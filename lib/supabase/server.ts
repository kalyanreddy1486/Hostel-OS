import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { getControllerActingAs } from "@/lib/controller-impersonation";

export function createClient() {
  const cookieStore = cookies();
  // When the controller is "viewing as" a tenant, every PostgREST call gets
  // an x-controller-acting-as header that get_my_tenant_id() reads server-side
  // (it only honors the header for caller.role = 'controller').
  const actingAs = getControllerActingAs();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* ignore when called from a Server Component */
          }
        },
      },
      ...(actingAs
        ? {
            global: {
              headers: { "x-controller-acting-as": actingAs },
            },
          }
        : {}),
    },
  );
}
