import {
  HeadingSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <HeadingSkeleton />
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}
