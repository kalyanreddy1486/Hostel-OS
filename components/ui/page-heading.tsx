import * as React from "react";
import { cn } from "@/lib/utils";
import { SaffronUnderline } from "@/components/decor";

export function PageHeading({
  title,
  description,
  actions,
  className,
  eyebrow,
  variant = "default",
  italic = true,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
  variant?: "default" | "hero";
  /** Italic Fraunces title — default true. Pass false for proper-noun titles. */
  italic?: boolean;
}) {
  if (variant === "hero") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-900 p-6 text-primary-foreground shadow-elevation-2 texture-grain sm:p-8",
          className,
        )}
      >
        <div
          aria-hidden
          className="absolute -right-20 -top-20 size-80 rounded-full bg-[color-mix(in_oklab,var(--saffron)_40%,transparent)] blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/5 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-2xl space-y-2">
            {eyebrow ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/10 backdrop-blur">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="font-display text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">
              {italic ? <span className="italic">{title}</span> : title}
            </h1>
            {description ? (
              <p className="text-pretty text-sm/6 text-white/70">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </div>
    );
  }

  // Editorial default — bigger italic Fraunces, eyebrow chip, hand-drawn
  // saffron underline beneath. Used on every list page across the app.
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-6 border-b pb-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[44px]">
          {italic ? <span className="italic">{title}</span> : title}
          <span className="text-amber-600">.</span>
        </h1>
        <SaffronUnderline className="-mt-1 h-2 w-16 text-amber-500" />
        {description ? (
          <p className="max-w-2xl text-pretty pt-1 text-sm leading-relaxed text-foreground/75">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
