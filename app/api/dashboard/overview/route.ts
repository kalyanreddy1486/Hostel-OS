import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

type DailyPoint = { date: string; amount: number; count: number };

export async function GET() {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 29);
  const sinceIso = thirtyDaysAgo.toISOString().slice(0, 10);

  const [kpisRes, paymentsRes, auditRes, ticketsRes, invoicesRes] =
    await Promise.all([
      supabase.rpc("get_dashboard_kpis"),
      supabase
        .from("payments")
        .select("amount, payment_date, payment_mode")
        .gte("payment_date", sinceIso),
      supabase
        .from("audit_logs")
        .select("id, action, table_name, record_id, new_values, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("maintenance_tickets")
        .select("id, title, priority, status, created_at")
        .in("status", ["open", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, status, due_date")
        .in("status", ["pending", "partial", "overdue"])
        .order("due_date", { ascending: true })
        .limit(5),
    ]);

  const firstError = [kpisRes, paymentsRes, auditRes, ticketsRes, invoicesRes]
    .find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const payments = paymentsRes.data ?? [];
  const collectionTrend: DailyPoint[] = [];
  const byDay = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const d = p.payment_date ?? null;
    if (!d) continue;
    const key = d.slice(0, 10);
    const prev = byDay.get(key) ?? { amount: 0, count: 0 };
    prev.amount += Number(p.amount ?? 0);
    prev.count += 1;
    byDay.set(key, prev);
  }
  for (let i = 0; i < 30; i++) {
    const dt = new Date(thirtyDaysAgo);
    dt.setUTCDate(thirtyDaysAgo.getUTCDate() + i);
    const key = dt.toISOString().slice(0, 10);
    const val = byDay.get(key) ?? { amount: 0, count: 0 };
    collectionTrend.push({
      date: key,
      amount: Math.round(val.amount),
      count: val.count,
    });
  }

  const paymentMixMap = new Map<string, number>();
  for (const p of payments) {
    const mode = p.payment_mode ?? "other";
    paymentMixMap.set(
      mode,
      (paymentMixMap.get(mode) ?? 0) + Number(p.amount ?? 0),
    );
  }
  const paymentMix = Array.from(paymentMixMap.entries()).map(
    ([mode, amount]) => ({ mode, amount: Math.round(amount) }),
  );

  return NextResponse.json({
    kpis: kpisRes.data,
    collection_trend: collectionTrend,
    payment_mix: paymentMix,
    recent_activity: auditRes.data ?? [],
    urgent_tickets: ticketsRes.data ?? [],
    outstanding_invoices: invoicesRes.data ?? [],
  });
}
