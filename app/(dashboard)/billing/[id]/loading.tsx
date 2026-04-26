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
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Line className="w-48" />
                  <Line className="w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Block className="h-6 w-32 rounded-md" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Line className="w-40" />
                  <Line className="w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Line className="w-24" />
            <Block className="mt-3 h-10 w-40 rounded-md" />
            <Line className="mt-2 w-32" />
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
