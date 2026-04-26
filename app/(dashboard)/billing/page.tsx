import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch, getRequestOrigin } from "@/lib/server/origin";
import { BillingJobs } from "@/components/billing/billing-jobs";
import { CronStatus } from "@/components/billing/cron-status";
import { PaymentClaimsPanel } from "@/components/billing/payment-claims-panel";
import { SendEmailRemindersButton } from "@/components/billing/send-email-reminders-button";
import {
  BillingTable,
  type BillingInvoiceRow,
} from "@/components/billing/billing-table";
import { getAppSettings } from "@/lib/settings";
import { buildUpiDeepLink } from "@/lib/whatsapp";

type InvoiceRow = BillingInvoiceRow;

type SearchParams = { status?: string; billing_month?: string };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaffOrAdmin();

  const status = searchParams.status ?? "";
  const month = searchParams.billing_month ?? "";
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (month) qs.set("billing_month", month);

  const res = await serverFetch(`/api/invoices?${qs}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as
    | { invoices: InvoiceRow[] }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load invoices:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const settings = await getAppSettings();
  const baseUrl =
    process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ||
    getRequestOrigin() ||
    "";
  const invoices: InvoiceRow[] = body.invoices.map((i) => {
    if (i.status === "paid") return i;
    const noteRef = i.invoice_number ?? i.id.slice(0, 8);
    const upi = settings.upi_vpa
      ? buildUpiDeepLink({
          vpa: settings.upi_vpa,
          payeeName: settings.upi_payee_name,
          amount: Number(i.total_amount ?? 0),
          note: noteRef,
        })
      : null;
    const claim = baseUrl ? `${baseUrl}/pay/${i.id}` : null;
    const report = baseUrl ? `${baseUrl}/report-issue` : null;
    return { ...i, upi_link: upi, claim_link: claim, report_link: report };
  });
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Revenue"
        title="Billing"
        description={
          totalOutstanding > 0 ? (
            <>
              Invoices across all members ·{" "}
              <span className="font-semibold text-foreground">
                ₹{totalOutstanding.toLocaleString("en-IN")}
              </span>{" "}
              outstanding
            </>
          ) : (
            "Invoices across all members · all caught up"
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SendEmailRemindersButton />
            <PageActions
              primary={{ label: "New invoice", href: "/billing/new", icon: Plus }}
              secondary={[{ label: "Extra charges", href: "/extra-charges" }]}
            />
          </div>
        }
      />

      <PaymentClaimsPanel />

      <form className="flex flex-wrap gap-2" method="get">
        <FormSelect name="status" defaultValue={status} className="w-44">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </FormSelect>
        <Input
          type="month"
          name="billing_month"
          defaultValue={month ? month.slice(0, 7) : ""}
          className="w-44"
        />
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {status || month ? (
          <Link
            href="/billing"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Clear
          </Link>
        ) : null}
      </form>

      <BillingTable
        invoices={invoices}
        whatsappTemplate={settings.whatsapp_template}
        upiVpa={settings.upi_vpa}
      />

      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div>
            <h3 className="text-sm font-medium">Automation</h3>
            <p className="text-xs text-muted-foreground">
              Scheduled jobs and manual triggers.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Cron live
          </span>
        </summary>
        <div className="grid gap-4 border-t p-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CronStatus />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 text-sm font-medium">Run now</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Manual triggers — useful for mid-month catch-ups or before cron
              fires.
            </p>
            <BillingJobs />
          </div>
        </div>
      </details>
    </div>
  );
}
