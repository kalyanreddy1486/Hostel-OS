import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

type AssignmentMember = { id: string; name: string; status: string };
type AssignmentBed = { bed_number: string; room: { room_number: string } | null };
type ActiveAssignment = {
  id: string;
  move_in_date: string | null;
  is_active: boolean;
  member: AssignmentMember | null;
  bed: AssignmentBed | null;
};

type CandidateMember = { id: string; name: string; status: string };
type AvailableBed = {
  id: string;
  bed_number: string;
  room: { room_number: string } | { room_number: string }[] | null;
};

export async function GET() {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const { data: activeAssignments, error: activeError } = await supabase
    .from("assignments")
    .select(
      `
      id,
      move_in_date,
      is_active,
      member:members ( id, name, status ),
      bed:beds ( bed_number, room:rooms ( room_number ) )
    `,
    )
    .eq("is_active", true)
    .order("move_in_date", { ascending: false });

  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  const active = (activeAssignments ?? []) as unknown as ActiveAssignment[];

  const { data: memberRows, error: mError } = await supabase
    .from("members")
    .select("id, name, status")
    .in("status", ["pending", "active"]);

  if (mError) {
    return NextResponse.json({ error: mError.message }, { status: 500 });
  }

  const busy = new Set(active.map((a) => a.member?.id).filter(Boolean) as string[]);
  const assignCandidates =
    ((memberRows ?? []) as CandidateMember[]).filter(
      (m) => m.status === "pending" || !busy.has(m.id),
    ) ?? 
    [];

  const { data: availableBeds, error: bError } = await supabase
    .from("beds")
    .select(`id, bed_number, room:rooms ( room_number )`)
    .eq("status", "available")
    .order("bed_number");

  if (bError) {
    return NextResponse.json({ error: bError.message }, { status: 500 });
  }

  const bedsOptions =
    ((availableBeds ?? []) as unknown as AvailableBed[]).map((b) => {
      const room =
        b.room && Array.isArray(b.room) ? b.room[0] : (b.room as { room_number: string } | null);
      return {
      id: b.id,
      label: `Room ${room?.room_number ?? "?"} — bed ${b.bed_number}`,
      };
    }) ?? [];

  return NextResponse.json({
    active,
    candidates: assignCandidates,
    beds: bedsOptions,
  });
}

