import type { NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/pay",
  "/report-issue",
  "/api/health",
  "/api/public-claim",
  "/api/public-ticket",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  const { NextResponse } = await import("next/server");

  // Fast path: when auth isn't enforced (demo mode), don't spin up a
  // Supabase server client at all. Every request goes through this
  // middleware, so skipping the ~several-ms of client setup + cookie
  // bookkeeping shows up as lower navigation latency.
  const strict = process.env.AUTH_MODE === "strict";
  if (!strict) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  if (isPublic(pathname)) {
    return NextResponse.next({ request });
  }

  const { createServerClient } = await import("@supabase/ssr");
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate the session for real on every protected request.
  //
  // We previously had a "fast path" that trusted any cookie matching the
  // `sb-*-auth-token` shape, but that was an auth bypass: an attacker
  // could craft a cookie with that name and reach authenticated pages
  // (the page-level role gates would still catch most damage, but unauthed
  // server components could still render). The Supabase SSR client reads
  // from the cookie locally and only hits the auth server if the JWT is
  // expired, so the cost of doing this properly is a few milliseconds at
  // worst — not worth a security shortcut.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return response;
  } catch {
    // If the upstream auth server is unreachable, fall through to the
    // login redirect rather than crashing.
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
