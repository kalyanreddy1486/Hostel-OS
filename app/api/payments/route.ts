import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "").trim();
  const memberId = (url.searchParams.get("member_id") ?? "").trim();
  const invoiceId = (url.searchParams.get("invoice_id") ?? "").trim();

  const supabase = createTenantClient();
  let query = supabase
    .from("payments")
    .select(
      `
      id,
      amount,
      payment_date,
      payment_mode,
      transaction_reference,
      notes,
      invoice:invoices ( id, invoice_number, billing_month, total_amount ),
      member:members ( id, name, phone )
    `,
    )
    .order("payment_date", { ascending: false });

  if (mode) query = query.eq("payment_mode", mode);
  if (memberId) query = query.eq("member_id", memberId);
  if (invoiceId) query = query.eq("invoice_id", invoiceId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ payments: data ?? [] });
}
