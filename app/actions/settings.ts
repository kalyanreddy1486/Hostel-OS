"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { requireAdmin } from "@/lib/require-role";

const vpaRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

const schema = z.object({
  upi_vpa: z
    .string()
    .trim()
    .refine((v) => v === "" || vpaRegex.test(v), {
      message: "Looks invalid (expected like 9876543210@okhdfcbank)",
    }),
  upi_payee_name: z.string().trim().min(1).max(60),
});

export async function saveUpiSettings(formData: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse({
    upi_vpa: formData.get("upi_vpa") ?? "",
    upi_payee_name: formData.get("upi_payee_name") ?? "HostelOS",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const supabase = createActionClient();
  const v = parsed.data;
  const now = new Date().toISOString();
  const { error: e1 } = await supabase
    .from("app_settings")
    .upsert({ key: "upi_vpa", value: v.upi_vpa, updated_at: now });
  const { error: e2 } = await supabase
    .from("app_settings")
    .upsert({ key: "upi_payee_name", value: v.upi_payee_name, updated_at: now });
  if (e1 || e2) return { error: (e1 ?? e2)?.message };

  revalidatePath("/settings");
  revalidatePath("/billing");
  return { ok: true };
}

const templateSchema = z.object({
  whatsapp_template: z.string().max(2000),
});

export async function saveWhatsappTemplate(formData: FormData) {
  await requireAdmin();
  const parsed = templateSchema.safeParse({
    whatsapp_template: (formData.get("whatsapp_template") as string) ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const supabase = createActionClient();
  const value = parsed.data.whatsapp_template.trim();
  // Empty string means "use the built-in default"
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: "whatsapp_template",
      value,
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/billing");
  return { ok: true };
}

const emailTemplateSchema = z.object({
  email_template: z.string().max(4000),
});

export async function saveEmailTemplate(formData: FormData) {
  await requireAdmin();
  const parsed = emailTemplateSchema.safeParse({
    email_template: (formData.get("email_template") as string) ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const supabase = createActionClient();
  const value = parsed.data.email_template.trim();
  // Empty string means "use the built-in default"
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: "email_template",
      value,
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

