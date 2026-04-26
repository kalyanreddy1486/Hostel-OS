"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type Show = { current: boolean; next: boolean; confirm: boolean };

export function PasswordChangeForm() {
  const [pending, start] = React.useTransition();
  const [show, setShow] = React.useState<Show>({
    current: false,
    next: false,
    confirm: false,
  });
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Live strength heuristic — length + variety. Cheap and useful, no zxcvbn.
  const strength = React.useMemo(() => scorePassword(next), [next]);
  const matches = next.length > 0 && next === confirm;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await changePassword(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Password changed.");
      formRef.current?.reset();
      setNext("");
      setConfirm("");
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <Field
        id="current_password"
        label="Current password"
        autoComplete="current-password"
        show={show.current}
        onToggleShow={() =>
          setShow((s) => ({ ...s, current: !s.current }))
        }
      />

      <div className="space-y-2">
        <Field
          id="new_password"
          label="New password"
          autoComplete="new-password"
          show={show.next}
          value={next}
          onChange={(v) => setNext(v)}
          onToggleShow={() => setShow((s) => ({ ...s, next: !s.next }))}
        />
        {next.length > 0 ? (
          <StrengthMeter score={strength.score} label={strength.label} />
        ) : null}
      </div>

      <div className="space-y-2">
        <Field
          id="confirm_password"
          label="Confirm new password"
          autoComplete="new-password"
          show={show.confirm}
          value={confirm}
          onChange={(v) => setConfirm(v)}
          onToggleShow={() =>
            setShow((s) => ({ ...s, confirm: !s.confirm }))
          }
        />
        {confirm.length > 0 ? (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              matches
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {matches ? (
              <>
                <Check className="size-3" />
                Passwords match
              </>
            ) : (
              "Passwords don't match yet"
            )}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 translate-y-px" />
          You&apos;ll stay signed in on this device after changing.
        </p>
        <Button
          type="submit"
          disabled={
            pending || next.length < 8 || !matches || strength.score < 2
          }
        >
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  show,
  onToggleShow,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={id === "current_password" ? 1 : 8}
          maxLength={72}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="pr-10 font-mono"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {show ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function StrengthMeter({ score, label }: { score: number; label: string }) {
  // 4 segments; first N filled by score (1..4)
  const segments = [0, 1, 2, 3];
  const colors = [
    "bg-rose-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {segments.map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted transition-colors",
              i < score && colors[score - 1],
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Strength: <span className="text-foreground">{label}</span>
      </p>
    </div>
  );
}

function scorePassword(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "—" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  s = Math.min(s, 4);
  const label =
    s === 0
      ? "too short"
      : s === 1
        ? "weak"
        : s === 2
          ? "okay"
          : s === 3
            ? "strong"
            : "very strong";
  return { score: s, label };
}
