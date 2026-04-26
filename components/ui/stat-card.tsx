"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/components/ui/card";
import { fadeUp, hoverLift } from "@/lib/motion";

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
    /** If true, an "up" direction is styled red (e.g. rising overdue) */
    negative?: boolean;
  };
  accent?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
  footer?: React.ReactNode;
};

/**
 * Accent recipe = tinted background + colored icon chip + subtle top gradient.
 * Deliberately generous on contrast so the cards read as "scannable KPIs",
 * not "polite grey tiles".
 */
const accentStyles: Record<
  NonNullable<StatCardProps["accent"]>,
  { card: string; chip: string; ring: string }
> = {
  default: {
    card: "bg-gradient-to-br from-card to-muted/30 ring-1 ring-foreground/5",
    chip: "bg-muted text-muted-foreground",
    ring: "",
  },
  success: {
    card: "bg-gradient-to-br from-emerald-50 to-card dark:from-emerald-500/10 dark:to-card ring-1 ring-emerald-500/20",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-50 to-card dark:from-amber-500/10 dark:to-card ring-1 ring-amber-500/20",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "",
  },
  destructive: {
    card: "bg-gradient-to-br from-rose-50 to-card dark:from-rose-500/10 dark:to-card ring-1 ring-rose-500/20",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "",
  },
  info: {
    card: "bg-gradient-to-br from-sky-50 to-card dark:from-sky-500/10 dark:to-card ring-1 ring-sky-500/20",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    ring: "",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  accent = "default",
  className,
  footer,
}: StatCardProps) {
  const style = accentStyles[accent];
  return (
    <motion.div
      variants={fadeUp}
      {...hoverLift}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-[0_8px_28px_-12px_rgb(0_0_0/0.18)]",
        style.card,
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          {icon ? (
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg",
                style.chip,
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-display text-[40px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
            {value}
          </div>
          {trend ? <TrendBadge {...trend} /> : null}
        </div>
        {hint ? (
          <p className="mt-2.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </motion.div>
  );
}

function TrendBadge({
  direction,
  label,
  negative,
}: NonNullable<StatCardProps["trend"]>) {
  const positive = negative ? direction === "down" : direction === "up";
  const flat = direction === "flat";
  const colour = flat
    ? "text-muted-foreground bg-muted"
    : positive
      ? "text-emerald-700 bg-emerald-500/15 dark:text-emerald-300"
      : "text-rose-700 bg-rose-500/15 dark:text-rose-300";
  const Icon = flat ? Minus : direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        colour,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
