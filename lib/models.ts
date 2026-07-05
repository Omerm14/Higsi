// Model / task_type strings and rates per PiAPI's unified create-task API.
// PiAPI ships new models constantly — re-verify these against live docs
// (https://piapi.ai/docs) before relying on them for anything but personal use.
//
// Cost note: PiAPI bills in an internal "point" unit (see the `usage` field
// on a task response), not a flat $/call rate. rateUsd below is a rough
// estimate, not reconciled against actual point pricing — treat the
// pre-submit cost estimate as directional only until checked against real
// spend on the PiAPI dashboard.

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
    // NOTE: the reference-image input field name for Seedance i2v is not yet
    // confirmed — probing "image", "images", "image_url", "first_frame_image"
    // during the spike all left PiAPI's mode auto-detection at images=0
    // (i.e. it still ran as text-to-video). Check PiAPI's Seedance docs for
    // the correct field before relying on this option.
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
    label: "Nano Banana 2 (cheap image)",
    mode: "t2i",
    model: "gemini",
    taskType: "nano-banana-2",
    costUnit: "per_image",
    rateUsd: 0.06,
    tier: "cheap",
    defaults: { aspectRatio: "1:1" },
  },
  {
    id: "flux-schnell",
    label: "Flux Schnell (cheap image)",
    mode: "t2i",
    model: "Qubico/flux1-schnell",
    taskType: "txt2img",
    costUnit: "per_image",
    rateUsd: 0.02,
    tier: "cheap",
    defaults: { aspectRatio: "1:1" },
  },
  {
    id: "flux-dev",
    label: "Flux Dev (full quality image)",
    mode: "t2i",
    model: "Qubico/flux1-dev",
    taskType: "txt2img",
    costUnit: "per_image",
    // Verified to cost ~10x flux-schnell's frozen points on PiAPI.
    rateUsd: 0.2,
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
