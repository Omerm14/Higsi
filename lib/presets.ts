import type { Category } from "./models";

// UGC-focused one-click starting points: a preset is just a model plus
// prefilled field values (keyed by ModelField.key). Studio reads
// ?preset=<id> and seeds its form from here. Every modelId must exist in
// MODEL_OPTIONS — validated by the studio at render time, so a removed
// model degrades to "preset ignored", never a crash.
export interface Preset {
  id: string;
  title: string;
  tagline: string;
  modelId: string;
  values: Record<string, unknown>;
  category: Category;
  // Emoji stand-in until owner-generated thumbnails land in /public.
  emoji: string;
}

export const PRESETS: Preset[] = [
  {
    id: "product-unboxing",
    title: "Product unboxing",
    tagline: "Handheld UGC-style unboxing clip",
    modelId: "seedance-fast",
    category: "video",
    emoji: "📦",
    values: {
      prompt:
        "A person excitedly unboxing a product on a cozy desk, natural handheld phone footage, warm lighting, casual UGC review style, close-up on hands opening the box",
      aspectRatio: "9:16",
      duration: 5,
    },
  },
  {
    id: "talking-head-ad",
    title: "Talking head ad",
    tagline: "Creator-to-camera product pitch",
    modelId: "seedance-full",
    category: "video",
    emoji: "🎙️",
    values: {
      prompt:
        "A friendly content creator talking directly to the camera in a bright modern room, holding up a product, enthusiastic expression, vertical smartphone video, soft natural light",
      aspectRatio: "9:16",
      duration: 5,
    },
  },
  {
    id: "lifestyle-broll",
    title: "Lifestyle b-roll",
    tagline: "Aesthetic filler shots for edits",
    modelId: "wanx",
    category: "video",
    emoji: "🌅",
    values: {
      prompt:
        "Cinematic lifestyle b-roll: morning coffee being poured in slow motion, golden hour light through a kitchen window, shallow depth of field, warm tones",
      aspectRatio: "16:9",
    },
  },
  {
    id: "product-hero",
    title: "Product hero shot",
    tagline: "Clean studio product photo",
    modelId: "flux-dev",
    category: "image",
    emoji: "✨",
    values: {
      prompt:
        "Professional studio product photograph on a seamless pastel background, dramatic soft lighting, subtle reflection, centered composition, high-end commercial photography",
      aspectRatio: "1:1",
    },
  },
  {
    id: "social-visual",
    title: "Social post visual",
    tagline: "Fast eye-catching feed image",
    modelId: "flux-schnell",
    category: "image",
    emoji: "⚡",
    values: {
      prompt:
        "Bold vibrant social media visual, trending aesthetic, striking colors, clean negative space for text overlay, editorial photography style",
      aspectRatio: "1:1",
    },
  },
  {
    id: "ad-jingle",
    title: "Ad jingle",
    tagline: "Catchy 30-second brand track",
    modelId: "ace-step",
    category: "audio",
    emoji: "🎵",
    values: {
      prompt:
        "Upbeat catchy commercial jingle, bright pop instrumentation, feel-good energy, memorable hook, 30 seconds",
    },
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
