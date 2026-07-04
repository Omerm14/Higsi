create extension if not exists pgcrypto;

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  task_type text not null,
  mode text not null check (mode in ('t2v', 'i2v', 't2i')),
  prompt text not null,
  params jsonb not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'staged', 'completed', 'failed')
  ),
  piapi_task_id text not null,
  media_url text,
  est_cost_usd numeric(10, 4) not null,
  actual_cost_usd numeric(10, 4),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists generations_created_at_idx on generations (created_at desc);
