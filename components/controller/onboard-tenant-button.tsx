"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardTenant } from "@/app/actions/controller";

export function OnboardTenantButton() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await onboardTenant(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Hostel onboarded. Share the credentials with the admin.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <Plus className="size-3.5" />
        Add hostel
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-12 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 text-foreground shadow-2xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <header className="mb-5">
              <h2 className="font-display text-xl tracking-tight">
                Onboard a new hostel
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll create the admin account and a fresh tenant. Share
                the password with them out-of-band.
              </p>
            </header>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hostel_name" className="text-xs">
                  Hostel name
                </Label>
                <Input
                  id="hostel_name"
                  name="hostel_name"
                  required
                  placeholder="e.g. Sunrise Boys' Hostel"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_full_name" className="text-xs">
                  Admin name
                </Label>
                <Input
                  id="admin_full_name"
                  name="admin_full_name"
                  required
                  placeholder="Owner / manager"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_email" className="text-xs">
                  Admin email
                </Label>
                <Input
                  id="admin_email"
                  name="admin_email"
                  type="email"
                  required
                  placeholder="owner@hostel.in"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin_password" className="text-xs">
                  Initial password
                </Label>
                <Input
                  id="admin_password"
                  name="admin_password"
                  type="text"
                  required
                  minLength={8}
                  placeholder="Min 8 chars — share with admin securely"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">
                  Notes (optional)
                </Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Anything you want to remember about this hostel."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Creating…" : "Create hostel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
