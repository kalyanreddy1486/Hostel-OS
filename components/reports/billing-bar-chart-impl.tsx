"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  month: string;
  billed: number;
  collected: number;
  outstanding: number;
};

function formatMonth(m: string) {
  const d = new Date(`${m}-01`);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export function BillingBarChart({ data }: { data: Row[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 6"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={formatINR}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label) => formatMonth(String(label))}
            formatter={(v, name) => [
              `₹${Number(v ?? 0).toLocaleString("en-IN")}`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="billed"
            name="Billed"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            isAnimationActive
          />
          <Bar
            dataKey="collected"
            name="Collected"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
            isAnimationActive
          />
          <Bar
            dataKey="outstanding"
            name="Outstanding"
            fill="var(--chart-4)"
            radius={[4, 4, 0, 0]}
            isAnimationActive
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
