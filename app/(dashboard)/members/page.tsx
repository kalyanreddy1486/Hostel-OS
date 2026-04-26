import { Plus, UserPlus, Search } from "lucide-react";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { Button } from "@/components/ui/button";
import { serverFetch } from "@/lib/server/origin";
import { Input } from "@/components/ui/input";
import { MembersTable, type MemberRow } from "@/components/members/members-table";
import { FormSelect } from "@/components/ui/form-select";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";
import { EmptyState } from "@/components/shared/empty-state";

type SearchParams = { q?: string; status?: string };

type MemberListRow = MemberRow;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaffOrAdmin();
  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status;
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (statusFilter) qs.set("status", statusFilter);

  const res = await serverFetch(`/api/members?${qs}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as
    | { members: MemberListRow[] }
    | { error: string };

  if (!res.ok || "error" in body) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load members: {"error" in body ? body.error : "Unknown error"}
      </div>
    );
  }

  const members = body.members ?? [];
  const isFiltered = !!q || !!statusFilter;
  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Occupancy"
        title="Members"
        description={
          members.length > 0
            ? `${members.length} on file · ${activeCount} active · ${pendingCount} pending`
            : "Residents and applicants"
        }
        actions={
          <PageActions
            primary={{
              label: "Add member",
              href: "/members/new",
              icon: Plus,
            }}
          />
        }
      />

      <div className="rounded-2xl border bg-card p-4">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search name or phone…"
              defaultValue={q}
              className="pl-9"
            />
          </div>
          <FormSelect
            name="status"
            defaultValue={statusFilter ?? ""}
            selectSize="sm"
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="left">Left</option>
          </FormSelect>
          <Button type="submit" size="sm" variant="secondary">
            Filter
          </Button>
          {isFiltered ? (
            <a
              href="/members"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear
            </a>
          ) : null}
        </form>
      </div>

      {members.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="size-6" strokeWidth={1.75} />}
            title="No members match those filters"
            description="Try removing a filter or searching by a different name. Or add a new resident from scratch."
            actionHref="/members"
            actionLabel="Clear filters"
            secondaryHref="/members/new"
            secondaryLabel="Add a member instead"
          />
        ) : (
          <EmptyState
            icon={<UserPlus className="size-6" strokeWidth={1.75} />}
            title="Your hostel is empty — let's change that"
            description="Add the first resident in under a minute. You'll be able to assign them a bed, generate their invoice, and start collecting rent."
            actionHref="/members/new"
            actionLabel="Add the first member"
            secondaryHref="/rooms/new"
            secondaryLabel="Set up rooms first"
          />
        )
      ) : (
        <MembersTable members={members} />
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
