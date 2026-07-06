import type { Category } from "./models";

// The guided wizard's vocabulary: a "goal" is what a non-technical creator
// says they're making ("an unboxing video"), mapped to a model and enough
// plain-language questions for Eve (lib/eve.ts) to write an expert prompt.
// Goal → model routing is deliberate: customers never see model names.
export interface EveGoal {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  category: Category;
  modelId: string;
}

export const EVE_GOALS: EveGoal[] = [
  {
    id: "product-ad",
    title: "Product ad video",
    tagline: "A scroll-stopping clip that sells",
    emoji: "📱",
    category: "video",
    modelId: "seedance-full",
  },
  {
    id: "unboxing",
    title: "Unboxing video",
    tagline: "That first-reveal excitement",
    emoji: "📦",
    category: "video",
    modelId: "seedance-fast",
  },
  {
    id: "talking-head",
    title: "Talking-head ad",
    tagline: "Creator-to-camera pitch",
    emoji: "🎙️",
    category: "video",
    modelId: "seedance-full",
  },
  {
    id: "broll",
    title: "Lifestyle b-roll",
    tagline: "Aesthetic filler for your edits",
    emoji: "🌅",
    category: "video",
    modelId: "wanx",
  },
  {
    id: "product-photo",
    title: "Product photo",
    tagline: "Clean hero shot, studio quality",
    emoji: "✨",
    category: "image",
    modelId: "flux-dev",
  },
  {
    id: "social-visual",
    title: "Social post visual",
    tagline: "Eye-catching feed image, fast",
    emoji: "⚡",
    category: "image",
    modelId: "flux-schnell",
  },
  {
    id: "jingle",
    title: "Ad jingle",
    tagline: "A catchy track for your brand",
    emoji: "🎵",
    category: "audio",
    modelId: "ace-step",
  },
];

export function getGoal(id: string): EveGoal | undefined {
  return EVE_GOALS.find((g) => g.id === id);
}

export const VIBES = [
  { id: "luxury", label: "Luxury ✨" },
  { id: "fun", label: "Fun & playful 🎈" },
  { id: "minimal", label: "Clean & minimal 🤍" },
  { id: "bold", label: "Bold & loud 🔥" },
  { id: "cozy", label: "Warm & cozy ☕" },
  { id: "techy", label: "Sleek & techy 🤖" },
] as const;

export const PLATFORMS = [
  { id: "tiktok", label: "TikTok / Reels", aspectRatio: "9:16" },
  { id: "youtube", label: "YouTube", aspectRatio: "16:9" },
  { id: "feed", label: "Feed post", aspectRatio: "1:1" },
] as const;
