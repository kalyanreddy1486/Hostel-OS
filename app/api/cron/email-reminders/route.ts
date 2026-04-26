import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { _runBulkRemindersInternal } from "@/app/actions/email-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron endpoint: send email reminders for due/overdue invoices.
 *
 * Triggered by Vercel Cron (after deploy) or pg_cron via pg_net.
 * Authentication: Bearer token must match CRON_SECRET env var.
 *
 * Vercel Cron config goes in vercel.json:
 *   { "crons": [{ "path": "/api/cron/email-reminders", "schedule": "0 9 * * *" }] }
 *
 * Vercel automatically attaches an `Authorization: Bearer <CRON_SECRET>`
 * header when CRON_SECRET is set in project env.
 */
function authorized(req: Request, secret: string): boolean {
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Constant-time comparison so an attacker can't recover the secret one
  // byte at a time via response-latency timing.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }
  if (!authorized(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await _runBulkRemindersInternal({
    limit: 200,
    cooldownHours: 24,
    withinDays: 7,
  });

  return NextResponse.json(result);
}

// Vercel Cron sends GET, not POST. Allow both.
export async function GET(req: Request) {
  return POST(req);
}
