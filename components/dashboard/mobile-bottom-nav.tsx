"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/members", label: "Members", icon: Users },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/maintenance", label: "Tickets", icon: Wrench },
];

export function MobileBottomNav({
  role,
  onMore,
}: {
  role: string;
  /** Open the full sidebar drawer — covers Rooms, Assignments, Payments,
   *  Expenses, Reports, Settings, Sign out. */
  onMore: () => void;
}) {
  const pathname = usePathname();
  if (role === "resident") return null; // residents get a different nav

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/[0.08] surface-glass lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-foreground/55 hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-3 top-1.5 h-1 rounded-full"
                    style={{ background: "var(--saffron)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onMore}
            aria-label="Open more navigation"
            className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-foreground/55 transition-colors hover:text-foreground"
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
