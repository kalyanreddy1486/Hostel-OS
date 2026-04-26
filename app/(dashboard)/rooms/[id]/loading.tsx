import { Block, HeadingSkeleton, Line } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <HeadingSkeleton />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <Block className="h-5 w-32 rounded-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-4"
            >
              <Line className="w-16" />
              <Block className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
