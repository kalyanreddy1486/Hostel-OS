import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";
import { EmptyState } from "@/components/shared/empty-state";
import { CreditCard, Plus } from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import {
  PaymentsTable,
  type PaymentRow as PaymentTableRow,
} from "@/components/payments/payments-table";

type PaymentRow = PaymentTableRow;

type SearchParams = { mode?: string };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaffOrAdmin();
  const mode = searchParams.mode ?? "";
  const qs = new URLSearchParams();
  if (mode) qs.set("mode", mode);

  const res = await serverFetch(`/api/payments?${qs}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as
    | { payments: PaymentRow[] }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load payments:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const payments = body.payments;
  const totalReceived = payments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );

  // The table component requires invoice_number as non-null. The API may
  // return it null — fall back to a short slug so the type lines up.
  const tableRows: PaymentRow[] = payments.map((p) => ({
    ...p,
    invoice: p.invoice
      ? {
          id: p.invoice.id,
          invoice_number:
            p.invoice.invoice_number ?? p.invoice.id.slice(0, 8),
          billing_month: p.invoice.billing_month,
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Revenue"
        title="Payments"
        description={
          <>
            All recorded payments ·{" "}
            <span className="font-semibold text-foreground">
              ₹{totalReceived.toLocaleString("en-IN")}
            </span>{" "}
            received
          </>
        }
        actions={
          <PageActions
            primary={{
              label: "Record payment",
              href: "/payments/new",
              icon: Plus,
            }}
          />
        }
      />

      <form className="flex flex-wrap gap-2" method="get">
        <FormSelect name="mode" defaultValue={mode} className="w-44">
          <option value="">All payment modes</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="card">Card</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </FormSelect>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {mode ? (
          <Link
            href="/payments"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-6" strokeWidth={1.75} />}
          title="No payments yet"
          description="Payment collections will appear here. Record one manually, or wait for residents to submit claims via the pay link."
          actionHref="/payments/new"
          actionLabel="Record payment"
        />
      ) : (
        <PaymentsTable payments={tableRows} />
      )}
    </div>
  );
}
