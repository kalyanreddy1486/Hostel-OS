import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSessionProfile } from "@/lib/auth";

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "checkout"
  | "assign"
  | "status_change";

type AuditEntry = {
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
};

export async function writeAudit(
  supabase: SupabaseClient<Database>,
  entry: AuditEntry,
): Promise<void> {
  try {
    const { user } = await getSessionProfile();
    const performed_by = user.id === "demo-user" ? null : user.id;

    await supabase.from("audit_logs").insert({
      action: entry.action,
      table_name: entry.table_name,
      record_id: entry.record_id,
      old_values: (entry.old_values ?? null) as never,
      new_values: (entry.new_values ?? null) as never,
      performed_by,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
