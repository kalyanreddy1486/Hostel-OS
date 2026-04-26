import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { serverFetch } from "@/lib/server/origin";
import { TicketPanel } from "@/components/maintenance/ticket-panel";

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  issue_type: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  raised_by_name: string | null;
  raised_by_room_label: string | null;
  raised_by_phone: string | null;
  room: { id: string; room_number: string | null } | null;
  raised_by_member: { id: string; name: string; phone: string | null } | null;
  assignee: { id: string; full_name: string | null; role: string } | null;
};

type Staff = { id: string; full_name: string | null; role: string };

const priorityClasses: Record<Ticket["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-600/15 text-sky-900 dark:text-sky-300",
  high: "bg-orange-500/15 text-orange-900 dark:text-orange-300",
  urgent: "bg-red-600/15 text-red-800 dark:text-red-400",
};

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaffOrAdmin();

  const res = await serverFetch(`/api/maintenance/${params.id}`, {
    cache: "no-store",
  });
  if (res.status === 404) notFound();

  const body = (await res.json()) as
    | { ticket: Ticket; staff: Staff[] }
    | { error: string };
  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load ticket:{" "}
        {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const { ticket, staff } = body;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ticket.title}
          </h1>
          <p className="text-muted-foreground">
            Opened {new Date(ticket.created_at).toLocaleString("en-IN")}
            {ticket.resolved_at
              ? ` · Resolved ${new Date(ticket.resolved_at).toLocaleString("en-IN")}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn("capitalize", priorityClasses[ticket.priority])}
          >
            {ticket.priority}
          </Badge>
          <StatusBadge status={ticket.status} />
          <Link
            href="/maintenance"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              {ticket.issue_type ?? "Unspecified"} ·{" "}
              {ticket.room?.room_number
                ? `Room ${ticket.room.room_number}`
                : ticket.raised_by_room_label
                  ? `Room ${ticket.raised_by_room_label}`
                  : "No room"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ticket.description ? (
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            ) : (
              <p className="text-muted-foreground">
                No description provided.
              </p>
            )}
            {ticket.raised_by_member ? (
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Raised by</p>
                <p className="font-medium">{ticket.raised_by_member.name}</p>
                {ticket.raised_by_member.phone ? (
                  <p className="text-xs text-muted-foreground">
                    {ticket.raised_by_member.phone}
                  </p>
                ) : null}
                <Link
                  href={`/members/${ticket.raised_by_member.id}`}
                  className="mt-1 block text-xs underline underline-offset-4"
                >
                  Open member →
                </Link>
              </div>
            ) : ticket.raised_by_name ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Raised by</p>
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 text-xs uppercase tracking-widest text-amber-800 dark:text-amber-300"
                  >
                    Public submission
                  </Badge>
                </div>
                <p className="font-medium">{ticket.raised_by_name}</p>
                <p className="text-xs text-muted-foreground">
                  Room {ticket.raised_by_room_label ?? "—"}
                  {ticket.raised_by_phone ? ` · ${ticket.raised_by_phone}` : ""}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketPanel
              id={ticket.id}
              status={ticket.status}
              priority={ticket.priority}
              assignedTo={ticket.assigned_to}
              staff={staff}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
