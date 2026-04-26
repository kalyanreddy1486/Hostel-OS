"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/motion";

/**
 * Empty state with personality.
 *
 * Anatomy:
 *   - decorative blob (saffron radial) behind a soft icon — gives a moment
 *     of "designed" feel even when there's no data
 *   - witty, specific title (caller's responsibility)
 *   - one clear next action (primary button)
 *   - optional secondary action shown as a quiet text-link
 *
 * `icon` is a ReactNode (already-rendered element) so callers can pass
 * `<Wrench className="size-6" />` from server components without tripping
 * the RSC "functions can't cross the boundary" check.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  tone = "default",
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: "default" | "celebrate";
  className?: string;
}) {
  const isCelebrate = tone === "celebrate";
  const renderedIcon =
    icon ??
    (isCelebrate ? <Sparkles className="size-6" strokeWidth={1.75} /> : null);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-dashed border-foreground/15 bg-card/40 px-6 py-16 text-center backdrop-blur-[1px]",
        className,
      )}
    >
      {/* Concentric saffron rings — gives the empty state a destination feel,
          like the icon is sitting at the centre of a target. Cheaper than
          an SVG illustration and works in both themes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 -z-10 -translate-x-1/2"
      >
        <div className="grid size-72 place-items-center">
          <div className="absolute size-72 rounded-full ring-1 ring-foreground/[0.04]" />
          <div className="absolute size-56 rounded-full ring-1 ring-foreground/[0.05]" />
          <div className="absolute size-40 rounded-full ring-1 ring-foreground/[0.06]" />
          <div
            className="absolute size-40 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--saffron) 40%, transparent), transparent 65%)",
            }}
          />
        </div>
      </div>

      {renderedIcon ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-white text-amber-700 shadow-[0_4px_12px_-4px_oklch(0.78_0.14_55_/_0.4)] ring-1 ring-amber-200/70 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent dark:text-amber-300 dark:shadow-[0_4px_16px_-4px_oklch(0.78_0.14_55_/_0.5)] dark:ring-amber-500/30"
        >
          {renderedIcon}
        </motion.div>
      ) : null}

      <h3 className="mt-5 font-display text-2xl italic tracking-tight">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {actionHref && actionLabel ? (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={actionHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "group/btn gap-1.5 shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--primary)_40%,transparent)]",
            )}
          >
            {actionLabel}
            <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
