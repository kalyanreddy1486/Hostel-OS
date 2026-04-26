/**
 * Decorative SVG marks used across the editorial layout.
 *
 * These are intentionally hand-drawn (irregular paths, slight wobble) to
 * introduce warmth that geometric icons can't. Saffron-tinted by default;
 * pass `className` to override.
 */

export function SaffronUnderline({
  className = "h-2 w-32 text-amber-500",
}: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 8"
      fill="none"
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d="M2 5C30 2 60 6 90 4C120 2 150 6 198 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function SaffronArc({
  className = "size-72 text-amber-400",
}: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="arc-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#arc-grad)" />
      <path
        d="M30 100 A70 70 0 0 1 170 100"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
      />
    </svg>
  );
}

export function DotMatrix({
  className = "h-16 w-32 text-foreground/15",
  cols = 12,
  rows = 6,
}: { className?: string; cols?: number; rows?: number }) {
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={c * 8 + 2} cy={r * 8 + 2} r="1" fill="currentColor" />);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${cols * 8} ${rows * 8}`}
      className={className}
      aria-hidden
    >
      {dots}
    </svg>
  );
}

export function HairlineRule({
  className = "h-px w-full text-foreground/15",
}: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 1"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <line x1="0" y1="0.5" x2="400" y2="0.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

export function ChapterMark({
  number,
  className = "text-amber-600",
}: { number: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-xs ${className}`}
      aria-hidden
    >
      <span className="grid size-5 place-items-center rounded-full ring-1 ring-current">
        {number}
      </span>
      <span className="h-px w-8 bg-current opacity-40" />
    </span>
  );
}

export function QuoteMark({
  className = "size-12 text-amber-300/40",
}: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden fill="currentColor">
      <path d="M30 20C18 25 12 38 12 50V60H30V42H22C22 32 26 25 32 22L30 20ZM62 20C50 25 44 38 44 50V60H62V42H54C54 32 58 25 64 22L62 20Z" />
    </svg>
  );
}

export function PaperGrain({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}
