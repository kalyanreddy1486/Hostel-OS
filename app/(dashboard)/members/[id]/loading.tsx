import { Block, HeadingSkeleton, Line } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <HeadingSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <Block className="h-5 w-32 rounded-md" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="flex justify-between gap-4">
                  <Line className="w-20" />
                  <Line className="w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
