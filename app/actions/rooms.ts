"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireStaffOrAdmin } from "@/lib/require-role";

const roomSchema = z.object({
  room_number: z.string().min(1),
  room_type: z.enum(["single", "double", "triple", "dormitory"]),
  floor: z.coerce.number().int().optional(),
  capacity: z.coerce.number().int().min(1).max(50),
  monthly_rent: z.coerce.number().min(0),
  amenities: z.array(z.string()).optional(),
});

export async function createRoom(formData: FormData) {
  await requireAdmin();
  const supabase = createActionClient();

  const amenitiesRaw = formData.getAll("amenities") as string[];
  const parsed = roomSchema.safeParse({
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type"),
    floor: formData.get("floor") || undefined,
    capacity: formData.get("capacity"),
    monthly_rent: formData.get("monthly_rent"),
    amenities: amenitiesRaw.length ? amenitiesRaw : undefined,
  });

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;

  const roomPayload = {
    room_number: v.room_number,
    room_type: v.room_type,
    floor: v.floor ?? null,
    capacity: v.capacity,
    monthly_rent: v.monthly_rent,
    amenities: v.amenities?.length ? v.amenities : [],
  };

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert(roomPayload)
    .select("id")
    .single();

  if (roomError || !room) {
    throw new Error(roomError?.message ?? "Failed to create room");
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "rooms",
    record_id: room.id,
    new_values: roomPayload,
  });

  const beds = Array.from({ length: v.capacity }, (_, i) => ({
    room_id: room.id,
    bed_number: String(i + 1),
    status: "available" as const,
  }));

  const { data: insertedBeds, error: bedsError } = await supabase
    .from("beds")
    .insert(beds)
    .select("id, bed_number");
  if (bedsError) throw new Error(bedsError.message);

  if (insertedBeds?.length) {
    await writeAudit(supabase, {
      action: "create",
      table_name: "beds",
      record_id: room.id,
      new_values: { room_id: room.id, beds: insertedBeds },
    });
  }

  revalidatePath("/rooms");
  redirect("/rooms");
}

export async function updateBedStatus(bedId: string, status: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const allowed = ["available", "occupied", "reserved", "maintenance"];
  if (!allowed.includes(status)) return { error: "Invalid status" };

  const { data: before } = await supabase
    .from("beds")
    .select("status")
    .eq("id", bedId)
    .maybeSingle();

  const { error } = await supabase.from("beds").update({ status }).eq("id", bedId);
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "status_change",
    table_name: "beds",
    record_id: bedId,
    old_values: before ? { status: before.status } : null,
    new_values: { status },
  });

  revalidatePath("/rooms");
  return { ok: true };
}
