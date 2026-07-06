import Anthropic from "@anthropic-ai/sdk";
import type { EveGoal } from "./goals";

// Eve — the in-app creative director. Takes a plain-language brief from a
// non-technical creator and writes an expert generation prompt for the
// target model. Powered by Claude Haiku 4.5 (fast, ~a tenth of a cent per
// brief); degrades to hand-written templates when ANTHROPIC_API_KEY isn't
// configured so the wizard never breaks.

export interface EveBrief {
  product: string;
  description: string;
  vibe: string;
  platform: string;
  extra?: string;
}

export interface EveResult {
  prompt: string;
  note: string;
  source: "eve" | "template";
}

// Prompt-craft guides distilled from what works on each model family —
// the "skills" Eve applies. Keep these tight: they're instructions, not docs.
const CRAFT_GUIDES: Record<string, string> = {
  video: `You write prompts for Seedance/Wanx text-to-video models. Strong video prompts specify, in one flowing sentence stack: (1) subject + one clear action, (2) setting with 1-2 concrete details, (3) camera work (handheld, slow push-in, orbit, static tripod), (4) lighting (golden hour, soft window light, neon), (5) style tag (UGC smartphone footage, cinematic, commercial). Motion must be simple and physical — one action, no scene cuts, no text overlays, no logos. UGC-style content should feel authentic: handheld, natural light, real-home settings.`,
  image: `You write prompts for Flux image models. Strong image prompts specify: (1) subject with material/texture details, (2) composition (centered, rule of thirds, top-down flat-lay, close-up macro), (3) lighting (softbox studio, dramatic side light, golden hour), (4) background/environment, (5) style tag (commercial product photography, editorial, lifestyle). Add 2-3 quality cues (sharp focus, high detail). No text or logos in the image — models render them badly.`,
  audio: `You write prompts for the Ace-Step text-to-music model. Strong music prompts specify: (1) genre + tempo feel (upbeat pop, lo-fi chill, cinematic orchestral), (2) mood, (3) 2-3 lead instruments, (4) structure hint (catchy hook, builds to a drop, loopable). Keep it under 60 words.`,
};

const EVE_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    prompt: {
      type: "string" as const,
      description:
        "The final generation prompt, ready to send to the model. 30-90 words for video/image, under 60 for audio.",
    },
    note: {
      type: "string" as const,
      description:
        "One friendly sentence to the creator explaining the key choice you made (e.g. why handheld + golden hour sells this vibe). Max 140 characters.",
    },
  },
  required: ["prompt", "note"],
  additionalProperties: false,
};

export async function enhancePrompt(goal: EveGoal, brief: EveBrief): Promise<EveResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return templatePrompt(goal, brief);
  }
  try {
    const client = new Anthropic();
    const guide = CRAFT_GUIDES[goal.category] ?? CRAFT_GUIDES.video;

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: `You are Eve, the creative director inside an AI content studio for UGC creators. ${guide} Never mention model names or that you are an AI. Write prompts in English regardless of the brief's language.`,
      messages: [
        {
          role: "user",
          content: `Write the best possible generation prompt for this brief.

Goal: ${goal.title} (${goal.tagline})
Product/brand: ${brief.product}
About it: ${brief.description}
Vibe: ${brief.vibe}
Platform: ${brief.platform}${brief.extra ? `\nCreator's extra wishes: ${brief.extra}` : ""}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: EVE_OUTPUT_SCHEMA,
        },
      },
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("Empty Eve response");
    const parsed = JSON.parse(block.text) as { prompt: string; note: string };
    if (!parsed.prompt) throw new Error("Eve returned no prompt");
    return { prompt: parsed.prompt, note: parsed.note ?? "", source: "eve" };
  } catch (err) {
    // Never block a paying customer on the enhancement layer — fall back to
    // templates and let the request through.
    console.error("Eve enhancement failed, using template:", err);
    return templatePrompt(goal, brief);
  }
}

const VIBE_WORDS: Record<string, string> = {
  luxury: "premium, elegant, high-end aesthetic, rich textures",
  fun: "playful, colorful, energetic, lighthearted",
  minimal: "clean, minimal, uncluttered, soft neutral tones",
  bold: "bold, high-contrast, striking, attention-grabbing",
  cozy: "warm, cozy, inviting, soft golden light",
  techy: "sleek, modern, futuristic, cool tones",
};

// Deterministic fallback so the wizard works before ANTHROPIC_API_KEY is
// set (and during any Anthropic outage).
function templatePrompt(goal: EveGoal, brief: EveBrief): EveResult {
  const vibe = VIBE_WORDS[brief.vibe] ?? brief.vibe;
  const subject = `${brief.product}${brief.description ? ` — ${brief.description}` : ""}`;

  const templates: Record<string, string> = {
    "product-ad": `A polished commercial shot of ${subject}, ${vibe}, smooth slow camera push-in, professional studio lighting with a subtle reflection, cinematic product advertisement style`,
    unboxing: `A person excitedly unboxing ${subject} on a cozy desk, hands opening the box close-up, ${vibe}, natural handheld smartphone footage, warm lighting, authentic UGC review style`,
    "talking-head": `A friendly content creator talking directly to the camera holding ${subject}, bright modern room, ${vibe}, enthusiastic expression, vertical smartphone video, soft natural light`,
    broll: `Cinematic lifestyle b-roll featuring ${subject}, ${vibe}, slow motion, shallow depth of field, golden hour light, smooth gliding camera movement`,
    "product-photo": `Professional studio product photograph of ${subject}, centered composition on a seamless backdrop, ${vibe}, dramatic soft lighting with subtle reflection, sharp focus, high detail, commercial photography`,
    "social-visual": `Bold social media visual featuring ${subject}, ${vibe}, striking composition with clean negative space, trending editorial photography style, sharp focus`,
    jingle: `Upbeat catchy commercial jingle for ${brief.product}, ${vibe}, bright instrumentation, memorable hook, feel-good energy, loopable`,
  };

  return {
    prompt: templates[goal.id] ?? `${subject}, ${vibe}, high quality`,
    note: "Here's a solid starting point — tweak anything you like before generating.",
    source: "template",
  };
}
