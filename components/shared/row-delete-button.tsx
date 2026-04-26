"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function RowDeleteButton({
  action,
  id,
  label,
  confirmTitle = "Delete this item?",
  confirmDescription = "This can't be undone.",
  success = "Deleted",
}: {
  action: (id: string) => Promise<{ error?: string; ok?: boolean } | void>;
  id: string;
  label?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  success?: string;
  /** @deprecated use confirmTitle + confirmDescription */
  confirm?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={label ?? "Delete"}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await action(id);
            if (res && typeof res === "object" && "error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success(success);
            setOpen(false);
            // router.refresh keeps scroll position + in-page state instead
            // of doing a full white-flash reload.
            router.refresh();
          })
        }
      />
    </>
  );
}
