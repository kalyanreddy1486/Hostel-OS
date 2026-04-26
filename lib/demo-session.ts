import { cookies } from "next/headers";
import { createBackendClient } from "@/lib/backend/supabase";

export const DEMO_COOKIE = "hostel_demo_as";
export const DEMO_RESIDENT_USER_ID = "63287e6c-81dc-4337-9ad6-76d1fa0b77e8";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getDemoImpersonationUserId(): string | null {
  if (process.env.AUTH_MODE === "strict") return null;
  const v = cookies().get(DEMO_COOKIE)?.value;
  if (v && UUID_RE.test(v)) return v;
  return null;
}

export async function resolveDemoResident(userId: string) {
  const supabase = createBackendClient();
  const { data } = await supabase
    .from("members")
    .select("id, name, email, phone")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
