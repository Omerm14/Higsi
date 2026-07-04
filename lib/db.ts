import { neon } from "@neondatabase/serverless";
import type { Mode } from "./models";
import type { TaskStatus } from "./providers/types";

function sql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL is not set");
  return neon(url);
}

export interface Generation {
  id: string;
  model: string;
  task_type: string;
  mode: Mode;
  prompt: string;
  params: Record<string, unknown>;
  status: TaskStatus;
  piapi_task_id: string;
  media_url: string | null;
  est_cost_usd: string;
  actual_cost_usd: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function insertGeneration(input: {
  model: string;
  taskType: string;
  mode: Mode;
  prompt: string;
  params: Record<string, unknown>;
  piapiTaskId: string;
  estCostUsd: number;
}): Promise<Generation> {
  const db = sql();
  const rows = (await db`
    insert into generations
      (model, task_type, mode, prompt, params, piapi_task_id, est_cost_usd, status)
    values
      (${input.model}, ${input.taskType}, ${input.mode}, ${input.prompt},
       ${JSON.stringify(input.params)}, ${input.piapiTaskId}, ${input.estCostUsd}, 'pending')
    returning *
  `) as Generation[];
  return rows[0];
}

export async function getGeneration(id: string): Promise<Generation | undefined> {
  const db = sql();
  const rows = (await db`select * from generations where id = ${id}`) as Generation[];
  return rows[0];
}

export async function listGenerations(): Promise<Generation[]> {
  const db = sql();
  return (await db`select * from generations order by created_at desc limit 200`) as Generation[];
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
