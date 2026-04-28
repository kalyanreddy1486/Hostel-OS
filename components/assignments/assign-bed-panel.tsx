"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignBedAction,
  markAssignmentInvoicePaid,
  sendAssignmentInvoiceEmail,
} from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FollowUp = {
  invoiceId: string;
  moveInDate: string;
  memberHasEmail: boolean;
};

export function AssignBedPanel({
  members,
  beds,
}: {
  members: { id: string; name: string }[];
  beds: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const moveInDate = String(fd.get("move_in_date") ?? "");
    start(async () => {
      const res = await assignBedAction(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (res.dateMatchesToday) {
        toast.success(
          res.emailSent ? "Bed assigned · payment email sent" : "Bed assigned",
        );
        form.reset();
        router.refresh();
        return;
      }
      if (!res.invoiceId) {
        toast.success("Bed assigned");
        form.reset();
        router.refresh();
        return;
      }
      toast.success("Bed assigned");
      form.reset();
      setFollowUp({
        invoiceId: res.invoiceId,
        moveInDate,
        memberHasEmail: res.memberHasEmail,
      });
    });
  }

  function closeFollowUp() {
    setFollowUp(null);
    router.refresh();
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
      closeFollowUp();
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
      closeFollowUp();
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
      <Dialog
        open={Boolean(followUp)}
        onOpenChange={(next) => {
          if (!next) closeFollowUp();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {followUp ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Bed assigned · what about the invoice?
                </DialogTitle>
                <DialogDescription>
                  Move-in date <strong>{followUp.moveInDate}</strong> isn&rsquo;t
                  today, so we haven&rsquo;t sent any email yet. Pick one:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={pending || !followUp.memberHasEmail}
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
                    {followUp.memberHasEmail
                      ? `UPI link + complaint link, dated ${followUp.moveInDate}. Includes "if already paid, please ignore".`
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
                    Records a cash payment for the full invoice amount and
                    marks it paid. Use this when rent for this cycle was
                    already settled offline.
                  </div>
                </button>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeFollowUp}
                  disabled={pending}
                >
                  Decide later
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
