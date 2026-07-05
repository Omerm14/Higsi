// Model / task_type strings and rates per PiAPI's unified create-task API.
// PiAPI ships new models constantly — re-verify these against live docs
// (https://piapi.ai/docs) before relying on them for anything but personal use.
//
// Cost note: PiAPI bills in an internal "point" unit (see the `usage` field
// on a task response), not a flat $/call rate. rateUsd below is a rough
// estimate, not reconciled against actual point pricing — treat the
// pre-submit cost estimate as directional only until checked against real
// spend on the PiAPI dashboard.

export type Category = "image" | "video" | "audio" | "3d" | "tool";

export type ToolKind =
  | "upscale"
  | "background-removal"
  | "outpaint"
  | "faceswap";

export type CostUnit = "per_second" | "per_image" | "per_output";

export type FieldType =
  | "prompt"
  | "negative_prompt"
  | "select"
  | "image"
  | "number"
  | "text";

export interface ModelField {
  key: string; // local form-state key
  wireKey: string; // key PiAPI expects inside `input`
  type: FieldType;
  label: string;
  role?: "source" | "target" | "reference"; // disambiguates multi-image fields (faceswap)
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: string | number;
  min?: number;
  max?: number;
  step?: number;
  accept?: string; // for "image" fields, e.g. "image/*"
}

export interface ModelOption {
  id: string;
  label: string;
  category: Category;
  toolKind?: ToolKind;
  model: string;
  taskType: string;
  costUnit: CostUnit;
  rateUsd: number;
  tier: "cheap" | "mid" | "full";
  fields: ModelField[];
  outputKind: "image" | "video" | "audio" | "3d";
}

const ASPECT_RATIO_FIELD: ModelField = {
  key: "aspectRatio",
  wireKey: "aspect_ratio",
  type: "select",
  label: "Aspect ratio",
  default: "16:9",
  options: [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
  ],
};

const PROMPT_FIELD: ModelField = {
  key: "prompt",
  wireKey: "prompt",
  type: "prompt",
  label: "Prompt",
  required: true,
};

const DURATION_FIELD: ModelField = {
  key: "duration",
  wireKey: "duration",
  type: "number",
  label: "Duration (seconds)",
  default: 5,
  min: 1,
  max: 30,
};

// NOTE: the reference-image input field name for Seedance i2v is not yet
// confirmed — probing "image", "images", "image_url", "first_frame_image"
// during the spike all left PiAPI's mode auto-detection at images=0 (i.e. it
// still ran as text-to-video). Check PiAPI's Seedance docs for the correct
// field before relying on this option.
const SEEDANCE_IMAGE_FIELD: ModelField = {
  key: "imageUrl",
  wireKey: "image_url",
  type: "image",
  label: "Reference image",
  role: "source",
  required: true,
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "seedance-fast",
    label: "Seedance (fast, cheap)",
    category: "video",
    model: "seedance",
    taskType: "seedance-2-fast-preview",
    costUnit: "per_second",
    rateUsd: 0.1,
    tier: "cheap",
    outputKind: "video",
    fields: [PROMPT_FIELD, ASPECT_RATIO_FIELD, DURATION_FIELD],
  },
  {
    id: "seedance-full",
    label: "Seedance (full quality)",
    category: "video",
    model: "seedance",
    taskType: "seedance-2-preview",
    costUnit: "per_second",
    rateUsd: 0.5,
    tier: "full",
    outputKind: "video",
    fields: [PROMPT_FIELD, ASPECT_RATIO_FIELD, DURATION_FIELD],
  },
  {
    id: "seedance-fast-i2v",
    label: "Seedance (fast, cheap) — image to video",
    category: "video",
    model: "seedance",
    taskType: "seedance-2-fast-preview",
    costUnit: "per_second",
    rateUsd: 0.1,
    tier: "cheap",
    outputKind: "video",
    fields: [PROMPT_FIELD, ASPECT_RATIO_FIELD, DURATION_FIELD, SEEDANCE_IMAGE_FIELD],
  },
  {
    id: "seedance-full-i2v",
    label: "Seedance (full quality) — image to video",
    category: "video",
    model: "seedance",
    taskType: "seedance-2-preview",
    costUnit: "per_second",
    rateUsd: 0.5,
    tier: "full",
    outputKind: "video",
    fields: [PROMPT_FIELD, ASPECT_RATIO_FIELD, DURATION_FIELD, SEEDANCE_IMAGE_FIELD],
  },
  {
    id: "nano-banana",
    label: "Nano Banana 2 (cheap image)",
    category: "image",
    model: "gemini",
    taskType: "nano-banana-2",
    costUnit: "per_image",
    rateUsd: 0.06,
    tier: "mid",
    outputKind: "image",
    fields: [PROMPT_FIELD, { ...ASPECT_RATIO_FIELD, default: "1:1" }],
  },
  {
    id: "flux-schnell",
    label: "Flux Schnell (cheap image)",
    category: "image",
    model: "Qubico/flux1-schnell",
    taskType: "txt2img",
    costUnit: "per_image",
    rateUsd: 0.02,
    tier: "cheap",
    outputKind: "image",
    fields: [PROMPT_FIELD, { ...ASPECT_RATIO_FIELD, default: "1:1" }],
  },
  {
    id: "flux-dev",
    label: "Flux Dev (full quality image)",
    category: "image",
    model: "Qubico/flux1-dev",
    taskType: "txt2img",
    costUnit: "per_image",
    // Verified to cost ~10x flux-schnell's frozen points on PiAPI.
    rateUsd: 0.2,
    tier: "full",
    outputKind: "image",
    fields: [PROMPT_FIELD, { ...ASPECT_RATIO_FIELD, default: "1:1" }],
  },
];

export function getModelOption(id: string): ModelOption | undefined {
  return MODEL_OPTIONS.find((m) => m.id === id);
}

export function estimateCostUsd(
  option: ModelOption,
  values: Record<string, unknown>
): number {
  if (option.costUnit !== "per_second") return option.rateUsd;
  const durationField = option.fields.find((f) => f.key === "duration");
  const duration = Number(values.duration ?? durationField?.default ?? 5);
  return option.rateUsd * duration;
}

// Maps a filled-in values bag (keyed by ModelField.key) to the `input` object
// PiAPI expects (keyed by ModelField.wireKey), applying each field's default
// when the value is missing and skipping absent optional fields.
export function buildPiApiInput(
  option: ModelOption,
  values: Record<string, unknown>
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of option.fields) {
    const value = values[field.key] ?? field.default;
    if (value === undefined || value === null || value === "") continue;
    input[field.wireKey] = value;
  }
  return input;
}
