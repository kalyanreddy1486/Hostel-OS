/**
 * Surgical cleanup of the load-test synthetic data.
 *
 * Deletes (scoped to your tenant only):
 *   - All rooms with room_number 9000-9199 (the seeder's output)
 *   - The single room "TEST-9999" (from the room-create test)
 *   - All beds inside those rooms (cascade)
 *   - All members with name starting "Test " (the seeder's output)
 *   - All payments / invoices / extra_charges / assignments tied to those members
 *   - Maintenance tickets where title starts "TEST:"
 *   - Expenses where description starts "TEST:"
 *
 * Does NOT touch:
 *   - Real members (sai krishna, leela krishna, Aravind reddy, thrived reddy, etc.)
 *   - Real rooms (101, 201, etc.)
 *   - Audit log entries (kept for traceability)
 *   - Any invoice/payment manually created during testing on a real member
 *     (those need manual cleanup if you want them gone)
 *
 * Usage:
 *   TENANT_ID=<uuid> npx tsx scripts/wipe-test-data.ts [--dry-run]
 *
 * The TENANT_ID env var is required so this script can never accidentally
 * wipe data in the wrong tenant. Find your tenant id in Supabase:
 *   SELECT id, hostel_name FROM public.tenants;
 */

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID || !/^[0-9a-f-]{36}$/i.test(TENANT_ID)) {
  console.error(
    "✗ Set TENANT_ID env var to a valid UUID before running. " +
      "This guard prevents accidental cross-tenant data loss.",
  );
  process.exit(1);
}

async function runSql(sql: string) {
  const pat = process.env.SUPABASE_MGMT_TOKEN;
  const ref = process.env.SUPABASE_MUMBAI_REF;
  if (!pat || !ref) throw new Error("SUPABASE_MGMT_TOKEN/REF missing");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 HostelOS-Wipe",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const t = TENANT_ID;

  console.log(
    `→ ${dryRun ? "DRY RUN" : "DELETE"}: scoped to tenant ${t} only.\n`,
  );

  // 1. Show what's about to go
  console.log("→ Counting what will be deleted…\n");
  const counts = await runSql(`
    SELECT 'test members' AS what, count(*)::int AS n
      FROM public.members
      WHERE tenant_id = '${t}' AND name LIKE 'Test %'
    UNION ALL
    SELECT 'test rooms (9000-9199)', count(*)
      FROM public.rooms
      WHERE tenant_id = '${t}' AND room_number ~ '^9[0-9]{3}$'
    UNION ALL
    SELECT 'TEST-9999 room', count(*)
      FROM public.rooms
      WHERE tenant_id = '${t}' AND room_number = 'TEST-9999'
    UNION ALL
    SELECT 'TEST: maintenance tickets', count(*)
      FROM public.maintenance_tickets
      WHERE tenant_id = '${t}' AND title LIKE 'TEST:%'
    UNION ALL
    SELECT 'TEST: expenses', count(*)
      FROM public.expenses
      WHERE tenant_id = '${t}' AND description LIKE 'TEST:%';
  `);
  for (const row of counts) {
    console.log(`   ${row.what.padEnd(28)} ${String(row.n).padStart(5)}`);
  }
  console.log();

  if (dryRun) {
    console.log("Dry-run mode — exiting. Re-run without --dry-run to delete.");
    return;
  }

  console.log("→ Executing transactional cleanup…\n");

  // 2. Wipe in FK order, all in one transaction.
  //    Note: assignments → invoices → payments / extra_charges all reference
  //    members; assignments and beds reference rooms. Delete dependents first.
  await runSql(`
    BEGIN;

    -- Dependents of test members ----------------------------------------
    DELETE FROM public.payments p
    USING public.members m
    WHERE p.member_id = m.id
      AND m.tenant_id = '${t}' AND m.name LIKE 'Test %';

    DELETE FROM public.invoices i
    USING public.members m
    WHERE i.member_id = m.id
      AND m.tenant_id = '${t}' AND m.name LIKE 'Test %';

    DELETE FROM public.extra_charges ec
    USING public.members m
    WHERE ec.member_id = m.id
      AND m.tenant_id = '${t}' AND m.name LIKE 'Test %';

    DELETE FROM public.maintenance_tickets t
    USING public.members m
    WHERE t.raised_by = m.id
      AND m.tenant_id = '${t}' AND m.name LIKE 'Test %';

    -- TEST-prefixed tickets / expenses (independent of any member) -------
    DELETE FROM public.maintenance_tickets
    WHERE tenant_id = '${t}' AND title LIKE 'TEST:%';

    DELETE FROM public.expenses
    WHERE tenant_id = '${t}' AND description LIKE 'TEST:%';

    -- Assignments — by member then by bed in test rooms ----------------
    DELETE FROM public.assignments a
    USING public.members m
    WHERE a.member_id = m.id
      AND m.tenant_id = '${t}' AND m.name LIKE 'Test %';

    DELETE FROM public.assignments a
    USING public.beds b, public.rooms r
    WHERE a.bed_id = b.id
      AND b.room_id = r.id
      AND r.tenant_id = '${t}'
      AND (r.room_number ~ '^9[0-9]{3}$' OR r.room_number = 'TEST-9999');

    -- Members ----------------------------------------------------------
    DELETE FROM public.members
    WHERE tenant_id = '${t}' AND name LIKE 'Test %';

    -- Beds in test rooms ----------------------------------------------
    DELETE FROM public.beds b
    USING public.rooms r
    WHERE b.room_id = r.id
      AND r.tenant_id = '${t}'
      AND (r.room_number ~ '^9[0-9]{3}$' OR r.room_number = 'TEST-9999');

    -- Test rooms ------------------------------------------------------
    DELETE FROM public.rooms
    WHERE tenant_id = '${t}'
      AND (room_number ~ '^9[0-9]{3}$' OR room_number = 'TEST-9999');

    COMMIT;
  `);

  // 3. Verify everything is gone
  console.log("→ Verifying counts after delete…\n");
  const after = await runSql(`
    SELECT 'test members remaining' AS what, count(*)::int AS n
      FROM public.members
      WHERE tenant_id = '${t}' AND name LIKE 'Test %'
    UNION ALL
    SELECT 'test rooms remaining', count(*)
      FROM public.rooms
      WHERE tenant_id = '${t}' AND (room_number ~ '^9[0-9]{3}$' OR room_number = 'TEST-9999')
    UNION ALL
    SELECT 'TEST: tickets remaining', count(*)
      FROM public.maintenance_tickets
      WHERE tenant_id = '${t}' AND title LIKE 'TEST:%'
    UNION ALL
    SELECT 'TEST: expenses remaining', count(*)
      FROM public.expenses
      WHERE tenant_id = '${t}' AND description LIKE 'TEST:%';
  `);
  for (const row of after) {
    console.log(`   ${row.what.padEnd(28)} ${String(row.n).padStart(5)}`);
  }

  // 4. Show what's left
  const remaining = await runSql(`
    SELECT
      (SELECT count(*) FROM public.rooms WHERE tenant_id = '${t}') AS rooms,
      (SELECT count(*) FROM public.beds WHERE tenant_id = '${t}') AS beds,
      (SELECT count(*) FROM public.members WHERE tenant_id = '${t}') AS members,
      (SELECT count(*) FROM public.assignments WHERE tenant_id = '${t}' AND is_active = true) AS active_assignments;
  `);
  console.log("\n✓ Cleanup complete. Real data still in tenant:\n");
  console.log(`   Rooms:              ${remaining[0].rooms}`);
  console.log(`   Beds:               ${remaining[0].beds}`);
  console.log(`   Members:            ${remaining[0].members}`);
  console.log(`   Active assignments: ${remaining[0].active_assignments}`);
}

main().catch((e) => {
  console.error("\n✗ Wipe failed:", e.message ?? e);
  process.exit(1);
});
