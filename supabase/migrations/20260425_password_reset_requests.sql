-- Password reset requests submitted from the public login page.
--
-- Flow: user clicks "Forgot password?" on /login → enters email → row lands
-- here with status='pending'. Controller sees pending requests on /controller,
-- clicks "Reset & email" → system generates a strong temp password, calls
-- the Supabase Admin API to set it, emails the user, marks the row resolved.
--
-- All access is via service-role from server actions. No authenticated-user
-- or anon direct access — the table is locked with a deny-all RLS policy.

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  -- Joined opportunistically when the request arrives. Null if the email
  -- doesn't match any known auth user (we still keep the row so the
  -- controller can investigate).
  user_id         UUID,
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  hostel_name     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','resolved','dismissed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID,
  email_sent_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prr_status_created
  ON public.password_reset_requests (status, created_at DESC);

-- Used by the public submit action for rate-limiting (don't accept the same
-- email more than once per 5 minutes).
CREATE INDEX IF NOT EXISTS idx_prr_email_created
  ON public.password_reset_requests (email, created_at DESC);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prr_no_direct_access ON public.password_reset_requests;
CREATE POLICY prr_no_direct_access ON public.password_reset_requests
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
