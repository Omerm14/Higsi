import type {
  CreateTaskInput,
  CreateTaskResult,
  GetTaskResult,
  OutputKind,
  Provider,
  TaskStatus,
} from "./types";
import { extractOutputUrl } from "./extract";

const BASE_URL = "https://api.piapi.ai/api/v1";

function apiKey(): string {
  const key = process.env.PIAPI_KEY;
  if (!key) throw new Error("PIAPI_KEY is not set");
  return key;
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
