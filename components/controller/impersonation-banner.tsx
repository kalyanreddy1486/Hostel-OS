import { Eye, X } from "lucide-react";
import { exitViewAs } from "@/app/actions/controller";

export function ImpersonationBanner({
  hostelName,
}: {
  hostelName: string;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-amber-300/30 bg-gradient-to-r from-amber-300/15 via-amber-300/10 to-transparent px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
            <Eye className="size-3" />
            Viewing as
          </span>
          <span className="font-medium text-foreground">{hostelName}</span>
          <span className="hidden text-muted-foreground sm:inline">
            · Anything you do here happens to this hostel.
          </span>
        </div>
        <form action={exitViewAs}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-white/70 px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:bg-white dark:bg-black/30 dark:text-amber-100 dark:hover:bg-black/50"
          >
            <X className="size-3" />
            Exit View-as
          </button>
        </form>
      </div>
    </div>
  );
}
