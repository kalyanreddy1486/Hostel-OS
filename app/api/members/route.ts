import { NextResponse } from "next/server";
import { createTenantClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireStaffOrAdmin();
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();

  const supabase = createTenantClient();
  let query = supabase
    .from("member_summary")
    .select(
      "id, name, phone, status, check_in_date, current_room_number, current_bed_number, created_at",
    )
    .order("created_at", { ascending: false });

  if (status && ["active", "left", "pending"].includes(status)) {
    query = query.eq("status", status);
  }
  if (q) {
    // Sanitize before injecting into PostgREST `.or()` filter DSL.
    // Strip commas (filter separators), parens (filter grouping), and
    // unescape `%`/`_`/`\` so they're treated as literal ilike chars
    // rather than wildcards a user can leverage to enumerate. Cap length
    // to stop pathological queries.
    const safe = q
      .replace(/[,()]/g, " ")
      .replace(/[\\%_]/g, (c) => `\\${c}`)
      .slice(0, 80);
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[/api/members] query failed:", error.message);
    return NextResponse.json(
      { error: "Could not load members." },
      { status: 500 },
    );
  }
  return NextResponse.json({ members: data ?? [] });
}

