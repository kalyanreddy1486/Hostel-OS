"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeTenantAdminEmail,
  resetTenantAdminPassword,
} from "@/app/actions/controller";

export function TenantAdminForms({
  userId,
  currentEmail,
}: {
  userId: string;
  currentEmail: string;
}) {
  const router = useRouter();
  const [emailPending, startEmail] = React.useTransition();
  const [pwPending, startPw] = React.useTransition();
  const [showPw, setShowPw] = React.useState(false);

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startEmail(async () => {
      const res = await changeTenantAdminEmail(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Email updated. Admin must use the new email next sign-in.");
      // Refresh so the "Current email" panel above this form re-renders.
      router.refresh();
    });
  }

  function onPwSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startPw(async () => {
      const res = await resetTenantAdminPassword(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated.");
      form.reset();
      setShowPw(false);
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onEmailSubmit} className="space-y-2">
        <input type="hidden" name="user_id" value={userId} />
        <Label htmlFor="new_email" className="text-xs">
          Change email
        </Label>
        <div className="flex gap-2">
          <Input
            id="new_email"
            name="email"
            type="email"
            required
            defaultValue={currentEmail}
            placeholder="admin@hostel.in"
          />
          <Button type="submit" size="sm" disabled={emailPending}>
            {emailPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <form
        onSubmit={onPwSubmit}
        className="space-y-2 border-t pt-4"
      >
        <input type="hidden" name="user_id" value={userId} />
        <Label htmlFor="new_password" className="text-xs">
          Reset password
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="new_password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="pr-9 font-mono"
              autoComplete="new-password"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button type="submit" size="sm" variant="secondary" disabled={pwPending}>
            {pwPending ? "Saving…" : "Reset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
