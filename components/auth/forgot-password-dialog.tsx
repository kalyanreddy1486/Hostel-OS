"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
} from "@/app/actions/forgot-password";

type Step = "email" | "verify" | "done";

export function ForgotPasswordDialog({
  defaultEmail = "",
}: {
  defaultEmail?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("email");
  const [pending, start] = React.useTransition();

  const [email, setEmail] = React.useState(defaultEmail);
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  // Resend cooldown — prevents users from hammering the OTP endpoint.
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Portal mount — same trick as before, dialog DOM lives outside the
  // login form to avoid invalid nested-form submission hijacking.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndReset();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open) setEmail(defaultEmail);
  }, [open, defaultEmail]);

  function closeAndReset() {
    setOpen(false);
    setTimeout(() => {
      setStep("email");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPwd(false);
    }, 250);
  }

  function onRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestForgotPasswordOtp(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setStep("verify");
      setResendIn(30);
      toast.success(`Code sent to ${email.trim().toLowerCase()}`);
    });
  }

  function onResend() {
    if (resendIn > 0) return;
    const fd = new FormData();
    fd.set("email", email);
    start(async () => {
      const res = await requestForgotPasswordOtp(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setResendIn(30);
      toast.success("New code sent.");
    });
  }

  const passwordsMatch =
    newPassword.length >= 8 && newPassword === confirmPassword;

  function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    start(async () => {
      const res = await resetPasswordWithOtp(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setStep("done");
      toast.success("Password updated. Sign in with your new password.");
    });
  }

  const dialog = open ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pwd-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closeAndReset}
        className="absolute inset-0 bg-foreground/30 supports-[backdrop-filter]:backdrop-blur-sm"
      />

      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-t-2xl bg-card shadow-2xl ring-1 ring-foreground/10 sm:rounded-2xl",
          "animate-fade-in",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-foreground/[0.07] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2
                id="forgot-pwd-title"
                className="font-display text-lg tracking-tight"
              >
                {step === "done" ? "Password updated" : "Reset password"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === "email" &&
                  "Enter your account email and we'll send you a 6-digit code."}
                {step === "verify" &&
                  "Type the code we just emailed and choose a new password."}
                {step === "done" && "You can now sign in with your new password."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAndReset}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step 1 — email */}
        {step === "email" ? (
          <form onSubmit={onRequest} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Account email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="h-11 pl-10"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                If this email is on file, we&apos;ll send a 6-digit code. Codes
                expire in 10 minutes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeAndReset}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send code"
                )}
              </Button>
            </div>
          </form>
        ) : null}

        {/* Step 2 — OTP + new password */}
        {step === "verify" ? (
          <form onSubmit={onReset} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-otp">6-digit code</Label>
              <Input
                id="reset-otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="••••••"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 text-center font-mono text-xl tracking-[0.4em]"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Sent to{" "}
                <span className="font-mono text-foreground">
                  {email.trim().toLowerCase()}
                </span>
                . Check spam if you don&apos;t see it.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-new-pwd">New password</Label>
              <div className="relative">
                <Input
                  id="reset-new-pwd"
                  name="new_password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm-pwd">Confirm new password</Label>
              <Input
                id="reset-confirm-pwd"
                name="confirm_password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="font-mono"
              />
              {confirmPassword.length > 0 ? (
                <p
                  className={cn(
                    "text-[11px]",
                    passwordsMatch
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords don't match yet"}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Change email
                </button>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={pending || resendIn > 0}
                  className="text-foreground underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
              <Button
                type="submit"
                disabled={pending || otp.length !== 6 || !passwordsMatch}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </div>
          </form>
        ) : null}

        {/* Step 3 — done */}
        {step === "done" ? (
          <div className="px-5 py-7 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </span>
            <h3 className="mt-3 font-display text-lg italic">All set</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-pretty text-sm text-muted-foreground">
              Your password has been updated. Sign in below with your new
              password.
            </p>
            <Button type="button" className="mt-5" onClick={closeAndReset}>
              Got it
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Forgot password?
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
