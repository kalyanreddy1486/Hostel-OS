import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch, getRequestOrigin } from "@/lib/server/origin";
import { InvoiceStatusForm } from "@/components/billing/invoice-status-form";
import { DeleteInvoiceButton } from "@/components/billing/delete-invoice-button";
import { WhatsAppReminderButton } from "@/components/shared/whatsapp-reminder-button";
import { getAppSettings } from "@/lib/settings";
import { buildUpiDeepLink } from "@/lib/whatsapp";

type Invoice = {
  id: string;
  invoice_number: string | null;
  billing_month: string | null;
  due_date: string | null;
  status: "pending" | "paid" | "overdue" | "partial";
  rent_amount: number;
  electricity_amount: number;
  food_amount: number;
  extra_charges: number;
  late_fee: number;
  total_amount: number;
  notes: string | null;
  member: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  assignment: {
    id: string;
    move_in_date: string | null;
    bed: {
      bed_number: string | null;
      room: { room_number: string | null } | null;
    } | null;
  } | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  transaction_reference: string | null;
  notes: string | null;
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaffOrAdmin();

  const res = await serverFetch(`/api/invoices/${params.id}`, {
    cache: "no-store",
  });

  if (res.status === 404) notFound();

  const body = (await res.json()) as
    | {
        invoice: Invoice;
        payments: Payment[];
        paid_total: number;
        balance: number;
      }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load invoice:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const { invoice, payments, paid_total, balance } = body;
  const roomLabel = invoice.assignment?.bed
    ? `${invoice.assignment.bed.room?.room_number ?? "?"}/${invoice.assignment.bed.bed_number ?? "?"}`
    : null;

  const settings = await getAppSettings();
  const baseUrl =
    process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ||
    getRequestOrigin() ||
    "";
  const noteRef = invoice.invoice_number ?? invoice.id.slice(0, 8);
  const upiLink = settings.upi_vpa
    ? buildUpiDeepLink({
        vpa: settings.upi_vpa,
        payeeName: settings.upi_payee_name,
        amount: Number(invoice.total_amount ?? 0),
        note: noteRef,
      })
    : null;
  const claimLink = baseUrl ? `${baseUrl}/pay/${invoice.id}` : null;
  const reportLink = baseUrl ? `${baseUrl}/report-issue` : null;

  const lines: { label: string; amount: number }[] = [
    { label: "Rent", amount: invoice.rent_amount },
    { label: "Electricity", amount: invoice.electricity_amount },
    { label: "Food", amount: invoice.food_amount },
    { label: "Extra charges", amount: invoice.extra_charges },
    { label: "Late fee", amount: invoice.late_fee },
  ].filter((l) => Number(l.amount) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invoice {invoice.invoice_number ?? invoice.id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            {invoice.member?.name ?? "—"}
            {roomLabel ? ` · Room ${roomLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status !== "paid" && invoice.member ? (
            <WhatsAppReminderButton
              phone={invoice.member.phone}
              memberName={invoice.member.name}
              amount={Number(invoice.total_amount ?? 0)}
              invoiceNumber={invoice.invoice_number}
              dueDate={invoice.due_date}
              billingMonth={invoice.billing_month}
              upiVpa={settings.upi_vpa}
              upiLink={upiLink}
              claimLink={claimLink}
              reportLink={reportLink}
              template={settings.whatsapp_template}
              size="md"
              label="WhatsApp reminder"
            />
          ) : null}
          {invoice.status !== "paid" && invoice.member?.id ? (
            <Link
              href={`/payments/new?invoice_id=${invoice.id}&member_id=${invoice.member.id}`}
              className={cn(buttonVariants())}
            >
              Record payment
            </Link>
          ) : null}
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Download PDF
          </a>
          <Link
            href="/billing"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Billing month{" "}
              {invoice.billing_month
                ? invoice.billing_month.slice(0, 7)
                : "—"}{" "}
              · Due {invoice.due_date ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length ? (
                  lines.map((l) => (
                    <TableRow key={l.label}>
                      <TableCell>{l.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ₹{Number(l.amount).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No charges.
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₹
                    {Number(invoice.total_amount ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Paid so far
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    ₹{Number(paid_total ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Balance</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      balance > 0
                        ? "text-red-700 dark:text-red-400"
                        : "text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    ₹{Number(balance).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {invoice.notes ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {invoice.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceStatusForm id={invoice.id} status={invoice.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">
                  {invoice.member?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span>{invoice.member?.phone ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span>{invoice.member?.email ?? "—"}</span>
              </div>
              {invoice.member?.id ? (
                <Link
                  href={`/members/${invoice.member.id}`}
                  className="mt-2 block text-xs underline underline-offset-4"
                >
                  Open member profile →
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <DeleteInvoiceButton id={invoice.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Recorded payments against this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length ? (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.payment_date}</TableCell>
                    <TableCell className="capitalize">
                      {p.payment_mode}
                    </TableCell>
                    <TableCell>{p.transaction_reference ?? "—"}</TableCell>
                    <TableCell>{p.notes ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{Number(p.amount ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/api/payments/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline underline-offset-4"
                      >
                        PDF
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
