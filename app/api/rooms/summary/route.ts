import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();
  const { data, error } = await supabase
    .from("room_occupancy")
    .select(
      "id, room_number, room_type, floor, capacity, monthly_rent, amenities, total_beds, occupied_beds",
    )
    .order("room_number");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rooms: data ?? [] });
}

