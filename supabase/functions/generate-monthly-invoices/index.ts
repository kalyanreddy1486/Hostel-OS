import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  as_of?: string;          // YYYY-MM-DD, defaults to today UTC
  due_offset_days?: number; // days from billing_month → due_date (default 10)
  member_ids?: string[];
  dry_run?: boolean;
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUTC(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(dateIso: string): number {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

function monthStart(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function nextMonthStart(dateIso: string): string {
  const d = new Date(`${monthStart(dateIso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function makeInvoiceNumber(dateIso: string, seq: number) {
  const [y, m, d] = dateIso.split("-");
  return `INV-${y}${m}${d}-${String(seq).padStart(3, "0")}`;
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

function invoiceEmailHtml(opts: {
  memberName: string;
  invoiceNumber: string;
  billingMonth: string;
  total: number;
  dueDate: string | null;
}) {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;color:#111827">
    <h1 style="font-size:18px;margin:0 0 12px">New invoice</h1>
    <p>Hi ${escapeHtml(opts.memberName)},</p>
    <p>A new invoice has been created for your <strong>${escapeHtml(opts.billingMonth)}</strong> billing cycle.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280">Invoice</td><td style="text-align:right"><strong>${escapeHtml(opts.invoiceNumber)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Total</td><td style="text-align:right"><strong>${formatRupees(opts.total)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Due date</td><td style="text-align:right">${escapeHtml(opts.dueDate ?? "—")}</td></tr>
    </table>
    <p>You can view and download the invoice from your HostelOS account.</p>
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
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }
  }

  const asOf = body.as_of ?? todayUTC();
  const asOfDay = Number(asOf.slice(8, 10));
  const lastDay = lastDayOfMonth(asOf);
  const dueOffset = Math.max(0, Math.min(90, Number(body.due_offset_days ?? 0)));
  const dryRun = Boolean(body.dry_run);
  const dueDate = addDaysUTC(asOf, dueOffset);
  const cycleMonthStart = monthStart(asOf);
  const cycleMonthEnd = nextMonthStart(asOf);

  // Find members who already have any invoice for this calendar month. Skip them
  // so we don't double-bill if they were invoiced earlier under old logic or
  // created manually this month.
  const { data: existing, error: existingErr } = await supabase
    .from("invoices")
    .select("member_id, invoice_number")
    .gte("billing_month", cycleMonthStart)
    .lt("billing_month", cycleMonthEnd);
  if (existingErr) {
    return new Response(
      JSON.stringify({ error: `load existing invoices: ${existingErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const existingByMember = new Set((existing ?? []).map((i) => i.member_id));
  const usedNumbers = new Set((existing ?? []).map((i) => i.invoice_number));

  // PostgrestFilterBuilder methods return a new builder — they don't
  // mutate in place. Earlier this discarded the .in() result, silently
  // dropping the member_ids filter when admin re-ran for specific
  // residents only. Re-assign here so the filter actually applies.
  let assignmentsQuery = supabase
    .from("assignments")
    .select(
      "id, member_id, move_in_date, billing_mode, bed:beds!assignments_bed_id_fkey ( id, room:rooms ( id, monthly_rent ) ), member:members!assignments_member_id_fkey ( id, status )",
    )
    .eq("is_active", true);
  if (body.member_ids?.length) {
    assignmentsQuery = assignmentsQuery.in("member_id", body.member_ids);
  }
  const { data: assignments, error: aErr } = await assignmentsQuery;
  if (aErr) {
    return new Response(
      JSON.stringify({ error: `load assignments: ${aErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Filter to residents whose monthly billing day = as_of day.
  // Month-end rollover: on the last day of a short month, also include
  // residents whose move-in day > today's day (e.g., Feb 28 catches 29/30/31).
  const due = (assignments ?? []).filter((a) => {
    const assignment = a as {
      billing_mode?: string | null;
      move_in_date?: string | null;
      member?: { status?: string } | null;
    };
    if (assignment.billing_mode === "daily") return false;
    if (assignment.member?.status !== "active") return false;
    const mv = assignment.move_in_date;
    if (!mv) return false;
    const moveDay = Number(mv.slice(8, 10));
    if (moveDay === asOfDay) return true;
    if (asOfDay === lastDay && moveDay > asOfDay) return true;
    return false;
  });

  const memberIds = due.map((a) => (a as { member_id: string }).member_id);
  const roomIds = Array.from(
    new Set(
      due
        .map(
          (a) =>
            (a as { bed?: { room?: { id?: string } | null } | null }).bed?.room
              ?.id,
        )
        .filter((v: string | undefined): v is string => Boolean(v)),
    ),
  );

  const [{ data: elec }, { data: extras }] = await Promise.all([
    roomIds.length
      ? supabase
          .from("electricity_readings")
          .select("room_id, total_amount")
          .eq("billing_month", cycleMonthStart)
          .in("room_id", roomIds)
      : Promise.resolve({ data: [] as { room_id: string; total_amount: number | null }[] }),
    memberIds.length
      ? supabase
          .from("extra_charges")
          .select("member_id, amount")
          .eq("billing_month", cycleMonthStart)
          .in("member_id", memberIds)
      : Promise.resolve({ data: [] as { member_id: string; amount: number | null }[] }),
  ]);

  const elecByRoom = new Map<string, number>();
  for (const r of elec ?? []) {
    elecByRoom.set(r.room_id, (elecByRoom.get(r.room_id) ?? 0) + Number(r.total_amount ?? 0));
  }
  const extrasByMember = new Map<string, number>();
  for (const e of extras ?? []) {
    extrasByMember.set(e.member_id, (extrasByMember.get(e.member_id) ?? 0) + Number(e.amount ?? 0));
  }

  const rows: Array<Record<string, unknown>> = [];
  const skipped: Array<{ member_id: string; reason: string }> = [];
  let seq = 1;
  for (const a of due) {
    const assignment = a as {
      id: string;
      member_id: string;
      bed?: { room?: { id?: string; monthly_rent?: number } | null } | null;
    };
    const memberId = assignment.member_id;
    const roomId = assignment.bed?.room?.id;
    const rent = Number(assignment.bed?.room?.monthly_rent ?? 0);

    if (existingByMember.has(memberId)) {
      skipped.push({ member_id: memberId, reason: "already_invoiced_this_month" });
      continue;
    }
    if (rent <= 0) {
      skipped.push({ member_id: memberId, reason: "no_rent" });
      continue;
    }

    const electricityAmount = roomId ? elecByRoom.get(roomId) ?? 0 : 0;
    const extraCharges = extrasByMember.get(memberId) ?? 0;
    const total = rent + electricityAmount + extraCharges;

    let invoiceNumber = makeInvoiceNumber(asOf, seq);
    while (usedNumbers.has(invoiceNumber)) {
      seq += 1;
      invoiceNumber = makeInvoiceNumber(asOf, seq);
    }
    usedNumbers.add(invoiceNumber);
    seq += 1;

    rows.push({
      member_id: memberId,
      assignment_id: assignment.id,
      invoice_number: invoiceNumber,
      billing_month: asOf, // full YYYY-MM-DD = cycle start (resident's billing day)
      rent_amount: rent,
      electricity_amount: electricityAmount,
      food_amount: 0,
      extra_charges: extraCharges,
      late_fee: 0,
      total_amount: total,
      due_date: dueDate,
      status: "pending",
    });
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({
        as_of: asOf,
        due_date: dueDate,
        eligible: due.length,
        would_create: rows.length,
        skipped,
        dry_run: true,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  let created = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  const emailErrors: Array<{ member_id: string; reason: string }> = [];
  if (rows.length) {
    const { error: insertErr } = await supabase.from("invoices").insert(rows);
    if (insertErr) {
      return new Response(
        JSON.stringify({ error: `insert invoices: ${insertErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    created = rows.length;

    const { data: cfg } = await supabase.rpc("get_email_config");
    const apiKey = (cfg as { api_key?: string } | null)?.api_key ?? "";
    const fromAddr = (cfg as { from?: string } | null)?.from ?? "HostelOS <onboarding@resend.dev>";

    const { data: memberDetails } = await supabase
      .from("members")
      .select("id, name, email")
      .in("id", memberIds);
    const memberById = new Map<string, { name: string | null; email: string | null }>(
      (memberDetails ?? []).map((m) => [m.id, { name: m.name, email: m.email }]),
    );

    for (const r of rows) {
      const memberId = r.member_id as string;
      const m = memberById.get(memberId);
      if (!m?.email) {
        emailsSkipped += 1;
        continue;
      }
      const tpl = invoiceEmailHtml({
        memberName: m.name ?? "there",
        invoiceNumber: r.invoice_number as string,
        billingMonth: (r.billing_month as string),
        total: Number(r.total_amount ?? 0),
        dueDate: (r.due_date as string) ?? null,
      });
      const sent = await sendResendEmail({
        to: m.email,
        subject: `Invoice ${r.invoice_number} · ${formatRupees(Number(r.total_amount ?? 0))}`,
        html: tpl,
        apiKey,
        from: fromAddr,
      });
      if (sent.ok) emailsSent += 1;
      else emailErrors.push({ member_id: memberId, reason: sent.message ?? "unknown" });
    }

    await supabase.from("audit_logs").insert({
      action: "generate_invoices",
      table_name: "invoices",
      new_values: {
        as_of: asOf,
        due_date: dueDate,
        created,
        skipped_count: skipped.length,
        emails_sent: emailsSent,
        emails_skipped: emailsSkipped,
        emails_failed: emailErrors.length,
      },
    });
  }

  return new Response(
    JSON.stringify({
      as_of: asOf,
      due_date: dueDate,
      created,
      skipped,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      emails_failed: emailErrors,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
