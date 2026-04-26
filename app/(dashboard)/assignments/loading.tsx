import {
  FormSkeleton,
  HeadingSkeleton,
  TableSkeleton,
} from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <HeadingSkeleton />
      <FormSkeleton />
      <TableSkeleton rows={6} cols={4} />
    </div>
  );
}
