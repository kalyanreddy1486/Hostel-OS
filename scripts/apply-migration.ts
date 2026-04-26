/**
 * One-shot migration runner using the Supabase Management SQL API.
 *
 * Usage:
 *   npx tsx scripts/apply-migration.ts supabase/migrations/<file>.sql
 *
 * Uses SUPABASE_MGMT_TOKEN + SUPABASE_MUMBAI_REF from .env.local — the same
 * env vars the app's lookupUserIdByEmail() helper relies on.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error("Usage: npx tsx scripts/apply-migration.ts <file.sql>");
  }

  const sql = fs.readFileSync(file, "utf8");
  const pat = process.env.SUPABASE_MGMT_TOKEN;
  const ref = process.env.SUPABASE_MUMBAI_REF;
  if (!pat || !ref) {
    throw new Error("SUPABASE_MGMT_TOKEN and SUPABASE_MUMBAI_REF must be set");
  }

  console.log(`→ Applying ${file} to project ${ref}…`);
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 HostelOS-Migrate",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  console.log(`✓ Applied. Response: ${text.slice(0, 200)}`);
}

main().catch((err) => {
  console.error("✗ Migration failed:", err.message ?? err);
  process.exit(1);
});
