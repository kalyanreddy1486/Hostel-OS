"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendInvoiceReminderEmail } from "@/app/actions/email-reminders";

type Size = "sm" | "md";

/**
 * Single-invoice email reminder. Sits next to the WhatsApp "Remind" button
 * in the actions column; the two are complementary — Email gives a paper
 * trail, WhatsApp gives a poke.
 */
export function EmailInvoiceButton({
  invoiceId,
  memberEmail,
  size = "sm",
}: {
  invoiceId: string;
  memberEmail: string | null | undefined;
  size?: Size;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  if (!memberEmail) {
    return (
      <span
        title="No email on file for this resident"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-dashed bg-muted/40 text-muted-foreground",
          size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        )}
      >
        <Mail className={size === "sm" ? "size-3" : "size-4"} />
        No email
      </span>
    );
  }

  function send() {
    const fd = new FormData();
    fd.set("invoice_id", invoiceId);
    start(async () => {
      const res = await sendInvoiceReminderEmail(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Reminder emailed to ${res.sent_to}`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={pending}
      title={`Email a reminder to ${memberEmail}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-sky-600 font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
    >
      {pending ? (
        <Loader2 className={cn("animate-spin", size === "sm" ? "size-3" : "size-4")} />
      ) : (
        <Mail className={size === "sm" ? "size-3" : "size-4"} />
      )}
      Email
    </button>
  );
}
