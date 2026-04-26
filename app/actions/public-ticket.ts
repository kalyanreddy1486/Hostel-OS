"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBackendClient } from "@/lib/backend/supabase";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  room_label: z.string().trim().min(1).max(40),
  phone: z.string().trim().max(20).optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tenant_id: z.string().uuid().optional(),
});

export async function submitPublicTicket(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    room_label: formData.get("room_label"),
    phone: (formData.get("phone") as string) || undefined,
    title: formData.get("title"),
    description: (formData.get("description") as string) || undefined,
    priority: (formData.get("priority") as string) || "medium",
    tenant_id: (formData.get("tenant_id") as string) || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const v = parsed.data;
  const supabase = createBackendClient();

  // Tenant resolution: if the URL didn't pin a hostel (?h=<id>), default to
  // the only tenant. Once there are multiple hostels, /report-issue links
  // shared by each admin will carry their tenant_id and this fallback won't
  // matter.
  let tenantId = v.tenant_id ?? null;
  if (!tenantId) {
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(2);
    if (!tenants || tenants.length === 0 || tenants.length > 1) {
      // Single generic message for both cases — don't leak whether there
      // are 0, 1, or many tenants on the platform to anonymous callers.
      return {
        error:
          "Could not identify your hostel. Please use the link your admin shared with you.",
      };
    }
    tenantId = tenants[0].id;
  }

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .insert({
      raised_by: null,
      raised_by_name: v.name,
      raised_by_room_label: v.room_label,
      raised_by_phone: v.phone ?? null,
      title: v.title,
      description: v.description ?? null,
      priority: v.priority,
      status: "open",
      tenant_id: tenantId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[public-ticket] insert failed:", error.message);
    return { error: "Could not submit your request. Please try again." };
  }

  revalidatePath("/maintenance");
  return { ok: true, id: data.id };
}
