import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createBackendClient } from "@/lib/backend/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron endpoint: delete ID-proof PDFs from members who checked out more
 * than RETENTION_MONTHS ago.
 *
 * Why this exists:
 *   - DPDP Act (India) requires personal data to be erased once the
 *     purpose for collecting it is fulfilled. Once a resident has left
 *     and the retention window has passed, the ID proof has no operational
 *     use — keeping it is a liability.
 *   - Reduces Supabase Storage usage as a side effect.
 *
 * What it does:
 *   1. Selects members where status='left' AND check_out_date is older
 *      than RETENTION_MONTHS AND id_proof_url is not null.
 *   2. For each, deletes the file from the id-proofs bucket and nulls
 *      out members.id_proof_url. Logs an audit row.
 *   3. Returns a summary { processed, deleted, errors }.
 *
 * Auth:
 *   Bearer CRON_SECRET, same pattern as email-reminders cron. Vercel Cron
 *   attaches this header automatically when the env var is set.
 *
 * Schedule:
 *   Daily at 03:30 UTC (vercel.json). Mid-night-ish in India.
 */

const RETENTION_MONTHS = 6;
const ID_PROOF_BUCKET = "id-proofs";

function authorized(req: Request, secret: string): boolean {
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (!authorized(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const supabase = createBackendClient();

  const { data: stale, error: queryErr } = await supabase
    .from("members")
    .select("id, tenant_id, check_out_date, id_proof_url")
    .eq("status", "left")
    .lt("check_out_date", cutoffIso)
    .not("id_proof_url", "is", null)
    .limit(200);

  if (queryErr) {
    return NextResponse.json(
      { error: `Query failed: ${queryErr.message}` },
      { status: 500 },
    );
  }

  const rows = stale ?? [];
  let deleted = 0;
  const errors: Array<{ memberId: string; reason: string }> = [];

  for (const row of rows) {
    const path = row.id_proof_url;
    if (!path) continue;

    // Legacy rows may have stored a full URL — skip those (we can't
    // confidently identify the storage path to remove).
    if (path.startsWith("http://") || path.startsWith("https://")) {
      // Still null out the column so we don't keep retrying.
      await supabase
        .from("members")
        .update({ id_proof_url: null })
        .eq("id", row.id);
      continue;
    }

    const { error: rmErr } = await supabase.storage
      .from(ID_PROOF_BUCKET)
      .remove([path]);
    if (rmErr) {
      errors.push({ memberId: row.id, reason: rmErr.message });
      continue;
    }

    const { error: updErr } = await supabase
      .from("members")
      .update({ id_proof_url: null })
      .eq("id", row.id);
    if (updErr) {
      errors.push({ memberId: row.id, reason: updErr.message });
      continue;
    }

    // Audit trail — best-effort (don't fail the whole job if audit insert
    // breaks, just log it).
    await supabase
      .from("audit_logs")
      .insert({
        tenant_id: row.tenant_id,
        action: "id_proof_purged",
        table_name: "members",
        record_id: row.id,
        old_values: { id_proof_url: path, check_out_date: row.check_out_date },
        new_values: { id_proof_url: null },
      })
      .then(({ error }) => {
        if (error) console.warn("[cleanup-id-proofs] audit insert failed:", error.message);
      });

    deleted++;
  }

  return NextResponse.json({
    ok: true,
    cutoff: cutoffIso,
    retentionMonths: RETENTION_MONTHS,
    processed: rows.length,
    deleted,
    errors,
  });
}
