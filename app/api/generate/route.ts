import { NextResponse } from "next/server";
import { getModelOption, estimateCostUsd } from "@/lib/models";
import { PiApiProvider } from "@/lib/providers/piapi";
import { insertGeneration, monthToDateSpendUsd } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { modelId, prompt, duration, aspectRatio, imageUrl } = body ?? {};

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const option = getModelOption(modelId);
  if (!option) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  if (option.mode === "i2v" && !imageUrl) {
    return NextResponse.json(
      { error: "imageUrl is required for image-to-video" },
      { status: 400 }
    );
  }

  const estCostUsd = estimateCostUsd(option, { duration });

  const cap = Number(process.env.MONTHLY_CAP_USD ?? "50");
  const spentSoFar = await monthToDateSpendUsd();
  if (spentSoFar + estCostUsd > cap) {
    return NextResponse.json(
      {
        error: `Monthly cap of $${cap.toFixed(2)} would be exceeded (spent $${spentSoFar.toFixed(
          2
        )}, this job est. $${estCostUsd.toFixed(2)}).`,
      },
      { status: 402 }
    );
  }

  const provider = new PiApiProvider();
  const { taskId } = await provider.createTask({
    model: option.model,
    taskType: option.taskType,
    prompt,
    duration: duration ?? option.defaults.duration,
    aspectRatio: aspectRatio ?? option.defaults.aspectRatio,
    imageUrl,
  });

  const generation = await insertGeneration({
    model: option.model,
    taskType: option.taskType,
    mode: option.mode,
    prompt,
    params: { duration, aspectRatio, imageUrl, modelId },
    piapiTaskId: taskId,
    estCostUsd,
  });

  return NextResponse.json(generation);
}
