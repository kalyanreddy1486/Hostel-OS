"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const shortcutMap: Record<string, Record<string, string>> = {
  g: {
    d: "/dashboard",
    m: "/members",
    r: "/rooms",
    a: "/assignments",
    b: "/billing",
    p: "/payments",
    e: "/expenses",
    t: "/maintenance",
    o: "/reports",
  },
  n: {
    m: "/members/new",
    r: "/rooms/new",
    i: "/billing/new",
    p: "/payments/new",
    t: "/maintenance/new",
  },
};

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts({ role }: { role: string }) {
  const router = useRouter();
  const prefixRef = React.useRef<string | null>(null);
  const prefixTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (role === "resident") return;

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      const key = e.key.toLowerCase();

      if (prefixRef.current) {
        const path = shortcutMap[prefixRef.current]?.[key];
        prefixRef.current = null;
        if (prefixTimerRef.current) window.clearTimeout(prefixTimerRef.current);
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        return;
      }

      if (key === "g" || key === "n") {
        prefixRef.current = key;
        if (prefixTimerRef.current) window.clearTimeout(prefixTimerRef.current);
        prefixTimerRef.current = window.setTimeout(() => {
          prefixRef.current = null;
        }, 1200);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prefixTimerRef.current) window.clearTimeout(prefixTimerRef.current);
    };
  }, [role, router]);

  return null;
}
