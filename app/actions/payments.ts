"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fireAndForgetEmail } from "@/lib/email/send";
import { paymentReceivedEmail } from "@/lib/email/templates";
import { requireStaffOrAdmin } from "@/lib/require-role";

const paymentSchema = z.object({
  member_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  payment_mode: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "other"]),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

function nullableString(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length ? s : undefined;
}

async function reconcileInvoiceStatus(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total_amount, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return;

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const paidTotal = (payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );
  const total = Number(invoice.total_amount ?? 0);

  let newStatus: "pending" | "paid" | "partial" = "pending";
  if (total > 0 && paidTotal >= total) newStatus = "paid";
  else if (paidTotal > 0) newStatus = "partial";

  // Allow reconciliation OUT of "overdue" too — a resident paying a late
  // invoice in full should flip it to "paid", not leave it stuck on overdue.
  // Earlier we excluded "overdue" here, which silently kept paid-late
  // invoices marked overdue forever.
  if (newStatus !== invoice.status) {
    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId);

    await writeAudit(supabase, {
      action: "status_change",
      table_name: "invoices",
      record_id: invoiceId,
      old_values: { status: invoice.status },
      new_values: { status: newStatus, reason: "payment_reconcile" },
    });
  }
}

export async function recordPayment(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = paymentSchema.safeParse({
    member_id: formData.get("member_id"),
    invoice_id: nullableString(formData.get("invoice_id")),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_mode: formData.get("payment_mode"),
    transaction_reference: nullableString(formData.get("transaction_reference")),
    notes: nullableString(formData.get("notes")),
  });

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;
  const insertPayload = {
    member_id: v.member_id,
    invoice_id: v.invoice_id ?? null,
    amount: v.amount,
    payment_date: v.payment_date,
    payment_mode: v.payment_mode,
    transaction_reference: v.transaction_reference ?? null,
    notes: v.notes ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to record payment");
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "payments",
    record_id: inserted.id,
    new_values: insertPayload,
  });

  if (v.invoice_id) {
    await reconcileInvoiceStatus(supabase, v.invoice_id);
  }

  const { data: member } = await supabase
    .from("members")
    .select("name, email")
    .eq("id", v.member_id)
    .maybeSingle();
  let invoiceNumber: string | null = null;
  if (v.invoice_id) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", v.invoice_id)
      .maybeSingle();
    invoiceNumber = inv?.invoice_number ?? null;
  }
  if (member?.email) {
    const tpl = paymentReceivedEmail({
      memberName: member.name ?? "there",
      amount: v.amount,
      mode: v.payment_mode,
      invoiceNumber,
      reference: v.transaction_reference ?? null,
      receivedAt: v.payment_date,
    });
    fireAndForgetEmail({ to: member.email, ...tpl });
  }

  revalidatePath("/payments");
  revalidatePath("/billing");
  if (v.invoice_id) revalidatePath(`/billing/${v.invoice_id}`);
  if (v.invoice_id) redirect(`/billing/${v.invoice_id}`);
  redirect("/payments");
}

export async function deletePayment(paymentId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  const invoiceId = before?.invoice_id ?? null;

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "payments",
    record_id: paymentId,
    old_values: before ?? null,
  });

  if (invoiceId) {
    await reconcileInvoiceStatus(supabase, invoiceId);
    revalidatePath(`/billing/${invoiceId}`);
  }

  revalidatePath("/payments");
  revalidatePath("/billing");
  return { ok: true };
}

/**
 * Bulk-delete payments. Each delete also reconciles the linked invoice's
 * status (paid/partial/pending) so totals stay correct after the rows go.
 */
export async function deletePaymentsBulk(ids: string[]) {
  await requireStaffOrAdmin();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Nothing to delete." };
  }
  // Bound the batch to keep the request quick + the reconcile loop bounded.
  if (ids.length > 200) {
    return { error: "Too many at once — pick fewer than 200." };
  }
  const supabase = createActionClient();

  // Pull the rows first so we can audit + know which invoices to reconcile.
  const { data: before, error: fetchErr } = await supabase
    .from("payments")
    .select("*")
    .in("id", ids);
  if (fetchErr) return { error: fetchErr.message };

  const rows = before ?? [];
  if (rows.length === 0) return { error: "No payments matched." };

  const invoiceIds = Array.from(
    new Set(
      rows
        .map((r) => r.invoice_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  );

  const { error: deleteErr } = await supabase
    .from("payments")
    .delete()
    .in("id", ids);
  if (deleteErr) return { error: deleteErr.message };

  // Audit each row separately (mirrors deleteInvoicesBulk pattern)
  for (const row of rows) {
    await writeAudit(supabase, {
      action: "delete",
      table_name: "payments",
      record_id: row.id,
      old_values: row,
    });
  }

  // Reconcile each touched invoice
  for (const invId of invoiceIds) {
    await reconcileInvoiceStatus(supabase, invId);
    revalidatePath(`/billing/${invId}`);
  }

  revalidatePath("/payments");
  revalidatePath("/billing");
  return { ok: true, deleted: rows.length };
}
