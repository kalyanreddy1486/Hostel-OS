function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRupees(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function shell({ title, body }: { title: string; body: string }) {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;color:#111827">
    <h1 style="font-size:18px;margin:0 0 12px">${escape(title)}</h1>
    ${body}
    <p style="margin-top:24px;color:#6b7280;font-size:12px">HostelOS · This is an automated notification.</p>
  </div>
</body></html>`;
}

export function invoiceCreatedEmail(opts: {
  memberName: string;
  invoiceNumber: string;
  billingMonth: string;
  total: number;
  dueDate: string | null;
}) {
  const body = `
    <p>Hi ${escape(opts.memberName)},</p>
    <p>A new invoice has been created for <strong>${escape(opts.billingMonth)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280">Invoice</td><td style="text-align:right"><strong>${escape(opts.invoiceNumber)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Total</td><td style="text-align:right"><strong>${formatRupees(opts.total)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Due date</td><td style="text-align:right">${escape(opts.dueDate ?? "—")}</td></tr>
    </table>
    <p>You can view and download the invoice from your HostelOS account.</p>
  `;
  return {
    subject: `Invoice ${opts.invoiceNumber} · ${formatRupees(opts.total)}`,
    html: shell({ title: "New invoice", body }),
    text: `New invoice ${opts.invoiceNumber}: ${formatRupees(opts.total)} due ${opts.dueDate ?? "—"}.`,
  };
}

export function paymentReceivedEmail(opts: {
  memberName: string;
  amount: number;
  mode: string;
  invoiceNumber: string | null;
  reference: string | null;
  receivedAt: string | null;
}) {
  const body = `
    <p>Hi ${escape(opts.memberName)},</p>
    <p>We received a payment of <strong>${formatRupees(opts.amount)}</strong> via ${escape(opts.mode.replace(/_/g, " "))}.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${opts.invoiceNumber ? `<tr><td style="padding:6px 0;color:#6b7280">Invoice</td><td style="text-align:right"><strong>${escape(opts.invoiceNumber)}</strong></td></tr>` : ""}
      ${opts.reference ? `<tr><td style="padding:6px 0;color:#6b7280">Reference</td><td style="text-align:right">${escape(opts.reference)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6b7280">Received</td><td style="text-align:right">${escape(opts.receivedAt ?? "—")}</td></tr>
    </table>
    <p>A detailed receipt is available in your HostelOS account.</p>
  `;
  return {
    subject: `Payment received · ${formatRupees(opts.amount)}`,
    html: shell({ title: "Payment received", body }),
    text: `Payment of ${formatRupees(opts.amount)} received. Thank you.`,
  };
}

export function ticketRaisedEmail(opts: {
  memberName: string;
  title: string;
  priority: string;
}) {
  const body = `
    <p>Hi ${escape(opts.memberName)},</p>
    <p>Your maintenance ticket has been received:</p>
    <blockquote style="border-left:3px solid #d1d5db;margin:12px 0;padding:8px 12px;color:#374151">
      <strong>${escape(opts.title)}</strong><br/>Priority: ${escape(opts.priority)}
    </blockquote>
    <p>We&rsquo;ll keep you updated as staff work on it.</p>
  `;
  return {
    subject: `Ticket raised: ${opts.title}`,
    html: shell({ title: "Ticket received", body }),
    text: `Ticket received: ${opts.title}. Priority: ${opts.priority}.`,
  };
}

/**
 * Rent due / reminder email — used for both auto-send on invoice creation
 * and the daily reminder cron. Mirrors the WhatsApp message format so a
 * resident gets the same payment instructions whichever channel reaches them
 * first: readable UPI ID + a tappable confirm link + a complaint link.
 *
 * UPI / claim / report links are optional — if any are missing (e.g. UPI VPA
 * not configured in Settings, or APP_PUBLIC_URL not set yet), that section
 * is skipped rather than rendering a broken value.
 */
export function rentReminderEmail(opts: {
  memberName: string;
  invoiceNumber: string;
  billingMonth: string;
  amountDue: number;
  dueDate: string;
  daysRemaining: number;
  upiVpa?: string | null;
  claimLink?: string | null;
  reportLink?: string | null;
  /** When true, opens with "Your new invoice is ready" instead of "Reminder". */
  fresh?: boolean;
}) {
  const opener = opts.fresh
    ? `Your invoice for <strong>${escape(opts.billingMonth)}</strong> is ready. Rent of <strong>${formatRupees(opts.amountDue)}</strong> is due on <strong>${escape(opts.dueDate)}</strong>${
        opts.daysRemaining > 0
          ? ` — that's <strong>${opts.daysRemaining} day${opts.daysRemaining === 1 ? "" : "s"}</strong> from today.`
          : "."
      }`
    : `This is a friendly reminder — your rent of <strong>${formatRupees(opts.amountDue)}</strong> for <strong>${escape(opts.billingMonth)}</strong> is due ${
        opts.daysRemaining > 0
          ? `in <strong>${opts.daysRemaining} day${opts.daysRemaining === 1 ? "" : "s"}</strong> (on ${escape(opts.dueDate)})`
          : `on <strong>${escape(opts.dueDate)}</strong>`
      }.`;

  const upiBlock = opts.upiVpa
    ? `
      <h3 style="font-size:14px;color:#111827;margin:20px 0 6px">1) Pay via UPI to:</h3>
      <div style="margin:6px 0 12px;padding:12px 14px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:600;letter-spacing:0.04em;color:#9a3412">${escape(opts.upiVpa)}</div>
    `
    : "";

  const claimBlock = opts.claimLink
    ? `
      <h3 style="font-size:14px;color:#111827;margin:20px 0 6px">2) Then confirm your payment here:</h3>
      <p style="margin:6px 0 12px"><a href="${escape(opts.claimLink)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1e2a78;color:#fff;text-decoration:none;font-weight:600">Confirm payment</a><br/><span style="color:#6b7280;font-size:12px">${escape(opts.claimLink)}</span></p>
    `
    : "";

  const reportBlock = opts.reportLink
    ? `
      <h3 style="font-size:14px;color:#111827;margin:20px 0 6px">Any maintenance issue?</h3>
      <p style="margin:6px 0 12px"><a href="${escape(opts.reportLink)}" style="color:#1e2a78;text-decoration:underline">Raise a complaint here</a></p>
    `
    : "";

  const body = `
    <p>Hi ${escape(opts.memberName)},</p>
    <p>${opener}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr><td style="padding:4px 0;color:#6b7280">Invoice</td><td style="text-align:right"><strong>${escape(opts.invoiceNumber)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Amount</td><td style="text-align:right"><strong>${formatRupees(opts.amountDue)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Due on</td><td style="text-align:right">${escape(opts.dueDate)}</td></tr>
    </table>
    ${upiBlock}
    ${claimBlock}
    ${reportBlock}
    <p style="margin-top:18px;color:#6b7280;font-size:12px">If you've already paid, please ignore this email.</p>
  `;
  return {
    subject: opts.fresh
      ? `Your invoice · ${formatRupees(opts.amountDue)} due ${opts.dueDate}`
      : `Rent reminder · ${formatRupees(opts.amountDue)} due ${opts.dueDate}`,
    html: shell({
      title: opts.fresh ? "Your invoice is ready" : "Rent reminder",
      body,
    }),
    text:
      `${opts.fresh ? `Your invoice for ${opts.billingMonth} is ready.` : `Reminder: rent for ${opts.billingMonth}.`}\n` +
      `Amount: ${formatRupees(opts.amountDue)}, due ${opts.dueDate}.\n` +
      (opts.upiVpa ? `\nPay via UPI to: ${opts.upiVpa}\n` : "") +
      (opts.claimLink ? `Then confirm here: ${opts.claimLink}\n` : "") +
      (opts.reportLink ? `Maintenance issue? ${opts.reportLink}\n` : ""),
  };
}

export function forgotPasswordOtpEmail(opts: {
  code: string;
  expiresInMinutes: number;
}) {
  const body = `
    <p>Hi there,</p>
    <p>Use this code to reset your HostelOS password:</p>
    <div style="margin:20px 0;padding:18px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;text-align:center">
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:0.18em;color:#9a3412">${escape(opts.code)}</div>
    </div>
    <p style="color:#374151">This code expires in <strong>${opts.expiresInMinutes} minutes</strong>. Don&rsquo;t share it with anyone — HostelOS will never ask you for it.</p>
    <p style="color:#6b7280;font-size:12px;margin-top:18px">If you didn&rsquo;t try to reset your password, you can safely ignore this email — your password stays unchanged.</p>
  `;
  return {
    subject: `${opts.code} is your HostelOS password reset code`,
    html: shell({ title: "Reset your password", body }),
    text:
      `Your HostelOS password reset code is ${opts.code}. ` +
      `It expires in ${opts.expiresInMinutes} minutes. ` +
      `If you didn't request this, ignore this email.`,
  };
}

export function signupOtpEmail(opts: {
  code: string;
  hostelName: string;
  expiresInMinutes: number;
}) {
  const body = `
    <p>Hi there,</p>
    <p>Use this code to finish setting up <strong>${escape(opts.hostelName)}</strong> on HostelOS:</p>
    <div style="margin:20px 0;padding:18px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;text-align:center">
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:0.18em;color:#9a3412">${escape(opts.code)}</div>
    </div>
    <p style="color:#374151">This code expires in <strong>${opts.expiresInMinutes} minutes</strong>. Don&rsquo;t share it with anyone.</p>
    <p style="color:#6b7280;font-size:12px;margin-top:18px">If you didn&rsquo;t try to sign up, you can safely ignore this email.</p>
  `;
  return {
    subject: `${opts.code} is your HostelOS signup code`,
    html: shell({ title: "Confirm your email", body }),
    text:
      `Your HostelOS signup code is ${opts.code}. ` +
      `It expires in ${opts.expiresInMinutes} minutes.`,
  };
}

export function ticketStatusChangedEmail(opts: {
  memberName: string;
  title: string;
  newStatus: string;
}) {
  const body = `
    <p>Hi ${escape(opts.memberName)},</p>
    <p>Your maintenance ticket <strong>${escape(opts.title)}</strong> is now <strong>${escape(opts.newStatus)}</strong>.</p>
    <p>Sign in to HostelOS for the latest details.</p>
  `;
  return {
    subject: `Ticket ${opts.newStatus}: ${opts.title}`,
    html: shell({ title: "Ticket update", body }),
    text: `Ticket "${opts.title}" is now ${opts.newStatus}.`,
  };
}
