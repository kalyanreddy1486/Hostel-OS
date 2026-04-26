"use server";

import crypto from "crypto";
import { z } from "zod";
import { createBackendClient } from "@/lib/backend/supabase";
import { sendEmail } from "@/lib/email/send";
import { signupOtpEmail } from "@/lib/email/templates";

// ---------- Shared Gmail-domain validation -------------------------------

// Gmail-only signup. Catches common typos like gmial / gmaill / gmal /
// gnail / gmail.con. Note: each alternative below MUST be a misspelling,
// not a substring of "gmail" — e.g. earlier we had `gmaill?` which made
// the second `l` optional and false-positively flagged the legit `gmail`.
const GMAIL_DOMAIN_RE = /@gmail\.com$/i;
const GMAIL_TYPO_RE = /@(gmial|gmaill|gmal|gnail|gmai|gmail\.con|gamil|googelmail)\.[a-z]{2,}$/i;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254)
  .refine((e) => !GMAIL_TYPO_RE.test(e), {
    message: "That looks like a Gmail typo — did you mean @gmail.com?",
  })
  .refine((e) => GMAIL_DOMAIN_RE.test(e), {
    message: "Please use a Gmail address (ends in @gmail.com).",
  });

// ---------- OTP storage helpers ------------------------------------------

const OTP_TTL_MIN = 10;
const OTP_REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OTP_REQUEST_MAX_PER_WINDOW = 3;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  // Cryptographically random 6-digit code, zero-padded.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// ---------- Action 1: request OTP ----------------------------------------

const requestOtpSchema = z.object({
  email: emailSchema,
  hostel_name: z.string().trim().min(2).max(120),
});

/**
 * Step 1 of signup: send a 6-digit code to the entered Gmail.
 *
 * - Validates the email is a real Gmail address
 * - Rate-limits: max 3 OTPs per email per hour (counts pending + consumed)
 * - Stores only the SHA-256 hash of the code (plaintext is emailed once,
 *   never persisted)
 * - Returns ok regardless of whether the email actually exists in
 *   tenants/auth — we don't leak account existence here either
 */
export async function requestSignupOtp(formData: FormData) {
  const parsed = requestOtpSchema.safeParse({
    email: formData.get("email") ?? "",
    hostel_name: formData.get("hostel_name") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const { email, hostel_name } = parsed.data;
  const supabase = createBackendClient();

  // Rate-limit
  const since = new Date(Date.now() - OTP_REQUEST_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("email_otps" as never)
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("purpose", "signup")
    .gte("created_at", since);
  if ((count ?? 0) >= OTP_REQUEST_MAX_PER_WINDOW) {
    return {
      error:
        "Too many codes requested. Please wait an hour before trying again.",
    };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

  const { error: insertErr } = await supabase
    .from("email_otps" as never)
    .insert({
      email,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      purpose: "signup",
    } as never);
  if (insertErr) {
    // Don't leak Postgres error text (table/column/constraint names) to an
    // unauthenticated public caller. Log server-side, return generic to user.
    console.error("[signup-otp] insert failed:", insertErr.message);
    return { error: "Something went wrong. Please try again." };
  }

  const tpl = signupOtpEmail({
    code,
    hostelName: hostel_name,
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
      // Email transport not configured. Never log the plaintext code —
      // server logs (Vercel, Sentry, anywhere) shouldn't carry OTP secrets.
      console.error(
        `[signup-otp] email transport not configured (recipient redacted)`,
      );
      return {
        error:
          "Email delivery is not configured on this server. Tell your contact at HostelOS so they can enable it.",
      };
    }
    return {
      error: `Could not send the verification email: ${sent.message ?? sent.reason}. Try again, or use a different Gmail address.`,
    };
  }

  return { ok: true };
}

// ---------- Action 2: verify OTP + create user/tenant --------------------

const signupSchema = z.object({
  hostel_name: z.string().trim().min(2, "Hostel name is too short").max(120),
  admin_full_name: z.string().trim().min(2, "Your name is too short").max(120),
  admin_email: emailSchema,
  admin_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

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
 * Step 2 of signup: verify the OTP the user just typed, then create the
 * auth user + tenant + admin profile (mirrors the controller's onboardTenant
 * but with no auth gate). Auto sign-in happens client-side after this.
 */
export async function signUpAsHostelAdmin(formData: FormData) {
  const parsed = signupSchema.safeParse({
    hostel_name: formData.get("hostel_name"),
    admin_full_name: formData.get("admin_full_name"),
    admin_email: formData.get("admin_email"),
    admin_password: formData.get("admin_password"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const v = parsed.data;
  const supabase = createBackendClient();

  // 1. Look up the latest unconsumed OTP for this email
  const { data: otpRow, error: otpErr } = await supabase
    .from("email_otps" as never)
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("email", v.admin_email)
    .eq("purpose", "signup")
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
  if (otpErr) return { error: `Could not verify code: ${otpErr.message}` };
  if (!otpRow) {
    return {
      error:
        "No active code found. Click 'Resend code' or restart the signup.",
    };
  }
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return {
      error: "Your code expired. Click 'Resend code' to get a fresh one.",
    };
  }
  if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      error: "Too many wrong attempts. Click 'Resend code' to get a new one.",
    };
  }
  if (hashCode(v.otp) !== otpRow.code_hash) {
    // Increment attempt counter so brute-force gets shut down quickly
    await supabase
      .from("email_otps" as never)
      .update({ attempts: otpRow.attempts + 1 } as never)
      .eq("id", otpRow.id);
    return {
      error: `Wrong code. ${OTP_MAX_ATTEMPTS - otpRow.attempts - 1} attempt${OTP_MAX_ATTEMPTS - otpRow.attempts - 1 === 1 ? "" : "s"} left.`,
    };
  }

  // 2. Create the auth user. We rely on Supabase's create-user error to
  //    detect duplicates rather than pre-checking (the GET ?email= filter
  //    is silently ignored — see project_supabase_admin_users_filter memory).
  //    OTP is NOT consumed yet — only consume after both user + tenant rows
  //    are confirmed created, otherwise a transient DB failure burns the
  //    user's OTP and they can't retry without waiting for a fresh code.
  const created = await callAdminApi("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: v.admin_email,
      password: v.admin_password,
      email_confirm: true, // OTP already proved they own the inbox
      user_metadata: { full_name: v.admin_full_name },
    },
  });
  if (!created.ok) {
    const body = created.body as
      | { code?: string; error_code?: string; msg?: string; message?: string }
      | string
      | null;
    const code =
      typeof body === "object" && body
        ? body.code ?? body.error_code ?? ""
        : "";
    const msg =
      typeof body === "object" && body
        ? body.msg ?? body.message ?? ""
        : typeof body === "string"
          ? body
          : "";
    if (
      code === "email_exists" ||
      /already (been )?registered|already exists/i.test(msg)
    ) {
      return {
        error:
          "An account with this email already exists. Try signing in or use Forgot password.",
      };
    }
    console.error("[signup] auth user create failed:", body);
    return {
      error:
        "Could not create your account. Please try again, or contact support.",
    };
  }
  const adminUserId = (created.body as { id?: string })?.id;
  if (!adminUserId || typeof adminUserId !== "string") {
    // Defensive: if Supabase ever changes the response shape, don't
    // silently embed `undefined` into the SQL below as a UUID literal.
    console.error("[signup] missing id in admin API response:", created.body);
    return { error: "Unexpected response from auth service. Please try again." };
  }

  // 3. Create the tenant row
  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      hostel_name: v.hostel_name,
      contact_email: v.admin_email,
      admin_user_id: adminUserId,
      status: "active",
      notes: null,
    })
    .select("id")
    .single();
  if (tenantErr || !tenantRow) {
    await callAdminApi(`/auth/v1/admin/users/${adminUserId}`, {
      method: "DELETE",
    });
    console.error("[signup] tenant insert failed:", tenantErr?.message);
    return {
      error: "Could not create your hostel. Please try again.",
    };
  }

  // 4. Both user + tenant exist — NOW it's safe to consume the OTP. If we
  //    failed earlier the OTP stays valid so the user can retry without
  //    burning their daily quota.
  await supabase
    .from("email_otps" as never)
    .update({ consumed_at: new Date().toISOString() } as never)
    .eq("id", otpRow.id);

  // 5. Insert the admin profile via the JS client — fully parameterized,
  //    no SQL injection surface. The user-supplied `admin_full_name` only
  //    travels through Supabase's prepared-statement layer here.
  await supabase
    .from("profiles")
    .upsert(
      {
        id: adminUserId,
        full_name: v.admin_full_name,
        role: "admin",
        tenant_id: tenantRow.id,
      },
      { onConflict: "id" },
    );

  // 6. Backfill auth.identities + null-token columns (Mumbai migration
  //    gotchas — see project_mumbai_migration memory). The auth.* schema
  //    isn't exposed to PostgREST so we have to use the Mgmt API. Everything
  //    interpolated is a UUID we just validated, no user input touches this.
  await runAuthSchemaBackfill(adminUserId);

  return {
    ok: true,
    tenant_id: tenantRow.id,
    admin_user_id: adminUserId,
  };
}

/**
 * Runs the post-signup auth.* schema repair via the Supabase Management API.
 *
 * SECURITY: only UUIDs are interpolated, and we validate the format with a
 * strict regex before letting the value into the SQL string. This makes
 * injection impossible regardless of where `userId` came from. No user-
 * supplied strings reach this function.
 */
async function runAuthSchemaBackfill(userId: string) {
  if (!UUID_RE.test(userId)) {
    // Defensive: caller bug / API shape change. Don't run garbage SQL.
    console.error("[signup] runAuthSchemaBackfill rejected non-UUID:", userId);
    return;
  }
  const pat = process.env.SUPABASE_MGMT_TOKEN;
  const ref = process.env.SUPABASE_MUMBAI_REF;
  if (!pat || !ref) return;

  const sql = `
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    SELECT u.id::text, u.id,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
           'email', now(), now(), now()
    FROM auth.users u
    WHERE u.id = '${userId}'::uuid
      AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider='email');

    UPDATE auth.users SET
      confirmation_token     = COALESCE(confirmation_token, ''),
      recovery_token         = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change           = COALESCE(email_change, '')
    WHERE id = '${userId}'::uuid;
  `;

  await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 HostelOS-Signup",
      },
      body: JSON.stringify({ query: sql }),
      cache: "no-store",
    },
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
