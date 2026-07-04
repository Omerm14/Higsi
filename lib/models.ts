// Model / task_type strings and rates per the PiAPI integration spec.
// PiAPI ships new models constantly — re-verify these against live docs
// (https://piapi.ai/docs) before relying on them for anything but personal use.

export type Mode = "t2v" | "i2v" | "t2i";

export type CostUnit = "per_second" | "per_image";

export interface ModelOption {
  id: string;
  label: string;
  mode: Mode;
  model: string;
  taskType: string;
  costUnit: CostUnit;
  rateUsd: number;
  tier: "cheap" | "full";
  defaults: {
    duration?: number;
    aspectRatio?: string;
  };
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "seedance-fast",
    label: "Seedance (fast, cheap)",
    mode: "t2v",
    model: "seedance",
    taskType: "seedance-2-fast-preview",
    costUnit: "per_second",
    rateUsd: 0.1,
    tier: "cheap",
    defaults: { duration: 5, aspectRatio: "16:9" },
  },
  {
    id: "seedance-full",
    label: "Seedance (full quality)",
    mode: "t2v",
    model: "seedance",
    taskType: "seedance-2-preview",
    costUnit: "per_second",
    rateUsd: 0.5,
    tier: "full",
    defaults: { duration: 5, aspectRatio: "16:9" },
  },
  {
    id: "seedance-fast-i2v",
    label: "Seedance (fast, cheap) — image to video",
    mode: "i2v",
    model: "seedance",
    taskType: "seedance-2-fast-preview",
    costUnit: "per_second",
    rateUsd: 0.1,
    tier: "cheap",
    defaults: { duration: 5, aspectRatio: "16:9" },
  },
  {
    id: "seedance-full-i2v",
    label: "Seedance (full quality) — image to video",
    mode: "i2v",
    model: "seedance",
    taskType: "seedance-2-preview",
    costUnit: "per_second",
    rateUsd: 0.5,
    tier: "full",
    defaults: { duration: 5, aspectRatio: "16:9" },
  },
  {
    id: "nano-banana",
    label: "Nano Banana (cheap image)",
    mode: "t2i",
    model: "gemini",
    taskType: "gemini-2.5-flash-image",
    costUnit: "per_image",
    rateUsd: 0.02,
    tier: "cheap",
    defaults: { aspectRatio: "1:1" },
  },
  {
    id: "gpt-image",
    label: "GPT Image",
    mode: "t2i",
    model: "gpt-image",
    taskType: "text-to-image",
    costUnit: "per_image",
    rateUsd: 0.04,
    tier: "full",
    defaults: { aspectRatio: "1:1" },
  },
];

export function getModelOption(id: string): ModelOption | undefined {
  return MODEL_OPTIONS.find((m) => m.id === id);
}

export function estimateCostUsd(
  option: ModelOption,
  params: { duration?: number }
): number {
  if (option.costUnit === "per_image") return option.rateUsd;
  const duration = params.duration ?? option.defaults.duration ?? 5;
  return option.rateUsd * duration;
}
