import { notFound } from "next/navigation";
import { createBackendClient } from "@/lib/backend/supabase";
import { getAppSettings } from "@/lib/settings";
import { PublicClaimForm } from "@/components/public/public-claim-form";

function formatINR(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

export default async function PublicPayPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const supabase = createBackendClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, billing_month, due_date, total_amount, status")
    .eq("id", params.invoiceId)
    .maybeSingle();

  if (!invoice) notFound();

  const settings = await getAppSettings();
  const amount = Number(invoice.total_amount ?? 0);

  // Latest non-rejected claim for this invoice (so re-visits show status).
  const { data: claim } = await supabase
    .from("payment_inbox_events")
    .select("id, status, upi_reference, amount, received_at, rejected_reason")
    .eq("matched_invoice_id", invoice.id)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">HostelOS</h1>
          <p className="text-xs text-muted-foreground">Rent payment</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Amount due
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              {formatINR(amount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invoice{" "}
              <span className="font-mono">
                {invoice.invoice_number ?? invoice.id.slice(0, 8)}
              </span>
              {invoice.due_date ? ` · due ${invoice.due_date}` : ""}
            </p>
          </div>

          {invoice.status === "paid" ? (
            <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
              This invoice is already paid. No action needed.
            </p>
          ) : settings.upi_vpa ? (
            <div className="mt-4 space-y-2 rounded-lg border bg-white p-4">
              <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
                Pay this UPI ID
              </p>
              <div className="rounded-md bg-amber-50 p-3 text-center font-mono text-base font-semibold tracking-wider text-amber-900">
                {settings.upi_vpa}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Open PhonePe / GPay / Paytm → Send money → paste the ID above
                → enter <strong>{formatINR(amount)}</strong> with note{" "}
                <span className="font-mono">
                  {invoice.invoice_number ?? invoice.id.slice(0, 8)}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              UPI payment info not yet set up — please ask the hostel admin.
            </p>
          )}
        </div>

        {invoice.status !== "paid" ? (
          claim && claim.status !== "rejected" ? (
            <div className="rounded-xl border bg-card p-5 text-sm">
              <p className="font-medium">Your payment claim is submitted</p>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-medium text-foreground capitalize">
                    {claim.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>UTR</span>
                  <span className="font-mono text-foreground">
                    {claim.upi_reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="tabular-nums text-foreground">
                    {formatINR(Number(claim.amount))}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {claim.status === "confirmed"
                  ? "Admin confirmed. Thank you!"
                  : "Awaiting admin confirmation — usually within a few hours."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5">
              {claim?.status === "rejected" && claim.rejected_reason ? (
                <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  Previous claim rejected: {claim.rejected_reason}
                </p>
              ) : null}
              <p className="mb-1 text-sm font-medium">
                After paying, submit the details
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Paste the UPI transaction reference (UTR) from your UPI app so
                admin can verify the payment.
              </p>
              <PublicClaimForm
                invoiceId={invoice.id}
                defaultAmount={amount}
              />
            </div>
          )
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Powered by HostelOS · No account needed
        </p>
      </div>
    </div>
  );
}
