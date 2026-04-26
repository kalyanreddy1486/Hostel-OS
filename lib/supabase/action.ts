import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { createBackendClient } from "@/lib/backend/supabase";

export function createActionClient(): SupabaseClient<Database> {
  if (process.env.AUTH_MODE === "strict") {
    return createSsrClient() as unknown as SupabaseClient<Database>;
  }
  return createBackendClient();
}
