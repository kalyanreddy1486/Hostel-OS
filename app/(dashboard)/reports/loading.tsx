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
      <ChartSkeleton height={288} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
      <ChartSkeleton height={140} />
    </div>
  );
}
