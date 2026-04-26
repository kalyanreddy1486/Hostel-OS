import Link from "next/link";
import { Inbox } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";

export async function PendingClaimsWidget() {
  const supabase = createTenantClient();
  const { count } = await supabase
    .from("payment_inbox_events")
    .select("id", { count: "exact", head: true })
    .in("source", ["resident_claim", "public_claim"])
    .in("status", ["pending", "needs_review"]);

  const n = count ?? 0;
  if (n === 0) return null;

  return (
    <Link
      href="/billing"
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm transition-colors hover:bg-amber-500/10"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Inbox className="size-4" />
        </span>
        <div>
          <p className="font-medium">
            {n} payment{n === 1 ? "" : "s"} awaiting confirmation
          </p>
          <p className="text-xs text-muted-foreground">
            Residents have submitted UTRs — verify and confirm on the Billing
            page.
          </p>
        </div>
      </div>
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
        Review →
      </span>
    </Link>
  );
}
