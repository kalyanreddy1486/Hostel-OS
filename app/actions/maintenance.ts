"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { fireAndForgetEmail } from "@/lib/email/send";
import { ticketStatusChangedEmail } from "@/lib/email/templates";
import { requireStaffOrAdmin } from "@/lib/require-role";

const ticketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  issue_type: z
    .enum(["plumbing", "electrical", "furniture", "cleaning", "other"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  room_id: z.string().uuid().optional(),
  raised_by: z.string().uuid().optional(),
});

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

function nullableString(raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length ? s : undefined;
}

export async function createTicket(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = ticketSchema.safeParse({
    title: formData.get("title"),
    description: nullableString(formData.get("description")),
    issue_type: nullableString(formData.get("issue_type")),
    priority: (formData.get("priority") as string) || "medium",
    room_id: nullableString(formData.get("room_id")),
    raised_by: nullableString(formData.get("raised_by")),
  });

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;
  const insertPayload = {
    title: v.title,
    description: v.description ?? null,
    issue_type: v.issue_type ?? null,
    priority: v.priority,
    room_id: v.room_id ?? null,
    raised_by: v.raised_by ?? null,
    status: "open" as const,
  };

  const { data: inserted, error } = await supabase
    .from("maintenance_tickets")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create ticket");
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "maintenance_tickets",
    record_id: inserted.id,
    new_values: insertPayload,
  });

  revalidatePath("/maintenance");
  redirect(`/maintenance/${inserted.id}`);
}

export async function updateTicket(
  ticketId: string,
  patch: {
    status?: "open" | "in_progress" | "resolved" | "closed";
    assigned_to?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
  },
) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const parsed = updateSchema.safeParse(patch);
  if (!parsed.success) return { error: "Invalid patch" };

  const { data: before } = await supabase
    .from("maintenance_tickets")
    .select("status, assigned_to, priority, resolved_at")
    .eq("id", ticketId)
    .maybeSingle();

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "resolved" && !before?.resolved_at) {
    update.resolved_at = new Date().toISOString();
  }
  if (parsed.data.status && parsed.data.status !== "resolved") {
    update.resolved_at = null;
  }

  const { error } = await supabase
    .from("maintenance_tickets")
    .update(update)
    .eq("id", ticketId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "update",
    table_name: "maintenance_tickets",
    record_id: ticketId,
    old_values: before ?? null,
    new_values: update,
  });

  if (parsed.data.status && before?.status !== parsed.data.status) {
    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select(
        "title, raised_by_member:members!maintenance_tickets_raised_by_fkey ( name, email )",
      )
      .eq("id", ticketId)
      .maybeSingle();
    const member = Array.isArray(ticket?.raised_by_member)
      ? ticket?.raised_by_member[0]
      : ticket?.raised_by_member;
    if (ticket && member?.email) {
      const tpl = ticketStatusChangedEmail({
        memberName: member.name ?? "there",
        title: ticket.title,
        newStatus: parsed.data.status,
      });
      fireAndForgetEmail({ to: member.email, ...tpl });
    }
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${ticketId}`);
  return { ok: true };
}

export async function deleteTicket(ticketId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  const { error } = await supabase
    .from("maintenance_tickets")
    .delete()
    .eq("id", ticketId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "maintenance_tickets",
    record_id: ticketId,
    old_values: before ?? null,
  });

  revalidatePath("/maintenance");
  redirect("/maintenance");
}
