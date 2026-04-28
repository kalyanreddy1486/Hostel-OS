"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  assignBedAction,
  markAssignmentInvoicePaid,
  sendAssignmentInvoiceEmail,
} from "@/app/actions/assignments";
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
type FollowUp = {
  invoiceId: string;
  moveInDate: string;
  memberHasEmail: boolean;
};

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
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
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

  function resetForm() {
    setFollowUp(null);
    setMode("monthly");
    setMoveIn(new Date().toISOString().slice(0, 10));
    setCheckout("");
    setRate("");
  }

  function closeAndRefresh() {
    setOpen(false);
    resetForm();
    router.refresh();
  }

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
      const baseMsg =
        mode === "daily"
          ? `Assigned to ${bedLabel} · invoice for ${days} day${days === 1 ? "" : "s"} created`
          : `Assigned to ${bedLabel}`;

      // Move-in is today → email already auto-sent by the server action.
      if (res.dateMatchesToday) {
        toast.success(
          res.emailSent ? `${baseMsg} · payment email sent` : baseMsg,
        );
        closeAndRefresh();
        return;
      }

      // Back-dated / future-dated assignment: ask the admin what to do.
      // If there's no invoice (e.g. monthly_rent ≤ deposit) there's nothing
      // to email or mark paid — just close.
      if (!res.invoiceId) {
        toast.success(baseMsg);
        closeAndRefresh();
        return;
      }

      toast.success(baseMsg);
      setFollowUp({
        invoiceId: res.invoiceId,
        moveInDate: moveIn,
        memberHasEmail: res.memberHasEmail,
      });
    });
  }

  function onSendEmail() {
    if (!followUp) return;
    start(async () => {
      const r = await sendAssignmentInvoiceEmail(followUp.invoiceId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Payment email sent");
      closeAndRefresh();
    });
  }

  function onMarkPaid() {
    if (!followUp) return;
    start(async () => {
      const r = await markAssignmentInvoicePaid(followUp.invoiceId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Invoice marked paid for this cycle");
      closeAndRefresh();
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Assign member</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {followUp ? (
          <FollowUpPanel
            moveInDate={followUp.moveInDate}
            memberHasEmail={followUp.memberHasEmail}
            pending={pending}
            onSendEmail={onSendEmail}
            onMarkPaid={onMarkPaid}
            onCancel={closeAndRefresh}
          />
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FollowUpPanel({
  moveInDate,
  memberHasEmail,
  pending,
  onSendEmail,
  onMarkPaid,
  onCancel,
}: {
  moveInDate: string;
  memberHasEmail: boolean;
  pending: boolean;
  onSendEmail: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Member assigned · what about the invoice?</DialogTitle>
        <DialogDescription>
          Move-in date <strong>{moveInDate}</strong> isn&rsquo;t today, so we
          haven&rsquo;t sent any email yet. Pick one:
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <button
          type="button"
          disabled={pending || !memberHasEmail}
          onClick={onSendEmail}
          className={cn(
            "w-full rounded-lg border px-4 py-3 text-left transition-colors",
            "hover:border-primary hover:bg-primary/5",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <div className="text-sm font-medium">
            Send the payment email now
          </div>
          <div className="text-xs text-muted-foreground">
            {memberHasEmail
              ? `UPI link + complaint link, dated ${moveInDate}. Includes "if already paid, please ignore".`
              : "This member has no email on file — add one in their profile to enable this."}
          </div>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onMarkPaid}
          className={cn(
            "w-full rounded-lg border px-4 py-3 text-left transition-colors",
            "hover:border-primary hover:bg-primary/5",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <div className="text-sm font-medium">
            Don&rsquo;t send · mark this cycle as paid
          </div>
          <div className="text-xs text-muted-foreground">
            Records a cash payment for the full invoice amount and marks it
            paid. Use this when rent for this cycle was already settled
            offline.
          </div>
        </button>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Decide later
        </Button>
      </DialogFooter>
    </>
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
