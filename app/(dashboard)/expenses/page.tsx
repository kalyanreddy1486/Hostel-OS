import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { createTenantClient } from "@/lib/backend/supabase";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { addExpense } from "@/app/actions/expenses";
import { ExpensesTable } from "@/components/expenses/expenses-table";

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: string;
  spent_on: string;
  notes: string | null;
  created_at: string;
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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { month?: string; category?: string };
}) {
  await requireStaffOrAdmin();
  const supabase = createTenantClient();

  const today = new Date();
  const thisMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = searchParams.month ?? thisMonth;
  const categoryFilter = searchParams.category ?? "";

  const from = `${selectedMonth}-01`;
  const nextMonthDate = new Date(`${selectedMonth}-01T00:00:00Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const to = nextMonthDate.toISOString().slice(0, 10);

  const q = supabase
    .from("expenses")
    .select("id, description, amount, category, spent_on, notes, created_at")
    .gte("spent_on", from)
    .lt("spent_on", to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (categoryFilter) q.eq("category", categoryFilter);

  const { data: rows, error } = await q;
  const expenses = (rows ?? []) as ExpenseRow[];
  const total = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Revenue"
        title="Expenditure"
        description="Track what you spend on the hostel. Use P&L on the dashboard to see profit / loss against rent collected."
        actions={
          <PageActions
            secondary={[
              { label: "Dashboard", href: "/dashboard", icon: ArrowLeft },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-muted-foreground" />
            Add expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={addExpense}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="description">What for *</Label>
              <Input
                id="description"
                name="description"
                required
                placeholder="e.g. Cleaning supplies, plumber visit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                name="category"
                required
                defaultValue="other"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spent_on">Date *</Label>
              <Input
                id="spent_on"
                name="spent_on"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Receipt no., vendor, anything useful"
              />
            </div>
            <div className="flex items-end">
              <SubmitButton className="w-full" pendingLabel="Adding…">
                Add expense
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {new Date(`${selectedMonth}-01`).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} ·{" "}
            <span className="font-semibold text-foreground tabular-nums">
              ₹{total.toLocaleString("en-IN")}
            </span>{" "}
            spent
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            method="get"
            className="flex flex-wrap items-end gap-2 border-b pb-3"
          >
            <div className="space-y-1">
              <Label htmlFor="month" className="text-xs">
                Month
              </Label>
              <Input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedMonth}
                className="h-8 w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">
                Category
              </Label>
              <select
                id="category"
                name="category"
                defaultValue={categoryFilter}
                className="h-8 w-44 rounded-md border border-input bg-background px-2.5 text-sm"
              >
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Apply
            </Button>
            {categoryFilter || selectedMonth !== thisMonth ? (
              <Link
                href="/expenses"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Reset
              </Link>
            ) : null}
          </form>

          {error ? (
            <p className="text-sm text-destructive">
              Failed to load expenses: {error.message}
            </p>
          ) : null}

          {expenses.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No expenses logged for this period. Add one above.
            </p>
          ) : (
            <ExpensesTable expenses={expenses} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
