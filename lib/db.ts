import { neon } from "@neondatabase/serverless";
import type { Category } from "./models";
import type { TaskStatus } from "./providers/types";

export function sql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL is not set");
  return neon(url);
}

export interface Generation {
  id: string;
  user_id: string;
  model: string;
  task_type: string;
  category: Category;
  prompt: string;
  params: Record<string, unknown>;
  status: TaskStatus;
  provider: "piapi" | "fal";
  provider_task_id: string;
  media_url: string | null;
  est_cost_usd: string;
  actual_cost_usd: string | null;
  credits_charged: number;
  refunded: boolean;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

// What the browser is allowed to see: provider cost and task internals
// stay server-side — customers reason in credits only.
export type ClientGeneration = Omit<
  Generation,
  "est_cost_usd" | "actual_cost_usd" | "provider_task_id"
>;

export function toClientGeneration(g: Generation): ClientGeneration {
  const { est_cost_usd, actual_cost_usd, provider_task_id, ...client } = g;
  void est_cost_usd;
  void actual_cost_usd;
  void provider_task_id;
  return client;
}

export async function insertGeneration(input: {
  userId: string;
  model: string;
  taskType: string;
  category: Category;
  prompt: string;
  params: Record<string, unknown>;
  provider: "piapi" | "fal";
  estCostUsd: number;
  creditsCharged: number;
}): Promise<Generation> {
  const db = sql();
  // provider_task_id starts empty — it's filled in after the provider
  // accepts the task. The row must exist first so the credit ledger has a
  // generation to reference, and so a crash between deduct and submit is
  // visible to the reconciler cron (empty task id + stale pending = refund).
  const rows = (await db`
    insert into generations
      (user_id, model, task_type, category, prompt, params, provider,
       provider_task_id, est_cost_usd, credits_charged, status)
    values
      (${input.userId}, ${input.model}, ${input.taskType}, ${input.category},
       ${input.prompt}, ${JSON.stringify(input.params)}, ${input.provider},
       '', ${input.estCostUsd}, ${input.creditsCharged}, 'pending')
    returning *
  `) as Generation[];
  return rows[0];
}

export async function setGenerationTaskId(id: string, taskId: string): Promise<void> {
  const db = sql();
  await db`update generations set provider_task_id = ${taskId} where id = ${id}`;
}

export async function deleteGeneration(id: string): Promise<void> {
  const db = sql();
  await db`delete from generations where id = ${id}`;
}

// userId scopes the lookup to the caller's own rows — pass null only from
// trusted server-side contexts (the reconciler cron).
export async function getGeneration(
  id: string,
  userId: string | null
): Promise<Generation | undefined> {
  const db = sql();
  const rows = (userId === null
    ? await db`select * from generations where id = ${id}`
    : await db`select * from generations where id = ${id} and user_id = ${userId}`) as Generation[];
  return rows[0];
}

export async function listGenerations(userId: string): Promise<Generation[]> {
  const db = sql();
  return (await db`
    select * from generations
    where user_id = ${userId}
    order by created_at desc
    limit 200
  `) as Generation[];
}

export async function listStuckGenerations(): Promise<Generation[]> {
  const db = sql();
  return (await db`
    select * from generations
    where status in ('pending', 'processing', 'staged')
      and created_at < now() - interval '3 minutes'
    order by created_at asc
    limit 20
  `) as Generation[];
}

export async function updateGenerationStatus(
  id: string,
  fields: {
    status: TaskStatus;
    mediaUrl?: string;
    actualCostUsd?: number;
    error?: string;
  }
): Promise<Generation> {
  const db = sql();
  const completedAt = fields.status === "completed" || fields.status === "failed" ? new Date().toISOString() : null;
  const rows = (await db`
    update generations
    set status = ${fields.status},
        media_url = coalesce(${fields.mediaUrl ?? null}, media_url),
        actual_cost_usd = coalesce(${fields.actualCostUsd ?? null}, actual_cost_usd),
        error = coalesce(${fields.error ?? null}, error),
        completed_at = coalesce(${completedAt}, completed_at)
    where id = ${id}
    returning *
  `) as Generation[];
  return rows[0];
}

// Global provider-spend kill switch across all users — the per-user guards
// are the credit balance plus the daily velocity cap in lib/credits.ts.
export async function monthToDateSpendUsd(): Promise<number> {
  const db = sql();
  const rows = (await db`
    select coalesce(sum(coalesce(actual_cost_usd, est_cost_usd)), 0) as total
    from generations
    where created_at >= date_trunc('month', now())
      and status != 'failed'
  `) as { total: string }[];
  return Number(rows[0]?.total ?? 0);
}
