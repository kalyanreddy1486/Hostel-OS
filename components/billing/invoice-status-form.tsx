"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateInvoiceStatus } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";

type Status = "pending" | "paid" | "overdue" | "partial";

export function InvoiceStatusForm({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Status>(status);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateInvoiceStatus(id, value);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Status updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as Status)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>
      <Button
        size="sm"
        onClick={save}
        disabled={pending || value === status}
        className="w-full"
      >
        {pending ? "Saving…" : "Save status"}
      </Button>
    </div>
  );
}
