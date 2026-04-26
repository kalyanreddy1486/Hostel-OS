"use client";

import * as React from "react";
import Link from "next/link";
import { Snowflake, Filter, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RoomCard = {
  id: string;
  room_number: string;
  room_type: string | null;
  floor: number | null;
  capacity: number;
  monthly_rent: number;
  amenities: string[] | null;
  total_beds: number;
  occupied_beds: number;
};

type AcFilter = "all" | "ac" | "non_ac";
type AvailFilter = "all" | "available" | "partial" | "full";

function sharingLabel(capacity: number) {
  if (capacity === 1) return "Single";
  if (capacity === 2) return "2-sharing";
  if (capacity === 3) return "3-sharing";
  return `${capacity}-sharing`;
}

export function RoomsExplorer({ rooms }: { rooms: RoomCard[] }) {
  const [floor, setFloor] = React.useState<string>("all");
  const [sharing, setSharing] = React.useState<string>("all");
  const [ac, setAc] = React.useState<AcFilter>("all");
  const [avail, setAvail] = React.useState<AvailFilter>("all");

  // Derive the floor list from the data — sorted, deduped, "—" for null.
  const floors = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) set.add(r.floor == null ? "—" : String(r.floor));
    return Array.from(set).sort((a, b) => {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return Number(a) - Number(b);
    });
  }, [rooms]);

  // Derive the sharing options from the data so we never offer a capacity
  // the hostel doesn't actually have.
  const sharings = React.useMemo(() => {
    const set = new Set<number>();
    for (const r of rooms) set.add(r.capacity);
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filtered = React.useMemo(() => {
    return rooms.filter((r) => {
      if (floor !== "all") {
        const fLabel = r.floor == null ? "—" : String(r.floor);
        if (fLabel !== floor) return false;
      }
      if (sharing !== "all" && String(r.capacity) !== sharing) return false;
      if (ac !== "all") {
        const hasAc =
          Array.isArray(r.amenities) &&
          r.amenities.some((a) => a?.toLowerCase() === "ac");
        if (ac === "ac" && !hasAc) return false;
        if (ac === "non_ac" && hasAc) return false;
      }
      if (avail !== "all") {
        const total = r.total_beds ?? r.capacity;
        const occ = total ? (r.occupied_beds ?? 0) / total : 0;
        if (avail === "available" && occ !== 0) return false;
        if (avail === "partial" && (occ === 0 || occ >= 1)) return false;
        if (avail === "full" && occ < 1) return false;
      }
      return true;
    });
  }, [rooms, floor, sharing, ac, avail]);

  const anyActive =
    floor !== "all" || sharing !== "all" || ac !== "all" || avail !== "all";

  const reset = () => {
    setFloor("all");
    setSharing("all");
    setAc("all");
    setAvail("all");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Filter className="size-3.5" />
          Filters
        </span>

        <FilterChip label="Floor">
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="bg-transparent text-sm font-medium focus:outline-none"
            aria-label="Filter by floor"
          >
            <option value="all">All floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f === "—" ? "Unspecified" : `Floor ${f}`}
              </option>
            ))}
          </select>
        </FilterChip>

        <FilterChip label="Sharing">
          <select
            value={sharing}
            onChange={(e) => setSharing(e.target.value)}
            className="bg-transparent text-sm font-medium focus:outline-none"
            aria-label="Filter by sharing type"
          >
            <option value="all">Any sharing</option>
            {sharings.map((c) => (
              <option key={c} value={String(c)}>
                {sharingLabel(c)}
              </option>
            ))}
          </select>
        </FilterChip>

        <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
          <SegBtn
            active={ac === "all"}
            onClick={() => setAc("all")}
            label="All"
          />
          <SegBtn
            active={ac === "ac"}
            onClick={() => setAc("ac")}
            label={
              <span className="inline-flex items-center gap-1">
                <Snowflake className="size-3" />
                AC
              </span>
            }
          />
          <SegBtn
            active={ac === "non_ac"}
            onClick={() => setAc("non_ac")}
            label="Non-AC"
          />
        </div>

        <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
          <SegBtn
            active={avail === "all"}
            onClick={() => setAvail("all")}
            label="Any"
          />
          <SegBtn
            active={avail === "available"}
            onClick={() => setAvail("available")}
            label="Available"
          />
          <SegBtn
            active={avail === "partial"}
            onClick={() => setAvail("partial")}
            label="Partial"
          />
          <SegBtn
            active={avail === "full"}
            onClick={() => setAvail("full")}
            label="Full"
          />
        </div>

        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          {filtered.length} of {rooms.length} rooms
          {anyActive ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted"
            >
              <X className="size-3" />
              Clear
            </button>
          ) : null}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const total = r.total_beds ?? r.capacity;
          const occupied = r.occupied_beds ?? 0;
          const occ = total ? occupied / total : 0;
          const badgeVariant =
            occ >= 1 ? "default" : occ > 0 ? "secondary" : "outline";
          const hasAc =
            Array.isArray(r.amenities) &&
            r.amenities.some((a) => a?.toLowerCase() === "ac");
          return (
            <Link key={r.id} href={`/rooms/${r.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">
                      Room {r.room_number}
                    </CardTitle>
                    <Badge variant={badgeVariant}>
                      {occupied}/{total} beds
                    </Badge>
                  </div>
                  <CardDescription>
                    {r.room_type ?? "—"} · Floor {r.floor ?? "—"} · ₹
                    {r.monthly_rent}/mo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    {occ === 0
                      ? "All beds available"
                      : occ < 1
                        ? "Partially occupied"
                        : "Full"}
                  </div>
                  {hasAc ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      <Snowflake className="size-3" />
                      AC
                    </span>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {!filtered.length ? (
        <p className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No rooms match these filters.{" "}
          <button
            type="button"
            onClick={reset}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </p>
      ) : null}
    </>
  );
}

function FilterChip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </span>
  );
}

function SegBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm px-2.5 py-1 font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
