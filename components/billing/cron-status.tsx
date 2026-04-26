import { Clock, CheckCircle2, AlertTriangle, Pause } from "lucide-react";
import { createTenantClient } from "@/lib/backend/supabase";

type CronRow = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: {
    status: string | null;
    start_time: string | null;
    end_time: string | null;
    return_message: string | null;
  } | null;
};

const JOB_LABELS: Record<string, { title: string; description: string }> = {
  hostelos_generate_monthly_invoices: {
    title: "Generate rent invoices",
    description:
      "Runs daily. Invoices each resident on their move-in day of the month.",
  },
  hostelos_mark_overdue_invoices: {
    title: "Mark overdue invoices",
    description: "Flips unpaid invoices to overdue once past due date.",
  },
  hostelos_send_rent_reminders: {
    title: "Send rent reminders",
    description: "Emails residents 3 days before their invoice is due.",
  },
  hostelos_heartbeat: {
    title: "Keep-alive heartbeat",
    description: "Hourly ping that prevents Supabase from auto-pausing the project.",
  },
};

function describeSchedule(cron: string): string {
  const hourMatch = /^0 (\d+) \* \* \*$/.exec(cron);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    return `Daily · ${String(hour).padStart(2, "0")}:00 UTC`;
  }
  if (cron === "0 * * * *") return "Every hour";
  if (cron === "0 2 1 * *") return "1st of every month · 02:00 UTC";
  return cron;
}

function nextRunFor(cron: string, now = new Date()): Date | null {
  const hourMatch = /^0 (\d+) \* \* \*$/.exec(cron);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0),
    );
    if (d <= now) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  if (cron === "0 * * * *") {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0),
    );
    return d;
  }
  if (cron === "0 2 1 * *") {
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 2, 0, 0),
    );
    if (now.getUTCDate() < 1 || (now.getUTCDate() === 1 && now.getUTCHours() < 2)) {
      next.setUTCMonth(now.getUTCMonth());
    }
    return next;
  }
  return null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function CronStatus() {
  const supabase = createTenantClient();
  const { data, error } = await supabase.rpc("get_hostelos_cron_status" as never);

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
        Schedule info unavailable.
      </div>
    );
  }

  const payload = data as {
    jobs: Array<{ jobid: number; jobname: string; schedule: string; active: boolean }>;
    runs: Array<{
      jobid: number;
      status: string | null;
      start_time: string | null;
      end_time: string | null;
      return_message: string | null;
    }>;
  };

  const latestByJob = new Map<number, CronRow["last_run"]>();
  for (const r of payload.runs ?? []) {
    if (!latestByJob.has(r.jobid)) {
      latestByJob.set(r.jobid, {
        status: r.status,
        start_time: r.start_time,
        end_time: r.end_time,
        return_message: r.return_message,
      });
    }
  }

  const rows: CronRow[] = (payload.jobs ?? []).map((j) => ({
    ...j,
    last_run: latestByJob.get(j.jobid) ?? null,
  }));

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Scheduled jobs</h3>
          <p className="text-xs text-muted-foreground">
            Automatic background runs on Supabase cron.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Cron live
        </span>
      </div>
      <ul className="divide-y">
        {rows.map((r) => {
          const label = JOB_LABELS[r.jobname] ?? {
            title: r.jobname,
            description: "",
          };
          const next = nextRunFor(r.schedule);
          const status = r.last_run?.status ?? null;
          return (
            <li key={r.jobid} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label.title}</span>
                    {r.active ? null : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        <Pause className="size-3" />
                        paused
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {label.description}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {describeSchedule(r.schedule)}
                  </div>
                  {next ? (
                    <div className="mt-0.5">Next: {fmtTime(next.toISOString())}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {status === "succeeded" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" />
                    Last run succeeded · {fmtTime(r.last_run?.end_time ?? null)}
                  </span>
                ) : status === "failed" ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertTriangle className="size-3" />
                    Last run failed · {fmtTime(r.last_run?.end_time ?? null)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No runs yet — the scheduler will fire on its next window.
                  </span>
                )}
              </div>
              {status === "failed" && r.last_run?.return_message ? (
                <p className="mt-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                  {r.last_run.return_message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
