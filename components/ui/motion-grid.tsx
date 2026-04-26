"use client";

import * as React from "react";
import { motion } from "motion/react";
import { pageEnter, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * MotionGrid — drop-in replacement for any container whose children should
 * stagger fade-up on first paint. Children are wrapped in motion.div with
 * the `fadeUp` variant; the container itself uses `pageEnter`.
 *
 * Use cases:
 *   - rows of StatCards (the StatCard already declares `fadeUp` itself, so
 *     wrapping in MotionGrid alone gives the stagger effect)
 *   - a column of cards that should ripple in
 */
export function MotionGrid({
  className,
  children,
  staggered = true,
  as: Component = "div",
}: {
  className?: string;
  children: React.ReactNode;
  staggered?: boolean;
  as?: React.ElementType;
}) {
  if (!staggered) {
    return <Component className={className}>{children}</Component>;
  }
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * MotionItem — wrap any element to give it the standard fade-up entrance.
 * Use this when the child component doesn't already declare `fadeUp` itself.
 */
export function MotionItem({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className={cn(className)}>
      {children}
    </motion.div>
  );
}
