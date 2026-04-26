"use client";

import * as React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTenant } from "@/app/actions/controller";

export function DeleteTenantButton({
  tenantId,
  hostelName,
  variant = "full",
  onDeleted,
}: {
  tenantId: string;
  hostelName: string;
  /** "full" = labelled button (detail page); "icon" = small trash icon (list row) */
  variant?: "full" | "icon";
  onDeleted?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [pending, start] = React.useTransition();
  const router = useRouter();

  const matches = confirmText.trim() === hostelName;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matches) return;
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await deleteTenant(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${hostelName} deleted.`);
      setOpen(false);
      onDeleted?.();
      router.replace("/controller");
      router.refresh();
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          aria-label={`Delete ${hostelName}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          Delete hostel
        </button>
      )}

      {open ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 text-foreground shadow-2xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => !pending && setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <header className="mb-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-xl tracking-tight">
                  Delete {hostelName}?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is permanent and cannot be undone.
                </p>
              </div>
            </header>

            {/* Inline styles override anything (browser extension, user
                stylesheet, weird inheritance) that's been mis-aligning the
                text. `textAlign: left` + `direction: ltr` + `whiteSpace:
                normal` + `wordBreak: break-word` together guarantee left-
                aligned, wrapping text regardless of cascade. No
                `overflow-hidden` so we don't clip anything ugly. */}
            <div
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              style={{ textAlign: "left", direction: "ltr" }}
            >
              <p
                className="mb-2 font-semibold"
                style={{ textAlign: "left", direction: "ltr" }}
              >
                What will happen:
              </p>
              {[
                "Every room, bed, member, assignment, invoice, payment, expense, and ticket for this hostel will be permanently deleted.",
                "The admin’s login account will be removed — they won’t be able to sign in again.",
                "Audit-log history for this tenant is wiped too.",
              ].map((line) => (
                <p
                  key={line}
                  className="mb-1 last:mb-0"
                  style={{
                    textAlign: "left",
                    direction: "ltr",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  • {line}
                </p>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <input type="hidden" name="tenant_id" value={tenantId} />
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs">
                  Type{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {hostelName}
                  </span>{" "}
                  to confirm
                </Label>
                <Input
                  id="confirm"
                  name="confirm"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder=""
                  className="font-mono"
                  autoComplete="off"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  {matches ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ Confirmation matches — Delete is enabled
                    </span>
                  ) : confirmText.length > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400">
                      Doesn&apos;t match yet — type the name above exactly
                    </span>
                  ) : (
                    <>The Delete button stays off until you type the hostel name above.</>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={!matches || pending}
                >
                  {pending ? "Deleting…" : "Delete permanently"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
