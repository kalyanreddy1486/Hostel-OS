import {
  ChartSkeleton,
  HeadingSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <HeadingSkeleton />
      <StatCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton height={260} />
        </div>
        <ChartSkeleton height={260} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartSkeleton height={260} />
        </div>
        <ChartSkeleton height={260} />
      </div>
    </div>
  );
}
