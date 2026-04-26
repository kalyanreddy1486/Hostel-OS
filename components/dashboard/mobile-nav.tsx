"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  BedDouble,
  Receipt,
  CreditCard,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const staff: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/members", label: "Members", icon: Users },
  { href: "/rooms", label: "Rooms", icon: Building2 },
  { href: "/assignments", label: "Assignments", icon: BedDouble },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

// `role` is accepted for API symmetry but not used — only one nav (staff)
// exists now since residents don't have a portal.
export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  role: string;
}) {
  const pathname = usePathname();
  const items = staff;

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-foreground/20 supports-[backdrop-filter]:backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col gap-1 border-r bg-sidebar p-3 shadow-elevation-3 animate-fade-in">
        <div className="flex h-11 items-center justify-between gap-2 px-2">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" fill="none" className="size-4">
                <path
                  d="M4 11L12 4L20 11V20H14V14H10V20H4V11Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            HostelOS
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="mt-3 flex flex-col gap-0.5 px-1">
          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
