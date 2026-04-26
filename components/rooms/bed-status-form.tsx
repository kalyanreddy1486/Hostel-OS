"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BedStatusForm({
  bedId,
  current,
  action,
}: {
  bedId: string;
  current: string;
  action: (
    bedId: string,
    status: string,
  ) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function setStatus(status: string) {
    start(async () => {
      const res = await action(bedId, status);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Bed updated");
      // Server action only revalidates /rooms — refresh forces /rooms/[id]
      // and /beds to re-render with the new status too.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {["available", "reserved", "maintenance"].map((s) => (
        <Button
          key={s}
          type="button"
          size="sm"
          variant={current === s ? "default" : "outline"}
          disabled={pending || current === s || current === "occupied"}
          title={
            current === "occupied"
              ? "End the active assignment to change status"
              : undefined
          }
          onClick={() => setStatus(s)}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
