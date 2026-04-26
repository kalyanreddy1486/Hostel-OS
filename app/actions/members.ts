"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireStaffOrAdmin } from "@/lib/require-role";
import { compressIdProof } from "@/lib/id-proof-compress";

const ID_PROOF_BUCKET = "id-proofs";
// Cap the *upload* at 15 MB so high-res phone PDFs / heic images get through;
// compression brings them down to ~150 KB before they hit Supabase Storage.
const MAX_ID_PROOF_BYTES = 15 * 1024 * 1024;

const memberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().max(320).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  check_in_date: z.string().optional(),
  status: z.enum(["active", "left", "pending"]).optional(),
});

async function uploadIdProof(
  supabase: SupabaseClient,
  memberId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_ID_PROOF_BYTES) {
    throw new Error("ID proof must be 15 MB or smaller.");
  }
  // Accepts PDF or image. Server-side: downsizes images, strips EXIF (PII),
  // re-emits as PDF. Typical 1-3 MB phone scan ends up ~150-300 KB.
  const compressed = await compressIdProof(file);
  // Always store as .pdf — the bucket is homogeneous, the download API
  // returns application/pdf regardless of original input.
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").replace(/\.[^.]+$/, "");
  const path = `${memberId}/${Date.now()}-${safeName || "id"}.pdf`;
  const { error } = await supabase.storage
    .from(ID_PROOF_BUCKET)
    .upload(path, compressed.bytes, {
      contentType: compressed.contentType,
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function createMember(formData: FormData) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    emergency_contact_name: formData.get("emergency_contact_name") || undefined,
    emergency_contact_phone: formData.get("emergency_contact_phone") || undefined,
    check_in_date: formData.get("check_in_date") || undefined,
    status: (formData.get("status") as string) || "pending",
  };

  const parsed = memberSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error("Please check the form for errors.");
  }

  const v = parsed.data;
  const insertPayload = {
    name: v.name,
    phone: v.phone || null,
    email: v.email || null,
    emergency_contact_name: v.emergency_contact_name || null,
    emergency_contact_phone: v.emergency_contact_phone || null,
    check_in_date: v.check_in_date || null,
    status: v.status ?? "pending",
    id_proof_url: null as string | null,
  };

  const { data: inserted, error } = await supabase
    .from("members")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[members.create] insert failed:", error?.message);
    // Common case: duplicate phone/email constraint. Show a user-friendly
    // message rather than echoing raw Postgres constraint names.
    if (error?.code === "23505") {
      throw new Error(
        "A member with this phone or email already exists. Please double-check.",
      );
    }
    throw new Error("Could not create member. Please try again.");
  }

  const file = formData.get("id_proof_file");
  if (file instanceof File && file.size > 0) {
    try {
      const path = await uploadIdProof(supabase, inserted.id, file);
      await supabase
        .from("members")
        .update({ id_proof_url: path })
        .eq("id", inserted.id);
      insertPayload.id_proof_url = path;
    } catch (e) {
      // Member row is already created; surface the upload error but don't
      // rollback — admin can re-upload from the edit page.
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  await writeAudit(supabase, {
    action: "create",
    table_name: "members",
    record_id: inserted.id,
    new_values: insertPayload,
  });

  revalidatePath("/members");
  redirect("/members");
}

export async function updateMember(
  idOrFormData: string | FormData,
  maybeFormData?: FormData,
) {
  await requireStaffOrAdmin();
  console.log("[updateMember] invoked, first arg type:", typeof idOrFormData, idOrFormData instanceof FormData ? "is FormData" : "");
  // Supports both call shapes:
  //   action={updateMember.bind(null, memberId)} (legacy, bound arg)
  //   action={updateMember}                      (new, hidden _id input)
  const formData =
    typeof idOrFormData === "string"
      ? (maybeFormData as FormData)
      : idOrFormData;
  const id =
    typeof idOrFormData === "string"
      ? idOrFormData
      : (idOrFormData.get("_id") as string);

  console.log("[updateMember] id=", id, "formData keys:", formData ? Array.from(formData.keys()) : "null");

  if (!id) throw new Error("Missing member id.");

  const supabase = createActionClient();
  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    emergency_contact_name: formData.get("emergency_contact_name") || undefined,
    emergency_contact_phone: formData.get("emergency_contact_phone") || undefined,
    check_in_date: formData.get("check_in_date") || undefined,
    status: formData.get("status") as string,
  };

  const parsed = memberSchema.safeParse(raw);

  if (!parsed.success) {
    console.log("[updateMember] validation failed:", parsed.error.issues);
    throw new Error(
      `Please check the form: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  }
  console.log("[updateMember] validation ok, updating...");

  const { data: before } = await supabase
    .from("members")
    .select(
      "name, phone, email, emergency_contact_name, emergency_contact_phone, check_in_date, status, id_proof_url",
    )
    .eq("id", id)
    .maybeSingle();

  const v = parsed.data;
  const updatePayload: Record<string, unknown> = {
    name: v.name,
    phone: v.phone || null,
    email: v.email || null,
    emergency_contact_name: v.emergency_contact_name || null,
    emergency_contact_phone: v.emergency_contact_phone || null,
    check_in_date: v.check_in_date || null,
    status: v.status ?? "pending",
  };

  const file = formData.get("id_proof_file");
  if (file instanceof File && file.size > 0) {
    const path = await uploadIdProof(supabase, id, file);
    updatePayload.id_proof_url = path;
    // best-effort: remove the old file if it lived in our bucket
    const oldPath = before?.id_proof_url ?? null;
    if (oldPath && !oldPath.startsWith("http")) {
      await supabase.storage.from(ID_PROOF_BUCKET).remove([oldPath]);
    }
  }

  const { error } = await supabase
    .from("members")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("[members.update] update failed:", error.message);
    if (error.code === "23505") {
      throw new Error(
        "A member with this phone or email already exists. Please double-check.",
      );
    }
    throw new Error("Could not save member. Please try again.");
  }
  console.log("[updateMember] update success");

  await writeAudit(supabase, {
    action: "update",
    table_name: "members",
    record_id: id,
    old_values: before ?? null,
    new_values: updatePayload,
  });

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function checkoutMember(memberId: string) {
  await requireStaffOrAdmin();
  const supabase = createActionClient();
  const { error } = await supabase.rpc("checkout_member", {
    p_member_id: memberId,
  });
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "checkout",
    table_name: "members",
    record_id: memberId,
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/rooms");
  revalidatePath("/assignments");
  return { ok: true };
}

export async function deleteMember(memberId: string) {
  await requireAdmin();
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("members")
    .select(
      "name, phone, email, emergency_contact_name, emergency_contact_phone, check_in_date, status, id_proof_url",
    )
    .eq("id", memberId)
    .maybeSingle();

  // If the member has an active assignment, check them out first so the
  // delete_member RPC doesn't reject on "Member has an active assignment".
  const { data: activeAssignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("member_id", memberId)
    .eq("is_active", true)
    .maybeSingle();
  if (activeAssignment) {
    const { error: coErr } = await supabase.rpc("checkout_member", {
      p_member_id: memberId,
    });
    if (coErr) return { error: `checkout failed: ${coErr.message}` };
  }

  const { error } = await supabase.rpc("delete_member", {
    p_member_id: memberId,
  });
  if (error) return { error: error.message };

  await writeAudit(supabase, {
    action: "delete",
    table_name: "members",
    record_id: memberId,
    old_values: before ?? null,
  });

  revalidatePath("/members");
  revalidatePath("/rooms");
  revalidatePath("/assignments");
  redirect("/members");
}

export async function deleteMembersBulk(memberIds: string[]) {
  await requireAdmin();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return { error: "No members selected" };
  }
  const supabase = createActionClient();

  const { data: before } = await supabase
    .from("members")
    .select(
      "id, name, phone, email, emergency_contact_name, emergency_contact_phone, check_in_date, status, id_proof_url",
    )
    .in("id", memberIds);

  // Find which members still have an active assignment; check those out first
  // so the subsequent delete doesn't fail on "Member has an active assignment".
  const { data: activeAssignments } = await supabase
    .from("assignments")
    .select("member_id")
    .in("member_id", memberIds)
    .eq("is_active", true);
  const needsCheckout = new Set(
    (activeAssignments ?? []).map((a) => (a as { member_id: string }).member_id),
  );

  const failed: Array<{ id: string; reason: string }> = [];
  let deleted = 0;
  for (const id of memberIds) {
    if (needsCheckout.has(id)) {
      const { error: coErr } = await supabase.rpc("checkout_member", {
        p_member_id: id,
      });
      if (coErr) {
        failed.push({ id, reason: `checkout failed: ${coErr.message}` });
        continue;
      }
    }

    const { error } = await supabase.rpc("delete_member", { p_member_id: id });
    if (error) {
      failed.push({ id, reason: error.message });
      continue;
    }
    const row = (before ?? []).find((r) => (r as { id: string }).id === id);
    await writeAudit(supabase, {
      action: "delete",
      table_name: "members",
      record_id: id,
      old_values: (row as Record<string, unknown>) ?? null,
    });
    deleted += 1;
  }

  revalidatePath("/members");
  revalidatePath("/rooms");
  revalidatePath("/assignments");

  if (deleted === 0 && failed.length > 0) {
    return { error: failed.map((f) => f.reason).join("; ") };
  }
  return { ok: true, deleted, failed };
}

