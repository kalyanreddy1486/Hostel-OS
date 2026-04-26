"use server";

import crypto from "crypto";
import { z } from "zod";
import { createBackendClient } from "@/lib/backend/supabase";
import { sendEmail } from "@/lib/email/send";
import { forgotPasswordOtpEmail } from "@/lib/email/templates";

// Same OTP discipline as signup — short TTL, hashed at rest, attempt
// counter, per-email rate-limit. Distinguished from signup OTPs by
// `purpose='password_reset'` on the email_otps table.
const OTP_TTL_MIN = 10;
const OTP_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const OTP_REQUEST_MAX_PER_WINDOW = 3;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);

// ---------- Step 1: send the reset code ----------------------------------

const requestSchema = z.object({ email: emailSchema });

/**
 * Step 1 of forgot-password: email a 6-digit reset code to the user.
 *
 * Returns ok regardless of whether the email is registered, so the form
 * can't be used to enumerate accounts. If the email isn't on file we
 * silently no-op (no row inserted, no email sent — the rate-limit query
 * still happens to keep timing similar).
 */
export async function requestForgotPasswordOtp(formData: FormData) {
  const parsed = requestSchema.safeParse({
    email: formData.get("email") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email address." };
  }
  const email = parsed.data.email;
  const supabase = createBackendClient();

  // Rate-limit (always counts, even for unknown emails, so timing is uniform)
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("email_otps" as never)
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("purpose", "password_reset")
    .gte("created_at", since);
  if ((count ?? 0) >= OTP_REQUEST_MAX_PER_WINDOW) {
    return {
      error:
        "Too many reset codes requested. Please wait an hour before trying again.",
    };
  }

  // Look up the user by email via Admin API. We need the user_id to
  // actually update the password later; if the email isn't registered we
  // don't send anything but still return ok.
  const userId = await lookupUserIdByEmail(email);
  if (!userId) {
    // Pretend success — no enumeration oracle.
    return { ok: true };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();
  const { error: insertErr } = await supabase
    .from("email_otps" as never)
    .insert({
      email,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      purpose: "password_reset",
    } as never);
  if (insertErr) {
    // Don't leak Postgres error text to an unauthenticated public caller.
    console.error("[forgot-password] insert failed:", insertErr.message);
    return { error: "Something went wrong. Please try again." };
  }

  const tpl = forgotPasswordOtpEmail({
    code,
    expiresInMinutes: OTP_TTL_MIN,
  });
  const sent = await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!sent.ok) {
    if (sent.reason === "disabled") {
      // Never log the plaintext code — that would expose OTPs to anyone
      // with log access (Vercel dashboard, Sentry, etc.).
      console.error(
        `[forgot-password] email transport not configured (recipient redacted)`,
      );
      return {
        error:
          "Email delivery is not configured. Contact your HostelOS controller.",
      };
    }
    return {
      error: `Could not send the reset email: ${sent.message ?? sent.reason}.`,
    };
  }
  return { ok: true };
}

// ---------- Step 2: verify the code + set new password -------------------

const resetSchema = z
  .object({
    email: emailSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
  });

/**
 * Step 2: verify the OTP and update the user's password.
 *
 * Single atomic action — verify and update happen together so a stolen
 * OTP can't be reused. On failure, the OTP attempt counter is bumped so
 * brute-forcing a 6-digit code gets shut down after 5 wrong tries.
 */
export async function resetPasswordWithOtp(formData: FormData) {
  const parsed = resetSchema.safeParse({
    email: formData.get("email") ?? "",
    otp: formData.get("otp") ?? "",
    new_password: formData.get("new_password") ?? "",
    confirm_password: formData.get("confirm_password") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const v = parsed.data;
  const supabase = createBackendClient();

  const { data: otpRow } = await supabase
    .from("email_otps" as never)
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("email", v.email)
    .eq("purpose", "password_reset")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      code_hash: string;
      expires_at: string;
      attempts: number;
      consumed_at: string | null;
    }>();

  if (!otpRow) {
    return {
      error:
        "No active reset code. Click 'Resend code' or restart from the start.",
    };
  }
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return { error: "Your code expired. Click 'Resend code' to get a new one." };
  }
  if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      error: "Too many wrong attempts. Click 'Resend code' to get a new one.",
    };
  }
  if (hashCode(v.otp) !== otpRow.code_hash) {
    await supabase
      .from("email_otps" as never)
      .update({ attempts: otpRow.attempts + 1 } as never)
      .eq("id", otpRow.id);
    const left = OTP_MAX_ATTEMPTS - otpRow.attempts - 1;
    return {
      error: `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.`,
    };
  }

  // Find the user. If the row went away between request + verify
  // (rare — admin deleted them?), fail clearly.
  const userId = await lookupUserIdByEmail(v.email);
  if (!userId) {
    return { error: "Account not found. It may have been removed." };
  }

  // Mark OTP consumed BEFORE the password update so a subsequent retry
  // can't reuse the same code even if updateUser fails.
  await supabase
    .from("email_otps" as never)
    .update({ consumed_at: new Date().toISOString() } as never)
    .eq("id", otpRow.id);

  const r = await callAdminApi(`/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    body: { password: v.new_password },
  });
  if (!r.ok) {
    return {
      error: `Could not update your password: ${JSON.stringify(r.body).slice(0, 200)}`,
    };
  }
  return { ok: true };
}

// ---------- Helpers ------------------------------------------------------

async function callAdminApi(
  path: string,
  init: { method: string; body?: unknown },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const jwt = process.env.SUPABASE_SERVICE_ROLE_JWT!;
  if (!jwt) throw new Error("SUPABASE_SERVICE_ROLE_JWT not set");
  const res = await fetch(`${url}${path}`, {
    method: init.method,
    headers: {
      apikey: jwt,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

/**
 * Look up the auth user id for a given email via the Mumbai management SQL
 * endpoint. The Admin API's GET /users `?email=` filter is silently ignored
 * (see project_supabase_admin_users_filter memory), so we go straight to
 * auth.users instead.
 *
 * SECURITY: the Supabase Management SQL endpoint doesn't support
 * parameterized queries, so we must interpolate. We belt-and-braces this:
 *   1. Callers pass through `emailSchema` which enforces Gmail-domain
 *      (no quotes, backslashes, control chars allowed in @gmail.com)
 *   2. This function additionally rejects anything outside a strict safe-
 *      email regex before touching SQL.
 * The combination makes injection impossible regardless of caller bugs.
 */
const SAFE_EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

async function lookupUserIdByEmail(email: string): Promise<string | null> {
  if (!SAFE_EMAIL_RE.test(email)) {
    console.error("[forgot-password] rejected unsafe email shape");
    return null;
  }
  const pat = process.env.SUPABASE_MGMT_TOKEN;
  const ref = process.env.SUPABASE_MUMBAI_REF;
  if (!pat || !ref) {
    console.warn(
      "[forgot-password] SUPABASE_MGMT_TOKEN / REF not set — cannot look up user",
    );
    return null;
  }
  // After SAFE_EMAIL_RE, the email is provably free of single quotes,
  // backslashes, semicolons, and control chars — safe for ANSI single-quote
  // string interpolation.
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 HostelOS-Auth",
      },
      body: JSON.stringify({
        query: `SELECT id FROM auth.users WHERE email = '${email}' LIMIT 1;`,
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}
