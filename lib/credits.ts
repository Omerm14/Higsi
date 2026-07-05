import { sql } from "./db";

// All balance changes go through the append-only credit_transactions ledger,
// with users.balance_credits as the cached balance maintained in the same
// statement. The Neon HTTP driver is single-statement (no interactive
// transactions), so every mutation here is one atomic writable CTE.
// Idempotency is enforced at the DB level by two partial unique indexes:
// one on stripe_session_id (a replayed Stripe webhook can't double-grant)
// and one on (generation_id) where reason='refund' (a cron/poll race can't
// double-refund).

export type GrantReason = "purchase" | "signup_bonus" | "admin_adjustment";

// Deducts atomically; returns the new balance, or null if the balance was
// insufficient (the guarded update matched 0 rows, so nothing was written).
export async function deductCredits(
  userId: string,
  credits: number,
  generationId: string
): Promise<number | null> {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error(`Invalid credit amount: ${credits}`);
  }
  const db = sql();
  const rows = (await db`
    with spend as (
      update users
      set balance_credits = balance_credits - ${credits}
      where id = ${userId} and balance_credits >= ${credits}
      returning balance_credits
    ), ledger as (
      insert into credit_transactions (user_id, delta, reason, generation_id)
      select ${userId}, ${-credits}, 'generation', ${generationId}
      from spend
    )
    select balance_credits from spend
  `) as { balance_credits: number }[];
  return rows.length > 0 ? rows[0].balance_credits : null;
}

// Refunds a failed generation. Safe to call more than once — the partial
// unique index on (generation_id) where reason='refund' makes the second
// call insert nothing, and the CTE only credits the balance when the
// ledger row actually landed.
export async function refundGeneration(
  userId: string,
  credits: number,
  generationId: string
): Promise<boolean> {
  if (!Number.isInteger(credits) || credits <= 0) return false;
  const db = sql();
  const rows = (await db`
    with ledger as (
      insert into credit_transactions (user_id, delta, reason, generation_id)
      values (${userId}, ${credits}, 'refund', ${generationId})
      on conflict do nothing
      returning delta
    )
    update users
    set balance_credits = balance_credits + ${credits}
    where id = ${userId} and exists (select 1 from ledger)
    returning balance_credits
  `) as { balance_credits: number }[];
  return rows.length > 0;
}

// Grants credits (purchase / signup bonus / admin). For purchases,
// stripeSessionId makes the grant idempotent against webhook replays.
// Returns false when the grant was a duplicate no-op.
export async function grantCredits(
  userId: string,
  credits: number,
  reason: GrantReason,
  stripeSessionId?: string
): Promise<boolean> {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error(`Invalid credit amount: ${credits}`);
  }
  const db = sql();
  const rows = (await db`
    with ledger as (
      insert into credit_transactions (user_id, delta, reason, stripe_session_id)
      values (${userId}, ${credits}, ${reason}, ${stripeSessionId ?? null})
      on conflict do nothing
      returning delta
    )
    update users
    set balance_credits = balance_credits + ${credits}
    where id = ${userId} and exists (select 1 from ledger)
    returning balance_credits
  `) as { balance_credits: number }[];
  return rows.length > 0;
}

export async function getBalance(userId: string): Promise<number> {
  const db = sql();
  const rows = (await db`
    select balance_credits from users where id = ${userId}
  `) as { balance_credits: number }[];
  return rows[0]?.balance_credits ?? 0;
}

// Velocity guard on top of the balance: bounds the blast radius of a
// stolen session or a card-dispute abuser to one day's cap.
export async function creditsSpentLast24h(userId: string): Promise<number> {
  const db = sql();
  const rows = (await db`
    select coalesce(sum(-delta), 0) as spent
    from credit_transactions
    where user_id = ${userId}
      and reason = 'generation'
      and created_at > now() - interval '24 hours'
  `) as { spent: string }[];
  return Number(rows[0]?.spent ?? 0);
}
