import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();
  const { data, error } = await supabase.rpc("get_dashboard_kpis");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ kpis: data });
}

