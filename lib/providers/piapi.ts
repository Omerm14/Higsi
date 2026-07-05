import type {
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  OutputKind,
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
// image jobs expose an image URL under a different key entirely. Some
// models (e.g. Trellis) return several URLs at once — a preview video, the
// actual .glb model file, a background-removed image — so a plain "first
// URL found" walk picks the wrong one. Rather than hard-code one path per
// model, walk the object and score candidates: an outputKind-appropriate
// match wins first, then a no-watermark URL, then whatever came first.
function extractOutputUrl(output: unknown, outputKind?: OutputKind): string | undefined {
  if (!output || typeof output !== "object") return undefined;

  const candidates: { url: string; noWatermark: boolean; kindMatch: boolean }[] = [];

  const visit = (node: unknown, keyHint: string) => {
    if (!node) return;
    if (typeof node === "string") {
      if (/^https?:\/\//.test(node)) {
        candidates.push({
          url: node,
          noWatermark: /no.?watermark/i.test(keyHint),
          kindMatch: matchesOutputKind(node, keyHint, outputKind),
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

  const kindMatch = candidates.find((c) => c.kindMatch);
  if (kindMatch) return kindMatch.url;
  const noWatermark = candidates.find((c) => c.noWatermark);
  return (noWatermark ?? candidates[0]).url;
}

function matchesOutputKind(url: string, keyHint: string, outputKind?: OutputKind): boolean {
  if (!outputKind) return false;
  if (outputKind === "3d") {
    return /\.glb(\?|$)/i.test(url) || /model_file|^model$/i.test(keyHint);
  }
  if (outputKind === "audio") {
    return /\.(mp3|wav|ogg)(\?|$)/i.test(url) || /audio/i.test(keyHint);
  }
  return false;
}

export class PiApiProvider implements Provider {
  async createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
    const body = {
      model: input.model,
      task_type: input.taskType,
      input: input.input,
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

  async getTask(taskId: string, outputKind?: OutputKind): Promise<GetTaskResult> {
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
      const outputUrl = extractOutputUrl(output, outputKind);
      return { status, outputUrl };
    }
    if (status === "failed") {
      return { status, error: json?.data?.error?.message ?? "Task failed" };
    }
    return { status };
  }
}
