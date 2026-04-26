import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const memberId = (url.searchParams.get("member_id") ?? "").trim();
  const month = (url.searchParams.get("billing_month") ?? "").trim();

  const supabase = createTenantClient();
  let query = supabase
    .from("extra_charges")
    .select(
      `
      id,
      charge_date,
      billing_month,
      charge_type,
      description,
      amount,
      member:members ( id, name )
    `,
    )
    .order("charge_date", { ascending: false });

  if (memberId) query = query.eq("member_id", memberId);
  if (month) query = query.eq("billing_month", month);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ charges: data ?? [] });
}
