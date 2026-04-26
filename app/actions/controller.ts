"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireController } from "@/lib/require-role";
import { createBackendClient } from "@/lib/backend/supabase";
import { VIEW_AS_COOKIE } from "@/lib/controller-impersonation";

export async function startViewAs(formData: FormData): Promise<void> {
  await requireController();
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
    throw new Error("Invalid tenant id");
  }
  cookies().set(VIEW_AS_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h max session
  });
  redirect("/dashboard");
}

export async function exitViewAs(): Promise<void> {
  await requireController();
  cookies().delete(VIEW_AS_COOKIE);
  redirect("/controller");
}

function adminApi() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const jwt = process.env.SUPABASE_SERVICE_ROLE_JWT!;
  if (!jwt) {
    throw new Error("SUPABASE_SERVICE_ROLE_JWT not set");
  }
  return { url, jwt };
}

async function callAdminApi(
  path: string,
  init: { method: string; body?: unknown },
) {
  const { url, jwt } = adminApi();
  const res = await fetch(`${url}${path}`, {
    method: init.method,
    headers: {
      apikey: jwt,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

const passwordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export async function resetTenantAdminPassword(formData: FormData) {
  await requireController();
  const parsed = passwordSchema.safeParse({
    user_id: formData.get("user_id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const { user_id, password } = parsed.data;
  const r = await callAdminApi(`/auth/v1/admin/users/${user_id}`, {
    method: "PUT",
    body: { password },
  });
  if (!r.ok) {
    return { error: `Auth API ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}` };
  }
  revalidatePath("/controller");
  return { ok: true };
}

const emailSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().trim().email().max(254),
});

export async function changeTenantAdminEmail(formData: FormData) {
  await requireController();
  const parsed = emailSchema.safeParse({
    user_id: formData.get("user_id"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const { user_id, email } = parsed.data;

  // Verify the user_id actually owns a tenant. Without this, a controller
  // could submit any UUID and we'd happily PUT it to Supabase Admin API +
  // mirror to whatever tenant happens to match.
  const supabase = createBackendClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("admin_user_id", user_id)
    .maybeSingle();
  if (!tenant) {
    return {
      error:
        "No hostel found for that admin. The user may have been deleted or moved.",
    };
  }

  const r = await callAdminApi(`/auth/v1/admin/users/${user_id}`, {
    method: "PUT",
    body: { email, email_confirm: true },
  });
  if (!r.ok) {
    return { error: `Auth API ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}` };
  }
  await supabase
    .from("tenants")
    .update({ contact_email: email })
    .eq("id", tenant.id);
  revalidatePath("/controller");
  return { ok: true };
}

const tenantUpdateSchema = z.object({
  tenant_id: z.string().uuid(),
  hostel_name: z.string().trim().min(1).max(120),
  status: z.enum(["active", "suspended"]),
  notes: z.string().max(1000).optional(),
});

const onboardSchema = z.object({
  hostel_name: z.string().trim().min(1).max(120),
  admin_email: z.string().trim().email().max(254),
  admin_full_name: z.string().trim().min(1).max(120),
  admin_password: z.string().min(8).max(72),
  notes: z.string().max(1000).optional(),
});

export async function onboardTenant(formData: FormData) {
  await requireController();
  const parsed = onboardSchema.safeParse({
    hostel_name: formData.get("hostel_name"),
    admin_email: formData.get("admin_email"),
    admin_full_name: formData.get("admin_full_name"),
    admin_password: formData.get("admin_password"),
    notes: (formData.get("notes") as string) || undefined,
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

  // 1. Create the auth user
  const created = await callAdminApi("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: v.admin_email,
      password: v.admin_password,
      email_confirm: true,
      user_metadata: { full_name: v.admin_full_name },
    },
  });
  if (!created.ok) {
    return {
      error: `Could not create admin user: ${JSON.stringify(created.body).slice(0, 200)}`,
    };
  }
  const adminUserId = (created.body as { id: string }).id;

  // 2. Create the tenant row
  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      hostel_name: v.hostel_name,
      contact_email: v.admin_email,
      admin_user_id: adminUserId,
      status: "active",
      notes: v.notes ?? null,
    })
    .select("id")
    .single();
  if (tenantErr || !tenantRow) {
    // Roll back the auth user so we don't leak orphans on retry
    await callAdminApi(`/auth/v1/admin/users/${adminUserId}`, { method: "DELETE" });
    return { error: `Could not create tenant: ${tenantErr?.message ?? "unknown"}` };
  }

  // 3. Insert the admin profile via the JS client (parameterized, no SQL
  //    injection surface — `admin_full_name` only travels through
  //    Supabase's prepared statements here, never raw SQL).
  await supabase
    .from("profiles")
    .upsert(
      {
        id: adminUserId,
        full_name: v.admin_full_name,
        role: "admin",
        tenant_id: tenantRow.id,
      },
      { onConflict: "id" },
    );

  // 4. Backfill auth.identities + null-token columns (Mumbai migration
  //    gotchas — see project_mumbai_migration memory). The auth.* schema
  //    isn't exposed to PostgREST so we have to use the Mgmt SQL endpoint.
  //    Only `adminUserId` (a UUID) gets interpolated; we validate format
  //    before touching SQL so injection is impossible regardless of input
  //    source.
  if (UUID_RE.test(adminUserId)) {
    const sql = `
      INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      SELECT u.id::text, u.id,
             jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
             'email', now(), now(), now()
      FROM auth.users u
      WHERE u.id = '${adminUserId}'::uuid
        AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider='email');

      UPDATE auth.users SET
        confirmation_token     = COALESCE(confirmation_token, ''),
        recovery_token         = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change           = COALESCE(email_change, '')
      WHERE id = '${adminUserId}'::uuid;
    `;
    const pat = process.env.SUPABASE_MGMT_TOKEN;
    const ref = process.env.SUPABASE_MUMBAI_REF;
    if (pat && ref) {
      await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pat}`,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 HostelOS-Onboarding",
          },
          body: JSON.stringify({ query: sql }),
          cache: "no-store",
        },
      );
    }
  }

  revalidatePath("/controller");
  return { ok: true, tenant_id: tenantRow.id, admin_user_id: adminUserId };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deleteSchema = z.object({
  tenant_id: z.string().uuid(),
  // Type-to-confirm: caller must echo the hostel name exactly.
  confirm: z.string().min(1),
});

export async function deleteTenant(formData: FormData) {
  await requireController();
  const parsed = deleteSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const { tenant_id, confirm } = parsed.data;
  const supabase = createBackendClient();

  // Verify the typed name matches.
  const { data: tenant, error: lookupErr } = await supabase
    .from("tenants")
    .select("hostel_name, admin_user_id")
    .eq("id", tenant_id)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr.message };
  if (!tenant) return { error: "Hostel not found." };
  if (confirm.trim() !== tenant.hostel_name) {
    return {
      error: `Confirmation didn't match. Type "${tenant.hostel_name}" exactly.`,
    };
  }

  // Delete the tenant row. ON DELETE CASCADE on every data table will wipe
  // rooms / beds / members / assignments / invoices / payments / etc.
  const { error: deleteErr } = await supabase
    .from("tenants")
    .delete()
    .eq("id", tenant_id);
  if (deleteErr) return { error: deleteErr.message };

  // Best-effort: also remove the admin auth user so they can't log in to a
  // dead tenant. The profile row stays (FK is ON DELETE SET NULL on tenant_id)
  // until the auth user delete cascades it away.
  if (tenant.admin_user_id) {
    await callAdminApi(`/auth/v1/admin/users/${tenant.admin_user_id}`, {
      method: "DELETE",
    });
  }

  revalidatePath("/controller");
  return { ok: true };
}

export async function updateTenantMeta(formData: FormData) {
  await requireController();
  const parsed = tenantUpdateSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    hostel_name: formData.get("hostel_name"),
    status: formData.get("status"),
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; "),
    };
  }
  const { tenant_id, hostel_name, status, notes } = parsed.data;
  const supabase = createBackendClient();
  const { error } = await supabase
    .from("tenants")
    .update({ hostel_name, status, notes: notes ?? null })
    .eq("id", tenant_id);
  if (error) return { error: error.message };
  revalidatePath("/controller");
  return { ok: true };
}
