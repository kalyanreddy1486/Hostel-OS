"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { transferBedAction } from "@/app/actions/transfer-bed";

export type BedOption = {
  id: string;
  label: string;
};

export function TransferBedButton({
  memberId,
  memberName,
  currentBedLabel,
  availableBeds,
}: {
  memberId: string;
  memberName: string;
  currentBedLabel: string | null;
  availableBeds: BedOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  if (availableBeds.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled title="No other vacant beds">
        <ArrowRightLeft className="mr-1.5 size-3.5" />
        Transfer bed
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await transferBedAction(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${memberName} transferred`);
      setOpen(false);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="mr-1.5 size-3.5" />
        Transfer bed
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer {memberName}</DialogTitle>
            <DialogDescription>
              {currentBedLabel ? (
                <>
                  Moves them from <strong>{currentBedLabel}</strong> to a new
                  bed. Billing mode, deposit, and advance carry forward.
                </>
              ) : (
                <>Pick a new bed to transfer into.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="member_id" value={memberId} />
            <div className="space-y-2">
              <Label htmlFor={`bed-${memberId}`}>New bed *</Label>
              <select
                id={`bed-${memberId}`}
                name="new_bed_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`date-${memberId}`}>Effective date *</Label>
              <Input
                id={`date-${memberId}`}
                name="effective_date"
                type="date"
                required
                defaultValue={today}
              />
              <p className="text-xs text-muted-foreground">
                Old assignment closes on this date · new assignment starts same day.
              </p>
            </div>
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
                {pending ? "Transferring…" : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
