# HostelOS

**The operating system for your hostel.** A multi-tenant SaaS that replaces scattered spreadsheets and WhatsApp threads with a single source of truth — for hostel owners and their residents.

> Built for Indian PG / hostel managers handling 100–1,000 residents per property.

---

## 🌐 Live

- **App:** https://hostel-os-zeta.vercel.app
- **Try it:** sign up your own hostel at https://hostel-os-zeta.vercel.app/register (email OTP, takes a minute)

---

## 🚀 How to use it (admin / hostel owner)

This is the workflow from "I just signed up" to "my hostel is fully running on HostelOS."

### 1 — Sign up

1. Visit https://hostel-os-zeta.vercel.app/register
2. Enter your email + hostel name
3. Check your inbox for a 6-digit OTP, paste it back in
4. Set a password
5. You're in — landed on `/dashboard`

### 2 — Tell HostelOS about your UPI ID

Open **Settings → UPI payments**. Paste your UPI VPA (e.g. `9876543210@okhdfcbank`) and the payee name to show in UPI apps. Save. Every reminder you send from now on includes a one-tap UPI deep link for residents.

### 3 — Set up your rooms

Open **Rooms → Add room**. For each room give it:
- Room number (101, 102, A1, whatever you use)
- Type (single / double / triple / dormitory)
- Floor
- Capacity (1–6 — beds get auto-created)
- Monthly rent
- Amenities (AC, attached bathroom, wifi, wardrobe, geyser)

Add as many rooms as you have. The Rooms page lets you filter by **floor**, **sharing type**, **AC / non-AC**, and **availability** — handy when prospects ask "what 2-sharing AC rooms do you have free?"

### 4 — Add your residents

Open **Members → Add member**. Fill in name, phone, email, emergency contact, and upload an ID proof (Aadhaar / PAN / passport — PDF or photo, we auto-compress and strip EXIF).

### 5 — Assign a bed to each member

Open **Assignments**, pick a member + a free bed, set the move-in date and any deposit / advance, and click **Assign**. The bed flips to "occupied", the member's status flips to "active", and they're billable from that date.

### 6 — Generate the first invoice

Open **Billing → New invoice**. Pick the **room** first, then the **member** in that room (the dropdown narrows down). Rent auto-fills from the room's monthly rate. Add any electricity / food / extras / late fees. Click **Create invoice**.

The invoice goes out by email immediately (resident gets the UPI link + a "Confirm payment" link).

### 7 — Collect rent

Two paths:
- **Resident pays via UPI** → opens your custom-saved email/WhatsApp link → after paying, hits the confirm-payment page → pastes their UTR. You see the claim in **Billing → Pending claims**, click **Confirm**.
- **Resident pays cash / bank transfer** → open **Payments → Record payment** → pick the member, amount, mode, reference.

Either way, the invoice flips to **paid** and the dashboard updates instantly.

### 8 — Handle maintenance

When something breaks:
- **Resident reports it** at https://your-app.com/report-issue (no login needed) — staff sees it in **Maintenance**
- **Or you log it yourself** at **Maintenance → New ticket**

Assign to a staff member, set priority, mark resolved when done. Resident gets an automatic email when status changes.

### 9 — Send rent reminders

For any unpaid invoice on **Billing**:
- **WhatsApp:** click the WhatsApp icon → opens wa.me with your custom message + UPI link pre-filled
- **Email:** click the email icon → sends the email immediately
- **Bulk:** click **"Send reminders to all overdue"** at the top of `/billing`

Email reminders also fire **automatically every morning at 09:00 UTC** for any overdue invoice.

### 10 — Customise the messages

Open **Settings**. Two cards let you edit the actual text of:
- **WhatsApp reminder message** — what residents see when you click the WhatsApp button
- **Email reminder body** — what they receive in the rent reminder email

Both support `{placeholder}` tokens (`{name}`, `{amount}`, `{due_date}`, `{upi_vpa}`, `{claim_link}`, `{report_link}`) with a live preview as you type. Saving an empty body uses the built-in default.

### 11 — Track money + occupancy

- **Dashboard** — KPIs (occupied beds, active members, pending dues), 30-day collection trend, expenditure card, outstanding invoices, urgent tickets
- **Reports** — billing vs collection over 3 / 6 / 12 months, payment-mode mix, ticket SLA

### 12 — When a resident leaves

Open their member page → **Check out**. Their bed frees up, status flips to "left", any unpaid invoice stays attached. **Six months after checkout** the system auto-deletes their stored ID proof (DPDP-compliant retention).

---

## 🤝 How residents use it (no login required)

Residents never see the admin app. They only interact with two public links:

| Link | What they do |
|---|---|
| `/pay/<invoice-id>` (sent in reminders) | Pay via UPI deep link → paste UTR → admin confirms within 24h |
| `/report-issue` | Pick the hostel name + describe the problem → ticket lands in admin's `/maintenance` |

No accounts, no passwords, no app to install.

---

## ✨ Highlights

- 🏠 **Multi-tenant** — one deployment serves many hostels, isolated by Postgres row-level security
- 🛏 **Rooms · beds · members · assignments** — full occupancy model with bed-level granularity
- 💸 **Billing engine** — monthly invoices auto-generated by `pg_cron`, late fees on overdue, partial payments tracked
- 📱 **WhatsApp click-to-chat reminders** — free, no API fees, just `wa.me` deep links
- 📨 **Email reminders** — configurable templates, automatic + on-demand
- 🔐 **Self-service auth** — signup with OTP, forgot-password with rate-limited 6-digit codes
- 🧾 **Public payment claim form** — residents paste their UTR after paying via UPI; admin confirms in one click
- 🛠 **Maintenance tickets** — public report-issue page, staff assignment, status tracking
- 📊 **Reports** — billing vs collection chart, payment-mix breakdown, occupancy %, ticket SLA
- 🇮🇳 Built for **₹** (INR) and Indian banking conventions

---

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router · React 18 Server Components · Tailwind · shadcn/ui · Motion |
| Backend | Next.js Server Actions · Supabase Postgres · Edge Functions for cron jobs |
| Database | Postgres with Row-Level Security · `pg_cron` for scheduled jobs · `pg_net` for outbound HTTP |
| Auth | Supabase Auth (email/password + OTP) |
| Storage | Supabase Storage (id-proofs bucket, RLS-gated, 60-second signed URLs) |
| Observability | Sentry |
| Hosting | Vercel (Mumbai region for low latency to Indian users) |
| Email | Configurable SMTP (Gmail / Resend / any provider) |
| File compression | `sharp` for images, `pdf-lib` for PDFs (server-side, EXIF stripped) |

## Architecture in one screen

```
┌────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Browser       │────▶│  Next.js on Vercel    │────▶│ Supabase Mumbai  │
│ (admin / staff │     │  - SSR + Server      │     │ - Postgres + RLS │
│  / public)     │     │    Actions           │     │ - pg_cron jobs   │
└────────────────┘     │  - Suspense streaming│     │ - Edge Functions │
                       └──────────────────────┘     └──────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Sentry · SMTP    │
                        └──────────────────┘
```

Every database read/write goes through RLS — admin A can never see admin B's residents, even with a stolen anon key. Service-role calls (cron jobs, public endpoints) are deliberate and audited.

## ⚡ Performance

Measured on production (Mumbai region), warm cache, with 200 rooms · 700+ residents · 700+ active assignments seeded for the load test:

| Page | LCP | TTFB |
|---|---|---|
| `/dashboard` | **828 ms** | 325 ms |
| `/members` (renders all 699 rows) | 1896 ms | 265 ms |
| `/billing` | 676 ms | 259 ms |
| `/reports` | **368 ms** | 286 ms |
| `/login` | 224 ms | 8 ms |

All Core Web Vitals firmly in Google's "Good" zone. The dashboard streams via React Suspense — hero paints in 400 ms, KPI cards arrive as data loads.

## 🔁 What runs automatically

| Cron job | Schedule (UTC) | Schedule (IST) | Purpose |
|---|---|---|---|
| Email rent reminders | `0 9 * * *` | 14:30 daily | Sends reminders for overdue invoices |
| ID-proof cleanup | `30 3 * * *` | 09:00 daily | Deletes ID proofs of members checked out >6 months (DPDP-compliant) |
| Monthly invoice generation | `0 2 1 * *` | 07:30 on 1st of month | Auto-generates next month's invoices for all active residents (pg_cron) |
| Mark overdue | `0 4 * * *` | 09:30 daily | Flips invoices past due date from `pending` → `overdue` (pg_cron) |

---

## 💻 Local development

```bash
# 1. Clone + install
git clone https://github.com/kalyanreddy1486/Hostel-OS.git
cd Hostel-OS
npm install

# 2. Configure env vars
cp .env.example .env.local
# fill in your Supabase URL, keys, mgmt token, SMTP creds, etc.

# 3. Run
npm run dev
# → http://localhost:3000
```

### Database setup

Connect any Supabase project (free tier works). The schema lives in `supabase/migrations/` — apply in order. Key migrations:

- `*_assert_member_in_my_tenant.sql` — tenant guard helpers used by SECURITY DEFINER RPCs
- `*_assert_bed_in_my_tenant.sql` — bed-side tenant guard
- `*_email_otps_*.sql` — OTP table with rate limiting
- `*_invoice_last_email_reminder.sql` — reminder cooldown tracking
- `*_signup_otps.sql` — public signup verification

### Project structure

```
hostel-os/
├── app/
│   ├── (auth)/          # /login, /register
│   ├── (dashboard)/     # admin pages: /members /rooms /billing /payments /reports …
│   ├── api/             # /api/dashboard /api/reports /api/cron …
│   └── actions/         # server actions: members, rooms, invoices, payments …
├── components/
│   ├── billing/         # invoice form, table, email reminder button
│   ├── dashboard/       # KPI bento, collection chart, expenditure card …
│   ├── members/         # delete, transfer-bed, checkout buttons
│   └── ui/              # shadcn primitives (button, card, table, badge …)
├── lib/
│   ├── backend/         # Supabase clients (tenant + service-role)
│   ├── email/           # transport + templates
│   └── supabase/        # SSR / browser client factories
├── supabase/
│   ├── migrations/      # SQL migrations
│   └── functions/       # Edge Functions (cron-driven)
└── scripts/             # seed-load-test.ts, wipe-test-data.ts, apply-migration.ts
```

---

## 🔒 Security

- Row-level security on every table — `tenant_id = get_my_tenant_id()` policy on every row
- SECURITY DEFINER RPCs (`assign_bed`, `transfer_bed`, `checkout_member`, `delete_member`) call `assert_*_in_my_tenant()` helpers before any write
- `search_path` locked to `public, pg_temp` on every helper function
- Generic error messages on the public auth surface (no account enumeration)
- Rate-limited OTP issuance (3 per hour per email)
- All public endpoints (`/pay/*`, `/report-issue`, `/api/public-claim`) explicitly listed in middleware
- ID proofs in private bucket, served only via 60-second signed URLs through an authenticated proxy
- ID proof PDFs auto-purged 6 months after resident checkout (DPDP Act data minimization)
- 20+ findings from a self-conducted security audit fixed pre-launch (see `docs/`)

---

## 📦 Useful npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint via `next lint` |
| `npx tsx scripts/seed-load-test.ts <admin-email>` | Seed 200 rooms + 700 synthetic members for a tenant |
| `npx tsx scripts/wipe-test-data.ts` | Delete all `Test ` and `9000-9199`-numbered test data (set `TENANT_ID` env var) |
| `npx tsx scripts/apply-migration.ts <file.sql>` | Apply a SQL migration via Supabase Management API |
| `npx tsx scripts/push-env-to-vercel.ts` | Push every var from `.env.local` to Vercel |

---

## 📜 License

[AGPL-3.0](./LICENSE) — anyone running this code as a service must open-source their version. If that doesn't suit you, reach out for a commercial license.

## 👤 Author

Built solo as an end-to-end engineering exercise: from schema design and RLS policies through SSR rendering, client interactivity, cron jobs, observability, and deploy. Open to questions about any decision in here.
