import { FormSkeleton, HeadingSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <HeadingSkeleton />
      <FormSkeleton />
    </div>
  );
}
