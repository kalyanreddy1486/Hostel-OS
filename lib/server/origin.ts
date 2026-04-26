import { cookies, headers } from "next/headers";

/** Best-effort absolute origin for server-side fetches. */
export function getRequestOrigin() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return null;
  return `${proto}://${host}`;
}

/**
 * Fetch an internal API route from a server component/action, forwarding the
 * current request's cookies so auth middleware doesn't reject the internal
 * hop and send back the login HTML.
 */
export async function serverFetch(path: string, init?: RequestInit) {
  const origin = getRequestOrigin();
  const url = path.startsWith("http") ? path : `${origin ?? ""}${path}`;
  const cookieHeader = cookies().toString();
  const merged = new Headers(init?.headers);
  if (cookieHeader && !merged.has("cookie")) {
    merged.set("cookie", cookieHeader);
  }
  return fetch(url, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: merged,
  });
}

