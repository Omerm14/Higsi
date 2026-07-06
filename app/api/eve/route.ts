import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/users";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { getGoal, PLATFORMS, VIBES } from "@/lib/goals";
import { enhancePrompt } from "@/lib/eve";
import { getModelOption } from "@/lib/models";
import { customerCreditCost } from "@/lib/pricing";

const MAX_FIELD_CHARS = 300;

// Eve is free for customers — it's the conversion hook, and a Haiku call
// costs a fraction of a cent. Rate-limited so it can't be farmed as a
// generic LLM endpoint.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const limit = await checkRateLimit(`eve:${user.id}`, 20, 60);
  if (!limit.ok) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as {
    goalId?: string;
    product?: string;
    description?: string;
    vibe?: string;
    platform?: string;
    extra?: string;
  } | null;

  const goal = getGoal(body?.goalId ?? "");
  if (!goal) {
    return NextResponse.json({ error: "Unknown goal" }, { status: 400 });
  }

  const product = String(body?.product ?? "").trim();
  if (!product) {
    return NextResponse.json({ error: "Tell Eve what the product is" }, { status: 400 });
  }

  const fields = {
    product,
    description: String(body?.description ?? "").trim(),
    vibe: String(body?.vibe ?? "minimal"),
    platform: String(body?.platform ?? "tiktok"),
    extra: String(body?.extra ?? "").trim() || undefined,
  };
  for (const value of Object.values(fields)) {
    if (typeof value === "string" && value.length > MAX_FIELD_CHARS) {
      return NextResponse.json(
        { error: `Keep each answer under ${MAX_FIELD_CHARS} characters` },
        { status: 400 }
      );
    }
  }
  if (!VIBES.some((v) => v.id === fields.vibe)) fields.vibe = "minimal";
  const platform = PLATFORMS.find((p) => p.id === fields.platform) ?? PLATFORMS[0];

  const result = await enhancePrompt(goal, fields);

  const option = getModelOption(goal.modelId);
  if (!option) {
    return NextResponse.json({ error: "This goal is unavailable right now" }, { status: 500 });
  }

  // Prefill the generate call for the wizard: model, prompt, and the
  // field values the model's schema expects.
  const values: Record<string, unknown> = {};
  const promptField = option.fields.find((f) => f.type === "prompt");
  if (promptField) values[promptField.key] = result.prompt;
  if (option.fields.some((f) => f.key === "aspectRatio")) {
    values.aspectRatio = platform.aspectRatio;
  }
  if (option.fields.some((f) => f.key === "duration")) {
    values.duration = 5;
  }

  return NextResponse.json({
    prompt: result.prompt,
    note: result.note,
    source: result.source,
    modelId: goal.modelId,
    category: goal.category,
    outputKind: option.outputKind,
    promptKey: promptField?.key ?? null,
    values,
    credits: customerCreditCost(option, values),
  });
}
