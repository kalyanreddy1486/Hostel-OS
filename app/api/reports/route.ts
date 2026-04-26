import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

function monthKey(date: string | null) {
  if (!date) return null;
  return date.slice(0, 7);
}

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const months = Math.max(
    1,
    Math.min(24, Number(url.searchParams.get("months") ?? 6)),
  );

  const supabase = createTenantClient();

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));
  const sinceIso = since.toISOString().slice(0, 10);

  const [roomsSummaryRes, invoicesRes, paymentsRes, ticketsRes] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id, room_number, capacity", { count: "exact" }),
      supabase
        .from("invoices")
        .select("id, billing_month, total_amount, status")
        .gte("billing_month", sinceIso),
      supabase
        .from("payments")
        .select("id, payment_date, amount, payment_mode")
        .gte("payment_date", sinceIso),
      supabase
        .from("maintenance_tickets")
        .select("status, priority, created_at"),
    ]);

  const firstError = [
    roomsSummaryRes,
    invoicesRes,
    paymentsRes,
    ticketsRes,
  ].find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const rooms = roomsSummaryRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  const totalCapacity = rooms.reduce(
    (sum, r) => sum + Number(r.capacity ?? 0),
    0,
  );

  const { data: occupiedBedsData } = await supabase
    .from("beds")
    .select("id", { count: "exact", head: false })
    .eq("status", "occupied");
  const occupiedBeds = (occupiedBedsData ?? []).length;

  const monthSet = new Set<string>();
  for (const inv of invoices) {
    const mk = monthKey(inv.billing_month);
    if (mk) monthSet.add(mk);
  }
  for (const p of payments) {
    const mk = monthKey(p.payment_date);
    if (mk) monthSet.add(mk);
  }

  const d = new Date(sinceIso);
  for (let i = 0; i < months; i++) {
    monthSet.add(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const monthLabels = Array.from(monthSet).sort();

  const byMonth = monthLabels.map((m) => {
    const monthInvoices = invoices.filter(
      (i) => monthKey(i.billing_month) === m,
    );
    const monthPayments = payments.filter(
      (p) => monthKey(p.payment_date) === m,
    );
    const billed = monthInvoices.reduce(
      (s, i) => s + Number(i.total_amount ?? 0),
      0,
    );
    const collected = monthPayments.reduce(
      (s, p) => s + Number(p.amount ?? 0),
      0,
    );
    const outstanding = monthInvoices
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
    return { month: m, billed, collected, outstanding };
  });

  const paymentModes: Record<string, number> = {};
  for (const p of payments) {
    const mode = p.payment_mode ?? "other";
    paymentModes[mode] =
      (paymentModes[mode] ?? 0) + Number(p.amount ?? 0);
  }

  const ticketStats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
  };

  return NextResponse.json({
    occupancy: {
      total_beds: totalCapacity,
      occupied_beds: occupiedBeds,
      pct: totalCapacity ? Math.round((occupiedBeds / totalCapacity) * 100) : 0,
    },
    by_month: byMonth,
    payment_modes: paymentModes,
    ticket_stats: ticketStats,
  });
}
