import { NextResponse } from "next/server";
import { getModelOption, estimateCostUsd, buildPiApiInput } from "@/lib/models";
import { PiApiProvider } from "@/lib/providers/piapi";
import { insertGeneration, monthToDateSpendUsd } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { modelId, values } = body ?? {};

  const option = getModelOption(modelId);
  if (!option) {
    return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
  }

  const fieldValues: Record<string, unknown> = values ?? {};

  for (const field of option.fields) {
    if (!field.required) continue;
    const value = fieldValues[field.key];
    if (value === undefined || value === null || value === "") {
      return NextResponse.json(
        { error: `${field.label} is required` },
        { status: 400 }
      );
    }
  }

  const promptField = option.fields.find((f) => f.type === "prompt");
  const prompt = promptField ? String(fieldValues[promptField.key] ?? "") : "";

  const estCostUsd = estimateCostUsd(option, fieldValues);

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
    input: buildPiApiInput(option, fieldValues),
  });

  const generation = await insertGeneration({
    model: option.model,
    taskType: option.taskType,
    category: option.category,
    prompt,
    params: { ...fieldValues, modelId },
    piapiTaskId: taskId,
    estCostUsd,
  });

  return NextResponse.json(generation);
}
