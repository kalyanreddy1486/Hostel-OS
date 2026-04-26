"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  BedDouble,
  Receipt,
  CreditCard,
  Wrench,
  BarChart3,
  PiggyBank,
  Wallet,
  Settings,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const staffNav: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    heading: "Occupancy",
    items: [
      { href: "/members", label: "Members", icon: Users },
      { href: "/rooms", label: "Rooms", icon: Building2 },
      { href: "/assignments", label: "Assignments", icon: BedDouble },
    ],
  },
  {
    heading: "Revenue",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/extra-charges", label: "Extra charges", icon: PiggyBank },
      { href: "/expenses", label: "Expenses", icon: Wallet },
    ],
  },
  {
    heading: "Operations",
    items: [
      { href: "/maintenance", label: "Maintenance", icon: Wrench },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/audit", label: "Audit log", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// `role` is accepted for API symmetry with other shell components, but the
// sidebar only renders the staff nav now (residents have no portal).
export function AppSidebar({}: { role: string }) {
  const pathname = usePathname();
  const sections = staffNav;

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
      <Link
        href="/dashboard"
        className="mb-2 flex h-10 items-center gap-2 px-1 text-sidebar-foreground transition-opacity hover:opacity-85"
      >
        <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <path
              d="M4 11L12 4L20 11V20H14V14H10V20H4V11Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          Hostel<span className="text-muted-foreground">OS</span>
        </span>
      </Link>
      <nav className="mt-2 flex flex-col gap-4 px-1">
        {sections.map((section, i) => (
          <SidebarSection
            key={section.heading ?? `s-${i}`}
            heading={section.heading}
            items={section.items}
            pathname={pathname}
          />
        ))}
      </nav>
      <div className="mt-auto border-t px-2 pb-1 pt-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          Press{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">
            ⌘K
          </kbd>{" "}
          to search or jump anywhere.
        </p>
      </div>
    </aside>
  );
}

function SidebarSection({
  heading,
  items,
  pathname,
}: {
  heading?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      {heading ? (
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <span className="h-px flex-1 bg-gradient-to-r from-sidebar-border to-transparent" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {heading}
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-sidebar-border to-transparent" />
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon, exact }) => (
          <SidebarLink
            key={href}
            href={href}
            label={label}
            icon={Icon}
            active={
              exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`)
            }
          />
        ))}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      onFocus={() => router.prefetch(href)}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
      )}
    >
      {/* Animated background pill — only rendered on the active item, but
          framer-motion's layoutId means it glides between items as you
          navigate, instead of popping. */}
      {active ? (
        <motion.span
          layoutId="sidebar-active-pill"
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-sidebar-accent to-transparent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--saffron)_18%,transparent)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
      {active ? (
        <motion.span
          layoutId="sidebar-active-mark"
          aria-hidden
          className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
          style={{ background: "var(--saffron)" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="relative flex-1">{label}</span>
    </Link>
  );
}
