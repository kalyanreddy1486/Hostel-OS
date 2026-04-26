-- One-time signup verification codes.
--
-- Flow: user enters their email on /register → server generates a 6-digit
-- code, hashes it with SHA-256, stores the hash here with a 10-minute
-- expiry, and emails the plaintext code to the user. The user types the
-- code back; if its hash matches and isn't expired, the row is marked
-- consumed and the actual signup proceeds.
--
-- We never store the plaintext code — only the hash — so even a DB leak
-- doesn't let anyone hijack a signup.

CREATE TABLE IF NOT EXISTS public.signup_otps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INT  NOT NULL DEFAULT 0,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_otps_email_created
  ON public.signup_otps (email, created_at DESC);

ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sotp_no_direct_access ON public.signup_otps;
CREATE POLICY sotp_no_direct_access ON public.signup_otps
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
