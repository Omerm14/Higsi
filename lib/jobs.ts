import type { Generation } from "./db";
import { updateGenerationStatus } from "./db";
import { refundGeneration } from "./credits";
import { persistOutputToBlob } from "./blob";
import { getProvider } from "./providers";
import { getModelOption } from "./models";

// Shared by the client-polled /api/jobs/[id] route and the reconciler
// cron: poll the provider once and settle the row — persist output on
// completion, refund credits on failure. Terminal rows pass through
// untouched.
export async function settleGeneration(generation: Generation): Promise<Generation> {
  if (generation.status === "completed" || generation.status === "failed") {
    return generation;
  }

  const modelId = (generation.params as { modelId?: string } | null)?.modelId;
  const outputKind = modelId ? getModelOption(modelId)?.outputKind : undefined;

  const provider = getProvider(generation.provider);
  const result = await provider.getTask(generation.provider_task_id, outputKind);

  if (result.status === "completed" && result.outputUrl) {
    const mediaUrl = await persistOutputToBlob(result.outputUrl, generation.id);
    // Providers don't expose actual billed cost on the get-task response,
    // so the pre-submit estimate is recorded as actual; reconcile against
    // the provider dashboard if precise spend tracking becomes important.
    return updateGenerationStatus(generation.id, {
      status: "completed",
      mediaUrl,
      actualCostUsd: Number(generation.est_cost_usd),
    });
  }

  if (result.status === "failed") {
    return failAndRefund(generation, result.error ?? "Generation failed");
  }

  if (result.status !== generation.status) {
    return updateGenerationStatus(generation.id, { status: result.status });
  }

  return generation;
}

// Refund is idempotent (DB-level unique index), so a poll/cron race can't
// credit the customer twice.
export async function failAndRefund(
  generation: Generation,
  error: string
): Promise<Generation> {
  if (generation.credits_charged > 0) {
    await refundGeneration(generation.user_id, generation.credits_charged, generation.id);
  }
  return updateGenerationStatus(generation.id, { status: "failed", error });
}
