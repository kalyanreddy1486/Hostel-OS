import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient as createUserSessionClient } from "@/lib/supabase/server";

/**
 * Tenant-scoped client for admin/staff/resident requests.
 *
 * Returns a Supabase client bound to the signed-in user's session, so RLS
 * policies (specifically `tenant_id = get_my_tenant_id()`) automatically scope
 * every read and write to the caller's hostel. Use this in:
 *   - admin pages, server actions, API routes
 *   - resident pages
 * Do NOT use in: controller portal, edge functions, public endpoints — those
 * legitimately need service-role.
 */
export function createTenantClient() {
  return createUserSessionClient();
}

/**
 * Service-role client. Bypasses RLS — sees every tenant's data. Use only for:
 *   - controller portal (SaaS-owner views all hostels)
 *   - edge functions (no user session)
 *   - public endpoints (/pay, /report-issue) where there's no signed-in user
 *   - audit log writes (need to insert regardless of caller policy)
 */
export function createBackendClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const strict = process.env.AUTH_MODE === "strict";

  // In strict mode the backend client MUST use the service role — every
  // caller (controller pages, public OTP/ticket/claim flows, audit log
  // writes) needs RLS bypass. Silently falling back to anon would make
  // deny-all RLS policies (e.g. on `email_otps`) start denying our own
  // writes, which surfaces as "OTP system mysteriously broken" with no
  // clear error. Better to crash at boot than fail silently in prod.
  if (strict && !service) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required when AUTH_MODE=strict. " +
        "Set it in your environment before starting the server.",
    );
  }

  const key = service || anon;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input as RequestInfo, { ...(init as RequestInit), cache: "no-store" }),
    },
  });
}

