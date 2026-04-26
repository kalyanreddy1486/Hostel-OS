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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteMembersBulk } from "@/app/actions/members";

export type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  status: "active" | "pending" | "left";
  check_in_date: string | null;
  current_room_number: string | null;
  current_bed_number: string | null;
};

export function MembersTable({ members }: { members: MemberRow[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const allIds = React.useMemo(() => members.map((m) => m.id), [members]);
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
      const res = await deleteMembersBulk(ids);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const n = res.deleted ?? ids.length;
      if (res.failed && res.failed.length) {
        toast.warning(
          `Deleted ${n}, but ${res.failed.length} failed: ${res.failed[0].reason}`,
        );
      } else {
        toast.success(`Deleted ${n} member${n === 1 ? "" : "s"}`);
      }
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
            disabled={members.length === 0}
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
                    aria-label="Select all members"
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Room / bed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelected = selected.has(m.id);
              const loc =
                m.current_room_number && m.current_bed_number
                  ? `${m.current_room_number} / ${m.current_bed_number}`
                  : "—";
              return (
                <TableRow
                  key={m.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  {selectMode ? (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Select member ${m.name}`}
                        disabled={pending}
                        className="size-4 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={(e) => toggleOne(m.id, e.target.checked)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <Link
                      href={`/members/${m.id}`}
                      className="group/name flex items-center gap-2.5 transition-colors hover:text-primary"
                    >
                      <Avatar name={m.name} />
                      <span className="truncate">{m.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.phone ?? "—"}
                  </TableCell>
                  <TableCell>{loc}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell>{m.check_in_date ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/members/${m.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!members.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No members match your filters.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 sm:hidden">
        {members.length === 0 ? (
          <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No members match your filters.
          </p>
        ) : (
          members.map((m) => {
            const isSelected = selected.has(m.id);
            const loc =
              m.current_room_number && m.current_bed_number
                ? `${m.current_room_number} / ${m.current_bed_number}`
                : "—";
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  isSelected && "border-primary/40 bg-primary/[0.03]",
                )}
              >
                <div className="flex items-start gap-3">
                  {selectMode ? (
                    <input
                      type="checkbox"
                      aria-label={`Select member ${m.name}`}
                        disabled={pending}
                      className="mt-1.5 size-4 shrink-0 cursor-pointer accent-primary"
                      checked={isSelected}
                      onChange={(e) => toggleOne(m.id, e.target.checked)}
                    />
                  ) : null}
                  <Avatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/members/${m.id}`}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {m.name}
                      </Link>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {m.phone ?? "—"}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Room <span className="text-foreground">{loc}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Check-in{" "}
                        <span className="text-foreground">
                          {m.check_in_date ?? "—"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2.5 flex justify-end">
                      <Link
                        href={`/members/${m.id}`}
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
        title={`Delete ${selected.size} member${selected.size === 1 ? "" : "s"}?`}
        description="This also removes their assignments, invoices, and payment history. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        pending={pending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

/**
 * Initials avatar with a deterministic warm tint per name. Cheap, no extra
 * deps, but adds personality to a row of text.
 */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  // Hash → hue (warm range 20-60 for saffron/amber feel)
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = 20 + (h % 50);
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1 ring-black/5"
      style={{
        background: `oklch(0.92 0.06 ${hue})`,
        color: `oklch(0.32 0.12 ${hue})`,
      }}
    >
      {initials || "?"}
    </span>
  );
}
