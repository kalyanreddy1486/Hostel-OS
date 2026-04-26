"use client";

import * as React from "react";
import Link from "next/link";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhatsAppReminderButton } from "@/components/shared/whatsapp-reminder-button";
import { EmailInvoiceButton } from "@/components/billing/email-invoice-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteInvoicesBulk } from "@/app/actions/invoices";

export type BillingInvoiceRow = {
  id: string;
  invoice_number: string | null;
  billing_month: string | null;
  due_date: string | null;
  status: "pending" | "paid" | "overdue" | "partial";
  total_amount: number;
  member: {
    id: string;
    name: string;
    phone: string | null;
    email?: string | null;
  } | null;
  upi_link?: string | null;
  claim_link?: string | null;
  report_link?: string | null;
};

type BillingTableProps = {
  invoices: BillingInvoiceRow[];
  /** Custom WhatsApp template from settings; null → use built-in default. */
  whatsappTemplate?: string | null;
  /** Plain UPI VPA from settings, shown as copyable text in the reminder. */
  upiVpa?: string | null;
};

export function BillingTable({
  invoices,
  whatsappTemplate,
  upiVpa,
}: BillingTableProps) {
  const router = useRouter();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const allIds = React.useMemo(() => invoices.map((i) => i.id), [invoices]);
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
      const res = await deleteInvoicesBulk(ids);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Deleted ${res.deleted ?? ids.length} invoice${(res.deleted ?? ids.length) === 1 ? "" : "s"}`,
      );
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
            disabled={invoices.length === 0}
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
                    aria-label="Select all invoices"
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
              <TableHead>Invoice</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Billing month</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => {
              const isSelected = selected.has(i.id);
              return (
                <TableRow
                  key={i.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(i.status === "overdue" && "row-overdue")}
                >
                  {selectMode ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select invoice ${i.invoice_number ?? i.id.slice(0, 8)}`}
                        disabled={pending}
                        className="size-4 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={(e) => toggleOne(i.id, e.target.checked)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    {i.invoice_number ?? i.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{i.member?.name ?? "—"}</TableCell>
                  <TableCell>
                    {i.billing_month ? i.billing_month.slice(0, 7) : "—"}
                  </TableCell>
                  <TableCell>{i.due_date ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ₹{Number(i.total_amount ?? 0).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {i.status !== "paid" && i.member ? (
                        <WhatsAppReminderButton
                          phone={i.member.phone}
                          memberName={i.member.name}
                          amount={Number(i.total_amount ?? 0)}
                          invoiceNumber={i.invoice_number}
                          dueDate={i.due_date}
                          billingMonth={i.billing_month}
                          upiVpa={upiVpa ?? null}
                          upiLink={i.upi_link ?? null}
                          claimLink={i.claim_link ?? null}
                          reportLink={i.report_link ?? null}
                          template={whatsappTemplate ?? null}
                        />
                      ) : null}
                      {i.status !== "paid" && i.member ? (
                        <EmailInvoiceButton
                          invoiceId={i.id}
                          memberEmail={i.member.email ?? null}
                        />
                      ) : null}
                      <Link
                        href={`/billing/${i.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        View
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!invoices.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No invoices yet. Create your first invoice to get started.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 sm:hidden">
        {invoices.length === 0 ? (
          <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No invoices yet. Create your first invoice to get started.
          </p>
        ) : (
          invoices.map((i) => {
            const isSelected = selected.has(i.id);
            const total = Number(i.total_amount ?? 0);
            return (
              <div
                key={i.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  isSelected && "border-primary/40 bg-primary/[0.03]",
                )}
              >
                <div className="flex items-start gap-3">
                  {selectMode ? (
                    <input
                      type="checkbox"
                      aria-label={`Select invoice ${i.invoice_number ?? i.id.slice(0, 8)}`}
                        disabled={pending}
                      className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
                      checked={isSelected}
                      onChange={(e) => toggleOne(i.id, e.target.checked)}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {i.member?.name ?? "—"}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {i.invoice_number ?? i.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums">
                          ₹{total.toLocaleString("en-IN")}
                        </span>
                        <StatusBadge status={i.status} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        Month{" "}
                        <span className="text-foreground">
                          {i.billing_month ? i.billing_month.slice(0, 7) : "—"}
                        </span>
                      </span>
                      <span>
                        Due{" "}
                        <span className="text-foreground">
                          {i.due_date ?? "—"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end gap-1.5">
                      {i.status !== "paid" && i.member ? (
                        <WhatsAppReminderButton
                          phone={i.member.phone}
                          memberName={i.member.name}
                          amount={total}
                          invoiceNumber={i.invoice_number}
                          dueDate={i.due_date}
                          billingMonth={i.billing_month}
                          upiVpa={upiVpa ?? null}
                          upiLink={i.upi_link ?? null}
                          claimLink={i.claim_link ?? null}
                          reportLink={i.report_link ?? null}
                          template={whatsappTemplate ?? null}
                        />
                      ) : null}
                      {i.status !== "paid" && i.member ? (
                        <EmailInvoiceButton
                          invoiceId={i.id}
                          memberEmail={i.member.email ?? null}
                        />
                      ) : null}
                      <Link
                        href={`/billing/${i.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-7 px-2.5 text-xs",
                        )}
                      >
                        View
                      </Link>
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
        title={`Delete ${selected.size} invoice${selected.size === 1 ? "" : "s"}?`}
        description="This will permanently remove the selected invoices and their history. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
