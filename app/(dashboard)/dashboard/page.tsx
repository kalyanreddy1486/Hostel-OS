import { Suspense } from "react";
import Link from "next/link";
import {
  Bed,
  Users,
  AlertCircle,
  ArrowRight,
  Plus,
  Receipt,
  CreditCard,
  Wrench,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { redirectResidentFromStaffHome } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CountUp } from "@/components/ui/count-up";
import { MotionGrid, MotionItem } from "@/components/ui/motion-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { EditorialHero } from "@/components/dashboard/editorial-hero";
import { BentoStat } from "@/components/dashboard/bento-stat";
import { FeatureCollectedCard } from "@/components/dashboard/feature-collected-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  ChapterMark,
  HairlineRule,
  SaffronUnderline,
} from "@/components/decor";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";
import {
  ActivityFeed,
  type ActivityRow,
} from "@/components/dashboard/activity-feed";
import { CollectionChart } from "@/components/dashboard/collection-chart";
import { ExpenditureCard } from "@/components/dashboard/expenditure-card";
import { PendingClaimsWidget } from "@/components/dashboard/pending-claims-widget";
import { createTenantClient } from "@/lib/backend/supabase";

type Overview = {
  kpis: {
    active_members: number;
    total_beds: number;
    occupied_beds: number;
    paid_total_loaded: number;
    pending_total_loaded: number;
  };
  collection_trend: Array<{ date: string; amount: number; count: number }>;
  payment_mix: Array<{ mode: string; amount: number }>;
  recent_activity: ActivityRow[];
  urgent_tickets: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    created_at: string;
  }>;
  outstanding_invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    status: string;
    due_date: string | null;
  }>;
};

const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export default async function DashboardPage() {
  // Auth FIRST — never render anything for an unauthorised viewer.
  const session = await redirectResidentFromStaffHome();
  const isAdmin = session.profile?.role === "admin";

  const displayName = session.profile?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Hero renders synchronously — no DB round-trip blocks first paint.
  // Data-dependent sections stream in via Suspense below, dramatically
  // lowering LCP on this page (was ~2.5s, now hero text paints in <500ms).
  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <EditorialHero
        greeting={`${greeting}, ${displayName}`}
        date={dateLabel}
        title="Today"
        subtitle="Welcome back. Your numbers are loading just below — everything else is here too."
        actions={
          <>
            <Link
              href="/billing/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-foreground/15 bg-background/60 px-4 text-sm font-medium text-foreground backdrop-blur transition-all hover:bg-background"
            >
              <Receipt className="size-3.5" />
              New invoice
            </Link>
            {isAdmin ? (
              <Link
                href="/rooms/new"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-foreground/15 bg-background/60 px-4 text-sm font-medium text-foreground backdrop-blur transition-all hover:bg-background"
              >
                <Plus className="size-3.5" />
                Add room
              </Link>
            ) : null}
            <Link
              href="/members/new"
              className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-6px_rgba(0,0,0,0.5)]"
            >
              <Plus className="size-3.5" />
              Add member
            </Link>
          </>
        }
      />

      <Suspense fallback={null}>
        <PendingClaimsWidget />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>

      {/* Quick actions — static, no data dependency, paints with hero. */}
      <section className="space-y-3 pb-2">
        <div className="flex items-center gap-3">
          <ChapterMark number={6} />
          <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
            Quick moves
          </h2>
          <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
        </div>

        <MotionGrid className="grid gap-4 sm:grid-cols-3">
          <QuickAction
            icon={<Receipt className="size-4" />}
            title="New invoice"
            subtitle="Bill a member"
            href="/billing/new"
          />
          <QuickAction
            icon={<CreditCard className="size-4" />}
            title="Record payment"
            subtitle="Log a collection"
            href="/payments/new"
          />
          <QuickAction
            icon={<Wrench className="size-4" />}
            title="Raise ticket"
            subtitle="Log maintenance"
            href="/maintenance/new"
          />
        </MotionGrid>
      </section>

      <div className="flex items-center justify-center pb-6 pt-2">
        <SaffronUnderline className="h-2 w-16 text-amber-500" />
      </div>
    </div>
  );
}

/**
 * All data-fetching for the dashboard happens here. Streams in below the
 * hero so the page paints fast.
 */
async function DashboardContent() {
  const res = await serverFetch("/api/dashboard/overview", {
    cache: "no-store",
  });
  const body = (await res.json()) as Overview | { error: string };
  const data =
    res.ok && "kpis" in body
      ? body
      : {
          kpis: {
            active_members: 0,
            total_beds: 0,
            occupied_beds: 0,
            paid_total_loaded: 0,
            pending_total_loaded: 0,
          },
          collection_trend: Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - (29 - i));
            return { date: d.toISOString().slice(0, 10), amount: 0, count: 0 };
          }),
          payment_mix: [],
          recent_activity: [],
          urgent_tickets: [],
          outstanding_invoices: [],
        };

  const k = data.kpis;
  const activeMembers = Number(k.active_members ?? 0);
  const totalBeds = Number(k.total_beds ?? 0);
  const occupied = Number(k.occupied_beds ?? 0);
  const occupancyPct = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
  const vacant = Math.max(0, totalBeds - occupied);
  const paidLoaded = Number(k.paid_total_loaded ?? 0);
  const pendingDues = Number(k.pending_total_loaded ?? 0);

  const last30 = data.collection_trend.reduce((s, p) => s + p.amount, 0);

  // This-month expenditure + rent collected (for P&L card)
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);
  const monthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const supabase = createTenantClient();
  const [expensesRes, monthPaymentsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("description, amount, category, spent_on")
      .gte("spent_on", monthStart)
      .lt("spent_on", monthEnd)
      .order("spent_on", { ascending: false }),
    supabase
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", monthStart)
      .lt("payment_date", monthEnd),
  ]);

  const monthExpenses =
    (expensesRes.data ?? []) as Array<{
      description: string;
      amount: number;
      category: string;
    }>;
  const monthSpent = monthExpenses.reduce(
    (s, e) => s + Number(e.amount ?? 0),
    0,
  );
  const monthCollected = (monthPaymentsRes.data ?? []).reduce(
    (s, p) => s + Number((p as { amount: number }).amount ?? 0),
    0,
  );
  const lastEntry = monthExpenses[0]
    ? {
        description: monthExpenses[0].description,
        amount: Number(monthExpenses[0].amount ?? 0),
      }
    : null;

  const breakdownMap = new Map<string, number>();
  for (const e of monthExpenses) {
    const cat = e.category ?? "other";
    breakdownMap.set(cat, (breakdownMap.get(cat) ?? 0) + Number(e.amount ?? 0));
  }
  const expenseBreakdown = Array.from(breakdownMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ChapterMark number={2} />
          <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
            The numbers
          </h2>
          <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
        </div>

        <MotionGrid className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <div className="lg:col-span-7 lg:row-span-2">
            <FeatureCollectedCard
              amount={last30}
              paidLifetime={paidLoaded}
              trend={data.collection_trend.map((p) => p.amount)}
              className="h-full"
            />
          </div>

          <BentoStat
            label="Occupancy"
            value={`${occupied}/${totalBeds || 0}`}
            icon={<Bed className="size-4" />}
            accent="amber"
            hint={
              <>
                {occupancyPct}% occupied ·{" "}
                <Link
                  href="/beds?status=available"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {vacant} vacant
                </Link>
              </>
            }
            footer={<OccupancyBar pct={occupancyPct} />}
            className="lg:col-span-5"
          />

          <BentoStat
            label="Active residents"
            value={<CountUp value={activeMembers} />}
            icon={<Users className="size-4" />}
            accent="cream"
            hint="Currently in-house"
            className="lg:col-span-3"
          />

          <BentoStat
            label="Pending dues"
            value={<CountUp value={pendingDues} format="inr" />}
            icon={<AlertCircle className="size-4" />}
            accent={pendingDues > 0 ? "rose" : "sage"}
            hint={
              data.outstanding_invoices.length > 0
                ? `${data.outstanding_invoices.length} invoice(s) waiting`
                : "All clear"
            }
            className="lg:col-span-2"
          />
        </MotionGrid>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ChapterMark number={3} />
          <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
            Money in, money out
          </h2>
          <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
        </div>

        <MotionGrid className="grid gap-4 lg:grid-cols-3">
          <MotionItem className="lg:col-span-2">
            <CollectionChart data={data.collection_trend} />
          </MotionItem>
          <MotionItem>
            <ExpenditureCard
              monthLabel={monthLabel}
              monthSpent={monthSpent}
              monthCollected={monthCollected}
              entryCount={monthExpenses.length}
              lastEntry={lastEntry}
              breakdown={expenseBreakdown}
            />
          </MotionItem>
        </MotionGrid>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ChapterMark number={4} />
          <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
            Needs your attention
          </h2>
          <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
        </div>

        <MotionGrid className="grid gap-4 lg:grid-cols-3">
          <MotionItem className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between font-display text-xl tracking-tight">
                  <span>Outstanding invoices</span>
                  <Link
                    href="/billing"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground"
                  >
                    All invoices
                    <ArrowRight className="size-3" />
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs">
                  Bills still to be collected
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.outstanding_invoices.length === 0 ? (
                  <div className="px-4 pb-6 pt-2">
                    <EmptyState
                      icon={<Sparkles className="size-6" strokeWidth={1.75} />}
                      tone="celebrate"
                      title="Everything is paid 🎉"
                      description="No invoices outstanding. Your collections are caught up — keep it that way and you sleep well at month-end."
                      actionHref="/billing/new"
                      actionLabel="Create next invoice"
                    />
                  </div>
                ) : (
                  <ul className="divide-y">
                    {data.outstanding_invoices.map((inv) => (
                      <li key={inv.id}>
                        <Link
                          href={`/billing/${inv.id}`}
                          className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-display text-base tracking-tight group-hover:text-primary">
                              {inv.invoice_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Due{" "}
                              {inv.due_date
                                ? new Date(inv.due_date).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short" },
                                  )
                                : "—"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-display text-lg italic tabular-nums">
                              {formatINR(Number(inv.total_amount ?? 0))}
                            </span>
                            <StatusBadge status={inv.status} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </MotionItem>

          <MotionItem>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between font-display text-xl tracking-tight">
                  <span>Urgent tickets</span>
                  <Link
                    href="/maintenance"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground"
                  >
                    All
                    <ArrowRight className="size-3" />
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs">
                  Open or in-progress
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.urgent_tickets.length === 0 ? (
                  <div className="px-4 pb-6 pt-2">
                    <EmptyState
                      icon={<Wrench className="size-6" strokeWidth={1.75} />}
                      title="Nothing broken right now"
                      description="When a resident raises something, it lands here first."
                    />
                  </div>
                ) : (
                  <ul className="divide-y">
                    {data.urgent_tickets.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/maintenance/${t.id}`}
                          className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium group-hover:text-primary">
                              {t.title}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <PriorityDot priority={t.priority} />
                              <span className="text-xs capitalize text-muted-foreground">
                                {t.priority}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={t.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </MotionItem>
        </MotionGrid>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ChapterMark number={5} />
          <h2 className="font-display text-lg italic tracking-tight text-foreground/70">
            What just happened
          </h2>
          <HairlineRule className="ml-2 h-px flex-1 text-foreground/15" />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between font-display text-xl tracking-tight">
              <span>Recent activity</span>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground"
              >
                <BarChart3 className="size-3" />
                Reports
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ActivityFeed rows={data.recent_activity} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-amber-600 transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const color =
    priority === "urgent"
      ? "bg-destructive"
      : priority === "high"
        ? "bg-warning"
        : priority === "medium"
          ? "bg-info"
          : "bg-muted-foreground/50";
  return <span className={cn("size-1.5 rounded-full", color)} />;
}

function QuickAction({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <MotionItem>
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 text-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.18)]"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-700 transition-colors group-hover:bg-amber-500 group-hover:text-white">
            {icon}
          </span>
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </MotionItem>
  );
}
