"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { sendFreshInvoiceEmail } from "@/app/actions/email-reminders";
import type { Database } from "@/lib/database.types";

type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

function todayIst(): string {
  // sv-SE → YYYY-MM-DD format. Asia/Kolkata so a 23:00 UTC click on the 27th
  // (which is already the 28th in IST) compares against the 28th.
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
}

const assignSchema = z
  .object({
    member_id: z.string().uuid(),
    bed_id: z.string().uuid(),
    move_in_date: z.string().min(1),
    security_deposit: z.coerce.number().min(0).default(0),
    advance_paid: z.coerce.number().min(0).default(0),
    billing_mode: z.enum(["monthly", "daily"]).default("monthly"),
    daily_rate: z.coerce.number().min(0).optional(),
    expected_checkout_date: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.billing_mode === "daily") {
      if (!v.daily_rate || v.daily_rate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daily_rate"],
          message: "Price per day is required for daily billing",
        });
      }
      if (!v.expected_checkout_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expected_checkout_date"],
          message: "Checkout date is required for daily billing",
        });
      } else if (v.expected_checkout_date < v.move_in_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expected_checkout_date"],
          message: "Checkout date must be on or after joining date",
        });
      }
    }
  });

function daysBetweenInclusive(startIso: string, endIso: string) {
  const a = new Date(`${startIso}T00:00:00Z`).getTime();
  const b = new Date(`${endIso}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

function invoiceNumberFor(dateIso: string) {
  const [y, m, d] = dateIso.split("-");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV-${y}${m}${d}-${rand}`;
}

export async function assignBedAction(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = assignSchema.safeParse({
    member_id: formData.get("member_id"),
    bed_id: formData.get("bed_id"),
    move_in_date: formData.get("move_in_date"),
    security_deposit: formData.get("security_deposit") ?? 0,
    advance_paid: formData.get("advance_paid") ?? 0,
    billing_mode: (formData.get("billing_mode") as string) || "monthly",
    daily_rate: formData.get("daily_rate") ?? undefined,
    expected_checkout_date:
      (formData.get("expected_checkout_date") as string) || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const v = parsed.data;
  const { data, error } = await supabase.rpc("assign_bed", {
    p_member_id: v.member_id,
    p_bed_id: v.bed_id,
    p_move_in_date: v.move_in_date,
    p_security_deposit: v.security_deposit,
    p_advance_paid: v.advance_paid,
    p_billing_mode: v.billing_mode,
    p_daily_rate: v.daily_rate ?? undefined,
    p_expected_checkout_date: v.expected_checkout_date ?? undefined,
  });

  if (error) return { error: error.message };
  const assignmentId = data as string;

  await writeAudit(supabase, {
    action: "assign",
    table_name: "assignments",
    record_id: assignmentId ?? null,
    new_values: {
      member_id: v.member_id,
      bed_id: v.bed_id,
      move_in_date: v.move_in_date,
      security_deposit: v.security_deposit,
      advance_paid: v.advance_paid,
      billing_mode: v.billing_mode,
      daily_rate: v.daily_rate ?? null,
      expected_checkout_date: v.expected_checkout_date ?? null,
    },
  });

  // Fetch member + room info for invoice + notification
  const { data: member } = await supabase
    .from("members")
    .select("name, email")
    .eq("id", v.member_id)
    .maybeSingle();

  let invoicePayload: InvoiceInsert | null = null;

  if (v.billing_mode === "daily" && v.daily_rate && v.expected_checkout_date) {
    const days = daysBetweenInclusive(v.move_in_date, v.expected_checkout_date);
    const total = Math.round(days * v.daily_rate);
    const billingMonth = `${v.move_in_date.slice(0, 7)}-01`;

    invoicePayload = {
      member_id: v.member_id,
      assignment_id: assignmentId,
      invoice_number: invoiceNumberFor(v.move_in_date),
      billing_month: billingMonth,
      due_date: v.move_in_date,
      rent_amount: total,
      electricity_amount: 0,
      food_amount: 0,
      extra_charges: 0,
      late_fee: 0,
      total_amount: total,
      status: "pending",
      notes: `Daily billing · ${days} day${days === 1 ? "" : "s"} × ₹${v.daily_rate} (stay ${v.move_in_date} → ${v.expected_checkout_date}).`,
    };
  } else if (v.billing_mode === "monthly") {
    // First-cycle invoice for a monthly resident. Cron will generate the next
    // one on their move-in day-of-month each subsequent month.
    // Security deposit (if any) is credited against this first invoice:
    //   invoice_amount = max(0, monthly_rent - security_deposit)
    const { data: bedRow } = await supabase
      .from("beds")
      .select("room:rooms ( monthly_rent )")
      .eq("id", v.bed_id)
      .maybeSingle();
    const roomRaw = (bedRow as { room?: unknown } | null)?.room;
    const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw;
    const rent = Number((room as { monthly_rent?: number } | null)?.monthly_rent ?? 0);
    const deposit = Number(v.security_deposit ?? 0);
    const invoiceAmount = Math.max(0, rent - deposit);

    if (invoiceAmount > 0) {
      const note =
        deposit > 0
          ? `First cycle · ${v.move_in_date}. Rent ₹${rent.toLocaleString("en-IN")} − security deposit ₹${deposit.toLocaleString("en-IN")} = ₹${invoiceAmount.toLocaleString("en-IN")} payable.`
          : `First cycle · pay on or before ${v.move_in_date} to move in.`;
      invoicePayload = {
        member_id: v.member_id,
        assignment_id: assignmentId,
        invoice_number: invoiceNumberFor(v.move_in_date),
        billing_month: v.move_in_date,
        due_date: v.move_in_date,
        rent_amount: invoiceAmount,
        electricity_amount: 0,
        food_amount: 0,
        extra_charges: 0,
        late_fee: 0,
        total_amount: invoiceAmount,
        status: "pending",
        notes: note,
      };
    }
  }

  const dateMatchesToday = v.move_in_date === todayIst();
  let invoiceId: string | null = null;
  let emailSent = false;

  if (invoicePayload) {
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert(invoicePayload)
      .select("id, invoice_number, total_amount, billing_month, due_date, tenant_id")
      .single();

    if (invErr) {
      return {
        error: `Assignment saved, but invoice create failed: ${invErr.message}`,
      };
    }

    if (inv) {
      invoiceId = inv.id;
      await writeAudit(supabase, {
        action: "create",
        table_name: "invoices",
        record_id: inv.id,
        new_values: invoicePayload as unknown as Record<string, unknown>,
      });

      // Auto-send the rent reminder (with UPI link + complaint link + "ignore
      // if already paid" footer) only when the move-in date is today. For
      // back-dated or future-dated assignments the admin gets a follow-up
      // prompt in the UI to choose: send email, or mark this invoice paid.
      if (dateMatchesToday && member?.email) {
        const r = await sendFreshInvoiceEmail(inv.id, inv.tenant_id ?? undefined);
        emailSent = r.ok === true;
      }
    }

    revalidatePath("/billing");
  }

  revalidatePath("/assignments");
  revalidatePath("/members");
  revalidatePath("/rooms");
  return {
    ok: true,
    assignmentId,
    invoiceId,
    dateMatchesToday,
    memberHasEmail: Boolean(member?.email),
    emailSent,
  };
}

// ---------- Assignment follow-up actions ---------------------------------
// Used by the "What should we do about this invoice?" dialog that pops up
// after a back-dated / future-dated assignment.

const invoiceIdSchema = z.object({ invoice_id: z.string().uuid() });

/**
 * Send the rent-reminder email (UPI + claim + complaint links, "ignore if
 * already paid" footer) for an invoice that was just created by an
 * assignment whose move-in date didn't match today.
 */
export async function sendAssignmentInvoiceEmail(invoiceId: string) {
  await requireStaffOrAdmin();
  const parsed = invoiceIdSchema.safeParse({ invoice_id: invoiceId });
  if (!parsed.success) return { error: "Invalid invoice id." };

  const supabase = createActionClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, tenant_id, member:members(email)")
    .eq("id", parsed.data.invoice_id)
    .maybeSingle();
  if (!inv) return { error: "Invoice not found." };
  const memberRow = Array.isArray(inv.member) ? inv.member[0] : inv.member;
  if (!memberRow?.email) {
    return { error: "Member has no email on file." };
  }

  const r = await sendFreshInvoiceEmail(inv.id, inv.tenant_id ?? undefined);
  if (!r.ok) {
    return {
      error:
        "message" in r && r.message
          ? r.message
          : "Could not send the email. Please try again.",
    };
  }
  return { ok: true };
}

/**
 * Skip the email and mark this assignment's first-cycle invoice paid in full.
 * Used when an admin is back-recording an assignment for a resident who has
 * already settled the rent for the current cycle.
 */
export async function markAssignmentInvoicePaid(invoiceId: string) {
  await requireStaffOrAdmin();
  const parsed = invoiceIdSchema.safeParse({ invoice_id: invoiceId });
  if (!parsed.success) return { error: "Invalid invoice id." };

  const supabase = createActionClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, member_id, total_amount, status, due_date, billing_month")
    .eq("id", parsed.data.invoice_id)
    .maybeSingle();
  if (!inv) return { error: "Invoice not found." };
  if (inv.status === "paid") {
    // Idempotent — UI may double-click. Treat as success.
    return { ok: true };
  }

  const total = Number(inv.total_amount ?? 0);

  const paymentInsert = {
    member_id: inv.member_id as string,
    invoice_id: inv.id,
    amount: total,
    payment_date: (inv.due_date as string | null) ?? todayIst(),
    payment_mode: "cash",
    notes: "Marked paid on assignment (rent already settled offline)",
  };

  const { data: pay, error: payErr } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();
  if (payErr || !pay) {
    return { error: "Could not record the payment. Please try again." };
  }

  const { error: invErr } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", inv.id);
  if (invErr) {
    return { error: "Could not update the invoice. Please try again." };
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "payments",
    record_id: pay.id,
    new_values: paymentInsert,
  });
  await writeAudit(supabase, {
    action: "update",
    table_name: "invoices",
    record_id: inv.id,
    new_values: { status: "paid" },
  });

  revalidatePath("/billing");
  revalidatePath(`/billing/${inv.id}`);
  revalidatePath("/payments");
  return { ok: true };
}
