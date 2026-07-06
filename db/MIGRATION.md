# Manual DB migrations

The dev sandbox can't reach Neon directly (raw-TCP Postgres and Neon's HTTPS
data-API host are both blocked by network policy), so schema changes are
written here and run manually via Neon's web SQL Editor.

**Run these in order, top to bottom, before (or together with) deploying the
SaaS pivot.** Each block is idempotent-ish — safe to re-run except where
noted. Fresh databases can skip all of this and run `db/schema.sql` instead.

## Migration 001 — users + ownership

Run this AFTER you've signed in once through the deployed app's new Clerk
login (you need your own Clerk user id, visible in the Clerk dashboard under
Users — it looks like `user_2abc...`). Replace `user_OWNER_CLERK_ID` below
with it. Note: your first sign-in will fail to create rows until this
migration runs — that's fine, sign in anyway to mint the Clerk id, run this,
then reload.

```sql
create table if not exists users (
  id text primary key,
  email text,
  display_name text,
  balance_credits integer not null default 0 check (balance_credits >= 0),
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table generations add column if not exists user_id text references users(id);
create index if not exists generations_user_created_idx on generations (user_id, created_at desc);

-- Adopt all existing rows as the owner's:
insert into users (id, email) values ('user_OWNER_CLERK_ID', 'omermoran14@gmail.com')
  on conflict (id) do nothing;
update generations set user_id = 'user_OWNER_CLERK_ID' where user_id is null;
alter table generations alter column user_id set not null;
```

## Migration 002 — credit ledger

```sql
create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  delta integer not null,
  reason text not null check (
    reason in ('purchase', 'generation', 'refund', 'signup_bonus', 'admin_adjustment')
  ),
  generation_id uuid references generations(id),
  stripe_session_id text,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_tx_stripe_session_uniq
  on credit_transactions (stripe_session_id) where stripe_session_id is not null;
create unique index if not exists credit_tx_generation_refund_uniq
  on credit_transactions (generation_id) where reason = 'refund';
create index if not exists credit_tx_user_idx on credit_transactions (user_id, created_at desc);

alter table generations add column if not exists credits_charged integer not null default 0;
alter table generations add column if not exists refunded boolean not null default false;
```

## Migration 003 — rate limits

```sql
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);
```

## Migration 004 — provider columns

The rename is NOT re-runnable (second run errors harmlessly because the
column is already renamed).

```sql
alter table generations add column if not exists provider text not null default 'piapi';
alter table generations rename column piapi_task_id to provider_task_id;
```

## Optional — grant yourself admin credits

So you never pay yourself while testing (replace the id):

```sql
with grant_tx as (
  insert into credit_transactions (user_id, delta, reason, note)
  values ('user_OWNER_CLERK_ID', 100000, 'admin_adjustment', 'owner test credits')
  returning delta
)
update users set balance_credits = balance_credits + 100000
where id = 'user_OWNER_CLERK_ID';
```

## Sanity checks after running everything

```sql
select column_name from information_schema.columns
where table_name = 'generations' order by ordinal_position;
-- expect: ... user_id, provider, provider_task_id, credits_charged, refunded ...

select count(*) from users;
select count(*) from generations where user_id is null; -- expect 0
```
