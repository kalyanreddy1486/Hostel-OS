import { applyTemplate } from "@/lib/whatsapp";

/**
 * Default email body for rent reminders. Plain text with {placeholder}
 * tokens — the same format as DEFAULT_WHATSAPP_TEMPLATE so admins only
 * have to learn one syntax.
 *
 * When this body is rendered for the HTML email, newlines become
 * paragraph breaks, URLs become clickable links, and {upi_vpa} is
 * styled in monospace so it's easy to copy.
 */
export const DEFAULT_EMAIL_TEMPLATE = `Hi {name},

Your rent of {amount} for {month} is due on {due_date}.

1) Pay via UPI to:
{upi_vpa}

2) Then confirm your payment here:
{claim_link}

Any maintenance issue? Raise it here:
{report_link}

Thank you!`;

/**
 * Same placeholder vocabulary as WHATSAPP_PLACEHOLDERS so the two editors
 * feel identical. Re-exported for the EmailTemplateForm UI.
 */
export const EMAIL_PLACEHOLDERS: Array<{
  token: string;
  description: string;
  example: string;
}> = [
  { token: "{name}", description: "Resident's name", example: "Aravind" },
  { token: "{amount}", description: "Total invoice amount", example: "₹8,000" },
  { token: "{month}", description: "Billing month", example: "April 2026" },
  { token: "{due_date}", description: "Invoice due date", example: "24 Apr 2026" },
  { token: "{invoice}", description: "Invoice number", example: "INV-20260424-504" },
  { token: "{upi_vpa}", description: "UPI ID (rendered monospace)", example: "9876543210@okhdfcbank" },
  { token: "{claim_link}", description: "Confirm-payment link", example: "https://…/pay/…" },
  { token: "{report_link}", description: "Public complaint link", example: "https://…/report-issue" },
];

export function applyEmailTemplate(
  template: string,
  values: Record<string, string | null | undefined>,
): string {
  return applyTemplate(template, values);
}

/**
 * Convert a plain-text email body into safe styled HTML for sending.
 * - Escapes all HTML special chars (so admin's `<` / `&` don't break layout)
 * - Replaces double-newlines with paragraph breaks, single newlines with <br>
 * - Auto-links http(s) URLs
 * - Wraps anything that looks like a UPI VPA (`x@bank`) in a monospace tag
 */
export function plainTextToEmailHtml(text: string): string {
  const escaped = escapeHtml(text);
  // Collapse runs of 3+ newlines down to 2 so paragraphs stay sensible.
  const normalized = escaped.replace(/\n{3,}/g, "\n\n");
  const paragraphs = normalized.split(/\n{2,}/);

  return paragraphs
    .map((p) => {
      const linked = autoLinkUrls(p);
      const styled = styleUpiVpas(linked);
      const withBreaks = styled.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 12px;line-height:1.55">${withBreaks}</p>`;
    })
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function autoLinkUrls(s: string): string {
  // Match http(s) URLs up to whitespace / common terminators.
  return s.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    (url) =>
      `<a href="${url}" style="color:#1e2a78;text-decoration:underline;word-break:break-all">${url}</a>`,
  );
}

function styleUpiVpas(s: string): string {
  // VPA = at least 2 alnum chars + @ + at least 2 letters. Avoid email
  // addresses by requiring no dot before the @ (UPI handles like
  // 9876543210@okhdfcbank are clean) — gmail-style emails won't match.
  return s.replace(
    /\b([a-zA-Z0-9._\-]{4,})@([a-zA-Z]{2,})\b/g,
    (m, user, host) => {
      // Skip common email TLDs so user@gmail.com doesn't get UPI styling.
      if (/^(gmail|yahoo|outlook|hotmail|live|icloud|protonmail)$/i.test(host)) {
        return m;
      }
      return `<code style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:2px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;letter-spacing:0.02em">${user}@${host}</code>`;
    },
  );
}
