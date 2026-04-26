"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBackendClient } from "@/lib/backend/supabase";

// No auth — this is the public payment-claim endpoint residents hit from a
// WhatsApp link without logging in. We still:
//   • validate the invoice exists and isn't already paid
//   • reject duplicate UTRs for the same invoice
//   • log everything to payment_inbox_events for admin review
// The admin's manual confirmation is the actual security boundary.
const schema = z.object({
  invoice_id: z.string().uuid(),
  payer_name: z.string().trim().min(1).max(120),
  room_no: z.string().trim().max(40).optional(),
  amount: z.coerce.number().positive(),
  utr_reference: z.string().trim().min(6).max(40),
  payment_mode: z
    .enum(["upi", "bank_transfer", "cash", "card", "cheque", "other"])
    .default("upi"),
  paid_on: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function submitPublicPaymentClaim(formData: FormData) {
  const parsed = schema.safeParse({
    invoice_id: formData.get("invoice_id"),
    payer_name: formData.get("payer_name"),
    room_no: (formData.get("room_no") as string) || undefined,
    amount: formData.get("amount"),
    utr_reference: formData.get("utr_reference"),
    payment_mode: (formData.get("payment_mode") as string) || "upi",
    paid_on: (formData.get("paid_on") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const v = parsed.data;
  const supabase = createBackendClient();

  // Verify invoice
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, member_id, total_amount, invoice_number, status, tenant_id")
    .eq("id", v.invoice_id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "paid") {
    return { error: "This invoice is already marked paid." };
  }

  // Reject obviously inflated claims. We allow up to 110% of invoice total
  // (handles odd UPI rounding, late-fee buffers) and any non-zero positive
  // amount below — admin still confirms manually, but this stops noise like
  // ₹99,99,999 typos and trolls submitting absurd amounts.
  const invoiceTotal = Number(invoice.total_amount ?? 0);
  if (invoiceTotal > 0 && v.amount > invoiceTotal * 1.1) {
    return {
      error: `Amount looks too high for this invoice (₹${invoiceTotal.toLocaleString("en-IN")}). Double-check what you paid.`,
    };
  }

  // Duplicate UTR guard (same invoice, same UTR, not rejected). Tenant-
  // scope so a UTR string used on a different hostel's invoice doesn't
  // false-positive here. Two residents at different hostels could
  // legitimately have the same UTR if their UPI apps assign similar
  // short references.
  const { data: existing } = await supabase
    .from("payment_inbox_events")
    .select("id")
    .eq("tenant_id", invoice.tenant_id)
    .eq("matched_invoice_id", v.invoice_id)
    .eq("upi_reference", v.utr_reference)
    .neq("status", "rejected")
    .maybeSingle();
  if (existing) {
    return { error: "A claim with this UTR was already submitted." };
  }

  const notesLine = [
    v.room_no ? `Room: ${v.room_no}` : null,
    v.paid_on ? `Paid on: ${v.paid_on}` : null,
    v.notes ? `Note: ${v.notes}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const { error: insertErr } = await supabase
    .from("payment_inbox_events")
    .insert({
      source: "public_claim",
      amount: v.amount,
      upi_reference: v.utr_reference,
      invoice_reference: invoice.invoice_number,
      payer_name: v.payer_name,
      matched_invoice_id: v.invoice_id,
      claimed_by_member_id: invoice.member_id,
      payment_mode: v.payment_mode,
      status: "needs_review",
      raw_body: notesLine || null,
      // Multi-tenant: stamp the invoice's tenant so RLS scopes correctly.
      // Anon callers don't have an auth.uid() for the auto-stamp trigger.
      tenant_id: invoice.tenant_id,
    });
  if (insertErr) return { error: insertErr.message };

  revalidatePath("/billing");
  return { ok: true };
}
