import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { recordPayment } from "@/app/actions/payments";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";

type MemberOption = { id: string; name: string };
type InvoiceOption = {
  id: string;
  invoice_number: string | null;
  billing_month: string | null;
  total_amount: number;
  status: string;
  member: { id: string } | null;
};

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: { invoice_id?: string; member_id?: string };
}) {
  await requireStaffOrAdmin();

  const [membersRes, invoicesRes] = await Promise.all([
    serverFetch("/api/members?status=active", { cache: "no-store" }),
    serverFetch("/api/invoices", { cache: "no-store" }),
  ]);
  const membersBody = (await membersRes.json()) as
    | { members: MemberOption[] }
    | { error: string };
  const invoicesBody = (await invoicesRes.json()) as
    | { invoices: InvoiceOption[] }
    | { error: string };

  const members = "members" in membersBody ? membersBody.members : [];
  const invoices = "invoices" in invoicesBody ? invoicesBody.invoices : [];
  const openInvoices = invoices.filter((i) => i.status !== "paid");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Record payment
          </h1>
          <p className="text-muted-foreground">
            Link to an open invoice to auto-update its status
          </p>
        </div>
        <Link
          href="/payments"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={recordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member_id">Member *</Label>
              <select
                id="member_id"
                name="member_id"
                required
                defaultValue={searchParams.member_id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_id">Link to invoice (optional)</Label>
              <select
                id="invoice_id"
                name="invoice_id"
                defaultValue={searchParams.invoice_id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Unlinked / general payment</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_number ?? i.id.slice(0, 8)} ·{" "}
                    {i.billing_month
                      ? i.billing_month.slice(0, 7)
                      : "—"}{" "}
                    · ₹{Number(i.total_amount).toLocaleString("en-IN")} ·{" "}
                    {i.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment date *</Label>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  required
                  defaultValue={today}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment mode *</Label>
                <select
                  id="payment_mode"
                  name="payment_mode"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="cash"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction_reference">
                  Reference / txn id
                </Label>
                <Input
                  id="transaction_reference"
                  name="transaction_reference"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>

            <SubmitButton pendingLabel="Recording…">Record payment</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
