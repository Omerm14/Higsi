import { sql } from "./db";

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  balance_credits: number;
  is_banned: boolean;
  created_at: string;
  lifetime_spent_credits: string;
}

export async function adminListUsers(): Promise<AdminUserRow[]> {
  const db = sql();
  return (await db`
    select u.*,
      coalesce((
        select sum(-t.delta) from credit_transactions t
        where t.user_id = u.id and t.reason = 'generation'
      ), 0) as lifetime_spent_credits
    from users u
    order by u.created_at desc
    limit 100
  `) as AdminUserRow[];
}

export interface AdminMargin {
  revenue_usd: number;
  provider_cost_usd: number;
  purchases_usd: number;
}

// Month-to-date economics: what customers burned in credits (face value)
// vs what the providers actually cost, plus cash collected via Stripe.
export async function adminMonthToDate(): Promise<AdminMargin> {
  const db = sql();
  const rows = (await db`
    select
      coalesce((
        select sum(credits_charged) from generations
        where created_at >= date_trunc('month', now())
          and status != 'failed'
      ), 0) / 100.0 as revenue_usd,
      coalesce((
        select sum(coalesce(actual_cost_usd, est_cost_usd)) from generations
        where created_at >= date_trunc('month', now())
          and status != 'failed'
      ), 0) as provider_cost_usd,
      coalesce((
        select sum(delta) from credit_transactions
        where reason = 'purchase'
          and created_at >= date_trunc('month', now())
      ), 0) / 100.0 as purchases_usd
  `) as { revenue_usd: string; provider_cost_usd: string; purchases_usd: string }[];
  const r = rows[0];
  return {
    revenue_usd: Number(r?.revenue_usd ?? 0),
    provider_cost_usd: Number(r?.provider_cost_usd ?? 0),
    purchases_usd: Number(r?.purchases_usd ?? 0),
  };
}

export interface AdminFailureRow {
  model: string;
  total: string;
  failed: string;
}

export async function adminFailureRates(): Promise<AdminFailureRow[]> {
  const db = sql();
  return (await db`
    select model,
      count(*) as total,
      count(*) filter (where status = 'failed') as failed
    from generations
    where created_at > now() - interval '7 days'
    group by model
    order by count(*) desc
  `) as AdminFailureRow[];
}

export interface AdminGenerationRow {
  id: string;
  user_id: string;
  model: string;
  status: string;
  credits_charged: number;
  est_cost_usd: string;
  provider: string;
  created_at: string;
  error: string | null;
}

export async function adminRecentGenerations(): Promise<AdminGenerationRow[]> {
  const db = sql();
  return (await db`
    select id, user_id, model, status, credits_charged, est_cost_usd,
           provider, created_at, error
    from generations
    order by created_at desc
    limit 50
  `) as AdminGenerationRow[];
}
