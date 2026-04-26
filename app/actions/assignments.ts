"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { fireAndForgetEmail } from "@/lib/email/send";
import { invoiceCreatedEmail } from "@/lib/email/templates";
import type { Database } from "@/lib/database.types";

type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

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

  if (invoicePayload) {
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert(invoicePayload)
      .select("id, invoice_number, total_amount, billing_month, due_date")
      .single();

    if (invErr) {
      return {
        error: `Assignment saved, but invoice create failed: ${invErr.message}`,
      };
    }

    if (inv) {
      await writeAudit(supabase, {
        action: "create",
        table_name: "invoices",
        record_id: inv.id,
        new_values: invoicePayload as unknown as Record<string, unknown>,
      });

      if (member?.email) {
        const tpl = invoiceCreatedEmail({
          memberName: member.name ?? "there",
          invoiceNumber: inv.invoice_number ?? inv.id.slice(0, 8),
          billingMonth: String(inv.billing_month ?? v.move_in_date),
          total: Number(inv.total_amount ?? invoicePayload.total_amount ?? 0),
          dueDate: inv.due_date ?? null,
        });
        fireAndForgetEmail({ to: member.email, ...tpl });
      }
    }

    revalidatePath("/billing");
  }

  revalidatePath("/assignments");
  revalidatePath("/members");
  revalidatePath("/rooms");
  return { ok: true, assignmentId };
}
