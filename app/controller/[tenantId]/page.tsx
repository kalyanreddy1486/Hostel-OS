import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, Eye, Settings as SettingsIcon } from "lucide-react";
import { requireController } from "@/lib/require-role";
import { createBackendClient } from "@/lib/backend/supabase";
import { TenantAdminForms } from "@/components/controller/tenant-admin-forms";
import { TenantMetaForm } from "@/components/controller/tenant-meta-form";
import { DeleteTenantButton } from "@/components/controller/delete-tenant-button";
import { startViewAs } from "@/app/actions/controller";
import { PageHeading } from "@/components/ui/page-heading";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Tenant = {
  id: string;
  hostel_name: string;
  contact_email: string | null;
  status: string;
  notes: string | null;
  admin_user_id: string | null;
  created_at: string;
};

type AdminInfo = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

async function getAdminInfo(userId: string): Promise<AdminInfo | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const jwt = process.env.SUPABASE_SERVICE_ROLE_JWT;
  if (!jwt) return null;
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: jwt, Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const u = (await res.json()) as {
    id: string;
    email?: string | null;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
  };
  return {
    id: u.id,
    email: u.email ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
  };
}

export default async function TenantDetailPage({
  params,
}: {
  params: { tenantId: string };
}) {
  await requireController();
  const supabase = createBackendClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, hostel_name, contact_email, status, notes, admin_user_id, created_at")
    .eq("id", params.tenantId)
    .maybeSingle<Tenant>();

  if (!tenant) notFound();

  const tid = tenant.id;
  const [roomsRes, bedsRes, membersRes, invoicesRes, paymentsRes, ticketsRes] =
    await Promise.all([
      supabase.from("rooms").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
      supabase.from("beds").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
      supabase.from("invoices").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
      supabase.from("maintenance_tickets").select("*", { count: "exact", head: true }).eq("tenant_id", tid),
    ]);

  const adminInfo = tenant.admin_user_id ? await getAdminInfo(tenant.admin_user_id) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/controller"
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        All hostels
      </Link>

      <PageHeading
        variant="hero"
        eyebrow="Tenant detail"
        title={tenant.hostel_name}
        description={
          <>
            Joined{" "}
            <span className="font-medium text-white">
              {new Date(tenant.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {" · "}
            <span className="font-mono text-xs text-white/85">
              {tenant.id}
            </span>
          </>
        }
        actions={
          <>
            <span className="inline-flex items-center self-center">
              <StatusBadge status={tenant.status} />
            </span>
            <form action={startViewAs}>
              <input type="hidden" name="tenant_id" value={tenant.id} />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Eye className="size-3.5" />
                See into hostel
              </button>
            </form>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Rooms" value={roomsRes.count ?? 0} accent="default" />
        <StatCard label="Beds" value={bedsRes.count ?? 0} accent="info" />
        <StatCard label="Residents" value={membersRes.count ?? 0} accent="success" />
        <StatCard label="Invoices" value={invoicesRes.count ?? 0} accent="default" />
        <StatCard label="Payments" value={paymentsRes.count ?? 0} accent="success" />
        <StatCard label="Tickets" value={ticketsRes.count ?? 0} accent="warning" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="size-4 text-muted-foreground" />
              Hostel info
            </CardTitle>
            <CardDescription>
              Display name, status, and internal notes — visible only here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantMetaForm
              tenantId={tenant.id}
              hostelName={tenant.hostel_name}
              status={tenant.status}
              notes={tenant.notes ?? ""}
            />
          </CardContent>
        </Card>

        <Card className="border-amber-300/40 bg-gradient-to-br from-amber-50 to-card dark:from-amber-500/10 dark:to-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-700 dark:text-amber-300" />
                Admin login
              </span>
            </CardTitle>
            <CardDescription>
              Force-change credentials for this hostel&apos;s admin account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="space-y-1.5 rounded-lg border bg-background/60 p-3 text-xs">
              <Row label="Current email">
                <span className="font-mono">{adminInfo?.email ?? "—"}</span>
              </Row>
              <Row label="Last sign-in">
                <span>
                  {adminInfo?.last_sign_in_at
                    ? new Date(adminInfo.last_sign_in_at).toLocaleString("en-IN")
                    : "Never"}
                </span>
              </Row>
              <Row label="User id">
                <span className="font-mono text-xs text-foreground">
                  {tenant.admin_user_id ?? "—"}
                </span>
              </Row>
            </dl>

            {tenant.admin_user_id ? (
              <TenantAdminForms
                userId={tenant.admin_user_id}
                currentEmail={adminInfo?.email ?? ""}
              />
            ) : (
              <p className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                No admin user linked to this hostel.
              </p>
            )}

            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Mail className="size-3.5" />
              Share new credentials out-of-band
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <span className="grid size-7 place-items-center rounded-md bg-destructive/10">
              ⚠
            </span>
            Danger zone
          </CardTitle>
          <CardDescription>
            Removing a hostel wipes every record tied to it and disables the
            admin&apos;s login. There is no undo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteTenantButton
            tenantId={tenant.id}
            hostelName={tenant.hostel_name}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
