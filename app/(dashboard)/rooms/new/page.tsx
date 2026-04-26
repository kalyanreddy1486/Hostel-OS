import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createRoom } from "@/app/actions/rooms";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

const AMENITIES = ["AC", "attached_bathroom", "wifi", "wardrobe", "geyser"];

export default async function NewRoomPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New room</h1>
          <p className="text-muted-foreground">
            Beds are created automatically from capacity
          </p>
        </div>
        <Link
          href="/rooms"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room number *</Label>
              <Input id="room_number" name="room_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_type">Type *</Label>
              <select
                id="room_type"
                name="room_type"
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue="double"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dormitory">Dormitory</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input id="floor" name="floor" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (beds) *</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={2}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_rent">Monthly rent (₹) *</Label>
              <Input
                id="monthly_rent"
                name="monthly_rent"
                type="number"
                min={0}
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Amenities</span>
              <div className="flex flex-wrap gap-3">
                {AMENITIES.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="amenities" value={a} />
                    <span className="capitalize">{a.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
            <SubmitButton pendingLabel="Creating…">Create room & beds</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
