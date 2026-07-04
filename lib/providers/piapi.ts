import type {
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  Provider,
  TaskStatus,
} from "./types";

const BASE_URL = "https://api.piapi.ai/api/v1";

function apiKey(): string {
  const key = process.env.PIAPI_KEY;
  if (!key) throw new Error("PIAPI_KEY is not set");
  return key;
}

// PiAPI's output shape varies per model (Section 4 of the build brief):
// video jobs expose output.video.url / output.works[].video.resource,
// image jobs expose an image URL under a different key entirely. Rather
// than hard-code one path, walk the object and prefer a no-watermark URL.
function extractOutputUrl(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return undefined;

  const candidates: { url: string; noWatermark: boolean }[] = [];

  const visit = (node: unknown, keyHint: string) => {
    if (!node) return;
    if (typeof node === "string") {
      if (/^https?:\/\//.test(node)) {
        candidates.push({
          url: node,
          noWatermark: /no.?watermark/i.test(keyHint),
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, keyHint));
      return;
    }
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        visit(value, key);
      }
    }
  };

  visit(output, "");
  if (candidates.length === 0) return undefined;

  const noWatermark = candidates.find((c) => c.noWatermark);
  return (noWatermark ?? candidates[0]).url;
}

export class PiApiProvider implements Provider {
  async createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
    const body = {
      model: input.model,
      task_type: input.taskType,
      input: {
        prompt: input.prompt,
        ...(input.duration ? { duration: input.duration } : {}),
        ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
        ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
      },
      config: {
        service_mode: "public",
      },
    };

    const res = await fetch(`${BASE_URL}/task`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PiAPI create task failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const taskId = json?.data?.task_id;
    if (!taskId) {
      throw new Error(`PiAPI create task response missing task_id: ${JSON.stringify(json)}`);
    }
    return { taskId };
  }

  async getTask(taskId: string): Promise<GetTaskResult> {
    const res = await fetch(`${BASE_URL}/task/${taskId}`, {
      headers: { "x-api-key": apiKey() },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PiAPI get task failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const status: TaskStatus = json?.data?.status;
    const output = json?.data?.output;

    if (status === "completed") {
      const outputUrl = extractOutputUrl(output);
      return { status, outputUrl };
    }
    if (status === "failed") {
      return { status, error: json?.data?.error?.message ?? "Task failed" };
    }
    return { status };
  }
}
