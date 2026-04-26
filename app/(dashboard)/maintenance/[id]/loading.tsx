import { Block, HeadingSkeleton, Line } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <HeadingSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Block className="h-6 w-40 rounded-md" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Line className="w-24" />
                  <Line className="w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Block className="h-6 w-32 rounded-md" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Block className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Line className="w-40" />
                    <Line className="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Line className="w-24" />
            <Block className="mt-3 h-8 w-32 rounded-md" />
          </div>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Line className="w-28" />
            <Block className="mt-3 h-9 w-full rounded-md" />
            <Block className="mt-2 h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
