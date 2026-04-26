"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";

export function CommandPalette({ role }: { role: string }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  async function signOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  }

  // Residents have no portal — palette only shows admin/staff routes.
  void role;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/10 p-4 pt-[14vh] supports-[backdrop-filter]:backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border bg-popover shadow-elevation-3 animate-scale-in">
            <Command loop>
              <CommandInput placeholder="Search or jump to…" autoFocus />
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>

                {(
                  <>
                    <CommandGroup heading="Navigate">
                      <Item
                        icon={LayoutDashboard}
                        label="Dashboard"
                        shortcut="G D"
                        onSelect={() => go("/dashboard")}
                      />
                      <Item
                        icon={Users}
                        label="Members"
                        shortcut="G M"
                        onSelect={() => go("/members")}
                      />
                      <Item
                        icon={Building2}
                        label="Rooms"
                        shortcut="G R"
                        onSelect={() => go("/rooms")}
                      />
                      <Item
                        icon={BedDouble}
                        label="Assignments"
                        onSelect={() => go("/assignments")}
                      />
                      <Item
                        icon={Receipt}
                        label="Billing"
                        shortcut="G B"
                        onSelect={() => go("/billing")}
                      />
                      <Item
                        icon={CreditCard}
                        label="Payments"
                        shortcut="G P"
                        onSelect={() => go("/payments")}
                      />
                      <Item
                        icon={Wallet}
                        label="Expenses"
                        onSelect={() => go("/expenses")}
                      />
                      <Item
                        icon={Wrench}
                        label="Maintenance"
                        onSelect={() => go("/maintenance")}
                      />
                      <Item
                        icon={BarChart3}
                        label="Reports"
                        onSelect={() => go("/reports")}
                      />
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Create">
                      <Item
                        icon={Plus}
                        label="New Member"
                        shortcut="N M"
                        onSelect={() => go("/members/new")}
                      />
                      <Item
                        icon={Plus}
                        label="New Room"
                        shortcut="N R"
                        onSelect={() => go("/rooms/new")}
                      />
                      <Item
                        icon={Plus}
                        label="New Invoice"
                        shortcut="N I"
                        onSelect={() => go("/billing/new")}
                      />
                      <Item
                        icon={Plus}
                        label="Record Payment"
                        shortcut="N P"
                        onSelect={() => go("/payments/new")}
                      />
                      <Item
                        icon={Plus}
                        label="Raise Ticket"
                        onSelect={() => go("/maintenance/new")}
                      />
                    </CommandGroup>
                  </>
                )}

                <CommandSeparator />

                <CommandGroup heading="Theme">
                  <Item
                    icon={Sun}
                    label="Light mode"
                    onSelect={() => {
                      setTheme("light");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={Moon}
                    label="Dark mode"
                    onSelect={() => {
                      setTheme("dark");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={Monitor}
                    label="System theme"
                    onSelect={() => {
                      setTheme("system");
                      setOpen(false);
                    }}
                  />
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Account">
                  <Item
                    icon={LogOut}
                    label="Sign out"
                    onSelect={signOut}
                  />
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  ↑↓
                </kbd>
                <span>Navigate</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  ↵
                </kbd>
                <span>Open</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  Esc
                </kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Item({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect}>
      <Icon className="size-4 text-muted-foreground" />
      <span>{label}</span>
      {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
    </CommandItem>
  );
}

export function CommandPaletteTrigger() {
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }
  }, []);

  function open() {
    const ev = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
    });
    window.dispatchEvent(ev);
  }

  return (
    <button
      type="button"
      onClick={open}
      className="group inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-64"
    >
      <Search className="size-4" />
      <span className="hidden flex-1 text-left sm:inline">Search or jump…</span>
      <span className="hidden items-center gap-0.5 sm:inline-flex">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
          {isMac ? "⌘" : "Ctrl"}
        </kbd>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
          K
        </kbd>
      </span>
    </button>
  );
}
