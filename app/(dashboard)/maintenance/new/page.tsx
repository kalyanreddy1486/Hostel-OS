import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { createTicket } from "@/app/actions/maintenance";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";

type RoomOption = { id: string; room_number: string };
type MemberOption = { id: string; name: string };

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: { room_id?: string; raised_by?: string };
}) {
  await requireStaffOrAdmin();

  const [roomsRes, membersRes] = await Promise.all([
    serverFetch("/api/rooms/summary", { cache: "no-store" }),
    serverFetch("/api/members?status=active", { cache: "no-store" }),
  ]);
  const roomsBody = (await roomsRes.json()) as
    | { rooms: RoomOption[] }
    | { error: string };
  const membersBody = (await membersRes.json()) as
    | { members: MemberOption[] }
    | { error: string };

  const rooms = "rooms" in roomsBody ? roomsBody.rooms : [];
  const members = "members" in membersBody ? membersBody.members : [];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New ticket</h1>
          <p className="text-muted-foreground">
            Log a maintenance issue against a room or member
          </p>
        </div>
        <Link
          href="/maintenance"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g. Leaking tap in bathroom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional details"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issue_type">Type</Label>
                <select
                  id="issue_type"
                  name="issue_type"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unspecified</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="furniture">Furniture</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="medium"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="room_id">Room</Label>
                <select
                  id="room_id"
                  name="room_id"
                  defaultValue={searchParams.room_id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raised_by">Raised by (member)</Label>
                <select
                  id="raised_by"
                  name="raised_by"
                  defaultValue={searchParams.raised_by ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Staff / system</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SubmitButton pendingLabel="Creating…">Create ticket</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
