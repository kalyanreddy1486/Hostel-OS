"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicket, deleteTicket } from "@/app/actions/maintenance";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type Status = "open" | "in_progress" | "resolved" | "closed";
type Priority = "low" | "medium" | "high" | "urgent";

type Staff = { id: string; full_name: string | null; role: string };

export function TicketPanel({
  id,
  status,
  priority,
  assignedTo,
  staff,
}: {
  id: string;
  status: Status;
  priority: Priority;
  assignedTo: string | null;
  staff: Staff[];
}) {
  const router = useRouter();
  const [s, setS] = useState<Status>(status);
  const [p, setP] = useState<Priority>(priority);
  const [a, setA] = useState<string>(assignedTo ?? "");
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty =
    s !== status || p !== priority || (a || null) !== (assignedTo ?? null);

  function save() {
    startSave(async () => {
      const res = await updateTicket(id, {
        status: s,
        priority: p,
        assigned_to: a || null,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Ticket updated");
      router.refresh();
    });
  }

  function onDelete() {
    startDelete(async () => {
      const res = await deleteTicket(id);
      if (res && typeof res === "object" && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Ticket deleted");
      window.location.href = "/maintenance";
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          value={s}
          onChange={(e) => setS(e.target.value as Status)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Priority
        </label>
        <select
          value={p}
          onChange={(e) => setP(e.target.value as Priority)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Assigned to
        </label>
        <select
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Unassigned</option>
          {staff.map((st) => (
            <option key={st.id} value={st.id}>
              {st.full_name ?? st.id.slice(0, 8)} ({st.role})
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={save}
        disabled={!dirty || saving}
        className="w-full"
        size="sm"
      >
        {saving ? "Saving…" : "Save"}
      </Button>

      <Button
        onClick={() => setConfirmOpen(true)}
        // Block delete while a save is in flight too — otherwise a user
        // could update + delete in the same moment, racing the audit log.
        disabled={deleting || saving}
        className="w-full"
        variant="destructive"
        size="sm"
      >
        {deleting ? "Deleting…" : "Delete ticket"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this ticket permanently?"
        description="The ticket and its history will be removed. This cannot be undone."
        confirmText="Delete ticket"
        variant="destructive"
        pending={deleting}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}
