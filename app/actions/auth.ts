"use server";

import { z } from "zod";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "New password is too long"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
  })
  .refine((d) => d.current_password !== d.new_password, {
    path: ["new_password"],
    message: "New password must be different from the current one",
  });

/**
 * Self-service password change for the currently signed-in user.
 *
 * Verifies the current password by attempting a fresh sign-in against a
 * disposable Supabase client (so we don't disturb the active session
 * cookies), then issues an `auth.updateUser({ password })` on the SSR
 * client which is bound to the real session.
 *
 * In demo mode (AUTH_MODE !== "strict") there's no real auth user, so we
 * surface a friendly error instead of pretending it worked.
 */
export async function changePassword(formData: FormData) {
  const parsed = schema.safeParse({
    current_password: formData.get("current_password") ?? "",
    new_password: formData.get("new_password") ?? "",
    confirm_password: formData.get("confirm_password") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  if (process.env.AUTH_MODE !== "strict") {
    return {
      error:
        "Password change is disabled in demo mode. Switch AUTH_MODE=strict and sign in with a real account.",
    };
  }

  const supabase = createSsrClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user || !user.email) {
    return { error: "You're not signed in." };
  }

  // Verify the current password using a throwaway client so the active
  // session cookies aren't rewritten by the verification sign-in attempt.
  //
  // KNOWN MVP RACE: between the verify-sign-in below and the updateUser
  // call, a concurrent request could change the password (e.g. parallel
  // `resetPasswordWithOtp` flow). The window is milliseconds and requires
  // the user to trigger two flows simultaneously. Supabase's auth API
  // doesn't expose a single "verify-then-update" call so this is the
  // best we can do without a custom Postgres function. Accepted risk.
  const verifier = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verifyErr) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (updateErr) {
    // Don't echo Supabase API internals to the user. Log server-side.
    console.error("[change-password] updateUser failed:", updateErr.message);
    return {
      error: "Could not update your password. Please try again.",
    };
  }

  return { ok: true };
}
