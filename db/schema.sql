-- Full schema for a fresh database. An existing database is upgraded with
-- the ordered migrations in db/MIGRATION.md instead.
create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key, -- Clerk user id (user_...)
  email text,
  display_name text,
  balance_credits integer not null default 0 check (balance_credits >= 0),
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  model text not null,
  task_type text not null,
  category text not null check (
    category in ('image', 'video', 'audio', '3d', 'tool')
  ),
  prompt text not null,
  params jsonb not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'staged', 'completed', 'failed')
  ),
  provider text not null default 'piapi',
  provider_task_id text not null,
  media_url text,
  est_cost_usd numeric(10, 4) not null,
  actual_cost_usd numeric(10, 4),
  credits_charged integer not null default 0,
  refunded boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists generations_created_at_idx on generations (created_at desc);
create index if not exists generations_user_created_idx on generations (user_id, created_at desc);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  delta integer not null, -- +purchase/grant, -spend, +refund
  reason text not null check (
    reason in ('purchase', 'generation', 'refund', 'signup_bonus', 'admin_adjustment')
  ),
  generation_id uuid references generations(id),
  stripe_session_id text,
  note text,
  created_at timestamptz not null default now()
);

-- DB-level idempotency: a replayed Stripe webhook can't double-grant and a
-- poll/cron race can't double-refund.
create unique index if not exists credit_tx_stripe_session_uniq
  on credit_transactions (stripe_session_id) where stripe_session_id is not null;
create unique index if not exists credit_tx_generation_refund_uniq
  on credit_transactions (generation_id) where reason = 'refund';
create index if not exists credit_tx_user_idx on credit_transactions (user_id, created_at desc);

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);
