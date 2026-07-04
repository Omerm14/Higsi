# Higsi

Personal image/video generation tool backed by [PiAPI](https://piapi.ai), built
to replace a paid Higgsfield subscription. Single-user, not a product.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `PIAPI_KEY` — from your PiAPI account (piapi.ai). Sign up for free credits.
   - `POSTGRES_URL` — a Neon/Vercel Postgres connection string.
   - `BLOB_READ_WRITE_TOKEN` — from a Vercel Blob store.
   - `MONTHLY_CAP_USD` — spend guardrail, defaults to `50`.
2. Run the schema migration once against your Postgres database:
   ```bash
   psql "$POSTGRES_URL" -f db/schema.sql
   ```
3. Install deps and run the dev server:
   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — Generate is the home
screen, Gallery lists everything that's finished.

## How it works

- `/api/generate` validates the request, estimates cost, checks it against
  `MONTHLY_CAP_USD` (month-to-date spend from the `generations` table), then
  creates a PiAPI task and stores a `pending` row.
- The client polls `/api/jobs/:id`, which polls PiAPI in turn. On completion,
  the server downloads PiAPI's output and re-uploads it to Vercel Blob —
  PiAPI deletes its own outputs after a set period, so this copy is what the
  gallery actually serves.
- `lib/providers/piapi.ts` implements the `Provider` interface in
  `lib/providers/types.ts`. A future fallback provider (e.g. Higgsfield MCP)
  just needs to implement the same interface.

Model/task_type strings and rates live in `lib/models.ts` — PiAPI ships new
models frequently, so re-verify those against live docs before trusting them
for anything beyond personal experimentation.
