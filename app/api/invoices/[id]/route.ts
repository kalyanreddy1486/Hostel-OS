import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
      *,
      member:members ( id, name, phone, email ),
      assignment:assignments (
        id,
        move_in_date,
        bed:beds ( bed_number, room:rooms ( room_number ) )
      )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_date, payment_mode, transaction_reference, notes",
    )
    .eq("invoice_id", params.id)
    .order("payment_date", { ascending: false });

  if (paymentsError) {
    return NextResponse.json({ error: paymentsError.message }, { status: 500 });
  }

  const paidTotal = (payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );
  const balance = Number(invoice.total_amount ?? 0) - paidTotal;

  return NextResponse.json({
    invoice,
    payments: payments ?? [],
    paid_total: paidTotal,
    balance,
  });
}
