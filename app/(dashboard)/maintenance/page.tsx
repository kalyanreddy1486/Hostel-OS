import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";
import { EmptyState } from "@/components/shared/empty-state";
import { Wrench, Plus } from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { FilterForm } from "@/components/shared/filter-form";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  issue_type: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  resolved_at: string | null;
  raised_by_name: string | null;
  raised_by_room_label: string | null;
  raised_by_phone: string | null;
  room: { id: string; room_number: string | null } | null;
  raised_by_member: { id: string; name: string } | null;
  assignee: { id: string; full_name: string | null; role: string } | null;
};

const priorityClasses: Record<Ticket["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-600/15 text-sky-900 dark:text-sky-300",
  high: "bg-orange-500/15 text-orange-900 dark:text-orange-300",
  urgent: "bg-red-600/15 text-red-800 dark:text-red-400",
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  await requireStaffOrAdmin();

  const status = searchParams.status ?? "";
  const priority = searchParams.priority ?? "";
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (priority) qs.set("priority", priority);

  const res = await serverFetch(`/api/maintenance?${qs}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as
    | { tickets: Ticket[] }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load tickets:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const tickets = body.tickets;
  const openCount = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Operations"
        title="Maintenance"
        description={`${openCount} open · ${tickets.length} total`}
        actions={
          <PageActions
            primary={{ label: "New ticket", href: "/maintenance/new", icon: Plus }}
          />
        }
      />

      <FilterForm className="flex flex-wrap gap-2">
        <FormSelect name="status" defaultValue={status} className="w-44">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </FormSelect>
        <FormSelect name="priority" defaultValue={priority} className="w-44">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </FormSelect>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {status || priority ? (
          <Link
            href="/maintenance"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Clear
          </Link>
        ) : null}
      </FilterForm>

      <div className="hidden rounded-md border bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Raised by</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Raised</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => {
              const raisedByLabel =
                t.raised_by_member?.name ??
                t.raised_by_name ??
                "—";
              const roomLabel =
                t.room?.room_number ?? t.raised_by_room_label ?? "—";
              const isPublic = !t.raised_by_member && !!t.raised_by_name;
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span>{raisedByLabel}</span>
                      {isPublic ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-xs uppercase tracking-widest text-amber-800 dark:text-amber-300"
                        >
                          Public
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{roomLabel}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("capitalize", priorityClasses[t.priority])}
                    >
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>{t.assignee?.full_name ?? "Unassigned"}</TableCell>
                  <TableCell>
                    {new Date(t.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/maintenance/${t.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!tickets.length ? (
          <div className="p-4">
            <EmptyState
              icon={<Wrench className="size-6" strokeWidth={1.75} />}
              title="No maintenance tickets"
              description="Ticket activity will show up here — residents can raise them from their portal, or staff can log one on behalf."
              actionHref="/maintenance/new"
              actionLabel="Raise ticket"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 sm:hidden">
        {tickets.length === 0 ? (
          <div className="rounded-md border bg-card p-4">
            <EmptyState
              icon={<Wrench className="size-6" strokeWidth={1.75} />}
              title="No maintenance tickets"
              description="Ticket activity will show up here — residents can raise them from their portal, or staff can log one on behalf."
              actionHref="/maintenance/new"
              actionLabel="Raise ticket"
            />
          </div>
        ) : (
          tickets.map((t) => {
            const raisedByLabel =
              t.raised_by_member?.name ?? t.raised_by_name ?? "—";
            const roomLabel =
              t.room?.room_number ?? t.raised_by_room_label ?? "—";
            const isPublic = !t.raised_by_member && !!t.raised_by_name;
            return (
              <Link
                key={t.id}
                href={`/maintenance/${t.id}`}
                className="block rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {t.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{raisedByLabel}</span>
                      {isPublic ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-[10px] uppercase tracking-widest text-amber-800 dark:text-amber-300"
                        >
                          Public
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      priorityClasses[t.priority],
                    )}
                  >
                    {t.priority}
                  </Badge>
                  <span>
                    Room <span className="text-foreground">{roomLabel}</span>
                  </span>
                  <span className="ml-auto">
                    {new Date(t.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {t.assignee?.full_name ? (
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    Assigned to{" "}
                    <span className="text-foreground">
                      {t.assignee.full_name}
                    </span>
                  </div>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
