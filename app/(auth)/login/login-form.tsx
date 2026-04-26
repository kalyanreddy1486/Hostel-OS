"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default to "/" so the home page can route based on role (controller →
  // /controller, resident → /my-account, admin/staff → /dashboard).
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(friendlyAuthError(signError.message));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  function friendlyAuthError(raw: string): string {
    const m = raw.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid_credentials")) {
      return "That email and password don't match. Check both and try again.";
    }
    if (m.includes("email not confirmed")) {
      return "Please confirm your email before signing in. Check your inbox for the verification link.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return "Too many attempts. Please wait a minute before trying again.";
    }
    if (m.includes("network") || m.includes("fetch")) {
      return "Network problem. Check your connection and try again.";
    }
    if (m.includes("user not found")) {
      return "No account found with that email. Need to register?";
    }
    return "Couldn't sign you in. Please try again.";
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Welcome back
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Admin, staff, or resident — one login, all your hostel data.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@hostel.in"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <ForgotPasswordDialog defaultEmail={email} />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full gap-2 text-sm font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
