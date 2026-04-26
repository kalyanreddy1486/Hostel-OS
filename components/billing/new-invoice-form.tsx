"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoice } from "@/app/actions/invoices";

export type InvoiceMemberOption = {
  id: string;
  name: string;
  bed_number: string | null;
  monthly_rent: number;
  move_in_date: string | null;
  room_label: string | null;
};

export type InvoiceRoomOption = {
  id: string;
  room_number: string;
  monthly_rent: number;
  members: InvoiceMemberOption[];
};

function clampDayToMonth(yyyyMm: string, day: number): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${yyyyMm}-${String(safeDay).padStart(2, "0")}`;
}

function currentCycleDate(moveInDate: string | null): string {
  const today = new Date();
  const yyyyMm = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  if (!moveInDate) return `${yyyyMm}-01`;
  const day = Number(moveInDate.slice(8, 10));
  if (!Number.isInteger(day) || day < 1) return `${yyyyMm}-01`;
  return clampDayToMonth(yyyyMm, day);
}

export function NewInvoiceForm({
  rooms,
  initialMemberId,
}: {
  rooms: InvoiceRoomOption[];
  initialMemberId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // If we were deep-linked to a specific member (from /members/[id] →
  // "Bill this member"), figure out which room they live in so we can
  // pre-select both dropdowns.
  const initialRoomId = React.useMemo(() => {
    if (!initialMemberId) return "";
    const room = rooms.find((r) =>
      r.members.some((m) => m.id === initialMemberId),
    );
    return room?.id ?? "";
  }, [rooms, initialMemberId]);

  const [roomId, setRoomId] = React.useState<string>(initialRoomId);
  const [memberId, setMemberId] = React.useState<string>(initialMemberId ?? "");

  const selectedRoom = React.useMemo(
    () => rooms.find((r) => r.id === roomId) ?? null,
    [rooms, roomId],
  );

  const roomMembers = selectedRoom?.members ?? [];

  const selected = React.useMemo(
    () => roomMembers.find((m) => m.id === memberId) ?? null,
    [roomMembers, memberId],
  );

  const defaultCycle = React.useMemo(
    () => currentCycleDate(selected?.move_in_date ?? null),
    [selected?.move_in_date],
  );

  const [billingMonth, setBillingMonth] = React.useState(defaultCycle);
  const [dueDate, setDueDate] = React.useState(defaultCycle);
  const [rent, setRent] = React.useState<number | "">(
    selected?.monthly_rent ?? "",
  );

  // When room changes, reset member; if the room has only one resident,
  // pre-select them (saves a click for 2-share rooms with only one tenant).
  React.useEffect(() => {
    if (!selectedRoom) return;
    if (selectedRoom.members.length === 1) {
      setMemberId(selectedRoom.members[0].id);
    } else if (
      memberId &&
      !selectedRoom.members.some((m) => m.id === memberId)
    ) {
      // Clear stale member id when switching rooms
      setMemberId("");
    }
    // Note: intentionally don't add memberId to deps — we only react to
    // room changes, not to member changes within a room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // When member changes, recompute defaults.
  React.useEffect(() => {
    const cycle = currentCycleDate(selected?.move_in_date ?? null);
    setBillingMonth(cycle);
    setDueDate(cycle);
    setRent(selected?.monthly_rent ?? "");
  }, [selected?.id, selected?.move_in_date, selected?.monthly_rent]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createInvoice(fd);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create invoice";
        // Next.js server actions throw a redirect on success; that shows as a
        // message like NEXT_REDIRECT — swallow it.
        if (!/NEXT_REDIRECT/.test(msg)) {
          toast.error(msg);
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room_id">Room *</Label>
          <select
            id="room_id"
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.room_number} · {r.members.length} resident
                {r.members.length === 1 ? "" : "s"}
                {r.monthly_rent > 0
                  ? ` · ₹${r.monthly_rent.toLocaleString("en-IN")}/mo`
                  : ""}
              </option>
            ))}
          </select>
          {!rooms.length ? (
            <p className="text-xs text-muted-foreground">
              No occupied rooms yet — assign a member to a bed first.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="member_id">Member *</Label>
          <select
            id="member_id"
            name="member_id"
            required
            disabled={!selectedRoom}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {selectedRoom ? "Select member…" : "Pick a room first"}
            </option>
            {roomMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.bed_number ? ` · Bed ${m.bed_number}` : ""}
              </option>
            ))}
          </select>
          {selectedRoom && roomMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active residents in this room.
            </p>
          ) : null}
          {selected?.move_in_date ? (
            <p className="text-xs text-muted-foreground">
              Joined {selected.move_in_date} · billing day:{" "}
              {selected.move_in_date.slice(8, 10)} of each month
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing_month">Billing month *</Label>
          <Input
            id="billing_month"
            name="billing_month"
            type="date"
            required
            value={billingMonth}
            onChange={(e) => {
              setBillingMonth(e.target.value);
              setDueDate(e.target.value);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Cycle start date. Same as the resident&apos;s billing anniversary.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice_number">Invoice number</Label>
        <Input id="invoice_number" name="invoice_number" placeholder="Auto if empty" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rent_amount">Rent *</Label>
          <Input
            id="rent_amount"
            name="rent_amount"
            type="number"
            min={0}
            step="0.01"
            required
            value={rent}
            onChange={(e) =>
              setRent(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          {selected && selected.monthly_rent > 0 ? (
            <p className="text-xs text-muted-foreground">
              Room rent: ₹{selected.monthly_rent.toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="electricity_amount">Electricity</Label>
          <Input
            id="electricity_amount"
            name="electricity_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="food_amount">Food</Label>
          <Input
            id="food_amount"
            name="food_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="extra_charges">Extra charges</Label>
          <Input
            id="extra_charges"
            name="extra_charges"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="late_fee">Late fee</Label>
          <Input
            id="late_fee"
            name="late_fee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="pending"
          >
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}
