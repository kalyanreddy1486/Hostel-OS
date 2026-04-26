"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

type Point = { date: string; amount: number; count: number };

export function CollectionChart({ data }: { data: Point[] }) {
  const total = data.reduce((s, p) => s + p.amount, 0);
  const paymentsCount = data.reduce((s, p) => s + p.count, 0);

  return (
    <Card>
      <CardContent className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Collections · last 30 days
            </div>
            <div className="mt-1 tabular-nums text-2xl font-semibold leading-none tracking-tight">
              ₹{total.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {paymentsCount} payments
            </div>
          </div>
        </div>

        <div className="-mx-2 mt-5 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 6"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(d) => format(parseISO(d), "d MMM")}
                interval="preserveStartEnd"
                minTickGap={48}
              />
              <YAxis
                hide
                domain={[0, (max: number) => Math.max(500, max * 1.2)]}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#collectionFill)"
                isAnimationActive
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Point }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-elevation-3">
      <div className="font-medium text-foreground">
        {format(parseISO(label), "EEE d MMM")}
      </div>
      <div className="mt-0.5 tabular-nums text-muted-foreground">
        ₹{p.amount.toLocaleString("en-IN")}{" "}
        <span className="text-xs">({p.count} pmts)</span>
      </div>
    </div>
  );
}
