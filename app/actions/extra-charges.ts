"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireStaffOrAdmin } from "@/lib/require-role";

const chargeSchema = z.object({
  member_id: z.string().uuid(),
  charge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  billing_month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional(),
  charge_type: z.enum(["damage", "late_fee", "laundry", "food", "other"]),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
});

function nullableString(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length ? s : undefined;
}

export async function addExtraCharge(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = chargeSchema.safeParse({
    member_id: formData.get("member_id"),
    charge_date: formData.get("charge_date"),
    billing_month: nullableString(formData.get("billing_month")),
    charge_type: formData.get("charge_type"),
    description: nullableString(formData.get("description")),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;
  const insertPayload = {
    member_id: v.member_id,
    charge_date: v.charge_date,
    billing_month: v.billing_month ?? null,
    charge_type: v.charge_type,
    description: v.description ?? null,
    amount: v.amount,
  };

  const { data: inserted, error } = await supabase
    .from("extra_charges")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to add charge");
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "extra_charges",
    record_id: inserted.id,
    new_values: insertPayload,
  });

  revalidatePath("/extra-charges");
  revalidatePath(`/members/${v.member_id}`);
  redirect("/extra-charges");
}

export async function deleteExtraCharge(chargeId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("extra_charges")
    .select("*")
    .eq("id", chargeId)
    .maybeSingle();

  const { error } = await supabase
    .from("extra_charges")
    .delete()
    .eq("id", chargeId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "extra_charges",
    record_id: chargeId,
    old_values: before ?? null,
  });

  revalidatePath("/extra-charges");
  if (before?.member_id) revalidatePath(`/members/${before.member_id}`);
  return { ok: true };
}

export async function deleteExtraChargesBulk(ids: string[]) {
  // Bulk financial-record deletion is irreversible — gate to admin only.
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Nothing to delete." };
  }
  if (ids.length > 200) {
    return { error: "Too many at once — pick fewer than 200." };
  }
  const supabase = createActionClient();

  const { data: before, error: fetchErr } = await supabase
    .from("extra_charges")
    .select("*")
    .in("id", ids);
  if (fetchErr) return { error: fetchErr.message };
  const rows = before ?? [];
  if (rows.length === 0) return { error: "No charges matched." };

  const { error: deleteErr } = await supabase
    .from("extra_charges")
    .delete()
    .in("id", ids);
  if (deleteErr) return { error: deleteErr.message };

  for (const row of rows) {
    await writeAudit(supabase, {
      action: "delete",
      table_name: "extra_charges",
      record_id: row.id,
      old_values: row,
    });
    if (row.member_id) revalidatePath(`/members/${row.member_id}`);
  }

  revalidatePath("/extra-charges");
  return { ok: true, deleted: rows.length };
}
