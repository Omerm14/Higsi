# SETUP — going live as a pay-per-use product

Everything in this checklist happens outside the code (Clerk, Stripe, Neon,
Vercel dashboards). Work top to bottom; the app boots with warnings until
the "required" vars are set and fails loudly if the core three are missing.

## 1. Clerk (auth)

1. Create an application at https://dashboard.clerk.com — enable **Google**
   and **Email** sign-in.
2. From the app's **API Keys** page copy both keys into Vercel → Project →
   Settings → Environment Variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Deploy, then sign in once yourself. In Clerk dashboard → Users, copy your
   user id (`user_...`) and:
   - set it as `ADMIN_CLERK_USER_ID` in Vercel env vars (unlocks `/admin`);
   - paste it into **Migration 001** in `db/MIGRATION.md` and run the
     migrations in Neon's SQL Editor (in order, 001 → 004).

## 2. Stripe (credit purchases)

1. Create an account at https://dashboard.stripe.com (test mode first).
2. Developers → API keys → copy the **secret key** → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → **Add endpoint**:
   - URL: `https://<your-domain>/api/webhooks/stripe`
   - Event: `checkout.session.completed`
   - Copy the **signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. No products/prices to create — the checkout uses inline `price_data`.
5. Test: buy the $10 pack with card `4242 4242 4242 4242` → your balance
   should jump by 1,000 credits and a `purchase` row should appear in
   `credit_transactions`.
6. When ready for real money, flip Stripe to live mode and swap both keys.

## 3. Remaining environment variables (Vercel)

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<your-production-domain>` (no trailing slash) |
| `CRON_SECRET` | any long random string (`openssl rand -hex 32`) — Vercel automatically sends it with cron requests |
| `DAILY_SPEND_CAP_CREDITS` | per-user daily cap, default `5000` (= $50 customer-facing) |
| `MONTHLY_CAP_USD` | global provider-spend kill switch — raise it well above expected volume (e.g. `1000`) now that each user pays |
| `SENTRY_DSN` | optional — create a Next.js project at sentry.io and paste its DSN |
| `FAL_KEY` | optional until Fal models are enabled — from https://fal.ai/dashboard/keys |

Already set from before: `PIAPI_KEY`, `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`.

## 4. Vercel plan

The reconciler cron (`vercel.json`, every minute) needs **Vercel Pro**. On
Hobby it silently degrades to ~once a day, which means stuck jobs can take a
day to auto-refund. Pro is the right call for a paid product.

## 5. Fal.ai (optional cost reduction, later)

The Fal provider is wired in code but **no Fal model is enabled** — every
model must be live-spike-verified first (provider docs lie; that convention
has caught three broken integrations so far). To enable one:

```bash
npx tsx scripts/provider-spike.ts --provider fal --model fal-ai/flux/schnell --input '{"prompt":"a red fox"}'
```

If it completes with a real output URL, add a `ModelOption` with
`provider: "fal"` in `lib/models.ts` (model = the Fal path, taskType = ""),
set its true `rateUsd` from Fal's pricing page, and compare cost/quality
against the PiAPI equivalent before switching defaults.

## 6. Launch smoke test (10 minutes)

1. Fresh browser / second Google account → sign up → dashboard shows the
   500-credit welcome.
2. Generate an image from a preset → balance ticks down in the header →
   confetti on completion.
3. Second account's gallery is empty; pasting the owner's `/api/media/<id>`
   URL returns 404.
4. Spend down to near zero → generate → "Not enough credits" with a Buy
   credits button → test-card purchase → balance +1,000.
5. In Neon, set a generation's `created_at` back an hour while `pending` →
   within a minute the cron marks it failed and the refund appears in the
   ledger.
6. `/admin` shows users, margins, and recent generations (only for your
   account; anyone else gets a 404).

## 7. Naming

The product name lives in one place: `lib/brand.ts`. Change `name`,
`tagline`, `description`, and `logoLetter` when you settle on the final
brand, and update `NEXT_PUBLIC_APP_URL` + Clerk/Stripe URLs if the domain
changes.
