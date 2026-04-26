"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function DeleteMemberButton({
  deleteAction,
}: {
  deleteAction: () => Promise<{ error?: string } | void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete member
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this member permanently?"
        description="Their assignments, invoices, payments, and extra charges will also be deleted. This cannot be undone."
        confirmText="Delete member"
        variant="destructive"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deleteAction();
            if (res && typeof res === "object" && "error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success("Member deleted");
            window.location.href = "/members";
          })
        }
      />
    </>
  );
}
