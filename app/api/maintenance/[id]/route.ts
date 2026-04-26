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

  const { data: ticket, error } = await supabase
    .from("maintenance_tickets")
    .select(
      `
      *,
      room:rooms ( id, room_number ),
      raised_by_member:members!maintenance_tickets_raised_by_fkey ( id, name, phone ),
      assignee:profiles!maintenance_tickets_assigned_to_fkey ( id, full_name, role )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["admin", "staff"]);

  return NextResponse.json({ ticket, staff: staff ?? [] });
}
