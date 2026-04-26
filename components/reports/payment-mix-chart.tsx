"use client";

import dynamic from "next/dynamic";

const PaymentMixChartImpl = dynamic(
  () =>
    import("./payment-mix-chart-impl").then((m) => ({
      default: m.PaymentMixChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function PaymentMixChart({
  data,
}: {
  data: Array<{ mode: string; amount: number }>;
}) {
  return <PaymentMixChartImpl data={data} />;
}

function ChartSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded-lg bg-muted/40" />;
}
