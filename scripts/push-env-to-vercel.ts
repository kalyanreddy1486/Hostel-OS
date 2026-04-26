/**
 * Bulk-push every variable from .env.local to Vercel for production +
 * preview + development environments. Run once after `vercel link`.
 *
 * Usage:
 *   VERCEL_TOKEN=<token> npx tsx scripts/push-env-to-vercel.ts
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

const TOKEN = process.env.VERCEL_TOKEN;
const SCOPE = process.env.VERCEL_SCOPE || "895kkr-4294s-projects";

if (!TOKEN) {
  console.error("✗ VERCEL_TOKEN env var required");
  process.exit(1);
}

// Parse .env.local — manual parser so we don't expand $VARS (a service-role
// JWT can contain $ chars and we want them preserved verbatim).
function parseEnvFile(file: string): Record<string, string> {
  const text = fs.readFileSync(file, "utf8");
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function pushEnv(
  key: string,
  value: string,
  target: "production" | "preview" | "development",
): Promise<void> {
  return new Promise((resolve, reject) => {
    // `vercel env add <name> <target>` reads the value from stdin.
    const proc = spawn(
      "npx",
      [
        "vercel",
        "env",
        "add",
        key,
        target,
        "--token",
        TOKEN!,
        "--scope",
        SCOPE,
      ],
      { stdio: ["pipe", "pipe", "pipe"], shell: true },
    );
    let stderr = "";
    proc.stdout.on("data", () => {
      /* swallow noise */
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        // already-exists is not fatal — we'll handle it
        if (/already exists/i.test(stderr)) {
          resolve();
        } else {
          reject(new Error(`vercel env add ${key} ${target} failed: ${stderr}`));
        }
      }
    });
    proc.stdin.write(value);
    proc.stdin.end();
  });
}

async function main() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(`✗ .env.local not found at ${envPath}`);
    process.exit(1);
  }

  const env = parseEnvFile(envPath);
  const keys = Object.keys(env).filter((k) => env[k] !== "");
  console.log(`→ Found ${keys.length} non-empty vars in .env.local`);
  console.log(`→ Target scope: ${SCOPE}`);
  console.log();

  const targets: Array<"production" | "preview" | "development"> = [
    "production",
    "preview",
    "development",
  ];

  let ok = 0;
  let failed = 0;
  for (const key of keys) {
    process.stdout.write(`   ${key.padEnd(38)} `);
    try {
      for (const t of targets) {
        await pushEnv(key, env[key], t);
      }
      console.log("✓");
      ok++;
    } catch (e) {
      console.log(`✗ ${(e as Error).message.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\n→ Pushed ${ok} vars (${failed} failed) to Vercel\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
