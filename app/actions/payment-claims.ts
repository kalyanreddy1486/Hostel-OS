"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { fireAndForgetEmail } from "@/lib/email/send";
import { paymentReceivedEmail } from "@/lib/email/templates";

export async function confirmPaymentClaim(claimId: string) {
  const session = await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: claim } = await supabase
    .from("payment_inbox_events")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) return { error: "Claim not found" };
  if (claim.status === "confirmed") return { error: "Already confirmed" };
  if (!claim.matched_invoice_id) return { error: "Claim has no invoice link" };

  // Atomically claim ownership of this confirmation BEFORE inserting the
  // payment row. Two concurrent admin clicks would otherwise both pass the
  // status check above, both insert payment rows, and double-reconcile.
  // The conditional update returns count=0 if some other confirm got in
  // first; we bail without writing anything else.
  const { data: claimed, error: claimErr } = await supabase
    .from("payment_inbox_events")
    .update({
      status: "confirmed",
      confirmed_by: session.user.id === "demo-user" ? null : session.user.id,
      confirmed_at: new Date().toISOString(),
      match_reason: "admin_confirmed_resident_claim",
    } as never)
    .eq("id", claimId)
    .neq("status", "confirmed")
    .select("id");
  if (claimErr) {
    console.error("[confirm-claim] atomic update failed:", claimErr.message);
    return { error: "Could not confirm. Please try again." };
  }
  if (!claimed || claimed.length === 0) {
    // Some other admin's confirm landed first — bail without writing anything.
    return { error: "Already confirmed by another admin." };
  }

  // Create the real payment row
  const paymentInsert = {
    member_id: claim.claimed_by_member_id ?? "",
    invoice_id: claim.matched_invoice_id,
    amount: Number(claim.amount),
    payment_date: (claim.received_at as string).slice(0, 10),
    payment_mode: claim.payment_mode ?? "upi",
    transaction_reference: claim.upi_reference ?? null,
    notes: `Confirmed from resident claim · ${claim.upi_reference ?? ""}`,
  };
  if (!paymentInsert.member_id) {
    return { error: "Claim has no member id; cannot create payment" };
  }
  const { data: pay, error: payErr } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();
  if (payErr || !pay) {
    console.error("[confirm-claim] payment insert failed:", payErr?.message);
    return { error: "Could not record the payment. Please try again." };
  }
  // Backfill matched_payment_id now that we have it
  await supabase
    .from("payment_inbox_events")
    .update({ matched_payment_id: pay.id } as never)
    .eq("id", claimId);

  // Reconcile invoice status
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total_amount, status")
    .eq("id", claim.matched_invoice_id)
    .maybeSingle();
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", claim.matched_invoice_id);
  const paidTotal = (allPayments ?? []).reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );
  const total = Number(invoice?.total_amount ?? 0);
  let newStatus: "pending" | "paid" | "partial" = "pending";
  if (total > 0 && paidTotal >= total) newStatus = "paid";
  else if (paidTotal > 0) newStatus = "partial";
  // Allow reconciliation OUT of "overdue" too — confirming a late payment
  // in full should flip the invoice to "paid", not stick on overdue.
  if (invoice && invoice.status !== newStatus) {
    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", claim.matched_invoice_id);
  }

  // Status, confirmed_by, confirmed_at, and match_reason were set by the
  // atomic update earlier (see top of function); matched_payment_id was
  // backfilled after the payment insert. Just write the audit here.
  await writeAudit(supabase, {
    action: "create",
    table_name: "payments",
    record_id: pay.id,
    new_values: paymentInsert,
  });

  // Send receipt email if member has email
  if (claim.claimed_by_member_id) {
    const { data: member } = await supabase
      .from("members")
      .select("name, email")
      .eq("id", claim.claimed_by_member_id)
      .maybeSingle();
    if (member?.email) {
      const tpl = paymentReceivedEmail({
        memberName: member.name ?? "there",
        amount: Number(claim.amount),
        mode: claim.payment_mode ?? "upi",
        invoiceNumber: claim.invoice_reference,
        reference: claim.upi_reference,
        receivedAt: paymentInsert.payment_date,
      });
      fireAndForgetEmail({ to: member.email, ...tpl });
    }
  }

  revalidatePath("/billing");
  revalidatePath(`/billing/${claim.matched_invoice_id}`);
  revalidatePath("/payments");
  return { ok: true };
}

export async function rejectPaymentClaim(claimId: string, reason: string) {
  const session = await requireStaffOrAdmin();
  if (!reason?.trim()) return { error: "Reason is required" };
  const supabase = createActionClient();
  const { error } = await supabase
    .from("payment_inbox_events")
    .update({
      status: "rejected",
      rejected_reason: reason.trim(),
      confirmed_by: session.user.id === "demo-user" ? null : session.user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", claimId);
  if (error) return { error: error.message };

  revalidatePath("/billing");
  return { ok: true };
}
