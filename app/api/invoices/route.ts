import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "").trim();
  const billingMonth = (url.searchParams.get("billing_month") ?? "").trim();
  const memberId = (url.searchParams.get("member_id") ?? "").trim();

  const supabase = createTenantClient();
  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      billing_month,
      due_date,
      status,
      rent_amount,
      electricity_amount,
      food_amount,
      extra_charges,
      late_fee,
      total_amount,
      created_at,
      member:members ( id, name, phone, email )
    `,
    )
    .order("created_at", { ascending: false });

  if (status && ["pending", "paid", "overdue", "partial"].includes(status)) {
    query = query.eq("status", status);
  }
  if (billingMonth) {
    query = query.eq("billing_month", billingMonth);
  }
  if (memberId) {
    query = query.eq("member_id", memberId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoices: data ?? [] });
}
