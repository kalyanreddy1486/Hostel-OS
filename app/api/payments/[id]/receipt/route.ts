import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createTenantClient } from "@/lib/backend/supabase";
import { PaymentReceiptPdf } from "@/components/pdf/invoice-pdf";
import { getRequestOrigin } from "@/lib/server/origin";
import { generateQrDataUrl } from "@/lib/server/qrcode";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  // Auth + tenant scope: receipt PDF carries member contact + amount.
  // Without these, anyone with a guessable payment UUID could pull
  // cross-tenant receipts. Tenant client (RLS-scoped) replaces the
  // bare service-role lookup.
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_date, payment_mode, transaction_reference, notes, member:members ( name, phone, email ), invoice:invoices ( invoice_number, total_amount )",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = Array.isArray(payment.member)
    ? payment.member[0] ?? null
    : payment.member ?? null;
  const invoice = Array.isArray(payment.invoice)
    ? payment.invoice[0] ?? null
    : payment.invoice ?? null;

  const origin = getRequestOrigin() ?? "";
  // Receipt QR points to the public pay page for the related invoice. The
  // /my-account portal was removed.
  const qrDataUrl = await generateQrDataUrl(
    invoice ? `${origin}/pay/${payment.id}` : origin,
  );

  const stream = await renderToStream(
    PaymentReceiptPdf({
      payment: {
        id: payment.id,
        amount: Number(payment.amount ?? 0),
        payment_date: payment.payment_date,
        payment_mode: payment.payment_mode,
        transaction_reference: payment.transaction_reference,
        notes: payment.notes,
      },
      member,
      invoice: invoice
        ? {
            invoice_number: invoice.invoice_number,
            total_amount: Number(invoice.total_amount ?? 0),
          }
        : null,
      qrDataUrl,
    }),
  );

  const filename = `receipt-${payment.id.slice(0, 8)}.pdf`;
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
