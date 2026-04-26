"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ease } from "@/lib/motion";
import { SaffronUnderline, ChapterMark, PaperGrain } from "@/components/decor";

/**
 * Editorial Hero — magazine spread feel.
 *
 * - Massive italic Fraunces title
 * - Eyebrow with chapter mark (No. 01) + date + greeting
 * - Saffron arc behind the headline
 * - Hand-drawn underline accent
 * - Paper-grain texture for warmth
 */
export function EditorialHero({
  greeting,
  date,
  title = "Today",
  subtitle,
  actions,
}: {
  greeting: string;
  date: string;
  title?: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border bg-gradient-to-br from-[#fffbf3] via-card to-[#fef6e7] px-6 py-10 sm:px-10 sm:py-12">
      <PaperGrain />

      {/* Slowly-rotating saffron arc behind the headline */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 -z-10 hidden sm:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <AnimatedArc />
      </motion.div>

      {/* Subtle floating dot pulse behind, additional ambient motion */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-32 top-16 -z-10 hidden size-3 rounded-full bg-amber-400/60 sm:block"
        animate={{ y: [0, -8, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-24 top-40 -z-10 hidden size-1.5 rounded-full bg-amber-500/50 sm:block"
        animate={{ y: [0, 6, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-8">
        <div className="min-w-0 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease }}
            className="flex items-center gap-3"
          >
            <ChapterMark number={1} />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
              {date} · {greeting}
            </span>
          </motion.div>

          <h1
            className="mt-4 font-display text-[68px] font-semibold leading-[0.95] tracking-[-0.025em] text-foreground sm:text-[88px]"
            aria-label={title}
          >
            <SplitText text={title} className="italic" />
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease, delay: 0.6 + title.length * 0.05 }}
              className="inline-block text-amber-600"
            >
              .
            </motion.span>
          </h1>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 96 }}
            transition={{ duration: 0.6, ease, delay: 0.8 + title.length * 0.05 }}
            className="mt-3 overflow-hidden"
          >
            <SaffronUnderline className="h-2 w-24 text-amber-500" />
          </motion.div>

          {/*
            Subtitle is the largest text element on the page, so it dominates LCP.
            We render it immediately (no opacity fade) and only animate a small
            slide-in. Without this, LCP was ~2.2s waiting for the opacity tween.
          */}
          <motion.p
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mt-5 max-w-md text-base leading-relaxed text-foreground/75"
          >
            {subtitle}
          </motion.p>
        </div>

        {actions ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 1.1 }}
            className="flex flex-wrap gap-2"
          >
            {actions}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * SplitText — animates each character independently. Looks expensive but is
 * a single staggered transform per glyph.
 */
function SplitText({
  text,
  className = "",
}: { text: string; className?: string }) {
  const chars = Array.from(text);
  return (
    <span className={`inline-block ${className}`}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{
            duration: 0.55,
            ease,
            delay: 0.15 + i * 0.05,
          }}
          className="inline-block"
          style={{ transformOrigin: "50% 70%" }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * AnimatedArc — saffron radial glow + a subtle inner ring. Uses currentColor
 * so the parent can tint it. The whole element rotates very slowly when
 * wrapped in a motion.div with infinite rotation.
 */
function AnimatedArc() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className="size-[420px] text-amber-400"
      aria-hidden
    >
      <defs>
        <radialGradient id="hero-arc-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#hero-arc-grad)" />
      <path
        d="M30 100 A70 70 0 0 1 170 100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
        fill="none"
        strokeDasharray="3 6"
      />
      <path
        d="M50 100 A50 50 0 0 1 150 100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
        fill="none"
      />
    </svg>
  );
}
