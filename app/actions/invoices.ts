"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { sendFreshInvoiceEmail } from "@/app/actions/email-reminders";
import { requireStaffOrAdmin } from "@/lib/require-role";

const invoiceSchema = z.object({
  member_id: z.string().uuid(),
  assignment_id: z.string().uuid().optional(),
  billing_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional(),
  invoice_number: z.string().optional(),
  rent_amount: z.coerce.number().min(0),
  electricity_amount: z.coerce.number().min(0).default(0),
  food_amount: z.coerce.number().min(0).default(0),
  extra_charges: z.coerce.number().min(0).default(0),
  late_fee: z.coerce.number().min(0).default(0),
  status: z.enum(["pending", "paid", "overdue", "partial"]).default("pending"),
  notes: z.string().optional(),
});

function computeTotal(v: {
  rent_amount: number;
  electricity_amount: number;
  food_amount: number;
  extra_charges: number;
  late_fee: number;
}) {
  return (
    Number(v.rent_amount) +
    Number(v.electricity_amount) +
    Number(v.food_amount) +
    Number(v.extra_charges) +
    Number(v.late_fee)
  );
}

function toNullableString(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length ? s : undefined;
}

export async function createInvoice(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = invoiceSchema.safeParse({
    member_id: formData.get("member_id"),
    assignment_id: toNullableString(formData.get("assignment_id")),
    billing_month: formData.get("billing_month"),
    due_date: toNullableString(formData.get("due_date")),
    invoice_number: toNullableString(formData.get("invoice_number")),
    rent_amount: formData.get("rent_amount") ?? 0,
    electricity_amount: formData.get("electricity_amount") ?? 0,
    food_amount: formData.get("food_amount") ?? 0,
    extra_charges: formData.get("extra_charges") ?? 0,
    late_fee: formData.get("late_fee") ?? 0,
    status: (formData.get("status") as string) || "pending",
    notes: toNullableString(formData.get("notes")),
  });

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;
  const total = computeTotal(v);
  const insertPayload = {
    member_id: v.member_id,
    assignment_id: v.assignment_id ?? null,
    billing_month: v.billing_month,
    due_date: v.due_date ?? null,
    invoice_number: v.invoice_number ?? null,
    rent_amount: v.rent_amount,
    electricity_amount: v.electricity_amount,
    food_amount: v.food_amount,
    extra_charges: v.extra_charges,
    late_fee: v.late_fee,
    total_amount: total,
    status: v.status,
    notes: v.notes ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("invoices")
    .insert(insertPayload)
    .select("id, tenant_id")
    .single();

  if (error || !inserted) {
    console.error("[invoices.create] insert failed:", error?.message);
    throw new Error("Could not create the invoice. Please try again.");
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "invoices",
    record_id: inserted.id,
    new_values: insertPayload,
  });

  // Auto-send the resident a "your invoice is ready" email — same body
  // as the rent reminder, including UPI VPA + claim link + complaint link.
  // Pass tenant_id so the service-role lookup is tenant-scoped (defense in
  // depth — the invoice we just created is naturally in this tenant, but
  // if anyone ever calls this with a forged id, the filter blocks it).
  // Fire-and-forget: a slow Gmail SMTP shouldn't block the redirect.
  sendFreshInvoiceEmail(inserted.id, inserted.tenant_id).catch((err) => {
    console.error("[invoice-create-email] failed:", err);
  });

  revalidatePath("/billing");
  redirect(`/billing/${inserted.id}`);
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "pending" | "paid" | "overdue" | "partial",
) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  if (!["pending", "paid", "overdue", "partial"].includes(status)) {
    return { error: "Invalid status" };
  }

  const { data: before } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .maybeSingle();

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "status_change",
    table_name: "invoices",
    record_id: invoiceId,
    old_values: before ? { status: before.status } : null,
    new_values: { status },
  });

  revalidatePath("/billing");
  revalidatePath(`/billing/${invoiceId}`);
  return { ok: true };
}

async function invokeEdgeFunction<T>(
  slug: string,
  body: unknown,
): Promise<{ ok: true; result: T } | { error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The Supabase Edge Function gateway requires a JWT in the Authorization
  // header (verify_jwt=true on each function). The anon key is always a
  // proper JWT signed with the project JWT_SECRET; the service_role env var
  // in this project is a short-form `sb_secret_*` key that is not a JWT, so
  // it would be rejected by the gateway. The function body itself uses its
  // own service role from Deno env for DB writes, so anon at the gateway
  // boundary is fine for internal server-action callers.
  const bearer =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !bearer) return { error: "Missing Supabase env vars" };
  try {
    const res = await fetch(`${url}/functions/v1/${slug}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: bearer,
      },
      body: JSON.stringify(body ?? {}),
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T);
    if (!res.ok) {
      const msg =
        (data as { error?: string })?.error ??
        `Edge function ${slug} failed (${res.status})`;
      return { error: msg };
    }
    return { ok: true, result: data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runGenerateMonthlyInvoices(input?: {
  billing_month?: string;
  due_day?: number;
  dry_run?: boolean;
}) {
  await requireStaffOrAdmin();
  const res = await invokeEdgeFunction<Record<string, unknown>>(
    "generate-monthly-invoices",
    input ?? {},
  );
  if ("error" in res) return res;
  revalidatePath("/billing");
  return res;
}

export async function runMarkOverdueInvoices(input?: {
  as_of?: string;
  late_fee?: number;
  dry_run?: boolean;
}) {
  await requireStaffOrAdmin();
  const res = await invokeEdgeFunction<Record<string, unknown>>(
    "mark-overdue-invoices",
    input ?? {},
  );
  if ("error" in res) return res;
  revalidatePath("/billing");
  return res;
}

export async function deleteInvoice(invoiceId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "invoices",
    record_id: invoiceId,
    old_values: before ?? null,
  });

  revalidatePath("/billing");
  redirect("/billing");
}

export async function deleteInvoicesBulk(invoiceIds: string[]) {
  await requireStaffOrAdmin();
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return { error: "No invoices selected" };
  }
  if (invoiceIds.length > 200) {
    return { error: "Too many at once — pick fewer than 200." };
  }
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("invoices")
    .select("*")
    .in("id", invoiceIds);

  const { error } = await supabase.from("invoices").delete().in("id", invoiceIds);
  if (error) return { error: error.message };

  for (const row of before ?? []) {
    await writeAudit(supabase, {
      action: "delete",
      table_name: "invoices",
      record_id: (row as { id: string }).id,
      old_values: row as Record<string, unknown>,
    });
  }

  revalidatePath("/billing");
  return { ok: true, deleted: before?.length ?? 0 };
}
