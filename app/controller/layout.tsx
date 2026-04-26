import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { requireController } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function ControllerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireController();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/controller"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="size-3.5" strokeWidth={2.25} />
            </span>
            <span>
              <span className="block font-display text-[15px] font-semibold tracking-tight">
                Hostel<span className="text-muted-foreground">OS</span>
              </span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Controller
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium text-muted-foreground">
                Signed in
              </div>
              <div className="font-mono text-sm text-foreground">
                {session.user.email ?? "controller"}
              </div>
            </div>
            <Link
              href="/logout"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 font-medium transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
