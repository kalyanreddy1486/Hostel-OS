"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { LogOut, ChevronDown, Eye } from "lucide-react";
import { setDemoRole } from "@/app/actions/demo";

export function TopBar({
  email,
  role,
  fullName,
  isDemo,
}: {
  email: string | null | undefined;
  role: string;
  fullName: string | null;
  isDemo?: boolean;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const display = fullName || email?.split("@")[0] || "Account";
  const initials = display
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b surface-glass px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-elevation-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4"
              aria-hidden
            >
              <path
                d="M4 11L12 4L20 11V20H14V14H10V20H4V11Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="hidden sm:inline">HostelOS</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:justify-center">
        <CommandPaletteTrigger />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <AccountMenu
          display={display}
          initials={initials}
          role={role}
          email={email ?? null}
          isDemo={isDemo}
          onSignOut={signOut}
        />
      </div>

      <CommandPalette role={role} />
      <KeyboardShortcuts role={role} />
    </header>
  );
}

function AccountMenu({
  display,
  initials,
  role,
  email,
  isDemo,
  onSignOut,
}: {
  display: string;
  initials: string;
  role: string;
  email: string | null;
  isDemo?: boolean;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu · ${display}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-2 px-2 [&>*]:pointer-events-none",
        )}
      >
        <span
          className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[120px] truncate text-xs font-medium">
            {display}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {role}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div className="border-b px-2 pb-2 pt-1.5">
            <p className="truncate text-sm font-medium">{display}</p>
            <p className="truncate text-xs text-muted-foreground">
              {email ?? "—"}
            </p>
          </div>
          {isDemo ? (
            <div className="mt-1 border-b pb-1.5">
              <div className="flex items-center gap-1.5 px-1.5 pb-1 pt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
                <Eye className="size-3" />
                Demo view as
              </div>
              <div className="flex gap-1 px-1">
                <form action={setDemoRole} className="flex-1">
                  <input type="hidden" name="role" value="admin" />
                  <button
                    type="submit"
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    Admin
                  </button>
                </form>
                <form action={setDemoRole} className="flex-1">
                  <input type="hidden" name="role" value="resident" />
                  <button
                    type="submit"
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      role === "resident"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    Resident
                  </button>
                </form>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
