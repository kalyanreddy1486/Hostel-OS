import { Block, HeadingSkeleton, Line } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Block className="h-5 w-20 rounded-md" />
                <Block className="h-5 w-14 rounded-full" />
              </div>
              <Line className="w-64" />
            </div>
            <Block className="h-8 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
