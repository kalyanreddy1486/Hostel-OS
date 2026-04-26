"use client";

import { motion } from "motion/react";

/**
 * Next.js `template.tsx` re-mounts on every navigation (unlike `layout.tsx`
 * which persists). That's exactly what we need for an entrance animation
 * to fire on every route change.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
