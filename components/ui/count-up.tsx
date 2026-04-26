"use client";

import * as React from "react";
import { animate, useInView, useMotionValue } from "motion/react";

type FormatMode = "integer" | "inr";

function formatBy(mode: FormatMode, n: number): string {
  const v = Math.round(n);
  if (mode === "inr") return `₹${v.toLocaleString("en-IN")}`;
  return v.toLocaleString("en-IN");
}

/**
 * Count-up number that animates from 0 to `value` once it enters the viewport.
 *
 * The format is selected by string mode (not a function) because this is a
 * Client Component reachable from server pages — RSC can't serialize functions
 * across the boundary.
 */
export function CountUp({
  value,
  format = "integer",
  duration = 0.9,
}: {
  value: number;
  format?: FormatMode;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const mv = useMotionValue(0);
  const [display, setDisplay] = React.useState(formatBy(format, value));

  React.useEffect(() => {
    if (!inView) return;
    // Reset to 0 then animate to target — gives the count-up effect.
    mv.set(0);
    setDisplay(formatBy(format, 0));
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(formatBy(format, v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, format, mv]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
