"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmPaymentClaim,
  rejectPaymentClaim,
} from "@/app/actions/payment-claims";

export function ClaimConfirmButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const onClick = () => {
    start(async () => {
      const res = await confirmPaymentClaim(id);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment confirmed");
      router.refresh();
    });
  };
  return (
    <Button size="sm" onClick={onClick} disabled={pending}>
      <CheckCircle2 className="mr-1.5 size-3.5" />
      {pending ? "Confirming…" : "Confirm"}
    </Button>
  );
}

export function ClaimRejectButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, start] = React.useTransition();

  const onReject = () => {
    start(async () => {
      const res = await rejectPaymentClaim(id, reason);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Claim rejected");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <XCircle className="mr-1.5 size-3.5" />
        Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject payment claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject_reason">
              Reason (visible to the resident)
            </Label>
            <Input
              id="reject_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., No matching credit in bank"
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              type="button"
              disabled={pending || !reason.trim()}
              onClick={onReject}
            >
              {pending ? "Rejecting…" : "Reject claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
