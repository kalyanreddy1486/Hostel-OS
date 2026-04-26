/**
 * Motion presets for HostelOS.
 *
 * Principles:
 *   - Motion is deliberate, never decorative.
 *   - Page-enter is the most-used pattern: stagger fade-up by 50ms.
 *   - Hover/tap interactions are subtle (1-2px translate, no jank).
 *   - All durations under 400ms; ease-out for entries, ease-in-out for state.
 */

import type { Variants } from "motion/react";

// Soft, snappy ease — feels confident, not bouncy.
export const ease = [0.22, 1, 0.36, 1] as const;

// Page-enter container: staggers children.
export const pageEnter: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

// Each child rises 12px and fades in. Cheap, expensive-feeling.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

// Slightly bigger lift for hero / first-fold items.
export const fadeUpLarge: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

// Scale-in for stat cards / KPI tiles.
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease } },
};

// Hover preset for cards/rows.
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.2, ease } },
  whileTap: { y: 0, scale: 0.99 },
};
