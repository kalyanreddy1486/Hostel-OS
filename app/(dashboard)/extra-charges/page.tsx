
import { requireStaffOrAdmin } from "@/lib/require-role";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addExtraCharge } from "@/app/actions/extra-charges";
import { ExtraChargesTable } from "@/components/charges/extra-charges-table";


import { serverFetch } from "@/lib/server/origin";
import { EmptyState } from "@/components/shared/empty-state";
import { PiggyBank, ArrowLeft } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { PageActions } from "@/components/ui/page-actions";

type ChargeRow = {
  id: string;
  charge_date: string;
  billing_month: string | null;
  charge_type: string | null;
  description: string | null;
  amount: number;
  member: { id: string; name: string } | null;
};

type MemberOption = { id: string; name: string };

export default async function ExtraChargesPage() {
  await requireStaffOrAdmin();

  const [chargesRes, membersRes] = await Promise.all([
    serverFetch("/api/extra-charges", { cache: "no-store" }),
    serverFetch("/api/members?status=active", { cache: "no-store" }),
  ]);
  const chargesBody = (await chargesRes.json()) as
    | { charges: ChargeRow[] }
    | { error: string };
  const membersBody = (await membersRes.json()) as
    | { members: MemberOption[] }
    | { error: string };

  const charges = "charges" in chargesBody ? chargesBody.charges : [];
  const members = "members" in membersBody ? membersBody.members : [];

  const today = new Date().toISOString().slice(0, 10);
  const monthFirst = `${today.slice(0, 7)}-01`;
  const totalThisMonth = charges
    .filter((c) => c.billing_month?.startsWith(today.slice(0, 7)))
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeading
        eyebrow="Revenue"
        title="Extra charges"
        description={`Damage, late fees, food, laundry · ₹${totalThisMonth.toLocaleString("en-IN")} this month`}
        actions={
          <PageActions
            secondary={[
              { label: "Back to billing", href: "/billing", icon: ArrowLeft },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Add charge</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={addExtraCharge}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="member_id">Member *</Label>
              <select
                id="member_id"
                name="member_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge_type">Type *</Label>
              <select
                id="charge_type"
                name="charge_type"
                required
                defaultValue="damage"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="damage">Damage</option>
                <option value="late_fee">Late fee</option>
                <option value="laundry">Laundry</option>
                <option value="food">Food</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge_date">Date *</Label>
              <Input
                id="charge_date"
                name="charge_date"
                type="date"
                required
                defaultValue={today}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_month">Billing month</Label>
              <Input
                id="billing_month"
                name="billing_month"
                type="date"
                defaultValue={monthFirst}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <SubmitButton pendingLabel="Adding…">Add charge</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {charges.length === 0 ? (
        <EmptyState
          icon={<PiggyBank className="size-6" strokeWidth={1.75} />}
          title="No extra charges yet"
          description="One-off charges (damages, laundry, late fees) you log here get added to that member's next invoice."
        />
      ) : (
        <ExtraChargesTable charges={charges} />
      )}
    </div>
  );
}
