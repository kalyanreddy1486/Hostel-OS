import { getSessionProfile } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { ImpersonationBanner } from "@/components/controller/impersonation-banner";
import { getControllerActingAs } from "@/lib/controller-impersonation";
import { createBackendClient } from "@/lib/backend/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  const role = session.profile?.role ?? "resident";

  const isDemo = process.env.AUTH_MODE !== "strict";

  // If a controller is acting-as a tenant, look up the hostel name once and
  // show a sticky banner above every admin page so they never forget.
  let viewingAs: { hostelName: string } | null = null;
  if (role === "controller") {
    const tenantId = getControllerActingAs();
    if (tenantId) {
      const supabase = createBackendClient();
      const { data } = await supabase
        .from("tenants")
        .select("hostel_name")
        .eq("id", tenantId)
        .maybeSingle();
      viewingAs = { hostelName: data?.hostel_name ?? "Unknown hostel" };
    }
  }

  const effectiveRole = role === "controller" ? "admin" : role;

  return (
    <>
      {viewingAs ? <ImpersonationBanner hostelName={viewingAs.hostelName} /> : null}
      <DashboardShell
        email={session.user.email}
        role={effectiveRole}
        fullName={session.profile?.full_name ?? null}
        isDemo={isDemo}
      >
        {/* Reserve space at the bottom on mobile so the fixed bottom nav
            doesn't cover content. */}
        <div className="pb-20 lg:pb-0">{children}</div>
      </DashboardShell>
    </>
  );
}
