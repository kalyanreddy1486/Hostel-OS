"use client";

import * as React from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { PageTransition } from "@/components/dashboard/page-transition";

export function DashboardShell({
  children,
  email,
  role,
  fullName,
  isDemo,
}: {
  children: React.ReactNode;
  email: string | null | undefined;
  role: string;
  fullName: string | null;
  isDemo?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={role} />
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        role={role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          email={email}
          role={role}
          fullName={fullName}
          isDemo={isDemo}
        />
        <main className="flex-1 bg-muted/20 p-4 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      {/* Bottom tab nav (mobile only). The "More" tab opens the full sidebar
          drawer so every secondary route (Rooms, Assignments, Payments,
          Expenses, Reports) stays one tap away. */}
      <MobileBottomNav role={role} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
