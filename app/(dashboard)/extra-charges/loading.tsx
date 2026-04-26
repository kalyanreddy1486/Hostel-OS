import { HeadingSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <HeadingSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
