"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireStaffOrAdmin } from "@/lib/require-role";

const expenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.coerce.number().min(0),
  category: z
    .enum([
      "rent_paid",
      "supplies",
      "utilities",
      "maintenance",
      "staff",
      "food",
      "other",
    ])
    .default("other"),
  spent_on: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function addExpense(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    category: (formData.get("category") as string) || "other",
    spent_on: formData.get("spent_on"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    );
  }

  const v = parsed.data;
  const payload = {
    description: v.description,
    amount: v.amount,
    category: v.category,
    spent_on: v.spent_on,
    notes: v.notes ?? null,
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add expense");

  await writeAudit(supabase, {
    action: "create",
    table_name: "expenses",
    record_id: data.id,
    new_values: payload,
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses");
}

export async function deleteExpense(expenseId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .maybeSingle();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "expenses",
    record_id: expenseId,
    old_values: before ?? null,
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExpensesBulk(ids: string[]) {
  // Bulk financial-record deletion is irreversible — gate to admin only,
  // matching the deleteMembersBulk pattern. Single deletes stay open to
  // staff because they're easier to recover from.
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Nothing to delete." };
  }
  if (ids.length > 200) {
    return { error: "Too many at once — pick fewer than 200." };
  }
  const supabase = createActionClient();

  const { data: before, error: fetchErr } = await supabase
    .from("expenses")
    .select("*")
    .in("id", ids);
  if (fetchErr) return { error: fetchErr.message };
  const rows = before ?? [];
  if (rows.length === 0) return { error: "No expenses matched." };

  const { error: deleteErr } = await supabase
    .from("expenses")
    .delete()
    .in("id", ids);
  if (deleteErr) return { error: deleteErr.message };

  for (const row of rows) {
    await writeAudit(supabase, {
      action: "delete",
      table_name: "expenses",
      record_id: row.id,
      old_values: row,
    });
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true, deleted: rows.length };
}
