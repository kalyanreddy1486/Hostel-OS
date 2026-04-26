"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckSquare, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RowDeleteButton } from "@/components/shared/row-delete-button";
import {
  deleteExpense,
  deleteExpensesBulk,
} from "@/app/actions/expenses";

export type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: string;
  spent_on: string;
  notes: string | null;
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

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const allIds = React.useMemo(() => expenses.map((e) => e.id), [expenses]);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(allIds) : new Set());

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const onConfirmDelete = () => {
    startTransition(async () => {
      const ids = Array.from(selected);
      const res = await deleteExpensesBulk(ids);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.deleted ?? ids.length;
      toast.success(`Deleted ${n} expense${n === 1 ? "" : "s"}`);
      setConfirmOpen(false);
      exitSelectMode();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {selectMode ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">
              {selected.size === 0
                ? "Tick the rows to select"
                : `${selected.size} selected`}
            </span>
            <span className="text-xs text-muted-foreground">
              (or use the top-left box to select all)
            </span>
            <button
              type="button"
              onClick={exitSelectMode}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Cancel
            </button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={enterSelectMode}
            disabled={expenses.length === 0}
          >
            <CheckSquare className="mr-1.5 size-3.5" />
            Select
          </Button>
        )}

        {selectMode && selected.size > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Delete {selected.size}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all expenses"
                    disabled={pending}
                    className="size-4 cursor-pointer accent-primary"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </TableHead>
              ) : null}
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => {
              const isSelected = selected.has(e.id);
              return (
                <TableRow
                  key={e.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  {selectMode ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select expense ${e.description}`}
                        disabled={pending}
                        className="size-4 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={(ev) => toggleOne(e.id, ev.target.checked)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>{e.spent_on}</TableCell>
                  <TableCell className="font-medium">
                    {e.description}
                    {e.notes ? (
                      <div className="text-xs font-normal text-muted-foreground">
                        {e.notes}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₹{Number(e.amount ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowDeleteButton
                      id={e.id}
                      action={deleteExpense}
                      confirmTitle="Delete expense?"
                      confirmDescription={`₹${Number(e.amount ?? 0).toLocaleString("en-IN")} · ${e.description}. This cannot be undone.`}
                      success="Expense deleted"
                      label="Delete expense"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selected.size} expense${selected.size === 1 ? "" : "s"}?`}
        description="The amounts will be removed from your P&L. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
