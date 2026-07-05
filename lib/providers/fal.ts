import type {
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  OutputKind,
  Provider,
} from "./types";
import { extractOutputUrl } from "./extract";

// Fal queue API (https://fal.ai/docs — verified shape, but every model
// added on top of this provider still needs a live spike per project
// convention before being trusted in lib/models.ts):
//   POST https://queue.fal.run/{modelId}                     -> { request_id }
//   GET  https://queue.fal.run/{modelId}/requests/{id}/status -> { status }
//   GET  https://queue.fal.run/{modelId}/requests/{id}        -> result payload
// Unlike PiAPI, the status/result URLs need the model id, not just a task
// id — so createTask returns a composite "model::request_id" task id that
// survives the DB round-trip and is split back apart in getTask. For Fal
// models, ModelOption.model holds the full Fal model path (e.g.
// "fal-ai/flux/schnell") and taskType is unused ("").
const BASE_URL = "https://queue.fal.run";

function apiKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Key ${apiKey()}`,
    "Content-Type": "application/json",
  };
}

export class FalProvider implements Provider {
  async createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
    const res = await fetch(`${BASE_URL}/${input.model}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(input.input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fal create task failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const requestId = json?.request_id;
    if (!requestId) {
      throw new Error(`Fal create task response missing request_id: ${JSON.stringify(json)}`);
    }
    return { taskId: `${input.model}::${requestId}` };
  }

  async getTask(taskId: string, outputKind?: OutputKind): Promise<GetTaskResult> {
    const separator = taskId.lastIndexOf("::");
    if (separator === -1) {
      throw new Error(`Malformed Fal task id (expected "model::request_id"): ${taskId}`);
    }
    const model = taskId.slice(0, separator);
    const requestId = taskId.slice(separator + 2);

    const statusRes = await fetch(
      `${BASE_URL}/${model}/requests/${requestId}/status`,
      { headers: headers() }
    );
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`Fal get status failed (${statusRes.status}): ${text}`);
    }

    const statusJson = await statusRes.json();
    const falStatus: string = statusJson?.status ?? "";

    if (falStatus === "IN_QUEUE") return { status: "pending" };
    if (falStatus === "IN_PROGRESS") return { status: "processing" };
    if (falStatus !== "COMPLETED") return { status: "processing" };

    // COMPLETED covers both success and failure — the result fetch
    // disambiguates (a failed request returns a non-2xx with error detail).
    const resultRes = await fetch(`${BASE_URL}/${model}/requests/${requestId}`, {
      headers: headers(),
    });
    if (!resultRes.ok) {
      const text = await resultRes.text();
      return { status: "failed", error: `Fal request failed: ${text}` };
    }

    const result = await resultRes.json();
    const outputUrl = extractOutputUrl(result, outputKind);
    if (!outputUrl) {
      return { status: "failed", error: "Fal result contained no output URL" };
    }
    return { status: "completed", outputUrl };
  }
}
