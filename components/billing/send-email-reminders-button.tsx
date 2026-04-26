"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendDueEmailReminders } from "@/app/actions/email-reminders";

/**
 * Manual trigger for the email-reminder batch. Sends to every unpaid
 * invoice that's due within 7 days, has a member email on file, and
 * hasn't been emailed in the past 24h.
 *
 * In production this same logic also runs nightly via the cron route at
 * /api/cron/email-reminders — this button is for "do it now" cases.
 */
export function SendEmailRemindersButton() {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function trigger() {
    start(async () => {
      const res = await sendDueEmailReminders();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const lines = [
        `${res.sent} email${res.sent === 1 ? "" : "s"} sent.`,
      ];
      if (res.skipped) {
        lines.push(`${res.skipped} skipped (cooled-down or no email).`);
      }
      if (res.failures && res.failures.length) {
        lines.push(`${res.failures.length} failed: ${res.failures[0].reason}`);
      }
      toast.success(lines.join(" "));
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={trigger}
      disabled={pending}
      title="Send email reminders to all unpaid invoices due within 7 days (max 1 email per invoice per day)."
    >
      {pending ? (
        <>
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <Mail className="mr-1.5 size-3.5" />
          Email all due
        </>
      )}
    </Button>
  );
}
