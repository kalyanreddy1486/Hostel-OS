import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignBedPanel } from "@/components/assignments/assign-bed-panel";
import { createTenantClient } from "@/lib/backend/supabase";
import { PageHeading } from "@/components/ui/page-heading";

type ActiveAssignmentRow = {
  id: string;
  move_in_date: string | null;
  member: { id?: string; name?: string } | null;
  bed:
    | { bed_number?: string; room?: { room_number?: string } | null }
    | null
    | undefined;
};

export default async function AssignmentsPage() {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const [activeRes, membersRes, availableBedsRes] = await Promise.all([
    supabase
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
      .order("move_in_date", { ascending: false }),
    supabase
      .from("members")
      .select("id, name, status")
      .in("status", ["pending", "active"]),
    supabase
      .from("beds")
      .select("id, bed_number, room:rooms ( room_number )")
      .eq("status", "available")
      .order("bed_number"),
  ]);

  const err =
    activeRes.error?.message ??
    membersRes.error?.message ??
    availableBedsRes.error?.message;
  if (err) {
    return (
      <p className="text-destructive">Failed to load assignments: {err}</p>
    );
  }

  const active = (activeRes.data ?? []) as unknown as ActiveAssignmentRow[];
  const busy = new Set(
    active.map((a) => a.member?.id).filter(Boolean) as string[],
  );
  const assignCandidates = (
    (membersRes.data ?? []) as { id: string; name: string; status: string }[]
  ).filter((m) => m.status === "pending" || !busy.has(m.id));

  type AvailableBed = {
    id: string;
    bed_number: string;
    room: { room_number: string } | { room_number: string }[] | null;
  };
  const bedsOptions = ((availableBedsRes.data ?? []) as unknown as AvailableBed[]).map(
    (b) => {
      const room =
        b.room && Array.isArray(b.room)
          ? b.room[0]
          : (b.room as { room_number: string } | null);
      return {
        id: b.id,
        label: `Room ${room?.room_number ?? "?"} — bed ${b.bed_number}`,
      };
    },
  );

  const rows = active;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <PageHeading
        eyebrow="Occupancy"
        title="Assignments"
        description={`${rows.length} active bed assignment${rows.length === 1 ? "" : "s"}`}
      />

      <AssignBedPanel
        members={assignCandidates.map((m) => ({ id: m.id, name: m.name }))}
        beds={bedsOptions}
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Room / bed</TableHead>
              <TableHead>Move-in</TableHead>
              <TableHead className="text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => {
              const m = r.member as { id?: string; name?: string } | null;
              const b = r.bed as
                | { bed_number?: string; room?: { room_number?: string } }
                | null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                  <TableCell>
                    {b?.room?.room_number ?? "?"}/{b?.bed_number ?? "?"}
                  </TableCell>
                  <TableCell>{r.move_in_date}</TableCell>
                  <TableCell className="text-right">
                    {m?.id ? (
                      <Link
                        href={`/members/${m.id}`}
                        className="text-sm underline underline-offset-4"
                      >
                        Open
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows?.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No active assignments.
          </p>
        ) : null}
      </div>
    </div>
  );
}
