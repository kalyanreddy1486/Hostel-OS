import { cn } from "@/lib/utils";

export function Line({ className }: { className?: string }) {
  return <div className={cn("skeleton h-3", className)} />;
}

export function Block({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function HeadingSkeleton() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div className="space-y-2">
        <Line className="w-24" />
        <Block className="h-7 w-64 rounded-md" />
        <Line className="w-80" />
      </div>
      <div className="flex gap-2">
        <Block className="h-8 w-28 rounded-md" />
        <Block className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
        >
          <Line className="w-24" />
          <Block className="mt-3 h-7 w-32 rounded-md" />
          <Line className="mt-2 w-40" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid gap-3 border-b bg-muted/40 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={i} className="w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-3 border-b px-4 py-3 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Line key={c} className={cn(c === 0 ? "w-32" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="flex items-end gap-1 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
      style={{ minHeight: height }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="skeleton flex-1 rounded-sm"
          style={{ height: `${20 + ((i * 37) % 70)}%` }}
        />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Line className="w-24" />
          <Block className="h-9 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Block className="h-9 w-24 rounded-md" />
        <Block className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
