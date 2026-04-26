import Link from "next/link";
import { Building2, Users, BedDouble, ArrowUpRight } from "lucide-react";
import { requireController } from "@/lib/require-role";
import { createBackendClient } from "@/lib/backend/supabase";
import { OnboardTenantButton } from "@/components/controller/onboard-tenant-button";
import { DeleteTenantButton } from "@/components/controller/delete-tenant-button";
import { PageHeading } from "@/components/ui/page-heading";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CountUp } from "@/components/ui/count-up";
import { MotionGrid } from "@/components/ui/motion-grid";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type TenantRow = {
  id: string;
  hostel_name: string;
  contact_email: string | null;
  status: string;
  admin_user_id: string | null;
  created_at: string;
};

type TenantWithStats = TenantRow & {
  rooms: number;
  beds: number;
  members: number;
  invoices: number;
};

export default async function ControllerHome() {
  await requireController();
  const supabase = createBackendClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, hostel_name, contact_email, status, admin_user_id, created_at")
    .order("created_at", { ascending: false })
    .returns<TenantRow[]>();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load tenants: {error.message}
      </div>
    );
  }

  const stats: TenantWithStats[] = await Promise.all(
    (tenants ?? []).map(async (t) => {
      const [r, b, m, i] = await Promise.all([
        supabase.from("rooms").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        supabase.from("beds").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        supabase.from("members").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
        supabase.from("invoices").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
      ]);
      return {
        ...t,
        rooms: r.count ?? 0,
        beds: b.count ?? 0,
        members: m.count ?? 0,
        invoices: i.count ?? 0,
      };
    }),
  );

  const totals = stats.reduce(
    (acc, s) => ({
      rooms: acc.rooms + s.rooms,
      beds: acc.beds + s.beds,
      members: acc.members + s.members,
      active: acc.active + (s.status === "active" ? 1 : 0),
    }),
    { rooms: 0, beds: 0, members: 0, active: 0 },
  );
  const occupancyPct = totals.beds
    ? Math.round((totals.members / totals.beds) * 100)
    : 0;


  return (
    <div className="space-y-6">
      <PageHeading
        variant="hero"
        eyebrow={`${stats.length} hostel${stats.length === 1 ? "" : "s"} on the network`}
        title="Command Center"
        description="Top-down view of every hostel running on HostelOS. Drill in to change an admin's login, pause an account, or step inside as them."
        actions={<OnboardTenantButton />}
      />

      <MotionGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Hostels"
          value={<CountUp value={stats.length} />}
          icon={<Building2 className="size-4" />}
          hint={`${totals.active} active`}
          accent="default"
        />
        <StatCard
          label="Rooms"
          value={<CountUp value={totals.rooms} />}
          icon={<Building2 className="size-4" />}
          hint="Across the network"
          accent="info"
        />
        <StatCard
          label="Beds"
          value={<CountUp value={totals.beds} />}
          icon={<BedDouble className="size-4" />}
          hint={`${occupancyPct}% network occupancy`}
          accent="warning"
        />
        <StatCard
          label="Residents"
          value={<CountUp value={totals.members} />}
          icon={<Users className="size-4" />}
          hint={`Filling ${totals.members} of ${totals.beds || 0} beds`}
          accent="success"
        />
      </MotionGrid>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div>
              <h2 className="font-display text-lg tracking-tight">Hostels</h2>
              <p className="text-xs text-muted-foreground">
                Click any row to manage credentials or view its data.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostel</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-right tabular-nums">Rooms</TableHead>
                <TableHead className="text-right tabular-nums">Beds</TableHead>
                <TableHead className="text-right tabular-nums">Residents</TableHead>
                <TableHead className="text-right tabular-nums">Invoices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <Link
                      href={`/controller/${s.id}`}
                      className="block font-medium tracking-tight transition-colors group-hover:text-primary"
                    >
                      {s.hostel_name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Joined{" "}
                      {new Date(s.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">
                    {s.contact_email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.rooms}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.beds}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.members}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.invoices}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/controller/${s.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1",
                        )}
                      >
                        Open
                        <ArrowUpRight className="size-3" />
                      </Link>
                      <DeleteTenantButton
                        tenantId={s.id}
                        hostelName={s.hostel_name}
                        variant="icon"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!stats.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <div className="px-4 py-2">
                      <EmptyState
                        icon={<Building2 className="size-6" strokeWidth={1.75} />}
                        title="No hostels onboarded yet"
                        description="When you create the first hostel, it'll show up here with its admin, room counts, and live status."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Counts are scoped per-tenant via{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">tenant_id</code>{" "}
        — onboarding a new hostel adds a fresh, isolated workspace.
      </p>
    </div>
  );
}
