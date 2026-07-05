export interface CreateTaskInput {
  model: string;
  taskType: string;
  // Passed through verbatim as PiAPI's `input` bag — callers build this via
  // lib/models.ts's buildPiApiInput() from a ModelOption's field schema.
  input: Record<string, unknown>;
}

export interface CreateTaskResult {
  taskId: string;
}

export type TaskStatus =
  | "pending"
  | "processing"
  | "staged"
  | "completed"
  | "failed";

export interface GetTaskResult {
  status: TaskStatus;
  outputUrl?: string;
  error?: string;
}

export type OutputKind = "image" | "video" | "audio" | "3d";

export interface Provider {
  createTask(input: CreateTaskInput): Promise<CreateTaskResult>;
  // outputKind lets the provider disambiguate a multi-URL output (e.g.
  // Trellis returns a preview video, a .glb model file, and a background-
  // removed image all in one response) — without it, the walker just
  // returns whichever URL it finds first.
  getTask(taskId: string, outputKind?: OutputKind): Promise<GetTaskResult>;
}
