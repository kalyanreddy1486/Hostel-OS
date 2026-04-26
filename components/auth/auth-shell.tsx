import Link from "next/link";
import { BarChart3, ShieldCheck, Sparkles, Wallet } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: BarChart3,
    title: "Live revenue pulse",
    body: "See billed vs collected by day. Spot overdue invoices before they age into problems.",
  },
  {
    icon: Wallet,
    title: "Billing on autopilot",
    body: "Electricity, rent, food and extras roll up into one invoice — paid via any mode you want.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "Row-level security on every table. Residents only ever see their own data.",
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-800 p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-5"
              aria-hidden
            >
              <path
                d="M4 4h3v7h10V4h3v16h-3v-6H7v6H4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">HostelOS</p>
            <p className="text-xs text-white/60">The operating system for your hostel</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 backdrop-blur">
              <Sparkles className="size-3" />
              Built for modern hostels
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight">
              Run every room, bill, and ticket from one calm dashboard.
            </h1>
            <p className="mt-3 text-sm text-white/75">
              HostelOS replaces scattered spreadsheets and WhatsApp threads with
              a single source of truth — for you and your residents.
            </p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <h.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-white/70">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/60">
          <span>© {new Date().getFullYear()} HostelOS</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <a href="mailto:support@hostel.os" className="hover:text-white">
              Support
            </a>
          </div>
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-4"
                aria-hidden
              >
                <path
                  d="M4 4h3v7h10V4h3v16h-3v-6H7v6H4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold">HostelOS</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-10 lg:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
