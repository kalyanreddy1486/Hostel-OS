"use client";

import dynamic from "next/dynamic";

type Row = {
  month: string;
  billed: number;
  collected: number;
  outstanding: number;
};

const BillingBarChartImpl = dynamic(
  () =>
    import("./billing-bar-chart-impl").then((m) => ({
      default: m.BillingBarChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function BillingBarChart({ data }: { data: Row[] }) {
  return <BillingBarChartImpl data={data} />;
}

function ChartSkeleton() {
  return <div className="h-72 w-full animate-pulse rounded-lg bg-muted/40" />;
}
