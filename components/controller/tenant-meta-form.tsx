"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { updateTenantMeta } from "@/app/actions/controller";

export function TenantMetaForm({
  tenantId,
  hostelName,
  status,
  notes,
}: {
  tenantId: string;
  hostelName: string;
  status: string;
  notes: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateTenantMeta(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Tenant updated.");
      // Refresh so the page heading + DeleteTenantButton's hostelName prop
      // reflect the new name.
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="tenant_id" value={tenantId} />

      <div className="space-y-1.5">
        <Label htmlFor="hostel_name" className="text-xs">
          Hostel name
        </Label>
        <Input
          id="hostel_name"
          name="hostel_name"
          required
          defaultValue={hostelName}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status" className="text-xs">
          Status
        </Label>
        <FormSelect id="status" name="status" defaultValue={status}>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </FormSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs">
          Internal notes
        </Label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={notes}
          maxLength={1000}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Anything you want to remember about this hostel."
        />
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
