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

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: assignments, error: aError } = await supabase
    .from("assignments")
    .select(
      `
      id,
      is_active,
      move_in_date,
      move_out_date,
      bed:beds (
        bed_number,
        room:rooms ( room_number, monthly_rent )
      )
    `,
    )
    .eq("member_id", params.id)
    .order("created_at", { ascending: false });

  if (aError) {
    return NextResponse.json({ error: aError.message }, { status: 500 });
  }

  return NextResponse.json({ member, assignments: assignments ?? [] });
}

