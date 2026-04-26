import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_mode: string | null;
  transaction_reference: string | null;
};

export type InvoicePdfProps = {
  invoice: {
    id: string;
    invoice_number: string | null;
    billing_month: string | null;
    due_date: string | null;
    status: string;
    rent_amount: number;
    electricity_amount: number;
    food_amount: number;
    extra_charges: number;
    late_fee: number;
    total_amount: number;
    notes: string | null;
    created_at: string;
  };
  member: { name: string; phone: string | null; email: string | null } | null;
  payments: PaymentRow[];
  orgName?: string;
  qrDataUrl?: string | null;
};

const INDIGO = "#4338ca";
const INDIGO_DARK = "#312e81";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG_SOFT = "#f9fafb";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
  },
  brandBar: {
    height: 6,
    backgroundColor: INDIGO,
  },
  headerWrap: {
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: INDIGO,
    color: "#ffffff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
    paddingTop: 7,
  },
  brandText: { marginLeft: 10 },
  brand: { fontSize: 16, fontWeight: 700, color: TEXT_DARK },
  tag: { fontSize: 9, color: TEXT_MUTED, marginTop: 2 },
  title: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  invoiceNum: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "right",
    color: TEXT_DARK,
    marginTop: 4,
  },
  meta: { fontSize: 9, color: "#374151", textAlign: "right", marginTop: 2 },
  statusPill: {
    alignSelf: "flex-end",
    marginTop: 8,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: INDIGO_DARK,
    backgroundColor: "#eef2ff",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  body: { paddingHorizontal: 36, paddingTop: 18 },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 16,
  },
  block: { flex: 1 },
  blockTitle: {
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  strong: { fontSize: 11, fontWeight: 700 },
  lineTable: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    marginBottom: 16,
    overflow: "hidden",
  },
  trHead: {
    flexDirection: "row",
    backgroundColor: BG_SOFT,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  th: {
    fontSize: 8,
    color: TEXT_MUTED,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  td: { fontSize: 10 },
  leftCell: { flex: 1 },
  rightCell: { width: 90, textAlign: "right" },
  totalBand: {
    flexDirection: "row",
    backgroundColor: INDIGO,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  totalLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  totalValue: {
    width: 120,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
  },
  notes: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    backgroundColor: BG_SOFT,
    fontSize: 9,
    color: "#374151",
  },
  qrWrap: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qr: { width: 72, height: 72 },
  qrText: { flex: 1, fontSize: 9, color: TEXT_MUTED, marginLeft: 12 },
  qrTitle: { fontSize: 10, fontWeight: 700, color: TEXT_DARK, marginBottom: 2 },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 20,
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

function fmt(n: number) {
  return `Rs. ${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function InvoicePdf({
  invoice,
  member,
  payments,
  orgName = "HostelOS",
  qrDataUrl,
}: InvoicePdfProps) {
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const balance = Number(invoice.total_amount ?? 0) - paidTotal;
  const invoiceLabel =
    invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase();

  const lines = [
    { label: "Rent", amount: invoice.rent_amount },
    { label: "Electricity", amount: invoice.electricity_amount },
    { label: "Food", amount: invoice.food_amount },
    { label: "Extra charges", amount: invoice.extra_charges },
    { label: "Late fee", amount: invoice.late_fee },
  ].filter((l) => Number(l.amount ?? 0) > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} fixed />
        <View style={styles.headerWrap}>
          <View style={styles.brandRow}>
            <Text style={styles.brandMark}>H</Text>
            <View style={styles.brandText}>
              <Text style={styles.brand}>{orgName}</Text>
              <Text style={styles.tag}>Hostel management platform</Text>
            </View>
          </View>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceNum}>{invoiceLabel}</Text>
            <Text style={styles.meta}>
              Billing{" "}
              {invoice.billing_month
                ? invoice.billing_month.slice(0, 7)
                : "—"}
            </Text>
            <Text style={styles.meta}>Due {fmtDate(invoice.due_date)}</Text>
            <Text style={styles.statusPill}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Billed to</Text>
              <Text style={styles.strong}>{member?.name ?? "—"}</Text>
              {member?.phone ? (
                <Text style={styles.td}>{member.phone}</Text>
              ) : null}
              {member?.email ? (
                <Text style={styles.td}>{member.email}</Text>
              ) : null}
            </View>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Invoice details</Text>
              <Text style={styles.td}>
                Issued: {fmtDate(invoice.created_at)}
              </Text>
              <Text style={styles.td}>Due: {fmtDate(invoice.due_date)}</Text>
            </View>
          </View>

          <View style={styles.lineTable}>
            <View style={styles.trHead}>
              <Text style={[styles.th, styles.leftCell]}>Description</Text>
              <Text style={[styles.th, styles.rightCell]}>Amount</Text>
            </View>
            {lines.length ? (
              lines.map((l) => (
                <View style={styles.tr} key={l.label}>
                  <Text style={[styles.td, styles.leftCell]}>{l.label}</Text>
                  <Text style={[styles.td, styles.rightCell]}>
                    {fmt(l.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.tr}>
                <Text style={[styles.td, styles.leftCell]}>No line items</Text>
                <Text style={[styles.td, styles.rightCell]}>—</Text>
              </View>
            )}
            <View style={styles.totalBand}>
              <Text style={styles.totalLabel}>Total due</Text>
              <Text style={styles.totalValue}>
                {fmt(invoice.total_amount)}
              </Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, styles.leftCell]}>Paid to date</Text>
              <Text style={[styles.td, styles.rightCell]}>
                {fmt(paidTotal)}
              </Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.strong, styles.leftCell]}>Balance</Text>
              <Text style={[styles.strong, styles.rightCell]}>
                {fmt(balance)}
              </Text>
            </View>
          </View>

          {payments.length ? (
            <View style={styles.lineTable}>
              <View style={styles.trHead}>
                <Text style={[styles.th, { flex: 1 }]}>Date</Text>
                <Text style={[styles.th, { flex: 1 }]}>Mode</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Reference</Text>
                <Text style={[styles.th, styles.rightCell]}>Amount</Text>
              </View>
              {payments.map((p) => (
                <View style={styles.tr} key={p.id}>
                  <Text style={[styles.td, { flex: 1 }]}>
                    {fmtDate(p.payment_date)}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }]}>
                    {p.payment_mode ?? "—"}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5 }]}>
                    {p.transaction_reference ?? "—"}
                  </Text>
                  <Text style={[styles.td, styles.rightCell]}>
                    {fmt(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {invoice.notes ? (
            <View style={styles.notes}>
              <Text>{invoice.notes}</Text>
            </View>
          ) : null}

          {qrDataUrl ? (
            <View style={styles.qrWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qr} />
              <View style={styles.qrText}>
                <Text style={styles.qrTitle}>Verify online</Text>
                <Text>
                  Scan this code to view the latest status of invoice{" "}
                  {invoiceLabel} in your {orgName} account.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer} fixed>
          {orgName} · This is a system-generated invoice · Generated{" "}
          {fmtDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
}

type ReceiptProps = {
  payment: {
    id: string;
    amount: number;
    payment_date: string | null;
    payment_mode: string | null;
    transaction_reference: string | null;
    notes: string | null;
  };
  member: { name: string; phone: string | null; email: string | null } | null;
  invoice: { invoice_number: string | null; total_amount: number } | null;
  orgName?: string;
  qrDataUrl?: string | null;
};

export function PaymentReceiptPdf({
  payment,
  member,
  invoice,
  orgName = "HostelOS",
  qrDataUrl,
}: ReceiptProps) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.brandBar} fixed />
        <View style={styles.headerWrap}>
          <View style={styles.brandRow}>
            <Text style={styles.brandMark}>H</Text>
            <View style={styles.brandText}>
              <Text style={styles.brand}>{orgName}</Text>
              <Text style={styles.tag}>Payment receipt</Text>
            </View>
          </View>
          <View>
            <Text style={styles.title}>Receipt</Text>
            <Text style={styles.invoiceNum}>
              #{payment.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.meta}>{fmtDate(payment.payment_date)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Received from</Text>
              <Text style={styles.strong}>{member?.name ?? "—"}</Text>
              {member?.phone ? (
                <Text style={styles.td}>{member.phone}</Text>
              ) : null}
            </View>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>For invoice</Text>
              <Text style={styles.strong}>
                {invoice?.invoice_number ?? "—"}
              </Text>
              {invoice ? (
                <Text style={styles.td}>
                  Total {fmt(invoice.total_amount)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.lineTable}>
            <View style={styles.totalBand}>
              <Text style={styles.totalLabel}>Amount received</Text>
              <Text style={styles.totalValue}>{fmt(payment.amount)}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, styles.leftCell]}>Mode</Text>
              <Text style={[styles.td, styles.rightCell]}>
                {payment.payment_mode ?? "—"}
              </Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, styles.leftCell]}>Reference</Text>
              <Text style={[styles.td, styles.rightCell]}>
                {payment.transaction_reference ?? "—"}
              </Text>
            </View>
          </View>

          {payment.notes ? (
            <View style={styles.notes}>
              <Text>{payment.notes}</Text>
            </View>
          ) : null}

          {qrDataUrl ? (
            <View style={styles.qrWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qr} />
              <View style={styles.qrText}>
                <Text style={styles.qrTitle}>Verify receipt</Text>
                <Text>
                  Scan to confirm this payment in your {orgName} account.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer} fixed>
          Receipt ID: {payment.id} · {orgName}
        </Text>
      </Page>
    </Document>
  );
}
