"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { assignBedAction } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssignBedPanel({
  members,
  beds,
}: {
  members: { id: string; name: string }[];
  beds: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await assignBedAction(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Bed assigned");
      form.reset();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign bed</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="member_id">Member</Label>
            <select
              id="member_id"
              name="member_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="bed_id">Bed</Label>
            <select
              id="bed_id"
              name="bed_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select…</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="move_in_date">Move-in date</Label>
            <Input
              id="move_in_date"
              name="move_in_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="security_deposit">Security deposit</Label>
            <Input
              id="security_deposit"
              name="security_deposit"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advance_paid">Advance paid</Label>
            <Input
              id="advance_paid"
              name="advance_paid"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Assign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
