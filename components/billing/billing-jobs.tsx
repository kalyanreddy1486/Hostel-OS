"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  runGenerateMonthlyInvoices,
  runMarkOverdueInvoices,
} from "@/app/actions/invoices";

export function BillingJobs() {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState<string | null>(null);
  const router = useRouter();

  const runGenerate = (dryRun: boolean) => {
    setLabel(dryRun ? "preview-generate" : "generate");
    startTransition(async () => {
      const res = await runGenerateMonthlyInvoices({ dry_run: dryRun });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const r = (res as { result?: Record<string, unknown> }).result ?? {};
      if (dryRun) {
        toast.success(`Dry run: would create ${r.would_create ?? 0} invoice(s)`);
      } else {
        toast.success(
          `Generated ${r.created ?? 0} invoice(s) for ${r.billing_month ?? ""}`,
        );
        router.refresh();
      }
    });
  };

  const runOverdue = (dryRun: boolean) => {
    setLabel(dryRun ? "preview-overdue" : "overdue");
    startTransition(async () => {
      const res = await runMarkOverdueInvoices({ dry_run: dryRun });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const r = (res as { result?: Record<string, unknown> }).result ?? {};
      if (dryRun) {
        toast.success(`Dry run: would mark ${r.would_mark ?? 0} overdue`);
      } else {
        toast.success(`Marked ${r.marked ?? 0} invoice(s) overdue`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => runGenerate(true)}
        disabled={pending}
      >
        {pending && label === "preview-generate" ? "…" : "Preview generate"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => runGenerate(false)}
        disabled={pending}
      >
        {pending && label === "generate" ? "Running…" : "Generate invoices"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => runOverdue(true)}
        disabled={pending}
      >
        {pending && label === "preview-overdue" ? "…" : "Preview overdue"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => runOverdue(false)}
        disabled={pending}
      >
        {pending && label === "overdue" ? "Running…" : "Mark overdue"}
      </Button>
    </div>
  );
}
