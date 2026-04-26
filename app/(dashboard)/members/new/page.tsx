import Link from "next/link";
import { requireStaffOrAdmin } from "@/lib/require-role";
import { createMember } from "@/app/actions/members";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function NewMemberPage() {
  await requireStaffOrAdmin();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New member</h1>
          <p className="text-muted-foreground">Create a resident record</p>
        </div>
        <Link
          href="/members"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createMember}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">
                  Emergency contact name
                </Label>
                <Input id="emergency_contact_name" name="emergency_contact_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">
                  Emergency contact phone
                </Label>
                <Input id="emergency_contact_phone" name="emergency_contact_phone" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="check_in_date">Check-in date</Label>
                <Input id="check_in_date" name="check_in_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  defaultValue="pending"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_proof_file">ID proof (PDF)</Label>
              <Input
                id="id_proof_file"
                name="id_proof_file"
                type="file"
                accept="application/pdf"
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80"
              />
              <p className="text-xs text-muted-foreground">
                Aadhaar, driving licence, or passport scan. PDF only · up to 10 MB.
              </p>
            </div>
            <SubmitButton>Save member</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
