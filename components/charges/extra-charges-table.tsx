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
  deleteExtraCharge,
  deleteExtraChargesBulk,
} from "@/app/actions/extra-charges";

export type ExtraChargeRow = {
  id: string;
  charge_date: string;
  billing_month: string | null;
  charge_type: string | null;
  description: string | null;
  amount: number;
  member: { id: string; name: string } | null;
};

export function ExtraChargesTable({
  charges,
}: {
  charges: ExtraChargeRow[];
}) {
  const router = useRouter();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const allIds = React.useMemo(() => charges.map((c) => c.id), [charges]);
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
      const res = await deleteExtraChargesBulk(ids);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.deleted ?? ids.length;
      toast.success(`Deleted ${n} charge${n === 1 ? "" : "s"}`);
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
            disabled={charges.length === 0}
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
                    aria-label="Select all charges"
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
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <TableRow
                  key={c.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  {selectMode ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select charge for ${c.member?.name ?? c.id.slice(0, 8)}`}
                        disabled={pending}
                        className="size-4 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={(e) => toggleOne(c.id, e.target.checked)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>{c.charge_date}</TableCell>
                  <TableCell className="font-medium">
                    {c.member?.name ?? "—"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {c.charge_type?.replace(/_/g, " ") ?? "—"}
                  </TableCell>
                  <TableCell>{c.description ?? "—"}</TableCell>
                  <TableCell>
                    {c.billing_month ? c.billing_month.slice(0, 7) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₹{Number(c.amount ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowDeleteButton
                      id={c.id}
                      action={deleteExtraCharge}
                      confirmTitle="Delete charge?"
                      confirmDescription={`₹${Number(c.amount ?? 0).toLocaleString("en-IN")} · ${c.member?.name ?? "—"} · ${c.charge_type ?? "charge"}. This cannot be undone.`}
                      success="Charge deleted"
                      label="Delete charge"
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
        title={`Delete ${selected.size} charge${selected.size === 1 ? "" : "s"}?`}
        description="The amounts will be removed from each member's ledger. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
