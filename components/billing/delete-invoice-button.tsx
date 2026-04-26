"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function DeleteInvoiceButton({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete invoice
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this invoice?"
        description="Recorded payments against it will remain but will be orphaned. This cannot be undone."
        confirmText="Delete invoice"
        variant="destructive"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteInvoice(id);
            if (res && typeof res === "object" && "error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success("Invoice deleted");
            window.location.href = "/billing";
          })
        }
      />
    </>
  );
}
