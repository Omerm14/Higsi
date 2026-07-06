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
  arrayWrap?: boolean; // wrap the single value in a 1-element array on the wire (e.g. Seedance's image_urls)
  numeric?: boolean; // coerce a "select" field's string option value to a number on the wire (e.g. upscale's scale)
}

export interface ModelOption {
  id: string;
  label: string;
  category: Category;
  toolKind?: ToolKind;
  // For piapi: model + taskType map to PiAPI's unified task body. For fal:
  // model is the full Fal model path (e.g. "fal-ai/flux/schnell") and
  // taskType is unused (""). Explicit on every entry — this field routes
  // real money.
  provider: "piapi" | "fal";
  model: string;
  taskType: string;
  costUnit: CostUnit;
  rateUsd: number;
  // Customer price = rateUsd * priceMultiplier (default 2 — see
  // lib/pricing.ts). Override per model if a specific margin is needed.
  priceMultiplier?: number;
  tier: "cheap" | "mid" | "full";
  fields: ModelField[];
  outputKind: "image" | "video" | "audio" | "3d";
  // Escape hatch for models whose wire format doesn't fit a flat key
  // mapping (e.g. Flux's outpaint needs its four directional paddings
  // nested under input.custom_settings). Runs after the flat field mapping.
  transformInput?: (input: Record<string, unknown>) => Record<string, unknown>;
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

// Resolved via live spike (2026-07-05): the field is the plural `image_urls`
// (a 1-2 element array), not `image_url`/`image`/`first_frame_image` as
// earlier probes assumed. PiAPI auto-detects image-to-video mode from its
// presence — no explicit "mode": "first_last_frames" needed. Confirmed by a
// real completed generation whose logs show "aspect ratio resolved to 1:1
// from first image", i.e. the image genuinely drove the output.
const SEEDANCE_IMAGE_FIELD: ModelField = {
  key: "imageUrl",
  wireKey: "image_urls",
  type: "image",
  label: "Reference image",
  role: "source",
  required: true,
  arrayWrap: true,
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
    provider: "piapi",
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
    provider: "piapi",
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
    provider: "piapi",
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
    provider: "piapi",
    outputKind: "video",
    fields: [PROMPT_FIELD, ASPECT_RATIO_FIELD, DURATION_FIELD, SEEDANCE_IMAGE_FIELD],
  },
  {
    // Verified via live spike (2026-07-05): a real ~85-frame 480p clip
    // completed in ~8 minutes. Flat $0.28/generation per PiAPI's docs
    // (not per-second — Wanx's output length isn't user-configurable).
    id: "wanx",
    label: "Wanx (cheap, longer clip)",
    category: "video",
    model: "Qubico/wanx",
    taskType: "txt2video-14b",
    costUnit: "per_output",
    rateUsd: 0.28,
    tier: "cheap",
    provider: "piapi",
    outputKind: "video",
    fields: [
      PROMPT_FIELD,
      {
        key: "negativePrompt",
        wireKey: "negative_prompt",
        type: "negative_prompt",
        label: "Avoid",
      },
    ],
  },
  {
    // Verified via live spike (2026-07-05): a real completed upscale in
    // ~11s. Pricing is actually $0.001/megapixel of output (2x on a 512x512
    // source = 1MP = $0.001 minimum charge) — rateUsd here is a flat
    // approximation for typical use, not exact for every input size.
    id: "upscale",
    label: "Upscale",
    category: "tool",
    toolKind: "upscale",
    model: "Qubico/image-toolkit",
    taskType: "upscale",
    costUnit: "per_output",
    rateUsd: 0.005,
    tier: "cheap",
    provider: "piapi",
    outputKind: "image",
    fields: [
      {
        key: "image",
        wireKey: "image",
        type: "image",
        label: "Image to upscale",
        role: "source",
        required: true,
      },
      {
        key: "scale",
        wireKey: "scale",
        type: "select",
        label: "Scale",
        default: "2",
        numeric: true,
        options: [
          { value: "2", label: "2x" },
          { value: "4", label: "4x" },
        ],
      },
    ],
  },
  {
    // Verified via live spike (2026-07-05): a real completed background
    // removal in ~9s. $0.001/generation per PiAPI's docs.
    id: "background-removal",
    label: "Background removal",
    category: "tool",
    toolKind: "background-removal",
    model: "Qubico/image-toolkit",
    taskType: "background-remove",
    costUnit: "per_output",
    rateUsd: 0.001,
    tier: "cheap",
    provider: "piapi",
    outputKind: "image",
    fields: [
      {
        key: "image",
        wireKey: "image",
        type: "image",
        label: "Image",
        role: "source",
        required: true,
      },
    ],
  },
  {
    // Verified via live spike (2026-07-05): a real completed outpaint in
    // ~38s (extended 128px left/right on a 512x512 source). No pricing page
    // found for this specific task_type — rateUsd approximated from
    // flux-dev's $0.20 (same underlying Flux Dev model family, same
    // 200000-point frozen amount we observed for flux-dev-per-image runs).
    id: "outpaint",
    label: "Outpaint",
    category: "tool",
    toolKind: "outpaint",
    model: "Qubico/flux1-dev-advanced",
    taskType: "fill-outpaint",
    costUnit: "per_output",
    rateUsd: 0.2,
    tier: "mid",
    provider: "piapi",
    outputKind: "image",
    fields: [
      {
        key: "prompt",
        wireKey: "prompt",
        type: "prompt",
        label: "Describe the extended area",
      },
      {
        key: "image",
        wireKey: "image",
        type: "image",
        label: "Image",
        role: "source",
        required: true,
      },
      {
        key: "outpaintLeft",
        wireKey: "outpaint_left",
        type: "number",
        label: "Left",
        default: 0,
        min: 0,
        max: 1024,
      },
      {
        key: "outpaintRight",
        wireKey: "outpaint_right",
        type: "number",
        label: "Right",
        default: 256,
        min: 0,
        max: 1024,
      },
      {
        key: "outpaintTop",
        wireKey: "outpaint_top",
        type: "number",
        label: "Top",
        default: 0,
        min: 0,
        max: 1024,
      },
      {
        key: "outpaintBottom",
        wireKey: "outpaint_bottom",
        type: "number",
        label: "Bottom",
        default: 0,
        min: 0,
        max: 1024,
      },
    ],
    transformInput: (input) => {
      const {
        outpaint_left,
        outpaint_right,
        outpaint_top,
        outpaint_bottom,
        ...rest
      } = input;
      return {
        ...rest,
        custom_settings: [
          {
            setting_type: "outpaint",
            outpaint_left: outpaint_left ?? 0,
            outpaint_right: outpaint_right ?? 0,
            outpaint_top: outpaint_top ?? 0,
            outpaint_bottom: outpaint_bottom ?? 0,
          },
        ],
      };
    },
  },
  {
    // Verified via live spike (2026-07-05): a real completed faceswap in
    // ~9s (using two real face photos — a first attempt with generic stock
    // photos failed with a generic "invalid request", which turned out to
    // be "no face detected" rather than a field-mapping problem; PiAPI
    // restores frozen points on that kind of failure, no charge).
    // $0.01/generation per PiAPI's docs.
    id: "faceswap",
    label: "Faceswap",
    category: "tool",
    toolKind: "faceswap",
    model: "Qubico/image-toolkit",
    taskType: "face-swap",
    costUnit: "per_output",
    rateUsd: 0.01,
    tier: "cheap",
    provider: "piapi",
    outputKind: "image",
    fields: [
      {
        key: "swapImage",
        wireKey: "swap_image",
        type: "image",
        label: "Face to use",
        role: "source",
        required: true,
      },
      {
        key: "targetImage",
        wireKey: "target_image",
        type: "image",
        label: "Photo to swap into",
        role: "target",
        required: true,
      },
    ],
  },
  {
    // Verified via live spike (2026-07-05): request accepted cleanly with a
    // real image URL, frozen points assigned. $0.10/generation per PiAPI's
    // docs. Note: PiAPI's echoed input moves our "image" value into an
    // internal "images" array field — send "image" as a plain string, that's
    // what the accepted request actually used.
    id: "trellis",
    label: "Trellis (image to 3D)",
    category: "3d",
    model: "Qubico/trellis",
    taskType: "image-to-3d",
    costUnit: "per_output",
    rateUsd: 0.1,
    tier: "cheap",
    provider: "piapi",
    outputKind: "3d",
    fields: [
      {
        key: "image",
        wireKey: "image",
        type: "image",
        label: "Source image",
        role: "source",
        required: true,
      },
    ],
  },
  {
    // Verified via live spike (2026-07-05): a real 10s .mp3 completed in
    // ~24s. $0.0005/sec per PiAPI's docs — extremely cheap.
    id: "ace-step",
    label: "Ace Step (music)",
    category: "audio",
    model: "Qubico/ace-step",
    taskType: "txt2audio",
    costUnit: "per_second",
    rateUsd: 0.0005,
    tier: "cheap",
    provider: "piapi",
    outputKind: "audio",
    fields: [
      {
        key: "prompt",
        wireKey: "style_prompt",
        type: "prompt",
        label: "Style",
        required: true,
      },
      {
        key: "lyrics",
        wireKey: "lyrics",
        type: "text",
        label: "Lyrics",
        default: "[inst]",
      },
      { ...DURATION_FIELD, default: 10, max: 240 },
    ],
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
    provider: "piapi",
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
    provider: "piapi",
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
    provider: "piapi",
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
// the provider expects (keyed by ModelField.wireKey), applying each field's
// default when the value is missing and skipping absent optional fields.
export function buildProviderInput(
  option: ModelOption,
  values: Record<string, unknown>
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of option.fields) {
    let value = values[field.key] ?? field.default;
    if (value === undefined || value === null || value === "") continue;
    if (field.numeric) value = Number(value);
    input[field.wireKey] = field.arrayWrap ? [value] : value;
  }
  return option.transformInput ? option.transformInput(input) : input;
}
