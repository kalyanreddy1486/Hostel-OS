"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireStaffOrAdmin } from "@/lib/require-role";

const schema = z.object({
  member_id: z.string().uuid(),
  new_bed_id: z.string().uuid(),
  effective_date: z.string().min(1),
});

export async function transferBedAction(formData: FormData) {
  await requireStaffOrAdmin();
  const parsed = schema.safeParse({
    member_id: formData.get("member_id"),
    new_bed_id: formData.get("new_bed_id"),
    effective_date: formData.get("effective_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const v = parsed.data;
  const supabase = createActionClient();

  const { data, error } = await supabase.rpc("transfer_bed", {
    p_member_id: v.member_id,
    p_new_bed_id: v.new_bed_id,
    p_effective_date: v.effective_date,
  });
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "assign",
    table_name: "assignments",
    record_id: (data as string) ?? null,
    new_values: {
      member_id: v.member_id,
      new_bed_id: v.new_bed_id,
      effective_date: v.effective_date,
      note: "bed_transfer",
    },
  });

  revalidatePath("/assignments");
  revalidatePath("/members");
  revalidatePath("/rooms");
  revalidatePath(`/members/${v.member_id}`);
  return { ok: true, assignmentId: data as string };
}
