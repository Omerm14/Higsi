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

export interface Provider {
  createTask(input: CreateTaskInput): Promise<CreateTaskResult>;
  getTask(taskId: string): Promise<GetTaskResult>;
}
