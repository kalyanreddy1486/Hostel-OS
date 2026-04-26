import { Suspense } from "react";
import { Receipt, Wrench } from "lucide-react";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeading } from "@/components/ui/page-heading";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";
import { BillingBarChart } from "@/components/reports/billing-bar-chart";
import { PaymentMixChart } from "@/components/reports/payment-mix-chart";

type ReportBody = {
  occupancy: { total_beds: number; occupied_beds: number; pct: number };
  by_month: {
    month: string;
    billed: number;
    collected: number;
    outstanding: number;
  }[];
  payment_modes: Record<string, number>;
  ticket_stats: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    urgent: number;
  };
};

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { months?: string };
}) {
  // Auth FIRST — never render anything for an unauthorised viewer.
  await requireStaffOrAdmin();
  const months = Math.max(3, Math.min(12, Number(searchParams.months ?? 6)));

  // Heading + window selector render synchronously. Heavy aggregation
  // streams in via Suspense below.
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Reports"
        title={`Last ${months} months`}
        description="Aggregated billing, collections, and maintenance"
        actions={
          <form method="get" className="flex items-center gap-2">
            <label
              className="text-xs uppercase tracking-widest text-muted-foreground"
              htmlFor="months"
            >
              Window
            </label>
            <select
              id="months"
              name="months"
              defaultValue={months}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Apply
            </button>
          </form>
        }
      />

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent months={months} />
      </Suspense>
    </div>
  );
}

async function ReportsContent({ months }: { months: number }) {
  const res = await serverFetch(`/api/reports?months=${months}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as ReportBody | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load reports:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const totalBilled = body.by_month.reduce((s, m) => s + m.billed, 0);
  const totalCollected = body.by_month.reduce((s, m) => s + m.collected, 0);
  const totalOutstanding = body.by_month.reduce(
    (s, m) => s + m.outstanding,
    0,
  );
  const collectionRate =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const last = body.by_month[body.by_month.length - 1];
  const prev = body.by_month[body.by_month.length - 2];
  const collectedMoM =
    prev && prev.collected > 0
      ? Math.round(((last.collected - prev.collected) / prev.collected) * 100)
      : null;

  const paymentMix = Object.entries(body.payment_modes)
    .map(([mode, amount]) => ({ mode, amount }))
    .sort((a, b) => b.amount - a.amount);

  const ticketStats = [
    { label: "Open", value: body.ticket_stats.open, tone: "warning" as const },
    {
      label: "In progress",
      value: body.ticket_stats.in_progress,
      tone: "info" as const,
    },
    {
      label: "Resolved",
      value: body.ticket_stats.resolved,
      tone: "success" as const,
    },
    {
      label: "Closed",
      value: body.ticket_stats.closed,
      tone: "default" as const,
    },
    {
      label: "Urgent",
      value: body.ticket_stats.urgent,
      tone: "destructive" as const,
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy"
          value={`${body.occupancy.pct}%`}
          hint={`${body.occupancy.occupied_beds} of ${body.occupancy.total_beds} beds`}
          accent="info"
        />
        <StatCard
          label="Billed"
          value={formatINR(totalBilled)}
          hint={`${body.by_month.length} months`}
        />
        <StatCard
          label="Collected"
          value={formatINR(totalCollected)}
          hint={`${collectionRate}% collection rate`}
          accent="success"
          trend={
            collectedMoM !== null
              ? {
                  direction:
                    collectedMoM > 0 ? "up" : collectedMoM < 0 ? "down" : "flat",
                  label: `${collectedMoM > 0 ? "+" : ""}${collectedMoM}% MoM`,
                }
              : undefined
          }
        />
        <StatCard
          label="Outstanding"
          value={formatINR(totalOutstanding)}
          hint="Unpaid / partial / overdue"
          accent={totalOutstanding > 0 ? "destructive" : "success"}
        />
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" />
            Billing vs collection
          </CardTitle>
          <CardDescription>
            Monthly totals — billed, collected, outstanding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingBarChart data={body.by_month} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Payment mix</CardTitle>
          <CardDescription>Collected by channel</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMixChart data={paymentMix} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            Maintenance
          </CardTitle>
          <CardDescription>Ticket volume by state</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ticketStats.map((s) => (
            <TicketStat key={s.label} {...s} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-foreground/[0.06] ${className}`}
      style={style}
    />
  );
}

function ReportsSkeleton() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-8 w-28" />
            <Bone className="mt-3 h-3 w-32" />
          </div>
        ))}
      </section>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground" />
            Billing vs collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-end gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <Bone
                key={i}
                className="w-full"
                style={{ height: `${30 + ((i * 11) % 65)}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Payment mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-background p-4">
              <Bone className="mx-auto h-7 w-12" />
              <Bone className="mx-auto mt-2 h-3 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function TicketStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "info" | "destructive";
}) {
  const ringClass = {
    default: "",
    success: "ring-success/30",
    warning: "ring-warning/30",
    info: "ring-info/30",
    destructive: "ring-destructive/30",
  }[tone];
  const textClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    info: "text-info",
    destructive: "text-destructive",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4 text-center ring-1 ring-transparent transition-all hover:ring-2",
        ringClass,
      )}
    >
      <div className={cn("tabular-nums text-2xl font-semibold", textClass)}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
