import { NextResponse } from "next/server";
import { getGeneration, updateGenerationStatus } from "@/lib/db";
import { persistOutputToBlob } from "@/lib/blob";
import { PiApiProvider } from "@/lib/providers/piapi";
import { getModelOption } from "@/lib/models";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const generation = await getGeneration(id);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generation.status === "completed" || generation.status === "failed") {
    return NextResponse.json(generation);
  }

  const modelId = (generation.params as { modelId?: string } | null)?.modelId;
  const outputKind = modelId ? getModelOption(modelId)?.outputKind : undefined;

  const provider = new PiApiProvider();
  const result = await provider.getTask(generation.piapi_task_id, outputKind);

  if (result.status === "completed" && result.outputUrl) {
    const mediaUrl = await persistOutputToBlob(result.outputUrl, generation.id);
    // PiAPI's get-task response doesn't expose actual billed cost, so we
    // record the pre-submit estimate as actual; reconcile against the PiAPI
    // dashboard if precise spend tracking becomes important.
    const updated = await updateGenerationStatus(generation.id, {
      status: "completed",
      mediaUrl,
      actualCostUsd: Number(generation.est_cost_usd),
    });
    return NextResponse.json(updated);
  }

  if (result.status === "failed") {
    const updated = await updateGenerationStatus(generation.id, {
      status: "failed",
      error: result.error,
    });
    return NextResponse.json(updated);
  }

  if (result.status !== generation.status) {
    const updated = await updateGenerationStatus(generation.id, { status: result.status });
    return NextResponse.json(updated);
  }

  return NextResponse.json(generation);
}
