"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";

type Point = { date: string; amount: number; count: number };

const CollectionChartImpl = dynamic(
  () =>
    import("./collection-chart-impl").then((m) => ({
      default: m.CollectionChart,
    })),
  {
    ssr: false,
    loading: () => <CollectionChartSkeleton />,
  },
);

export function CollectionChart({ data }: { data: Point[] }) {
  return <CollectionChartImpl data={data} />;
}

function CollectionChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-7 w-28 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
        <div className="-mx-2 mt-5 h-44 rounded-lg bg-muted/40" />
      </CardContent>
    </Card>
  );
}
