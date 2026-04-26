"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function CheckoutButton({
  checkoutAction,
}: {
  checkoutAction: () => Promise<{ error?: string; ok?: boolean } | void>;
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
        <LogOut className="size-4" />
        Check out
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Check this member out?"
        description="Their bed will be freed and their status will change to 'left'. Any active invoice stays with them."
        confirmText="Check out"
        variant="destructive"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await checkoutAction();
            if (res && typeof res === "object" && "error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success("Checked out");
            setOpen(false);
            window.location.reload();
          })
        }
      />
    </>
  );
}
