import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { createTenantClient } from "@/lib/backend/supabase";
import {
  NewInvoiceForm,
  type InvoiceRoomOption,
} from "@/components/billing/new-invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { member_id?: string };
}) {
  await requireStaffOrAdmin();

  const supabase = createTenantClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "move_in_date, member:members!assignments_member_id_fkey ( id, name, status ), bed:beds!assignments_bed_id_fkey ( bed_number, room:rooms ( id, room_number, monthly_rent ) )",
    )
    .eq("is_active", true);

  // Group active-member assignments by room. With 700 members across 200
  // rooms, the old flat select was unusable — picking room first narrows
  // the member list to the 2-6 residents in that room.
  const roomMap = new Map<string, InvoiceRoomOption>();
  for (const a of assignments ?? []) {
    const row = a as unknown as {
      move_in_date: string | null;
      member: { id: string; name: string; status: string } | null;
      bed: {
        bed_number: string | null;
        room: {
          id: string | null;
          room_number: string | null;
          monthly_rent: number | null;
        } | null;
      } | null;
    };
    const member = Array.isArray(row.member) ? row.member[0] : row.member;
    const bed = Array.isArray(row.bed) ? row.bed[0] : row.bed;
    const room = bed && (Array.isArray(bed.room) ? bed.room[0] : bed.room);
    if (!member || member.status !== "active") continue;
    if (!room?.id || !room.room_number) continue;

    let entry = roomMap.get(room.id);
    if (!entry) {
      entry = {
        id: room.id,
        room_number: room.room_number,
        monthly_rent: Number(room.monthly_rent ?? 0),
        members: [],
      };
      roomMap.set(room.id, entry);
    }
    entry.members.push({
      id: member.id,
      name: member.name,
      bed_number: bed?.bed_number ?? null,
      move_in_date: row.move_in_date,
      monthly_rent: Number(room.monthly_rent ?? 0),
      room_label: `Room ${room.room_number}${bed?.bed_number ? ` / ${bed.bed_number}` : ""}`,
    });
  }

  const rooms: InvoiceRoomOption[] = Array.from(roomMap.values())
    .map((r) => ({
      ...r,
      members: r.members.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) =>
      a.room_number.localeCompare(b.room_number, undefined, { numeric: true }),
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
          <p className="text-muted-foreground">
            Rent, electricity, food, and other charges
          </p>
        </div>
        <Link
          href="/billing"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewInvoiceForm
            rooms={rooms}
            initialMemberId={searchParams.member_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
