import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl, rentReminderMessage } from "@/lib/whatsapp";

type Size = "sm" | "md";

export function WhatsAppReminderButton({
  phone,
  memberName,
  amount,
  invoiceNumber,
  dueDate,
  billingMonth,
  upiVpa,
  upiLink,
  claimLink,
  reportLink,
  template,
  size = "sm",
  label,
}: {
  phone: string | null | undefined;
  memberName: string;
  amount: number;
  invoiceNumber: string | null;
  dueDate: string | null;
  billingMonth: string | null;
  upiVpa?: string | null;
  upiLink?: string | null;
  claimLink?: string | null;
  reportLink?: string | null;
  template?: string | null;
  size?: Size;
  label?: string;
}) {
  const msg = rentReminderMessage({
    memberName,
    amount,
    invoiceNumber,
    dueDate,
    billingMonth,
    upiVpa,
    upiLink,
    claimLink,
    reportLink,
    template,
  });
  const href = buildWhatsAppUrl(phone, msg);

  if (!href) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-dashed bg-muted/40 text-muted-foreground",
          size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        )}
        title="No valid phone number on file"
      >
        <MessageCircle className={size === "sm" ? "size-3" : "size-4"} />
        No phone
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-emerald-600 font-medium text-white transition-colors hover:bg-emerald-700",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
      title={`Send WhatsApp reminder to ${memberName}`}
    >
      <MessageCircle className={size === "sm" ? "size-3" : "size-4"} />
      {label ?? "Remind"}
    </a>
  );
}
