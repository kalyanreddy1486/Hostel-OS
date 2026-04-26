"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignBedAction } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string };
type BillingMode = "monthly" | "daily";

export function AssignBedButton({
  bedId,
  bedLabel,
  members,
}: {
  bedId: string;
  bedLabel: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<BillingMode>("monthly");
  const [moveIn, setMoveIn] = useState(new Date().toISOString().slice(0, 10));
  const [checkout, setCheckout] = useState("");
  const [rate, setRate] = useState<string>("");

  const days = (() => {
    if (mode !== "daily" || !moveIn || !checkout) return 0;
    const a = new Date(`${moveIn}T00:00:00Z`).getTime();
    const b = new Date(`${checkout}T00:00:00Z`).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
    return Math.round((b - a) / 86400000) + 1; // inclusive
  })();
  const total = days * Number(rate || 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("bed_id", bedId);
    fd.set("billing_mode", mode);
    start(async () => {
      const res = await assignBedAction(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "daily"
          ? `Assigned to ${bedLabel} · invoice for ${days} day${days === 1 ? "" : "s"} created`
          : `Assigned to ${bedLabel}`,
      );
      setOpen(false);
      router.refresh();
    });
  }

  if (members.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled title="No eligible members">
        Assign member
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Assign member</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {bedLabel}</DialogTitle>
          <DialogDescription>
            Pick a member, billing mode, and dates. The bed will be marked
            occupied.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="bed_id" value={bedId} />
          <input type="hidden" name="billing_mode" value={mode} />

          <div className="space-y-2">
            <Label htmlFor={`member-${bedId}`}>Member</Label>
            <select
              id={`member-${bedId}`}
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

          <div className="space-y-2">
            <Label>Billing mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === "monthly"}
                onClick={() => setMode("monthly")}
                title="Monthly"
                subtitle="Room's monthly rent"
              />
              <ModeButton
                active={mode === "daily"}
                onClick={() => setMode("daily")}
                title="Daily"
                subtitle="Per-day rate"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`date-${bedId}`}>
              {mode === "daily" ? "Joining date" : "Move-in date"}
            </Label>
            <Input
              id={`date-${bedId}`}
              name="move_in_date"
              type="date"
              required
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
            />
          </div>

          {mode === "daily" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`rate-${bedId}`}>Price per day *</Label>
                  <Input
                    id={`rate-${bedId}`}
                    name="daily_rate"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`checkout-${bedId}`}>Checkout date *</Label>
                  <Input
                    id={`checkout-${bedId}`}
                    name="expected_checkout_date"
                    type="date"
                    required
                    min={moveIn}
                    value={checkout}
                    onChange={(e) => setCheckout(e.target.value)}
                  />
                </div>
              </div>
              {days > 0 && Number(rate) > 0 ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <div className="font-medium">
                    {days} day{days === 1 ? "" : "s"} × ₹
                    {Number(rate).toLocaleString("en-IN")}{" "}
                    ={" "}
                    <span className="font-semibold">
                      ₹{total.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    An invoice for this amount will be created on assignment.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`deposit-${bedId}`}>Security deposit</Label>
                <Input
                  id={`deposit-${bedId}`}
                  name="security_deposit"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`advance-${bedId}`}>Advance paid</Label>
                <Input
                  id={`advance-${bedId}`}
                  name="advance_paid"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}
