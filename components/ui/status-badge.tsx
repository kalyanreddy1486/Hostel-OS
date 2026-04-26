import { cn } from "@/lib/utils";

type Style = { bg: string; text: string; dot: string; pulse?: boolean };

// "Live" states get a soft pulsing dot — drawing the eye to anything actively
// in motion (an open ticket, a pending invoice). Terminal states stay still.
const styles: Record<string, Style> = {
  active: {
    bg: "bg-emerald-500/10 ring-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    pulse: true,
  },
  paid: {
    bg: "bg-emerald-500/10 ring-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  available: {
    bg: "bg-emerald-500/10 ring-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  resolved: {
    bg: "bg-emerald-500/10 ring-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  pending: {
    bg: "bg-amber-500/10 ring-amber-500/30",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    pulse: true,
  },
  reserved: {
    bg: "bg-amber-500/10 ring-amber-500/30",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  open: {
    bg: "bg-amber-500/10 ring-amber-500/30",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    pulse: true,
  },
  partial: {
    bg: "bg-orange-500/10 ring-orange-500/30",
    text: "text-orange-800 dark:text-orange-300",
    dot: "bg-orange-500",
    pulse: true,
  },
  maintenance: {
    bg: "bg-orange-500/10 ring-orange-500/30",
    text: "text-orange-800 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  overdue: {
    bg: "bg-rose-500/10 ring-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    pulse: true,
  },
  left: {
    bg: "bg-rose-500/10 ring-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  occupied: {
    bg: "bg-rose-500/10 ring-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  in_progress: {
    bg: "bg-sky-500/10 ring-sky-500/30",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
  closed: {
    bg: "bg-muted ring-foreground/10",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const style = styles[key] ?? styles.closed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        style.bg,
        style.text,
      )}
    >
      <span className="relative grid size-1.5 place-items-center">
        {style.pulse ? (
          <span
            aria-hidden
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              style.dot,
            )}
          />
        ) : null}
        <span className={cn("relative size-1.5 rounded-full", style.dot)} />
      </span>
      {status.replace(/_/g, " ")}
    </span>
  );
}
