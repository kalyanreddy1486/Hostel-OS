import { Plus } from "lucide-react";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { getSessionProfile } from "@/lib/auth";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import { serverFetch } from "@/lib/server/origin";
import {
  RoomsExplorer,
  type RoomCard,
} from "@/components/rooms/rooms-explorer";

export default async function RoomsPage() {
  await requireStaffOrAdmin();
  const session = await getSessionProfile();
  const isAdmin = session?.profile?.role === "admin";
  const res = await serverFetch("/api/rooms/summary", {
    cache: "no-store",
  });
  const body = (await res.json()) as
    | { rooms: RoomCard[] }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load rooms: {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const rooms = body.rooms;

  const occupiedTotal = rooms.reduce((s, r) => s + (r.occupied_beds ?? 0), 0);
  const bedsTotal = rooms.reduce((s, r) => s + (r.total_beds ?? r.capacity), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Occupancy"
        title="Rooms"
        description={
          rooms.length
            ? `${rooms.length} rooms · ${occupiedTotal} of ${bedsTotal} beds occupied`
            : "Capacity and occupancy by room"
        }
        actions={
          isAdmin ? (
            <PageActions
              primary={{ label: "Add room", href: "/rooms/new", icon: Plus }}
            />
          ) : null
        }
      />

      {rooms.length ? (
        <RoomsExplorer rooms={rooms} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No rooms yet. Add your first room to create beds automatically.
        </p>
      )}
    </div>
  );
}
