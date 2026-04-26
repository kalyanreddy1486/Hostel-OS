import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createTenantClient } from "@/lib/backend/supabase";
import { InvoicePdf } from "@/components/pdf/invoice-pdf";
import { getRequestOrigin } from "@/lib/server/origin";
import { generateQrDataUrl } from "@/lib/server/qrcode";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  // Auth + tenant scope: PDF contains full member contact + financial history.
  // Without this gate anyone with a guessable invoice UUID could pull cross-
  // tenant financial records. Tenant client (RLS-scoped) replaces the bare
  // service-role lookup, and `requireStaffOrAdmin` ensures only logged-in
  // admin/staff can hit this route at all.
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const [{ data: invoice, error: invErr }, { data: payments }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, billing_month, due_date, status, rent_amount, electricity_amount, food_amount, extra_charges, late_fee, total_amount, notes, created_at, member:members ( name, phone, email )",
        )
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id, amount, payment_date, payment_mode, transaction_reference")
        .eq("invoice_id", params.id)
        .order("payment_date", { ascending: true }),
    ]);

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = Array.isArray(invoice.member)
    ? invoice.member[0] ?? null
    : invoice.member ?? null;

  const origin = getRequestOrigin() ?? "";
  // PDF QR points to the public pay page (no login). The /my-account portal
  // was removed when residents moved to public pay/report links.
  const qrDataUrl = await generateQrDataUrl(`${origin}/pay/${invoice.id}`);

  const stream = await renderToStream(
    InvoicePdf({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        billing_month: invoice.billing_month,
        due_date: invoice.due_date,
        status: invoice.status,
        rent_amount: Number(invoice.rent_amount ?? 0),
        electricity_amount: Number(invoice.electricity_amount ?? 0),
        food_amount: Number(invoice.food_amount ?? 0),
        extra_charges: Number(invoice.extra_charges ?? 0),
        late_fee: Number(invoice.late_fee ?? 0),
        total_amount: Number(invoice.total_amount ?? 0),
        notes: invoice.notes,
        created_at: invoice.created_at,
      },
      member,
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount ?? 0),
        payment_date: p.payment_date,
        payment_mode: p.payment_mode,
        transaction_reference: p.transaction_reference,
      })),
      qrDataUrl,
    }),
  );

  const filename = `invoice-${invoice.invoice_number ?? invoice.id.slice(0, 8)}.pdf`;
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
