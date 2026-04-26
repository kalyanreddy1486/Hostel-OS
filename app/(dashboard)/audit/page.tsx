import Link from "next/link";
import { requireAdmin } from "@/lib/require-role";
import { createTenantClient } from "@/lib/backend/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";

type Row = {
  id: string;
  created_at: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  new_values: unknown;
  old_values: unknown;
  performed_by: string | null;
  performer: { full_name: string | null; role: string | null } | null;
};

const PAGE_SIZE = 50;

const ACTIONS = [
  "create",
  "update",
  "delete",
  "checkout",
  "assign",
  "status_change",
  "generate_invoices",
  "rent_reminder",
];

const TABLES = [
  "members",
  "invoices",
  "payments",
  "assignments",
  "maintenance_tickets",
  "extra_charges",
  "expenses",
  "rooms",
  "beds",
  "payment_inbox_events",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function recordHref(table: string | null, id: string | null): string | null {
  if (!id) return null;
  switch (table) {
    case "members":
      return `/members/${id}`;
    case "invoices":
      return `/billing/${id}`;
    case "maintenance_tickets":
      return `/maintenance/${id}`;
    case "rooms":
      return `/rooms/${id}`;
    default:
      return null;
  }
}

function summarize(row: Row): string {
  const v = (row.new_values ?? row.old_values) as Record<string, unknown> | null;
  if (!v) return "—";
  const keys = ["name", "invoice_number", "status", "amount", "total_amount", "title"];
  for (const k of keys) {
    if (v[k] != null && v[k] !== "") {
      return `${k}: ${String(v[k]).slice(0, 60)}`;
    }
  }
  const first = Object.entries(v).find(([, val]) => val != null && val !== "");
  return first ? `${first[0]}: ${String(first[1]).slice(0, 60)}` : "—";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: {
    action?: string;
    table?: string;
    q?: string;
    page?: string;
  };
}) {
  await requireAdmin();
  const supabase = createTenantClient();

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_logs")
    .select(
      "id, created_at, action, table_name, record_id, new_values, old_values, performed_by, performer:profiles!audit_logs_performed_by_fkey ( full_name, role )",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.action) {
    query = query.eq("action", searchParams.action);
  }
  if (searchParams.table) {
    query = query.eq("table_name", searchParams.table);
  }
  if (searchParams.q) {
    query = query.ilike("record_id", `%${searchParams.q}%`);
  }

  const { data, count } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading
        eyebrow="Operations"
        title="Audit log"
        description="Everything that changed across the platform — who did what, when."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
          <CardDescription className="text-xs">
            Narrow by action, table, or record id.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2" method="get">
            <FormSelect
              name="action"
              defaultValue={searchParams.action ?? ""}
              className="w-44"
            >
              <option value="">Any action</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              name="table"
              defaultValue={searchParams.table ?? ""}
              className="w-48"
            >
              <option value="">Any table</option>
              {TABLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </FormSelect>
            <Input
              type="search"
              name="q"
              placeholder="Record id contains…"
              defaultValue={searchParams.q ?? ""}
              className="w-64"
            />
            <Button type="submit" size="sm" variant="secondary">
              Filter
            </Button>
            {searchParams.action || searchParams.table || searchParams.q ? (
              <Link
                href="/audit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Clear
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Who</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const href = recordHref(r.table_name, r.record_id);
              const perf = Array.isArray(r.performer)
                ? r.performer[0]
                : r.performer;
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDate(r.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                      {r.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{r.table_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {r.record_id?.slice(0, 8)}
                      </Link>
                    ) : (
                      (r.record_id?.slice(0, 8) ?? "—")
                    )}
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                    {summarize(r)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {perf?.full_name ? (
                      <span>
                        {perf.full_name}
                        {perf.role ? (
                          <span className="ml-1 text-muted-foreground">
                            · {perf.role}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">system</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length ? (
          <div className="p-4">
            <EmptyState
              icon={<Activity className="size-6" strokeWidth={1.75} />}
              title="No audit records match"
              description="Try clearing filters or broaden the search."
            />
          </div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {count ?? rows.length} records
          </p>
          <div className="flex gap-2">
            <Link
              href={{
                pathname: "/audit",
                query: { ...searchParams, page: Math.max(1, page - 1) },
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page === 1 && "pointer-events-none opacity-50",
              )}
              aria-disabled={page === 1}
            >
              Previous
            </Link>
            <Link
              href={{
                pathname: "/audit",
                query: { ...searchParams, page: Math.min(totalPages, page + 1) },
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page === totalPages && "pointer-events-none opacity-50",
              )}
              aria-disabled={page === totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
