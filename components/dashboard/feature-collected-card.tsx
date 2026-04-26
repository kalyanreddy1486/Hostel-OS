"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { Banknote } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The hero KPI card on the dashboard. Dark navy background with the big
 * italic ₹ amount in cream. Layered with:
 *   - decorative ring + dotted concentric arcs
 *   - sparkline ribbon at the bottom that draws in on mount
 *   - magnetic 3D tilt on mouse move (subtle: <8 degrees)
 *   - shimmering highlight that follows the cursor
 */
export function FeatureCollectedCard({
  amount,
  paidLifetime,
  trend,
  className,
}: {
  amount: number;
  paidLifetime: number;
  trend: number[];
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  // Mouse position tracked as 0..1 across the card
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 180, damping: 22 });
  const sy = useSpring(my, { stiffness: 180, damping: 22 });

  // Map to small rotations and a highlight position
  const rotateY = useTransform(sx, [0, 1], [6, -6]);
  const rotateX = useTransform(sy, [0, 1], [-5, 5]);
  const highlightX = useTransform(sx, [0, 1], ["0%", "100%"]);
  const highlightY = useTransform(sy, [0, 1], ["0%", "100%"]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function onMouseLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  // Sparkline path — generated from the trend array
  const sparkD = React.useMemo(() => buildSparkPath(trend, 320, 60), [trend]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      variants={fadeUp}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn(
        "group relative isolate flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-amber-300/10 bg-gradient-to-br from-[#0e1828] via-[#16223a] to-[#1a2742] p-6 text-amber-50 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {/* Mouse-following highlight */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 opacity-60"
        style={{
          background: "radial-gradient(380px circle at var(--mx) var(--my), rgba(251,191,36,0.18), transparent 60%)",
          ["--mx" as never]: highlightX,
          ["--my" as never]: highlightY,
        }}
      />

      {/* Decorative concentric circles — top right */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10">
        <svg viewBox="0 0 320 320" className="size-[320px] text-amber-300/10">
          <circle cx="160" cy="160" r="160" fill="currentColor" />
          <circle cx="160" cy="160" r="110" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="160" cy="160" r="70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeDasharray="3 4" />
        </svg>
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/85">
            Collected · last 30 days
          </p>
          <p className="text-xs text-amber-100/55">
            What residents actually paid this cycle
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-amber-300/15 text-amber-200">
          <Banknote className="size-4" />
        </span>
      </div>

      <div className="relative my-4 flex items-baseline gap-3">
        <div className="font-display text-[80px] font-semibold leading-none tracking-[-0.025em] text-amber-50">
          <span className="italic">
            <CountUp value={amount} format="inr" duration={1.2} />
          </span>
        </div>
        <BlinkingCaret />
      </div>

      {/* Sparkline ribbon */}
      <div className="relative">
        <svg
          viewBox="0 0 320 60"
          className="h-14 w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(251,191,36)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(251,191,36)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Filled area below the line */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            d={`${sparkD} L 320 60 L 0 60 Z`}
            fill="url(#spark-fill)"
          />
          {/* The line itself, drawn-in */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            d={sparkD}
            fill="none"
            stroke="rgb(251,191,36)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-amber-100/70">
          Lifetime paid:{" "}
          <strong className="font-semibold text-amber-50">
            ₹{paidLifetime.toLocaleString("en-IN")}
          </strong>
        </span>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/5 px-3 py-1 font-medium text-amber-200 transition-colors hover:border-amber-300/60 hover:bg-amber-300/10"
        >
          See payments →
        </Link>
      </div>
    </motion.div>
  );
}

function BlinkingCaret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      className="inline-block h-10 w-[3px] -translate-y-1 rounded-sm bg-amber-300"
    />
  );
}

/**
 * Build a smooth SVG path through the supplied points, normalised to
 * (0..width, 0..height). If the trend has fewer than 2 points or all values
 * are zero, returns an empty path.
 */
function buildSparkPath(trend: number[], width: number, height: number): string {
  if (!trend || trend.length < 2) return "M 0 50";
  const max = Math.max(1, ...trend);
  const min = Math.min(0, ...trend);
  const range = max - min || 1;
  const stepX = width / (trend.length - 1);
  const padding = 4;
  const points = trend.map((v, i) => {
    const x = i * stepX;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return [x, y] as const;
  });
  // Smooth catmull-rom-ish path with Q curves
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const cx = (px + x) / 2;
    d += ` Q ${cx} ${py}, ${cx} ${(py + y) / 2}`;
    d += ` Q ${cx} ${y}, ${x} ${y}`;
  }
  return d;
}
