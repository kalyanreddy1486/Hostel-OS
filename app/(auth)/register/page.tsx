"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestSignupOtp,
  signUpAsHostelAdmin,
} from "@/app/actions/signup";

type Step = "details" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");

  // Step 1 fields
  const [hostelName, setHostelName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 fields
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Live Gmail-domain check
  const trimmedEmail = email.trim().toLowerCase();
  const gmailTypoRe =
    /@(gmial|gmaill|gmal|gnail|gmai|gmail\.con|gamil|googelmail)\.[a-z]{2,}$/i;
  const isGmailTypo = gmailTypoRe.test(trimmedEmail);
  const isGmail = /@gmail\.com$/i.test(trimmedEmail);
  const emailOk = isGmail && !isGmailTypo;

  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const fd = new FormData();
    fd.set("email", email);
    fd.set("hostel_name", hostelName);

    const res = await requestSignupOtp(fd);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setStep("verify");
    setInfo(`We sent a 6-digit code to ${email.trim().toLowerCase()}.`);
  }

  async function onResendOtp() {
    setLoading(true);
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("hostel_name", hostelName);
    const res = await requestSignupOtp(fd);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setInfo("New code sent. Check your inbox.");
  }

  async function onVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("hostel_name", hostelName);
    fd.set("admin_full_name", fullName);
    fd.set("admin_email", email);
    fd.set("admin_password", password);
    fd.set("otp", otp);

    const res = await signUpAsHostelAdmin(fd);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    // Auto sign-in
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (signError) {
      setError(
        `Account created but auto sign-in failed: ${signError.message}. Please sign in manually.`,
      );
      router.push(`/login?email=${encodeURIComponent(email)}`);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Get started
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {step === "details"
              ? "Open your hostel on HostelOS"
              : "Verify your Gmail"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === "details"
              ? "Step 1 of 2 — your hostel and admin details. We'll send a code to your Gmail to confirm it's really you."
              : "Step 2 of 2 — enter the code we just emailed. It expires in 10 minutes."}
          </p>
        </div>

        {error ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {info && step === "verify" ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{info}</span>
          </div>
        ) : null}

        {step === "details" ? (
          <form onSubmit={onRequestOtp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="hostelName">Hostel name</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hostelName"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Sunrise PG, Pune"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Your name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  required
                  minLength={2}
                  placeholder="Kalyan Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Gmail address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              {email.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Must be a Gmail address. We&apos;ll email a 6-digit code to
                  this inbox to verify it&apos;s really yours.
                </p>
              ) : isGmailTypo ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  That looks like a Gmail typo — did you mean{" "}
                  <span className="font-medium">@gmail.com</span>?
                </p>
              ) : !isGmail ? (
                <p className="text-xs text-muted-foreground">
                  Use your Gmail account — we&apos;ll send a verification code
                  there.
                </p>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Looks good — we&apos;ll send a code to this address.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full gap-2 text-sm font-medium"
              disabled={
                loading ||
                !emailOk ||
                hostelName.length < 2 ||
                fullName.length < 2 ||
                password.length < 8
              }
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                "Send verification code"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={onVerifyAndCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
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
                className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Sent to{" "}
                <span className="font-mono text-foreground">
                  {email.trim().toLowerCase()}
                </span>
                . Check spam/promotions if you don&apos;t see it.
              </p>
            </div>

            <Button
              type="submit"
              className="h-11 w-full gap-2 text-sm font-medium"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying & creating…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Verify & open my hostel
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setOtp("");
                  setError(null);
                  setInfo(null);
                }}
                className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                Change email
              </button>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={loading}
                className="text-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
