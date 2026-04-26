"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUpiSettings } from "@/app/actions/settings";

export function SettingsForm({
  initial,
}: {
  initial: {
    upi_vpa: string;
    upi_payee_name: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveUpiSettings(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="upi_vpa">UPI ID (your VPA)</Label>
        <Input
          id="upi_vpa"
          name="upi_vpa"
          placeholder="9876543210@okhdfcbank"
          defaultValue={initial.upi_vpa}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Find this in your UPI app under &quot;My UPI ID&quot;. Examples:{" "}
          <span className="font-mono">9876543210@okhdfcbank</span>,{" "}
          <span className="font-mono">rahul@ybl</span>,{" "}
          <span className="font-mono">8765432100@paytm</span>. Residents will
          enter this in their UPI app to pay.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upi_payee_name">Payee name (shown to resident)</Label>
        <Input
          id="upi_payee_name"
          name="upi_payee_name"
          required
          defaultValue={initial.upi_payee_name || "HostelOS"}
        />
        <p className="text-xs text-muted-foreground">
          The name your residents will see when they paste the UPI ID into
          their UPI app — make it recognizable (e.g. your hostel name).
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
