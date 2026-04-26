"use client";

import * as React from "react";
import { motion } from "motion/react";
import { fadeUp, hoverLift } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * BentoStat — a flexible-size stat card built for asymmetric grid layouts.
 *
 * Variants:
 *   - "feature"   : large card with serif numeral, optional sparkline area
 *   - "compact"   : smaller card for the satellite cells
 */
type Variant = "feature" | "compact";

const accentBackgrounds: Record<string, string> = {
  default: "bg-gradient-to-br from-card to-muted/40",
  amber:
    "bg-gradient-to-br from-[#fff5dc] via-card to-card text-foreground",
  ink: "bg-gradient-to-br from-[#0e1828] to-[#1a2742] text-amber-50",
  cream:
    "bg-gradient-to-br from-[#fefaf3] to-card",
  sage: "bg-gradient-to-br from-emerald-50 to-card",
  rose: "bg-gradient-to-br from-rose-50 to-card",
};

export function BentoStat({
  label,
  value,
  hint,
  icon,
  accent = "default",
  variant = "compact",
  className,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: keyof typeof accentBackgrounds;
  variant?: Variant;
  className?: string;
  footer?: React.ReactNode;
}) {
  const isInk = accent === "ink";
  const labelColor = isInk
    ? "text-amber-200/85"
    : "text-foreground/65";

  return (
    <motion.div
      variants={fadeUp}
      {...hoverLift}
      className={cn(
        "group relative isolate flex flex-col justify-between overflow-hidden rounded-2xl border p-5 ring-1 ring-foreground/5 shadow-sm",
        accentBackgrounds[accent],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.18em]",
            labelColor,
          )}
        >
          {label}
        </span>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              isInk
                ? "bg-amber-300/15 text-amber-200"
                : "bg-foreground/5 text-foreground/70",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-6 font-display font-semibold leading-none tracking-[-0.025em]",
          variant === "feature"
            ? "text-[64px] sm:text-[80px]"
            : "text-[44px]",
          isInk ? "text-amber-50" : "text-foreground",
        )}
      >
        <span className="italic">{value}</span>
      </div>

      {hint ? (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            isInk ? "text-amber-100/70" : "text-foreground/65",
          )}
        >
          {hint}
        </p>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </motion.div>
  );
}
