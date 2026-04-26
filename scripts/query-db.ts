/**
 * One-shot SQL runner — same Management API path as apply-migration.ts,
 * but accepts a SQL string directly so we can poke at the schema fast
 * without writing a migration file.
 *
 * Usage:
 *   npx tsx scripts/query-db.ts "SELECT 1;"
 */

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const sql = process.argv[2];
  if (!sql) throw new Error("Pass SQL as first argument");

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
        "User-Agent": "Mozilla/5.0 HostelOS-Query",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  console.log(text);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
