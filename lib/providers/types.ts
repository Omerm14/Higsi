export interface CreateTaskInput {
  model: string;
  taskType: string;
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  imageUrl?: string;
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
