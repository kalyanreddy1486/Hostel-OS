import { cache } from "react";
import { createBackendClient } from "@/lib/backend/supabase";

export type AppSettings = {
  upi_vpa: string;
  upi_payee_name: string;
  /** Custom WhatsApp reminder template. Empty string = use built-in default. */
  whatsapp_template: string;
};

// DEFAULT_WHATSAPP_TEMPLATE + WHATSAPP_PLACEHOLDERS live in lib/whatsapp.ts
// (pure module, safe to import from client components — this file pulls in
//  next/headers via the supabase backend client).

export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = createBackendClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["upi_vpa", "upi_payee_name", "whatsapp_template"]);
  const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value]));
  return {
    upi_vpa: map.get("upi_vpa") ?? "",
    upi_payee_name: map.get("upi_payee_name") ?? "HostelOS",
    whatsapp_template: map.get("whatsapp_template") ?? "",
  };
});
