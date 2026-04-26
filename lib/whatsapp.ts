/**
 * Normalize an Indian phone number for wa.me deep links.
 *
 * wa.me expects digits-only, no `+`, with country code. Indian numbers stored
 * as `9876543210`, `+91 9876543210`, `91-9876543210`, or `(+91) 98765 43210`
 * should all normalize to `919876543210`.
 *
 * Returns null if the number doesn't look valid (too short, too long, etc.).
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  // Other country codes — accept 11-14 digits as-is.
  if (digits.length >= 11 && digits.length <= 14) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Build a UPI deep link for an invoice payment.
 * Example: upi://pay?pa=9876543210@okhdfcbank&pn=HostelOS&am=8000&cu=INR&tn=INV-001
 *
 * We intentionally keep the `@` raw (not URL-encoded to %40) in the `pa=`
 * parameter. UPI apps accept both forms, but raw `@` helps WhatsApp's URL
 * parser keep the whole link together instead of treating the leading digits
 * as a phone number.
 */
export function buildUpiDeepLink(opts: {
  vpa: string;
  payeeName: string;
  amount: number;
  note: string;
}): string | null {
  if (!opts.vpa) return null;
  // Encode payee name + note, but leave VPA raw.
  return (
    `upi://pay?pa=${opts.vpa}` +
    `&pn=${encodeURIComponent(opts.payeeName)}` +
    `&am=${opts.amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(opts.note)}`
  );
}

/**
 * Default WhatsApp reminder template. Placeholders are wrapped in {curlies}.
 * Used when admin hasn't customized one in Settings.
 *
 * We expose the raw VPA (not the `upi://` scheme link) because WhatsApp
 * does not auto-link `upi://` URLs — recipients can copy the VPA into
 * their UPI app of choice. `{upi_link}` remains available as a placeholder
 * for admins who want to add it back via custom templates.
 */
export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {name}, your rent of {amount} for {month} is due on {due_date}.

1) Pay via UPI to:
{upi_vpa}

2) Then confirm payment here:
{claim_link}

Any maintenance issue? Raise it here:
{report_link}

Thank you!`;

export const WHATSAPP_PLACEHOLDERS: Array<{
  token: string;
  description: string;
  example: string;
}> = [
  { token: "{name}", description: "Resident's name", example: "Aravind" },
  { token: "{amount}", description: "Total invoice amount", example: "₹8,000" },
  { token: "{month}", description: "Billing month", example: "April 2026" },
  { token: "{due_date}", description: "Invoice due date", example: "24 Apr 2026" },
  { token: "{invoice}", description: "Invoice number", example: "INV-20260424-504" },
  { token: "{upi_vpa}", description: "UPI ID as plain text (copyable)", example: "9876543210@okhdfcbank" },
  { token: "{upi_link}", description: "UPI deep link (rarely tappable in WhatsApp)", example: "upi://pay?…" },
  { token: "{claim_link}", description: "Claim/confirm payment link", example: "https://…/pay/…" },
  { token: "{report_link}", description: "Public complaint link", example: "https://…/report-issue" },
];

/**
 * Render a custom template by substituting {placeholder} tokens. Empty values
 * become an em-dash so the message still reads naturally.
 */
export function applyTemplate(
  template: string,
  values: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    return v == null || v === "" ? "—" : v;
  });
}

/** Friendly pre-filled rent reminder message with a pay link and a confirm link. */
export function rentReminderMessage(opts: {
  memberName: string;
  amount: number;
  invoiceNumber: string | null;
  dueDate: string | null;
  billingMonth: string | null;
  upiVpa?: string | null;
  upiLink?: string | null;
  claimLink?: string | null;
  reportLink?: string | null;
  /** If provided, the message is rendered from this template via {placeholder} substitution. */
  template?: string | null;
}): string {
  const amt = `₹${opts.amount.toLocaleString("en-IN")}`;
  const monthLabel = opts.billingMonth
    ? new Date(`${opts.billingMonth.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(
        "en-IN",
        { month: "long", year: "numeric" },
      )
    : "the current cycle";
  const dueLabelShort = opts.dueDate
    ? new Date(`${opts.dueDate}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "soon";
  const dueLabel = opts.dueDate ? `due on ${dueLabelShort}` : "due soon";
  const inv = opts.invoiceNumber ?? "";

  // If admin has saved a custom template, render via {placeholder} substitution.
  if (opts.template && opts.template.trim()) {
    return applyTemplate(opts.template, {
      name: opts.memberName,
      amount: amt,
      month: monthLabel,
      due_date: dueLabelShort,
      invoice: inv,
      upi_vpa: opts.upiVpa ?? "",
      upi_link: opts.upiLink ?? "",
      claim_link: opts.claimLink ?? "",
      report_link: opts.reportLink ?? "",
    });
  }

  // Fallback: built-in default template (hard-coded for backwards compat).
  const invSuffix = inv ? ` (Invoice ${inv})` : "";
  const lines = [
    `Hi ${opts.memberName}, your rent of ${amt} for ${monthLabel}${invSuffix} is ${dueLabel}.`,
  ];
  if (opts.upiVpa) {
    lines.push("");
    lines.push("1) Pay via UPI to:");
    lines.push(opts.upiVpa);
  }
  if (opts.claimLink) {
    lines.push("");
    lines.push("2) Then confirm payment here:");
    lines.push(opts.claimLink);
  }
  if (opts.reportLink) {
    lines.push("");
    lines.push("Any maintenance issue? Raise it here:");
    lines.push(opts.reportLink);
  }
  lines.push("");
  lines.push("Thank you!");
  return lines.join("\n");
}
