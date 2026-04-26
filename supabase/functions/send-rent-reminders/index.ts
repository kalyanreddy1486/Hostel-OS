import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  lead_days?: number; // days before due_date to send reminder (default 3)
  as_of?: string;     // YYYY-MM-DD, defaults to today UTC
  dry_run?: boolean;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatRupees(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reminderEmailHtml(opts: {
  memberName: string;
  invoiceNumber: string;
  billingMonth: string;
  amountDue: number;
  dueDate: string;
  daysRemaining: number;
}) {
  const dueLine =
    opts.daysRemaining === 0
      ? `is due <strong>today</strong>.`
      : `is due in <strong>${opts.daysRemaining} day${opts.daysRemaining === 1 ? "" : "s"}</strong>.`;
  const title =
    opts.daysRemaining === 0 ? "Rent due today" : "Rent reminder";
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;color:#111827">
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    <p>Hi ${escapeHtml(opts.memberName)},</p>
    <p>Your rent for the cycle starting <strong>${escapeHtml(opts.billingMonth)}</strong> ${dueLine}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280">Invoice</td><td style="text-align:right"><strong>${escapeHtml(opts.invoiceNumber)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Amount</td><td style="text-align:right"><strong>${formatRupees(opts.amountDue)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Due on</td><td style="text-align:right">${escapeHtml(opts.dueDate)}</td></tr>
    </table>
    <p>Please pay to continue your stay for the upcoming cycle.</p>
    <p style="margin-top:24px;color:#6b7280;font-size:12px">HostelOS · This is an automated notification.</p>
  </div>
</body></html>`;
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  from: string;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!args.apiKey) return { ok: false, message: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: args.from, to: [args.to], subject: args.subject, html: args.html }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: (body as { message?: string }).message ?? `HTTP ${res.status}` };
    return { ok: true, id: (body as { id?: string }).id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Body = {};
  if (req.method === "POST") {
    try { body = (await req.json()) as Body; } catch { body = {}; }
  }

  const leadDays = Math.min(30, Math.max(0, Number(body.lead_days ?? 3)));
  const asOf = body.as_of ?? today();
  const dryRun = Boolean(body.dry_run);
  const targetDueDate = addDays(asOf, leadDays);

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, billing_month, due_date, total_amount, status, member:members!invoices_member_id_fkey ( id, name, email )",
    )
    .eq("due_date", targetDueDate)
    .in("status", ["pending", "partial"]);

  if (invErr) {
    return new Response(
      JSON.stringify({ error: `load invoices: ${invErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const toSend: Array<{
    invoice_id: string;
    member_id: string;
    email: string;
    member_name: string;
    invoice_number: string;
    billing_month: string;
    amount: number;
    due_date: string;
  }> = [];
  const skipped: Array<{ invoice_id: string; reason: string }> = [];

  for (const inv of invoices ?? []) {
    const memberRaw = (inv as { member?: unknown }).member;
    const member = Array.isArray(memberRaw) ? memberRaw[0] : memberRaw;
    const m = member as { id?: string; name?: string | null; email?: string | null } | null;
    if (!m?.email) {
      skipped.push({ invoice_id: inv.id, reason: "no_email" });
      continue;
    }
    toSend.push({
      invoice_id: inv.id,
      member_id: m.id ?? "",
      email: m.email,
      member_name: m.name ?? "there",
      invoice_number: inv.invoice_number ?? inv.id.slice(0, 8),
      billing_month: (inv.billing_month ?? "").slice(0, 7),
      amount: Number(inv.total_amount ?? 0),
      due_date: inv.due_date ?? targetDueDate,
    });
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({
        as_of: asOf,
        lead_days: leadDays,
        target_due_date: targetDueDate,
        would_send: toSend.length,
        skipped,
        dry_run: true,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: cfg } = await supabase.rpc("get_email_config");
  const apiKey = (cfg as { api_key?: string } | null)?.api_key ?? "";
  const fromAddr = (cfg as { from?: string } | null)?.from ?? "HostelOS <onboarding@resend.dev>";

  let sent = 0;
  const failed: Array<{ invoice_id: string; reason: string }> = [];
  for (const t of toSend) {
    const tpl = reminderEmailHtml({
      memberName: t.member_name,
      invoiceNumber: t.invoice_number,
      billingMonth: t.billing_month,
      amountDue: t.amount,
      dueDate: t.due_date,
      daysRemaining: leadDays,
    });
    const res = await sendResendEmail({
      to: t.email,
      subject: `Rent reminder · ${formatRupees(t.amount)} due ${t.due_date}`,
      html: tpl,
      apiKey,
      from: fromAddr,
    });
    if (res.ok) sent += 1;
    else failed.push({ invoice_id: t.invoice_id, reason: res.message ?? "unknown" });
  }

  if (sent > 0 || failed.length > 0) {
    await supabase.from("audit_logs").insert({
      action: "rent_reminder",
      table_name: "invoices",
      new_values: {
        as_of: asOf,
        lead_days: leadDays,
        target_due_date: targetDueDate,
        sent,
        skipped_count: skipped.length,
        failed_count: failed.length,
      },
    });
  }

  return new Response(
    JSON.stringify({
      as_of: asOf,
      lead_days: leadDays,
      target_due_date: targetDueDate,
      sent,
      skipped,
      failed,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
