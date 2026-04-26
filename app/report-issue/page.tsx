import { PublicTicketForm } from "@/components/public/public-ticket-form";

export const dynamic = "force-dynamic";

export default function PublicReportIssuePage({
  searchParams,
}: {
  searchParams: { h?: string };
}) {
  const tenantId = searchParams.h;
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">HostelOS</h1>
          <p className="text-xs text-muted-foreground">Raise a complaint</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="mb-1 text-sm font-medium">Tell us what&apos;s wrong</p>
          <p className="mb-4 text-xs text-muted-foreground">
            No login needed. Fill this in and admin will see it in their
            maintenance queue.
          </p>
          <PublicTicketForm tenantId={tenantId} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by HostelOS · No account needed
        </p>
      </div>
    </div>
  );
}
