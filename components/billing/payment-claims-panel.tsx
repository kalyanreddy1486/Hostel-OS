import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";
import {
  ClaimConfirmButton,
  ClaimRejectButton,
} from "@/components/billing/payment-claim-actions";

function formatINR(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

export async function PaymentClaimsPanel() {
  const supabase = createTenantClient();
  const { data } = await supabase
    .from("payment_inbox_events")
    .select(
      "id, received_at, amount, upi_reference, invoice_reference, payer_name, status, payment_mode, matched_invoice_id",
    )
    .in("source", ["resident_claim", "public_claim"])
    .in("status", ["pending", "needs_review"])
    .order("received_at", { ascending: false })
    .limit(20);

  const claims = data ?? [];

  if (!claims.length) return null;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Payments awaiting confirmation</h3>
          <p className="text-xs text-muted-foreground">
            Verify each UTR against your bank app, then confirm.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-amber-700 dark:text-amber-300">
          {claims.length} pending
        </span>
      </div>
      <ul className="divide-y">
        {claims.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:items-center"
          >
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {c.payer_name ?? "Resident"}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {formatINR(Number(c.amount))} · {c.payment_mode ?? "upi"}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="font-mono">UTR {c.upi_reference}</span>
                {c.matched_invoice_id ? (
                  <Link
                    href={`/billing/${c.matched_invoice_id}`}
                    className="hover:underline"
                  >
                    Invoice {c.invoice_reference ?? c.matched_invoice_id.slice(0, 8)}
                  </Link>
                ) : null}
                <span>
                  Claimed {new Date(c.received_at).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <ClaimConfirmButton id={c.id} />
              <ClaimRejectButton id={c.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { CheckCircle2, XCircle };
