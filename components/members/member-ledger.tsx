import { Receipt, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";
import { StatusBadge } from "@/components/ui/status-badge";

function formatINR(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Entry =
  | {
      kind: "invoice";
      id: string;
      date: string;
      label: string;
      amount: number;
      status: string;
      notes: string | null;
    }
  | {
      kind: "payment";
      id: string;
      date: string;
      label: string;
      amount: number;
      mode: string;
      ref: string | null;
      invoiceRef: string | null;
    };

export async function MemberLedger({ memberId }: { memberId: string }) {
  const supabase = createTenantClient();
  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, billing_month, due_date, total_amount, status, notes",
      )
      .eq("member_id", memberId)
      .order("billing_month", { ascending: false }),
    supabase
      .from("payments")
      .select(
        "id, amount, payment_date, payment_mode, transaction_reference, invoice:invoices!payments_invoice_id_fkey ( invoice_number )",
      )
      .eq("member_id", memberId)
      .order("payment_date", { ascending: false }),
  ]);

  const invoices = invoicesRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const billed = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
  const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstanding = billed - paid;

  // Build merged chronological timeline (newest first).
  const entries: Entry[] = [
    ...invoices.map<Entry>((i) => ({
      kind: "invoice",
      id: i.id,
      date: i.billing_month ?? i.due_date ?? "",
      label: i.invoice_number ?? i.id.slice(0, 8),
      amount: Number(i.total_amount ?? 0),
      status: i.status,
      notes: i.notes ?? null,
    })),
    ...payments.map<Entry>((p) => {
      const invoiceRaw = (p as { invoice?: unknown }).invoice;
      const inv = Array.isArray(invoiceRaw) ? invoiceRaw[0] : invoiceRaw;
      return {
        kind: "payment",
        id: p.id,
        date: p.payment_date ?? "",
        label: (p.payment_mode ?? "payment").replace(/_/g, " "),
        amount: Number(p.amount ?? 0),
        mode: p.payment_mode ?? "",
        ref: p.transaction_reference ?? null,
        invoiceRef: (inv as { invoice_number?: string } | null)?.invoice_number ?? null,
      };
    }),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Running balance (forward in chronological order for correctness, then reverse display)
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const withBalance = chronological.map((e) => {
    if (e.kind === "invoice") running += e.amount;
    else running -= e.amount;
    return { ...e, balanceAfter: running };
  });
  const displayed = withBalance.slice().reverse();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Billed"
          value={formatINR(billed)}
          icon={<TrendingUp className="size-4" />}
          accent="default"
        />
        <SummaryTile
          label="Paid"
          value={formatINR(paid)}
          icon={<TrendingDown className="size-4" />}
          accent="success"
        />
        <SummaryTile
          label="Outstanding"
          value={formatINR(outstanding)}
          icon={<Receipt className="size-4" />}
          accent={outstanding > 0 ? "destructive" : "success"}
        />
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Ledger</h3>
          <p className="text-xs text-muted-foreground">
            Chronological timeline of invoices + payments with running balance.
          </p>
        </div>
        {displayed.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No billing activity yet.
          </p>
        ) : (
          <ul className="divide-y">
            {displayed.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-start gap-3 px-4 py-3">
                <div
                  className={
                    e.kind === "invoice"
                      ? "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }
                >
                  {e.kind === "invoice" ? (
                    <Receipt className="size-4" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {e.kind === "invoice" ? "Invoice" : e.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.label}
                    </span>
                    {e.kind === "invoice" ? (
                      <StatusBadge status={e.status} />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(e.date)}
                    {e.kind === "payment" && (e as Extract<Entry, { kind: "payment" }>).invoiceRef
                      ? ` · for ${(e as Extract<Entry, { kind: "payment" }>).invoiceRef}`
                      : ""}
                    {e.kind === "payment" && (e as Extract<Entry, { kind: "payment" }>).ref
                      ? ` · ref ${(e as Extract<Entry, { kind: "payment" }>).ref}`
                      : ""}
                    {e.kind === "invoice" && e.notes ? ` · ${e.notes}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <p
                    className={
                      e.kind === "invoice"
                        ? "font-medium text-foreground"
                        : "font-medium text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {e.kind === "invoice" ? "+" : "−"}
                    {formatINR(e.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bal {formatINR(e.balanceAfter)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "default" | "success" | "destructive";
}) {
  const ring =
    accent === "success"
      ? "ring-emerald-500/20"
      : accent === "destructive"
        ? "ring-destructive/30"
        : "ring-foreground/10";
  const text =
    accent === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className={`rounded-xl bg-card p-4 ring-1 ${ring}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${text}`}>{value}</p>
    </div>
  );
}
