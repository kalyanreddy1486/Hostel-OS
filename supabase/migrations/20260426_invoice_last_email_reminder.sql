-- Track when each invoice was last emailed so the daily reminder cron
-- doesn't spam residents with the same nudge multiple times.
--
-- Used by app/actions/email-reminders.ts (single + bulk send) and the
-- /api/cron/email-reminders route.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_email_reminder_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_email_reminder_due
  ON public.invoices (status, due_date)
  WHERE status IN ('pending', 'partial', 'overdue');
