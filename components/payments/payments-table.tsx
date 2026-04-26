"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckSquare, Trash2, X, FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RowDeleteButton } from "@/components/shared/row-delete-button";
import {
  deletePayment,
  deletePaymentsBulk,
} from "@/app/actions/payments";

export type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  transaction_reference: string | null;
  notes: string | null;
  member: { id: string; name: string; phone: string | null } | null;
  invoice: {
    id: string;
    invoice_number: string;
    billing_month: string | null;
  } | null;
};

function formatINR(n: number) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const allIds = React.useMemo(() => payments.map((p) => p.id), [payments]);
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

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(allIds) : new Set());
  };

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
      const res = await deletePaymentsBulk(ids);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.deleted ?? ids.length;
      toast.success(`Deleted ${n} payment${n === 1 ? "" : "s"}`);
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
            disabled={payments.length === 0}
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

      <div className="hidden rounded-md border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all payments"
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
              <TableHead>Member</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <TableRow
                  key={p.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  {selectMode ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select payment ${p.id.slice(0, 8)}`}
                        disabled={pending}
                        className="size-4 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={(e) => toggleOne(p.id, e.target.checked)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="font-medium">
                    {p.member?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {p.invoice ? (
                      <Link
                        href={`/billing/${p.invoice.id}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {p.invoice.invoice_number}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {p.payment_mode.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.transaction_reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatINR(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Link
                        href={`/api/payments/${p.id}/receipt`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <FileDown className="size-3" />
                        PDF
                      </Link>
                      <RowDeleteButton
                        id={p.id}
                        action={deletePayment}
                        confirmTitle="Delete this payment?"
                        confirmDescription={`${formatINR(p.amount)} on ${formatDate(p.payment_date)}. This will recompute the invoice's status.`}
                        success="Payment deleted"
                        label="Delete payment"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!payments.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No payments match your filters.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 sm:hidden">
        {payments.length === 0 ? (
          <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No payments match your filters.
          </p>
        ) : (
          payments.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  isSelected && "border-primary/40 bg-primary/[0.03]",
                )}
              >
                <div className="flex items-start gap-3">
                  {selectMode ? (
                    <input
                      type="checkbox"
                      aria-label={`Select payment ${p.id.slice(0, 8)}`}
                        disabled={pending}
                      className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
                      checked={isSelected}
                      onChange={(e) => toggleOne(p.id, e.target.checked)}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {p.member?.name ?? "—"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(p.payment_date)} ·{" "}
                          <span className="capitalize">
                            {p.payment_mode.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatINR(p.amount)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="min-w-0 truncate">
                        Inv{" "}
                        {p.invoice ? (
                          <Link
                            href={`/billing/${p.invoice.id}`}
                            className="font-mono text-foreground underline-offset-4 hover:underline"
                          >
                            {p.invoice.invoice_number}
                          </Link>
                        ) : (
                          <span>—</span>
                        )}
                      </span>
                      <span className="min-w-0 truncate font-mono">
                        {p.transaction_reference ?? "—"}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end gap-1.5">
                      <Link
                        href={`/api/payments/${p.id}/receipt`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <FileDown className="size-3" />
                        PDF
                      </Link>
                      <RowDeleteButton
                        id={p.id}
                        action={deletePayment}
                        confirmTitle="Delete this payment?"
                        confirmDescription={`${formatINR(p.amount)} on ${formatDate(p.payment_date)}. This will recompute the invoice's status.`}
                        success="Payment deleted"
                        label="Delete payment"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selected.size} payment${selected.size === 1 ? "" : "s"}?`}
        description="The linked invoices will recompute their paid/partial/pending status. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
