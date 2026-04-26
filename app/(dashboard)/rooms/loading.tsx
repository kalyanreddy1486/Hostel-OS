import { Block, HeadingSkeleton, Line } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <HeadingSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
          >
            <div className="flex items-start justify-between gap-2">
              <Block className="h-6 w-24 rounded-md" />
              <Block className="h-5 w-16 rounded-full" />
            </div>
            <Line className="mt-3 w-40" />
            <Line className="mt-2 w-28" />
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: 4 }).map((__, j) => (
                <Block key={j} className="h-8 w-8 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
