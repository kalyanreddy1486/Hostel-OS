import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "").trim();
  const priority = (url.searchParams.get("priority") ?? "").trim();

  const supabase = createTenantClient();
  let query = supabase
    .from("maintenance_tickets")
    .select(
      `
      id,
      title,
      description,
      issue_type,
      priority,
      status,
      created_at,
      resolved_at,
      raised_by_name,
      raised_by_room_label,
      raised_by_phone,
      room:rooms ( id, room_number ),
      raised_by_member:members!maintenance_tickets_raised_by_fkey ( id, name ),
      assignee:profiles!maintenance_tickets_assigned_to_fkey ( id, full_name, role )
    `,
    )
    .order("created_at", { ascending: false });

  if (status && ["open", "in_progress", "resolved", "closed"].includes(status)) {
    query = query.eq("status", status);
  }
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    query = query.eq("priority", priority);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tickets: data ?? [] });
}
