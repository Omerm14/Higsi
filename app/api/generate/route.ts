import { NextResponse } from "next/server";
import { getModelOption, estimateCostUsd, buildProviderInput } from "@/lib/models";
import { getProvider } from "@/lib/providers";
import {
  insertGeneration,
  deleteGeneration,
  setGenerationTaskId,
  monthToDateSpendUsd,
  toClientGeneration,
} from "@/lib/db";
import { requireUser, authErrorResponse } from "@/lib/users";
import { validateFieldValues } from "@/lib/validate";
import { customerCreditCost } from "@/lib/pricing";
import { deductCredits, creditsSpentLast24h } from "@/lib/credits";
import { failAndRefund } from "@/lib/jobs";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/ratelimit";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const minute = await checkRateLimit(
    `generate:m:${user.id}`,
    RATE_LIMITS.generatePerMinute,
    60
  );
  if (!minute.ok) return rateLimitResponse();
  const hour = await checkRateLimit(
    `generate:h:${user.id}`,
    RATE_LIMITS.generatePerHour,
    3600
  );
  if (!hour.ok) return rateLimitResponse();

  const body = await req.json().catch(() => null);
  const { modelId, values } = (body ?? {}) as {
    modelId?: string;
    values?: Record<string, unknown>;
  };

  const option = getModelOption(modelId ?? "");
  if (!option) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  const validated = validateFieldValues(option, values ?? {});
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const fieldValues = validated.clean;

  const promptField = option.fields.find((f) => f.type === "prompt");
  const prompt = promptField ? String(fieldValues[promptField.key] ?? "") : "";

  const estCostUsd = estimateCostUsd(option, fieldValues);
  const credits = customerCreditCost(option, fieldValues);

  // Per-user daily velocity cap — bounds the blast radius of a stolen
  // session or dispute abuse regardless of purchased balance.
  const dailyCap = Number(process.env.DAILY_SPEND_CAP_CREDITS ?? "5000");
  const spent24h = await creditsSpentLast24h(user.id);
  if (spent24h + credits > dailyCap) {
    return NextResponse.json(
      { error: "Daily generation limit reached — try again tomorrow." },
      { status: 429 }
    );
  }

  // Global provider-spend kill switch across all users.
  const cap = Number(process.env.MONTHLY_CAP_USD ?? "50");
  const spentSoFar = await monthToDateSpendUsd();
  if (spentSoFar + estCostUsd > cap) {
    return NextResponse.json(
      { error: "The studio is at capacity right now — please try again later." },
      { status: 503 }
    );
  }

  // Row first (gives the ledger a FK target and the reconciler a trail),
  // then deduct, then submit. Worst crash case — charged but never
  // submitted — is refunded by the cron via the empty provider_task_id.
  const generation = await insertGeneration({
    userId: user.id,
    model: option.model,
    taskType: option.taskType,
    category: option.category,
    prompt,
    params: { ...fieldValues, modelId },
    provider: option.provider,
    estCostUsd,
    creditsCharged: credits,
  });

  const newBalance = await deductCredits(user.id, credits, generation.id);
  if (newBalance === null) {
    await deleteGeneration(generation.id);
    return NextResponse.json(
      {
        error: "Not enough credits",
        needed: credits,
        balance: user.balance_credits,
      },
      { status: 402 }
    );
  }

  try {
    const provider = getProvider(option.provider);
    const { taskId } = await provider.createTask({
      model: option.model,
      taskType: option.taskType,
      input: buildProviderInput(option, fieldValues),
    });
    await setGenerationTaskId(generation.id, taskId);
  } catch (err) {
    const failed = await failAndRefund(
      generation,
      "The model couldn't accept this job — you were not charged."
    );
    console.error("Provider submit failed:", err);
    return NextResponse.json(
      { error: failed.error, id: failed.id },
      { status: 502 }
    );
  }

  return NextResponse.json({ ...toClientGeneration(generation), balance: newBalance });
}
