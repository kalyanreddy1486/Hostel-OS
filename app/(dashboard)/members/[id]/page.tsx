import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { updateMember, checkoutMember, deleteMember } from "@/app/actions/members";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckoutButton } from "@/components/members/checkout-button";
import { DeleteMemberButton } from "@/components/members/delete-member-button";
import { MemberLedger } from "@/components/members/member-ledger";
import {
  TransferBedButton,
  type BedOption,
} from "@/components/members/transfer-bed-button";
import { createTenantClient } from "@/lib/backend/supabase";
import { serverFetch } from "@/lib/server/origin";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AssignmentRow = {
  id: string;
  is_active: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
  bed:
    | {
        bed_number?: string;
        room?: { room_number?: string; monthly_rent?: number };
      }
    | null
    | undefined;
};

type MemberApiResponse = {
  member: {
    id: string;
    name: string;
    status: "active" | "pending" | "left";
    phone: string | null;
    email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
    id_proof_url: string | null;
    user_id: string | null;
  };
  assignments: AssignmentRow[];
};

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaffOrAdmin();
  const res = await serverFetch(`/api/members/${params.id}`, {
    cache: "no-store",
  });
  if (res.status === 404) notFound();
  const body = (await res.json()) as
    | MemberApiResponse
    | { error: string };
  if (!res.ok || "error" in body) notFound();

  const member = body.member;
  const assignments = body.assignments;

  const active = assignments?.find((a) => a.is_active);
  const bed = active?.bed as
    | {
        bed_number?: string;
        room?: { room_number?: string; monthly_rent?: number };
      }
    | null
    | undefined;

  // Available beds for transfer (all vacant beds across rooms)
  let availableBeds: BedOption[] = [];
  if (member.status === "active" && active) {
    const sb = createTenantClient();
    const { data: beds } = await sb
      .from("beds")
      .select(
        "id, bed_number, room:rooms ( room_number, monthly_rent )",
      )
      .eq("status", "available");
    availableBeds = (beds ?? []).map((b) => {
      const raw = (b as { room?: unknown }).room;
      const room = Array.isArray(raw) ? raw[0] : raw;
      const r = room as { room_number?: string; monthly_rent?: number } | null;
      const label = r?.room_number
        ? `Room ${r.room_number} / ${b.bed_number}${r.monthly_rent ? ` · ₹${Number(r.monthly_rent).toLocaleString("en-IN")}/mo` : ""}`
        : `Bed ${b.bed_number}`;
      return { id: b.id, label };
    });
  }
  const currentBedLabel =
    bed?.room?.room_number && bed?.bed_number
      ? `Room ${bed.room.room_number} / ${bed.bed_number}`
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/members" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            ← Members
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
          <StatusBadge status={member.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {member.status === "active" && active ? (
            <>
              <TransferBedButton
                memberId={member.id}
                memberName={member.name}
                currentBedLabel={currentBedLabel}
                availableBeds={availableBeds}
              />
              <CheckoutButton
                checkoutAction={checkoutMember.bind(null, member.id)}
              />
            </>
          ) : member.status === "left" ? (
            <DeleteMemberButton
              deleteAction={deleteMember.bind(null, member.id)}
            />
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current assignment</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {bed ? (
            <p>
              Room <strong>{bed.room?.room_number}</strong>, bed{" "}
              <strong>{bed.bed_number}</strong>
              {bed.room?.monthly_rent != null ? (
                <>
                  {" "}
                  — rent ₹{bed.room.monthly_rent}/mo
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground">No active bed assignment.</p>
          )}
        </CardContent>
      </Card>

      <MemberLedger memberId={member.id} />

      <Card>
        <CardHeader>
          <CardTitle>Edit member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateMember}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <input type="hidden" name="_id" value={member.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" name="name" required defaultValue={member.name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={member.phone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={member.email ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">
                  Emergency contact name
                </Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  defaultValue={member.emergency_contact_name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">
                  Emergency contact phone
                </Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  defaultValue={member.emergency_contact_phone ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="check_in_date">Check-in date</Label>
                <Input
                  id="check_in_date"
                  name="check_in_date"
                  type="date"
                  defaultValue={member.check_in_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_date">Check-out date</Label>
                <Input
                  id="check_out_date"
                  name="check_out_date"
                  type="date"
                  defaultValue={member.check_out_date ?? ""}
                  disabled
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue={member.status}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_proof_file">ID proof</Label>
              {member.id_proof_url ? (
                <p className="text-xs text-muted-foreground">
                  Current file on record.{" "}
                  <a
                    href={`/api/members/${member.id}/id-proof`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    View PDF →
                  </a>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No ID proof uploaded yet.
                </p>
              )}
              <Input
                id="id_proof_file"
                name="id_proof_file"
                type="file"
                accept="application/pdf,image/*"
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80"
              />
              <p className="text-xs text-muted-foreground">
                Upload a PDF or photo to replace the current file. Up to 15 MB; we&apos;ll auto-compress.
              </p>
            </div>
            <SubmitButton>Save changes</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment history</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {(assignments ?? []).length === 0 ? (
            <p className="text-muted-foreground">No assignments yet.</p>
          ) : (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room / bed</TableHead>
                    <TableHead>Move-in</TableHead>
                    <TableHead>Move-out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const b = a.bed as
                      | { bed_number?: string; room?: { room_number?: string } }
                      | null
                      | undefined;
                    const loc = b?.room?.room_number && b?.bed_number
                      ? `${b.room.room_number}/${b.bed_number}`
                      : "—";
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{loc}</TableCell>
                        <TableCell>{a.move_in_date ?? "—"}</TableCell>
                        <TableCell>{a.move_out_date ?? "—"}</TableCell>
                        <TableCell>{a.is_active ? "Active" : "Ended"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
