import Link from "next/link";
import {
  UserPlus,
  Bed,
  Receipt,
  CreditCard,
  Wrench,
  Zap,
  Building2,
  RefreshCcw,
  Trash2,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
};

const tableMeta: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    color: string;
    href?: (id: string | null) => string | null;
  }
> = {
  members: {
    icon: UserPlus,
    label: "Member",
    color: "bg-info/10 text-info",
    href: (id) => (id ? `/members/${id}` : null),
  },
  rooms: {
    icon: Building2,
    label: "Room",
    color: "bg-primary/10 text-primary",
    href: (id) => (id ? `/rooms/${id}` : null),
  },
  assignments: {
    icon: Bed,
    label: "Assignment",
    color: "bg-success/10 text-success",
  },
  invoices: {
    icon: Receipt,
    label: "Invoice",
    color: "bg-warning/15 text-warning-foreground",
    href: (id) => (id ? `/billing/${id}` : null),
  },
  payments: {
    icon: CreditCard,
    label: "Payment",
    color: "bg-success/10 text-success",
  },
  electricity_readings: {
    icon: Zap,
    label: "Electricity",
    color: "bg-warning/10 text-warning-foreground",
  },
  maintenance_tickets: {
    icon: Wrench,
    label: "Ticket",
    color: "bg-destructive/10 text-destructive",
    href: (id) => (id ? `/maintenance/${id}` : null),
  },
  extra_charges: {
    icon: Receipt,
    label: "Extra charge",
    color: "bg-warning/10 text-warning-foreground",
  },
  beds: {
    icon: Bed,
    label: "Bed",
    color: "bg-primary/10 text-primary",
  },
  audit_logs: {
    icon: RefreshCcw,
    label: "System",
    color: "bg-muted text-muted-foreground",
  },
};

function formatValue(s: string) {
  return s.replace(/_/g, " ");
}

const actionLabel: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  checkout: "checked out",
  assign: "assigned",
  status_change: "changed status",
};

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <RefreshCcw className="size-5" />
        <p>No activity yet. Changes will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row, i) => {
        const meta = tableMeta[row.table_name ?? ""] ?? {
          icon: RefreshCcw,
          label: row.table_name
            ? formatValue(row.table_name)
                .replace(/s$/, "")
                .replace(/^\w/, (c) => c.toUpperCase())
            : "Change",
          color: "bg-muted text-muted-foreground",
        };
        const Icon =
          row.action === "delete"
            ? Trash2
            : row.action === "checkout"
              ? LogOut
              : meta.icon;

        const label = actionLabel[row.action] ?? row.action;
        const href = meta.href?.(row.record_id) ?? null;
        const summary = describe(row);

        const body = (
          <div className="flex items-start gap-3 py-3">
            <span
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                meta.color,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <span className="font-medium">{meta.label}</span>{" "}
                <span className="text-muted-foreground">{label}</span>
                {summary ? (
                  <>
                    <span className="text-muted-foreground">{" · "}</span>
                    <span className="text-foreground/80">{summary}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(parseISO(row.created_at), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>
        );

        return (
          <li
            key={row.id}
            className={cn(i !== rows.length - 1 && "border-b")}
          >
            {href ? (
              <Link href={href} className="block px-4 hover:bg-muted/50">
                {body}
              </Link>
            ) : (
              <div className="px-4">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function describe(row: ActivityRow): string | null {
  const v = row.new_values ?? {};
  if (typeof v.name === "string") return v.name;
  if (typeof v.title === "string") return v.title;
  if (typeof v.invoice_number === "string") return v.invoice_number;
  if (typeof v.room_number === "string") return `Room ${v.room_number}`;
  if (typeof v.amount === "number") return `₹${v.amount.toLocaleString("en-IN")}`;
  if (typeof v.status === "string") return `→ ${formatValue(v.status)}`;
  return null;
}
