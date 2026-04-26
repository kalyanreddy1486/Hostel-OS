import nodemailer, { type Transporter } from "nodemailer";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "disabled" | "missing_recipient" | "api_error"; message?: string };

const DEFAULT_FROM = "HostelOS <no-reply@hostel.local>";

// Gmail SMTP transporter, lazily created and reused. Nodemailer pools
// connections so repeated sends in the same Node process don't pay the
// TLS/AUTH handshake every time.
//
// CRED ROTATION CAVEAT: this cache lives for the lifetime of the Node
// process. If you rotate `SMTP_PASS` (e.g. revoke the old Google App
// Password), you MUST restart the server — the cached transporter keeps
// using the old credentials until the process recycles. On Vercel / other
// serverless hosts this is moot (functions are short-lived) but on a
// long-running `npm start` you'll see auth failures until the bounce.
let cachedSmtp: Transporter | null = null;
function getSmtpTransport(): Transporter | null {
  if (cachedSmtp) return cachedSmtp;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  cachedSmtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT) === 465
      : true,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
  });
  return cachedSmtp;
}

/**
 * Send a transactional email.
 *
 * Provider preference:
 *  1. **SMTP** (Gmail App Password etc) — if SMTP_USER + SMTP_PASS are set.
 *     Free, no per-recipient restriction, ~500/day on Gmail.
 *  2. **Resend** — if RESEND_API_KEY is set.
 *  3. **Disabled** — if neither, returns { ok: false, reason: "disabled" }.
 *
 * The `from` address defaults to RESEND_FROM (legacy) → SMTP_FROM → SMTP_USER
 * → DEFAULT_FROM. For Gmail SMTP, deliverability is best when `from` matches
 * the authenticated user (Gmail rewrites the From header otherwise).
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendResult> {
  const to = Array.isArray(args.to) ? args.to : [args.to];
  const cleanTo = to
    .map((r) => (typeof r === "string" ? r.trim() : ""))
    .filter(Boolean);
  if (!cleanTo.length) {
    return { ok: false, reason: "missing_recipient" };
  }

  // Path 1: SMTP (Gmail App Password)
  const smtp = getSmtpTransport();
  if (smtp) {
    const from =
      process.env.SMTP_FROM ||
      process.env.RESEND_FROM ||
      process.env.SMTP_USER ||
      DEFAULT_FROM;
    try {
      const info = await smtp.sendMail({
        from,
        to: cleanTo,
        subject: args.subject,
        html: args.html,
        text: args.text,
        replyTo: args.replyTo,
      });
      return { ok: true, id: info.messageId };
    } catch (err) {
      return {
        ok: false,
        reason: "api_error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Path 2: Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "disabled" };
  }
  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: cleanTo,
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!res.ok || !payload.id) {
      return {
        ok: false,
        reason: "api_error",
        message: payload.message ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, id: payload.id };
  } catch (err) {
    return {
      ok: false,
      reason: "api_error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function fireAndForgetEmail(args: SendEmailArgs): void {
  sendEmail(args)
    .then(async (r) => {
      if (!r.ok && r.reason !== "disabled") {
        console.error("[email] send failed", r);
        if (process.env.SENTRY_DSN) {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureMessage(`email send failed: ${r.reason}`, {
            level: "warning",
            extra: { reason: r.reason, message: r.message },
          });
        }
      }
    })
    .catch(async (err) => {
      console.error("[email] uncaught send failure", err);
      if (process.env.SENTRY_DSN) {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(err);
      }
    });
}
