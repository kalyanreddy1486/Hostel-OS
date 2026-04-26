# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root.

- `npm run dev` — start dev server. The `predev` step wipes `.next/` first, so every `dev` boot is a clean build.
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm run lint` — ESLint via `next lint` (extends `next/core-web-vitals`).

There is no test runner configured.

## Environment

Copy [.env.example](./.env.example) to `.env.local`. Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — used by both the browser client and the SSR/middleware clients.
- `SUPABASE_SERVICE_ROLE_KEY` — used by [lib/backend/supabase.ts](./lib/backend/supabase.ts) for internal API routes. If absent it silently falls back to the anon key (demo-mode behavior — tighten this before going to prod).

The PRD ([How_to_do.txt](How_to_do.txt)) is the product spec. Section 4 defines the Supabase schema; Section 7.4 defines the `assign_bed` RPC; the codebase also calls `checkout_member`, `delete_member`, `get_dashboard_kpis`, and reads from a `room_occupancy` view — these must exist in Supabase for the app to work. [scripts/make-admin.sql](./scripts/make-admin.sql) is a one-shot to promote a user to admin.

## Architecture

### Stack
Next.js 14 App Router (React 18), TypeScript strict, Tailwind + shadcn/ui (`style: "base-nova"`, `baseColor: "neutral"`, Lucide icons), Supabase for DB/auth, Zod + react-hook-form for forms, Sonner for toasts. Path alias `@/*` resolves from repo root.

### Route groups
- `app/(auth)/` — login, register (public).
- `app/(dashboard)/` — authenticated shell with sidebar + topbar ([layout.tsx](./app/(dashboard)/layout.tsx)). All staff/admin pages live here. Residents see a reduced sidebar with only `/my-account`.
- `app/api/` — internal REST endpoints consumed by server components via `fetch`. They all use `createBackendClient()` and set `export const dynamic = "force-dynamic"`.

### Three Supabase client flavors — don't mix them up
- [lib/supabase/client.ts](./lib/supabase/client.ts) — `createBrowserClient` from `@supabase/ssr`, for client components.
- [lib/supabase/server.ts](./lib/supabase/server.ts) — `createServerClient` bound to `next/headers` cookies, for server components and server actions. Its `setAll` swallows errors because Server Components cannot mutate cookies.
- [lib/backend/supabase.ts](./lib/backend/supabase.ts) — `createClient` from `supabase-js`, no cookies, no session. Used only inside `app/api/*/route.ts`. Prefers service-role, falls back to anon.

Middleware ([middleware.ts](./middleware.ts) → [lib/supabase/middleware.ts](./lib/supabase/middleware.ts)) refreshes Supabase cookies on every request but is currently **demo mode**: it never redirects to `/login`. Re-enabling the auth gate is a deliberate change, not a bug.

### Auth / role model (demo-mode quirk)
[lib/auth.ts](./lib/auth.ts) returns a hardcoded `DEMO_SESSION` (`role: "admin"`) when no Supabase user is present. [lib/require-role.ts](./lib/require-role.ts) and [lib/require-admin.ts](./lib/require-admin.ts) currently all just call `requireSession()` — they're stubs. When real auth is turned back on, these are the single chokepoint to add redirects and role checks; call sites already treat them as gates.

### Server-component → API-route data flow
Pages in `(dashboard)` fetch from their own `/api/*` endpoints instead of calling Supabase directly:
```
page.tsx (server component)
  → fetch(`${getRequestOrigin()}/api/…`, { cache: "no-store" })
    → route.ts uses createBackendClient() (service role)
```
Absolute origin is required for server-side fetch; use [getRequestOrigin()](./lib/server/origin.ts), which derives it from `host` + `x-forwarded-proto`. When adding a new dashboard page that needs data, follow this pattern rather than calling Supabase from the page directly — it keeps RLS-sensitive reads behind the service-role boundary.

### Mutations: server actions, not API routes
Writes go through `"use server"` actions in [app/actions/](./app/actions/) ([members.ts](./app/actions/members.ts), [rooms.ts](./app/actions/rooms.ts), [assignments.ts](./app/actions/assignments.ts)). They use the SSR client (user-scoped), validate with Zod, call `revalidatePath`, and then `redirect`. Cross-table writes (bed assignment, checkout, delete) go through Supabase RPCs — never replicate that logic client-side.

Example: creating a room inserts the `rooms` row **and** fan-out-creates N `beds` rows (one per capacity) — see [app/actions/rooms.ts](./app/actions/rooms.ts). Bed assignment / checkout / member delete all go through the `assign_bed` / `checkout_member` / `delete_member` RPCs so the multi-table updates stay transactional.

### UI conventions
- shadcn components live in [components/ui/](./components/ui/). Feature components in sibling folders ([components/rooms/](./components/rooms/), [components/members/](./components/members/), [components/assignments/](./components/assignments/), [components/dashboard/](./components/dashboard/)).
- Theme is CSS-variable driven (see `tailwind.config.ts` + `app/globals.css`), including a `sidebar-*` palette.
- Status colors follow PRD §8: green (active/paid/available), yellow (pending/reserved), red (left/overdue/occupied), orange (maintenance/partial).
- Toasts via Sonner, mounted once in [app/layout.tsx](./app/layout.tsx) (`richColors`, `top-center`).

### Build phase status
Per PRD §11, this is Phase 1 (MVP): Members, Rooms, Beds, Assignments. Sidebar entries for Billing, Payments, Electricity, Maintenance, Reports are intentionally rendered as disabled "Soon" links in [components/dashboard/app-sidebar.tsx](./components/dashboard/app-sidebar.tsx) — the PRD's schema and flows for those exist but the pages don't.
