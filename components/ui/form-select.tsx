import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select> — matches our <Input> visually while staying fully
 * keyboard-accessible and submit-friendly for plain HTML forms.
 * Use this instead of raw <select> for consistency across the admin UI.
 */
type FormSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> & { selectSize?: "sm" | "md" };

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  function FormSelect(
    { className, children, selectSize = "md", ...props },
    ref,
  ) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex w-full appearance-none rounded-md border border-input bg-background pr-8 pl-3 text-sm shadow-sm outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selectSize === "sm" ? "h-8" : "h-9",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);
