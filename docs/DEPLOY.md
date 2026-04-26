# Deploy guide — Vercel

End-to-end, ~20 minutes. Assumes you have:
- A Supabase project already set up (Mumbai region) with all migrations applied
- A Gmail account with 2FA on + an App Password generated
- A GitHub account (or willingness to use Vercel CLI direct deploy)

---

## 1 — Push to GitHub

If you haven't yet:

```bash
cd hostel-os

# If this isn't a git repo:
git init
git add .
git commit -m "Initial HostelOS commit"

# Create a NEW empty repo at https://github.com/new (no README, no .gitignore — we already have those)
# Then:
git remote add origin https://github.com/<your-user>/hostel-os.git
git branch -M main
git push -u origin main
```

If git is already initialized, just commit and push:

```bash
git add .
git commit -m "Prep for deploy"
git push
```

> ⚠️ **Before pushing, double-check:** `git status` should show `.env.local` as **ignored** (it's in `.gitignore`). If it shows up as a file to be committed, STOP — your secrets would leak to GitHub. Verify `.gitignore` includes `.env*.local`.

---

## 2 — Connect to Vercel

Two options:

### Option A — Vercel dashboard (easier)
1. Go to <https://vercel.com/new>
2. **Import** your GitHub repo
3. Vercel auto-detects Next.js — leave the build command as default
4. **Don't deploy yet** — click "Environment Variables" first

### Option B — Vercel CLI
```bash
npx vercel       # links to a new project
# Follow prompts, accept defaults except project name
```

---

## 3 — Set environment variables in Vercel

In Vercel project → **Settings → Environment Variables**, paste each of these (copy values from your `.env.local`):

### Required to boot

| Variable | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (`sb_secret_*` form) |
| `SUPABASE_SERVICE_ROLE_JWT` | Supabase → Settings → API → service_role JWT (`eyJ...` form) |
| `SUPABASE_MGMT_TOKEN` | <https://supabase.com/dashboard/account/tokens> |
| `SUPABASE_MUMBAI_REF` | Your Supabase project ref (the 20-char string in your project URL) |
| `AUTH_MODE` | `strict` |

### Required for email + signup OTPs

| Variable | Value |
|---|---|
| `SMTP_USER` | Your Gmail (e.g. `you@gmail.com`) |
| `SMTP_PASS` | 16-char Google App Password — **no spaces** |
| `SMTP_FROM` | `HostelOS <you@gmail.com>` |

### Required for daily reminder cron

| Variable | Value |
|---|---|
| `CRON_SECRET` | Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Set AFTER first deploy (see step 5)

| Variable | Value |
|---|---|
| `APP_PUBLIC_URL` | The Vercel URL Vercel gave you, e.g. `https://hostel-os.vercel.app` |

> **Apply each var to all environments** (Production, Preview, Development) unless you have a reason not to.

---

## 4 — First deploy

- **Dashboard:** click **Deploy**.
- **CLI:** `npx vercel --prod`

Wait ~1-2 minutes. Vercel will give you a URL like `https://hostel-os-xyz.vercel.app`.

**Test that the page loads** (you'll get redirected to `/login` since you're not signed in — that's correct).

---

## 5 — Set `APP_PUBLIC_URL` and redeploy

Until this is set, all WhatsApp / email links inside reminders will use `localhost` and won't work for real residents.

1. Go to Vercel → Settings → Environment Variables
2. Add `APP_PUBLIC_URL` = your Vercel URL (the one from step 4)
3. Trigger a redeploy: **Deployments → ⋯ on latest → Redeploy** (or `npx vercel --prod` again)

---

## 6 — Update Supabase Auth config

Open <https://supabase.com/dashboard/project/_/auth/url-configuration> for your project:

- **Site URL** → `https://hostel-os.vercel.app` (your Vercel URL)
- **Redirect URLs** → add the same URL

Save. This stops Supabase emails (if you ever use them) from redirecting to localhost.

---

## 7 — End-to-end smoke test

Open your Vercel URL on **your phone** (not laptop — proves it works on a different network):

1. **Register** a new hostel admin → OTP arrives in Gmail → land on `/dashboard` ✓
2. **Create an invoice** → fresh "your invoice is ready" email arrives, links are real `https://...` URLs ✓
3. **Click WhatsApp Remind** on the invoice → message has tappable confirm link ✓
4. Sign out → click **Forgot password?** → OTP arrives → reset works ✓

If any step fails, check the issue:
- **OTP email doesn't arrive** → check Gmail App Password, check Vercel logs for SMTP errors
- **Links say `localhost`** → `APP_PUBLIC_URL` not set or didn't redeploy after setting it
- **"Service role key required"** at boot → `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel env

---

## 8 — Cron is live (no extra setup)

`vercel.json` at the repo root tells Vercel to run `/api/cron/email-reminders` every day at 9am UTC (`0 9 * * *` — adjust the schedule string in `vercel.json` if you want a different time).

Verify it's scheduled: Vercel project → **Cron** tab. Should show 1 job.

The endpoint requires `Authorization: Bearer <CRON_SECRET>`. Vercel attaches this automatically when `CRON_SECRET` is set in your env.

---

## After deploy

### Daily / weekly things to check

- **Vercel → Logs** for errors (until Sentry is wired up)
- **Supabase → Database → API logs** if a page is slow
- **Gmail → Sent folder** for the daily reminder cron output

### When you change code

```bash
git add .
git commit -m "Fix billing typo"
git push          # Vercel auto-deploys on push to main
```

### When you rotate Gmail App Password

1. Update `SMTP_PASS` in Vercel env
2. Trigger a redeploy (cached SMTP transport caches credentials per-process)

### When you change Supabase keys

Same as above — update env, redeploy.

---

## Costs (free-tier-friendly)

- **Vercel:** Hobby tier free. 100 GB bandwidth, 100k cron invocations / month — way more than enough.
- **Supabase:** Free tier — 500 MB DB, 1 GB storage, 50k monthly active users, 500 MB egress.
- **Gmail SMTP:** Free, ~500 emails / day cap.
- **Domain (optional):** ~₹500/year if you want `https://yourdomain.com` instead of `*.vercel.app`.

Total to run for friends: **₹0/month**.

---

## Rollback

If a deploy breaks something:

- **Dashboard:** Deployments → find a working one → ⋯ → **Promote to Production**
- **CLI:** `npx vercel rollback`

Both take ~10 seconds. No DB changes are reverted by this — schema migrations are forward-only.

---

## Support

- App issues: check `lib/auth.ts`, `lib/require-role.ts`, and the relevant `app/actions/<resource>.ts` server action
- Auth issues: most are documented in the project's CLAUDE.md and `~/.claude/projects/.../memory/` notes
- Supabase issues: check the Mumbai project's logs at supabase.com/dashboard
