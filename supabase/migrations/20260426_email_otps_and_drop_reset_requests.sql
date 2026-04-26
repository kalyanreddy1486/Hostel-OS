-- Generalize signup_otps → email_otps so the same shape serves both signup
-- verification and self-service forgot-password flow. Each row carries a
-- `purpose` column to keep the two streams separate.
--
-- Also drop the old controller-mediated password_reset_requests table — the
-- new flow is fully self-service via OTP, no controller queue.

-- 1. Rename signup_otps → email_otps (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'signup_otps'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_otps'
  ) THEN
    ALTER TABLE public.signup_otps RENAME TO email_otps;
  END IF;
END $$;

-- 2. Add purpose column. Existing rows are all signup OTPs; new
-- forgot-password OTPs will use purpose='password_reset'.
ALTER TABLE public.email_otps
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'signup'
    CHECK (purpose IN ('signup', 'password_reset'));

-- 3. Replace the email-only index with one that includes purpose, so the
-- per-flow rate-limit queries don't scan rows from the other purpose.
DROP INDEX IF EXISTS public.idx_signup_otps_email_created;
DROP INDEX IF EXISTS public.idx_email_otps_email_created;
CREATE INDEX IF NOT EXISTS idx_email_otps_purpose_email_created
  ON public.email_otps (purpose, email, created_at DESC);

-- 4. Re-apply RLS policy under the new table name (rename keeps the policy
-- but renames don't always survive policy lookups in older Postgres). The
-- IF NOT EXISTS makes this idempotent.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sotp_no_direct_access ON public.email_otps;
DROP POLICY IF EXISTS email_otps_no_direct_access ON public.email_otps;
CREATE POLICY email_otps_no_direct_access ON public.email_otps
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- 5. Drop the controller-mediated reset-request table — fully replaced by
-- the new self-service OTP flow. CASCADE clears any FK references.
DROP TABLE IF EXISTS public.password_reset_requests CASCADE;
