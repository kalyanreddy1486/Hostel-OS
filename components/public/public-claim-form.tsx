"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPublicPaymentClaim } from "@/app/actions/public-claim";

export function PublicClaimForm({
  invoiceId,
  defaultAmount,
}: {
  invoiceId: string;
  defaultAmount: number;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  // Stays true after a successful submit so the button doesn't briefly
  // re-enable in the gap between the transition ending and the parent
  // re-rendering the "claim submitted" view.
  const [submitted, setSubmitted] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await submitPublicPaymentClaim(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setSubmitted(true);
      toast.success("Submitted. Admin will confirm shortly.");
      router.refresh();
    });
  }

  const disabled = pending || submitted;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />

      <div className="space-y-2">
        <Label htmlFor="payer_name">Your name *</Label>
        <Input
          id="payer_name"
          name="payer_name"
          required
          placeholder="Rahul Kumar"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room_no">Room no.</Label>
          <Input id="room_no" name="room_no" placeholder="e.g. 101" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount paid *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            required
            defaultValue={defaultAmount || ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="utr_reference">UTR / transaction reference *</Label>
        <Input
          id="utr_reference"
          name="utr_reference"
          required
          minLength={6}
          placeholder="e.g. 520045891234"
          inputMode="numeric"
        />
        <p className="text-xs text-muted-foreground">
          12-digit number shown in your UPI app after the payment succeeds.
          PhonePe labels it &quot;UPI Ref. ID&quot;, GPay calls it
          &quot;Google transaction ID&quot;.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment_mode">Payment mode</Label>
          <select
            id="payment_mode"
            name="payment_mode"
            defaultValue="upi"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paid_on">Paid on</Label>
          <Input id="paid_on" name="paid_on" type="date" defaultValue={today} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Anything else admin should know?" />
      </div>

      <Button type="submit" disabled={disabled} className="w-full">
        {submitted
          ? "Submitted ✓"
          : pending
          ? "Submitting…"
          : "Submit payment details"}
      </Button>
    </form>
  );
}
