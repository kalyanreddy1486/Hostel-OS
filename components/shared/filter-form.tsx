"use client";

import * as React from "react";

/**
 * Drop-in replacement for `<form method="get">` filter bars on list pages.
 *
 * Behaviour:
 *   - Picking any <select> option auto-submits immediately (no need to click
 *     a Filter button — that was the broken-feeling UX everyone hit)
 *   - The Filter button still exists and works for keyboard / search inputs
 *   - On submit the form serialises to query params via native HTML — same
 *     server-side handling, just without the manual click
 *
 * Replaces `<form className=… method="get">` everywhere a status/category
 * select gates a server-rendered list (members, billing, maintenance).
 */
export function FilterForm({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    if ((e.target as HTMLElement).tagName === "SELECT") {
      // Use requestSubmit so the browser fires the form's native submit
      // (which our parent server-rendered page picks up via search params).
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      method="get"
      className={className}
      onChange={handleChange}
    >
      {children}
    </form>
  );
}
