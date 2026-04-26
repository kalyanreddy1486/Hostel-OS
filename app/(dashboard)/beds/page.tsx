import Link from "next/link";
import { BedDouble, ArrowLeft } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";
import { getSessionProfile } from "@/lib/auth";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AssignBedButton } from "@/components/rooms/assign-bed-button";
import { cn } from "@/lib/utils";

type BedRow = {
  id: string;
  bed_number: string;
  status: string;
  room: {
    id: string;
    room_number: string;
    room_type: string | null;
    floor: number | null;
    monthly_rent: number | null;
  } | null;
  assignments: Array<{
    is_active: boolean;
    member: { id: string; name: string } | null;
  }> | null;
};

const STATUS_TABS = [
  { key: "available", label: "Vacant", description: "Ready to assign" },
  { key: "occupied", label: "Occupied", description: "Currently in use" },
  { key: "reserved", label: "Reserved", description: "Held for someone" },
  { key: "maintenance", label: "Maintenance", description: "Out of service" },
  { key: "all", label: "All beds", description: "Every bed in the hostel" },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]["key"];

function isStatusKey(v: unknown): v is StatusKey {
  return (
    typeof v === "string" &&
    (STATUS_TABS as readonly { key: string }[]).some((t) => t.key === v)
  );
}

export default async function BedsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireStaffOrAdmin();
  const session = await getSessionProfile();
  const isAdmin = session?.profile?.role === "admin";

  const status: StatusKey = isStatusKey(searchParams.status)
    ? searchParams.status
    : "available";

  const supabase = createTenantClient();
  const needEligibleMembers =
    isAdmin && (status === "available" || status === "all");

  // One round-trip for everything the page needs. Bed list is small
  // enough (< a few hundred rows in practice) that fetching all and
  // deriving tab counts + filter client-side is cheaper than a second
  // server round-trip.
  const [bedsRes, memberRowsRes, activeAssignRes] = await Promise.all([
    supabase
      .from("beds")
      .select(
        `
        id,
        bed_number,
        status,
        room:rooms ( id, room_number, room_type, floor, monthly_rent ),
        assignments ( is_active, member:members ( id, name ) )
      `,
      )
      .order("bed_number"),
    needEligibleMembers
      ? supabase
          .from("members")
          .select("id, name, status")
          .in("status", ["pending", "active"])
      : Promise.resolve({ data: [] as { id: string; name: string; status: string }[], error: null }),
    needEligibleMembers
      ? supabase.from("assignments").select("member_id").eq("is_active", true)
      : Promise.resolve({ data: [] as { member_id: string }[], error: null }),
  ]);

  const error = bedsRes.error;
  const allBeds = (bedsRes.data ?? []) as unknown as BedRow[];

  // Derive tab counts from the single bed list
  const totalByStatus: Record<string, number> = {};
  for (const b of allBeds) {
    totalByStatus[b.status] = (totalByStatus[b.status] ?? 0) + 1;
  }
  const totalAll = allBeds.length;

  const beds =
    status === "all" ? [...allBeds] : allBeds.filter((b) => b.status === status);

  // sort by room number, then bed number (numeric)
  beds.sort((a, b) => {
    const ra = Number(a.room?.room_number ?? 0);
    const rb = Number(b.room?.room_number ?? 0);
    if (ra !== rb) return ra - rb;
    return Number(a.bed_number) - Number(b.bed_number);
  });

  let eligibleMembers: { id: string; name: string }[] = [];
  if (needEligibleMembers) {
    const busyMemberIds = new Set(
      ((activeAssignRes.data ?? []) as { member_id: string }[]).map(
        (a) => a.member_id,
      ),
    );
    eligibleMembers = (
      (memberRowsRes.data ?? []) as {
        id: string;
        name: string;
        status: string;
      }[]
    )
      .filter((m) => m.status === "pending" || !busyMemberIds.has(m.id))
      .map((m) => ({ id: m.id, name: m.name }));
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Occupancy"
        title="Beds"
        description="Every bed in the hostel. Pick a status tab to narrow down — assign a member to a vacant bed right from here."
        actions={
          <PageActions
            secondary={[
              { label: "All rooms", href: "/rooms", icon: ArrowLeft },
            ]}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const count =
            t.key === "all" ? totalAll : totalByStatus[t.key] ?? 0;
          const active = status === t.key;
          return (
            <Link
              key={t.key}
              href={`/beds?status=${t.key}`}
              className={cn(
                "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <span className="font-medium">{t.label}</span>
              <span
                className={cn(
                  "tabular-nums text-xs",
                  active
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load beds: {error.message}
        </div>
      ) : null}

      {beds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <BedDouble className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                No beds in this view.
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {status === "available"
                  ? "Every bed is accounted for — hostel is fully taken."
                  : "Nothing matches this filter. Try another tab."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {STATUS_TABS.find((t) => t.key === status)?.label} beds
            </CardTitle>
            <CardDescription>
              {STATUS_TABS.find((t) => t.key === status)?.description} ·{" "}
              {beds.length} bed{beds.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {beds.map((bed) => {
              const active = bed.assignments?.find((a) => a.is_active);
              const occupant = active?.member?.name;
              const canAssign =
                isAdmin && !active && bed.status === "available";
              return (
                <div
                  key={bed.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/30"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/rooms/${bed.room?.id ?? ""}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        Room {bed.room?.room_number ?? "—"}
                      </Link>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium">
                        Bed {bed.bed_number}
                      </span>
                      <StatusBadge status={bed.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bed.room?.room_type ? (
                        <span className="capitalize">
                          {bed.room.room_type}
                        </span>
                      ) : null}
                      {bed.room?.floor != null
                        ? ` · Floor ${bed.room.floor}`
                        : ""}
                      {bed.room?.monthly_rent != null
                        ? ` · ₹${Number(bed.room.monthly_rent).toLocaleString(
                            "en-IN",
                          )}/mo`
                        : ""}
                      {occupant ? (
                        <>
                          {" · "}
                          <Link
                            href={`/members/${active?.member?.id}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {occupant}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {canAssign ? (
                    <AssignBedButton
                      bedId={bed.id}
                      bedLabel={`Room ${bed.room?.room_number ?? "?"} — bed ${bed.bed_number}`}
                      members={eligibleMembers}
                    />
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
