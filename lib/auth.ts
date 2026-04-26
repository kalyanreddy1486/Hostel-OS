import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  getDemoImpersonationUserId,
  resolveDemoResident,
} from "@/lib/demo-session";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
};

type SessionProfile = {
  user: { id: string; email?: string | null };
  profile: Profile | null;
};

const DEMO_ADMIN: SessionProfile = {
  user: { id: "demo-user", email: "demo@localhost" },
  profile: {
    id: "demo-user",
    full_name: "Demo Admin",
    role: "admin",
    phone: null,
  },
};

// Memoized per-request via React cache(): the dashboard layout + every page's
// `requireStaffOrAdmin()` both call this. Without cache(), each navigation
// fires 2–3 Supabase round-trips for the same session info.
export const getSessionProfile = cache(async (): Promise<SessionProfile> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone")
      .eq("id", user.id)
      .maybeSingle();
    return {
      user: { id: user.id, email: user.email },
      profile: profile as Profile | null,
    };
  }

  const demoResidentId = getDemoImpersonationUserId();
  if (demoResidentId) {
    const member = await resolveDemoResident(demoResidentId);
    return {
      user: { id: demoResidentId, email: member?.email ?? null },
      profile: {
        id: demoResidentId,
        full_name: member?.name ?? "Demo Resident",
        role: "resident",
        phone: member?.phone ?? null,
      },
    };
  }

  return DEMO_ADMIN;
});
