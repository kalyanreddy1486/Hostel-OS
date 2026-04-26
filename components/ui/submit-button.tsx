"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button that automatically disables itself + shows a spinner while
 * its parent `<form>` (with a server action) is submitting.
 *
 * Use this anywhere you have `<form action={serverAction}>` to prevent
 * double-submission. React's useFormStatus hook tracks the form's pending
 * state without needing client state plumbing.
 *
 * Usage:
 *   <form action={createInvoice}>
 *     ...
 *     <SubmitButton>Save invoice</SubmitButton>
 *   </form>
 *
 * Pass `pendingLabel` to override the spinner-state text (default: "Saving…").
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className,
  ...rest
}: React.ComponentProps<typeof Button> & {
  pendingLabel?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || rest.disabled}
      className={cn("gap-2", className)}
      {...rest}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
