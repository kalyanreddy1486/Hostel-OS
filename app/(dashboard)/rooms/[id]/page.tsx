import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";
import { getSessionProfile } from "@/lib/auth";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { updateBedStatus } from "@/app/actions/rooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BedStatusForm } from "@/components/rooms/bed-status-form";
import { AssignBedButton } from "@/components/rooms/assign-bed-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function formatAmenity(a: string) {
  return a
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function RoomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaffOrAdmin();
  const session = await getSessionProfile();
  const isAdmin = session?.profile?.role === "admin";

  const supabase = createTenantClient();
  const [roomRes, bedsRes, memberRowsRes, activeAssignRes] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", params.id).single(),
    supabase
      .from("beds")
      .select(
        `
        id,
        bed_number,
        status,
        assignments (
          is_active,
          member:members ( id, name )
        )
      `,
      )
      .eq("room_id", params.id)
      .order("bed_number"),
    supabase
      .from("members")
      .select("id, name, status")
      .in("status", ["pending", "active"]),
    supabase.from("assignments").select("member_id").eq("is_active", true),
  ]);

  const { data: room, error } = roomRes;
  if (error || !room) notFound();

  const beds = bedsRes.data;
  const memberRows = memberRowsRes.data;
  const activeAssignments = activeAssignRes.data;

  const busyMemberIds = new Set(
    (activeAssignments ?? []).map((a) => a.member_id as string),
  );
  const eligibleMembers = ((memberRows ?? []) as {
    id: string;
    name: string;
    status: string;
  }[])
    .filter((m) => m.status === "pending" || !busyMemberIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/rooms"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon-sm" }),
            "mt-1",
          )}
          aria-label="Back to rooms"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Room
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Room {room.room_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{room.room_type ?? "—"}</span>
            {" · "}Floor {room.floor ?? "—"}
            {" · "}₹{Number(room.monthly_rent).toLocaleString("en-IN")}/mo
            {" · "}Capacity {room.capacity}
          </p>
        </div>
      </div>

      {(room.amenities?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {(room.amenities ?? []).map((a: string) => (
            <span
              key={a}
              className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {formatAmenity(a)}
            </span>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="size-4 text-muted-foreground" />
            Beds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(beds ?? []).map((bed) => {
            const assigns = bed.assignments as
              | { is_active?: boolean; member?: { id?: string; name?: string } }[]
              | null;
            const active = assigns?.find((a) => a.is_active);
            const occupant = active?.member?.name;
            const canAssign =
              isAdmin && !active && bed.status === "available";
            const canEditStatus = isAdmin && !active;
            return (
              <div
                key={bed.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card px-4 py-3.5 sm:grid sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">Bed {bed.bed_number}</p>
                    <StatusBadge status={bed.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {occupant ? (
                      <>
                        <Link
                          href={`/members/${active?.member?.id}`}
                          className="text-foreground underline underline-offset-4 hover:text-primary"
                        >
                          {occupant}
                        </Link>
                      </>
                    ) : (
                      "Vacant — ready to assign"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canAssign ? (
                    <AssignBedButton
                      bedId={bed.id}
                      bedLabel={`Room ${room.room_number} — bed ${bed.bed_number}`}
                      members={eligibleMembers}
                    />
                  ) : null}
                  {canEditStatus ? (
                    <BedStatusForm
                      bedId={bed.id}
                      current={bed.status}
                      action={updateBedStatus}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
