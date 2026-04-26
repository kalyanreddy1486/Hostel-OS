import { ChapterMark, HairlineRule } from "@/components/decor";

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <ChapterMark number={n} />
      <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
        {title}
      </h2>
      <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
    </div>
  );
}

function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-foreground/[0.06] ${className}`}
      style={style}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <section className="space-y-3">
        <SectionTitle n={2} title="The numbers" />
        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <div className="lg:col-span-7 lg:row-span-2">
            <div className="h-full min-h-[260px] rounded-2xl border bg-card p-6">
              <Bone className="h-3 w-24" />
              <Bone className="mt-4 h-10 w-48" />
              <Bone className="mt-2 h-3 w-32" />
              <div className="mt-8 flex h-24 items-end gap-1.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Bone key={i} className="h-full w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 lg:col-span-5">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-8 w-28" />
            <Bone className="mt-3 h-1.5 w-full rounded-full" />
          </div>
          <div className="rounded-2xl border bg-card p-5 lg:col-span-3">
            <Bone className="h-3 w-24" />
            <Bone className="mt-3 h-8 w-16" />
          </div>
          <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-8 w-20" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle n={3} title="Money in, money out" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
            <Bone className="h-4 w-32" />
            <div className="mt-6 flex h-44 items-end gap-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <Bone
                  key={i}
                  className="w-full"
                  style={{ height: `${20 + ((i * 7) % 70)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <Bone className="h-4 w-28" />
            <Bone className="mt-4 h-8 w-32" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle n={4} title="Needs your attention" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
            <Bone className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <Bone className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
