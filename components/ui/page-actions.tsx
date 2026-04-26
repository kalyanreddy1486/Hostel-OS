import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageActions enforces the "one primary CTA per page" discipline.
 *
 * - `primary`: filled primary button. Max one per page.
 * - `secondary`: outline buttons. As many as needed but ideally ≤ 2.
 *
 * Pass an `eyebrow` color via the parent — the component itself doesn't decide.
 */
type Action = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export function PageActions({
  primary,
  secondary,
  className,
  invert,
}: {
  primary?: Action;
  secondary?: Action[];
  className?: string;
  /** When the parent has a dark background (hero card), invert the styling. */
  invert?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {(secondary ?? []).map((s) => {
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-all",
              invert
                ? "border-white/15 bg-white/5 text-white/90 backdrop-blur hover:bg-white/15"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {s.label}
          </Link>
        );
      })}
      {primary ? (
        <Link
          href={primary.href}
          className={cn(
            "group inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
            invert
              ? "bg-white text-primary ring-1 ring-black/5 hover:bg-white/95"
              : "bg-primary text-primary-foreground ring-1 ring-primary/20 hover:bg-primary/90",
          )}
        >
          {primary.icon ? <primary.icon className="size-3.5" /> : null}
          {primary.label}
        </Link>
      ) : null}
    </div>
  );
}
