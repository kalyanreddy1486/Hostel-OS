"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExpenseByCategory = { category: string; amount: number };

type Props = {
  monthLabel: string; // "April 2026"
  monthSpent: number;
  monthCollected: number;
  entryCount: number;
  lastEntry: { description: string; amount: number } | null;
  breakdown: ExpenseByCategory[];
};

const CATEGORY_LABELS: Record<string, string> = {
  rent_paid: "Rent paid",
  supplies: "Supplies",
  utilities: "Utilities",
  maintenance: "Maintenance",
  staff: "Staff",
  food: "Food",
  other: "Other",
};

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function ExpenditureCard({
  monthLabel,
  monthSpent,
  monthCollected,
  entryCount,
  lastEntry,
  breakdown,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const net = monthCollected - monthSpent;

  return (
    <>
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              Expenditure
            </span>
            <Link
              href="/expenses"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              All →
            </Link>
          </CardTitle>
          <CardDescription className="text-xs">
            {monthLabel} · what you&apos;ve spent on the hostel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div>
            <div className="tabular-nums text-3xl font-semibold leading-none tracking-tight">
              {formatINR(monthSpent)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {entryCount} {entryCount === 1 ? "entry" : "entries"}
              {lastEntry ? (
                <>
                  {" · last: "}
                  <span className="text-foreground/70">
                    {lastEntry.description}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/expenses"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              + Add expense
            </Link>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              Calculate P&amp;L
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profit &amp; loss · {monthLabel}</DialogTitle>
            <DialogDescription>
              Rent collected this month against everything you&apos;ve logged
              as an expense.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Row
              label="Rent collected"
              value={formatINR(monthCollected)}
              positive
            />
            <Row
              label="Expenses"
              value={`− ${formatINR(monthSpent)}`}
              negative
            />
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net</span>
                <NetBadge value={net} />
              </div>
            </div>

            {breakdown.length > 0 ? (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Expense breakdown
                </p>
                <ul className="space-y-1.5 text-sm">
                  {breakdown.map((b) => (
                    <li
                      key={b.category}
                      className="flex items-center justify-between tabular-nums"
                    >
                      <span className="text-muted-foreground">
                        {CATEGORY_LABELS[b.category] ?? b.category}
                      </span>
                      <span className="font-medium">
                        {formatINR(b.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No expenses logged yet this month. Add your first one →{" "}
                <Link
                  href="/expenses"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Expenses page
                </Link>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums font-medium",
          positive && "text-success",
          negative && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function NetBadge({ value }: { value: number }) {
  const neutral = Math.round(value) === 0;
  const positive = value > 0;
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown;
  const cls = neutral
    ? "bg-muted text-muted-foreground"
    : positive
      ? "bg-success/10 text-success"
      : "bg-destructive/10 text-destructive";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
        cls,
      )}
    >
      <Icon className="size-3.5" />
      {value >= 0 ? formatINR(value) : `− ${formatINR(Math.abs(value))}`}
    </span>
  );
}
