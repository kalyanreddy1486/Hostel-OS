"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBackendClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { getAppSettings } from "@/lib/settings";
import { getRequestOrigin } from "@/lib/server/origin";
import { sendEmail } from "@/lib/email/send";
import { rentReminderEmail } from "@/lib/email/templates";

/**
 * Build the resident-facing reminder context once per batch — UPI VPA
 * (from Settings) + claim/report links (built from APP_PUBLIC_URL or, in
 * dev, the request origin). Cached at module level isn't safe across
 * requests, so we just compute per call; it's cheap.
 */
async function loadReminderContext() {
  const settings = await getAppSettings();
  const baseUrl =
    process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ||
    getRequestOrigin() ||
    "";
  return {
    upiVpa: settings.upi_vpa || null,
    baseUrl,
    customTemplate: settings.email_template || null,
  };
}

// ---------- Single-invoice reminder (manual) -----------------------------

const singleSchema = z.object({ invoice_id: z.string().uuid() });

export async function sendInvoiceReminderEmail(formData: FormData) {
  await requireStaffOrAdmin();
  const parsed = singleSchema.safeParse({
    invoice_id: formData.get("invoice_id"),
  });
  if (!parsed.success) return { error: "Invalid invoice id." };

  const supabase = createBackendClient();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, billing_month, due_date, total_amount, status, member:members(id, name, email)",
    )
    .eq("id", parsed.data.invoice_id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!inv) return { error: "Invoice not found." };
  if (inv.status === "paid") {
    return { error: "Invoice is already paid." };
  }
  const member = Array.isArray(inv.member) ? inv.member[0] : inv.member;
  if (!member?.email) {
    return {
      error: `${member?.name ?? "Resident"} has no email on file. Add one to their member profile first.`,
    };
  }

  const ctx = await loadReminderContext();
  const result = await deliverReminder(inv as InvoiceRow, member, ctx);
  if (!result.ok) return { error: result.message };

  await supabase
    .from("invoices")
    .update({ last_email_reminder_at: new Date().toISOString() } as never)
    .eq("id", inv.id);

  revalidatePath("/billing");
  revalidatePath(`/billing/${inv.id}`);
  return { ok: true, sent_to: member.email };
}

// ---------- Bulk: send reminders for all eligible due invoices -----------

type BulkOpts = {
  /** Cap on how many to send in one batch (Gmail SMTP soft limit ~500/day). */
  limit?: number;
  /** Don't re-email an invoice that was reminded within this many hours. */
  cooldownHours?: number;
  /** Send if due in <= this many days (negative = already overdue). */
  withinDays?: number;
};

export async function sendDueEmailReminders(opts: BulkOpts = {}) {
  await requireStaffOrAdmin();
  return _runBulkRemindersInternal(opts);
}

/**
 * @internal — DO NOT call from client components or unguarded code paths.
 *
 * This is a `"use server"` function that intentionally has NO auth check
 * because it serves two trusted callers:
 *   1. `sendDueEmailReminders` above, which auth-gates with `requireStaffOrAdmin()`
 *   2. The /api/cron/email-reminders route, which auth-gates with a Bearer
 *      token (see `app/api/cron/email-reminders/route.ts`)
 *
 * Adding a new caller? You MUST guard it before calling this. A plain
 * import from a client component would expose an unauth'd "send 200 emails"
 * endpoint to the public internet.
 */
export async function _runBulkRemindersInternal(opts: BulkOpts = {}) {
  const limit = opts.limit ?? 200;
  const cooldownHours = opts.cooldownHours ?? 24;
  const withinDays = opts.withinDays ?? 7;

  const supabase = createBackendClient();
  const cooldownCutoff = new Date(
    Date.now() - cooldownHours * 60 * 60 * 1000,
  ).toISOString();
  const dueCutoff = new Date(
    Date.now() + withinDays * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10); // date-only string

  // Eligible: unpaid, due within window, never reminded OR cooled down,
  // member has email on file. We over-fetch and filter the email check
  // client-side because Supabase JS doesn't support OR-with-NULL cleanly.
  const { data: rows, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, billing_month, due_date, total_amount, status, last_email_reminder_at, member:members(id, name, email)" as never,
    )
    .in("status", ["pending", "partial", "overdue"])
    .lte("due_date", dueCutoff)
    .order("due_date", { ascending: true })
    .limit(limit * 2)
    .returns<
      Array<{
        id: string;
        invoice_number: string | null;
        billing_month: string | null;
        due_date: string | null;
        total_amount: number;
        status: string;
        last_email_reminder_at: string | null;
        member:
          | { id: string; name: string; email: string | null }
          | { id: string; name: string; email: string | null }[]
          | null;
      }>
    >();

  if (error) return { error: error.message, sent: 0, skipped: 0 };

  const candidates = (rows ?? []).filter((r) => {
    const member = Array.isArray(r.member) ? r.member[0] : r.member;
    if (!member?.email) return false;
    if (!r.last_email_reminder_at) return true;
    return r.last_email_reminder_at < cooldownCutoff;
  });

  const toSend = candidates.slice(0, limit);

  const ctx = await loadReminderContext();
  let sent = 0;
  const failures: { invoice: string; reason: string }[] = [];

  for (const row of toSend) {
    const member = Array.isArray(row.member) ? row.member[0] : row.member;
    if (!member) continue;
    const result = await deliverReminder(row as InvoiceRow, member, ctx);
    if (result.ok) {
      await supabase
        .from("invoices")
        .update({ last_email_reminder_at: new Date().toISOString() } as never)
        .eq("id", row.id);
      sent++;
    } else {
      failures.push({ invoice: row.invoice_number ?? row.id.slice(0, 8), reason: result.message });
    }
  }

  revalidatePath("/billing");
  return {
    ok: true,
    sent,
    skipped: (rows?.length ?? 0) - candidates.length,
    eligible: candidates.length,
    failures,
  };
}

// ---------- Helpers ------------------------------------------------------

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  billing_month: string | null;
  due_date: string | null;
  total_amount: number;
  status: string;
};

type Member = { id: string; name: string; email: string | null };

type ReminderContext = {
  upiVpa: string | null;
  baseUrl: string;
  customTemplate: string | null;
};

async function deliverReminder(
  invoice: InvoiceRow,
  member: Member,
  ctx: ReminderContext,
  fresh = false,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!member.email) return { ok: false, message: "no email" };

  const monthLabel = invoice.billing_month
    ? new Date(`${invoice.billing_month.slice(0, 7)}-01T00:00:00Z`)
        .toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "the current cycle";
  const dueLabel = invoice.due_date
    ? new Date(`${invoice.due_date}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "soon";

  const daysRemaining = invoice.due_date
    ? Math.ceil(
        (new Date(`${invoice.due_date}T00:00:00Z`).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      )
    : 0;

  const claimLink = ctx.baseUrl ? `${ctx.baseUrl}/pay/${invoice.id}` : null;
  const reportLink = ctx.baseUrl ? `${ctx.baseUrl}/report-issue` : null;

  const tpl = rentReminderEmail({
    memberName: member.name,
    invoiceNumber: invoice.invoice_number ?? invoice.id.slice(0, 8),
    billingMonth: monthLabel,
    amountDue: Number(invoice.total_amount ?? 0),
    dueDate: dueLabel,
    daysRemaining: Math.max(daysRemaining, 0),
    upiVpa: ctx.upiVpa,
    claimLink,
    reportLink,
    fresh,
    customTemplate: ctx.customTemplate,
  });

  const r = await sendEmail({
    to: member.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  if (!r.ok) {
    return {
      ok: false,
      message:
        r.reason === "disabled"
          ? "Email is not configured on the server."
          : (r.message ?? r.reason),
    };
  }
  return { ok: true };
}

/**
 * Public entry-point: send the "your invoice is ready" email immediately
 * after an invoice is created. Used by app/actions/invoices.ts.
 *
 * Fire-and-forget from the caller's perspective — failures are logged but
 * don't block the create response. Sets last_email_reminder_at so the
 * daily cron skips this invoice for the next 24h.
 */
export async function sendFreshInvoiceEmail(
  invoiceId: string,
  tenantId?: string,
) {
  const supabase = createBackendClient();
  // Tenant-scope the lookup when caller knows the tenant. Today the only
  // caller is `createInvoice` which has the user's session and thus the
  // tenant. If `tenantId` is passed we filter by it so the service-role
  // client can't accidentally email a cross-tenant invoice.
  let q = supabase
    .from("invoices")
    .select(
      "id, invoice_number, billing_month, due_date, total_amount, status, tenant_id, member:members(id, name, email)" as never,
    )
    .eq("id", invoiceId);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data: inv } = await q.maybeSingle<{
    id: string;
    invoice_number: string | null;
    billing_month: string | null;
    due_date: string | null;
    total_amount: number;
    status: string;
    tenant_id: string;
    member:
      | { id: string; name: string; email: string | null }
      | { id: string; name: string; email: string | null }[]
      | null;
  }>();
  if (!inv) return { ok: false as const, message: "invoice not found" };
  const member = Array.isArray(inv.member) ? inv.member[0] : inv.member;
  if (!member?.email) {
    return { ok: false as const, message: "member has no email" };
  }

  const ctx = await loadReminderContext();
  const result = await deliverReminder(inv as InvoiceRow, member, ctx, true);
  if (result.ok) {
    await supabase
      .from("invoices")
      .update({ last_email_reminder_at: new Date().toISOString() } as never)
      .eq("id", inv.id);
  }
  return result;
}
