import type { OutputKind } from "./types";

// Provider output shapes vary per model: video jobs expose
// output.video.url / output.works[].video.resource, image jobs expose an
// image URL under a different key entirely, Fal returns { images: [{url}] }
// or { video: {url} }. Some models (e.g. Trellis) return several URLs at
// once — a preview video, the actual .glb model file, a background-removed
// image — so a plain "first URL found" walk picks the wrong one. Rather
// than hard-code one path per model, walk the object and score candidates:
// an outputKind-appropriate match wins first, then a no-watermark URL, then
// whatever came first.
export function extractOutputUrl(output: unknown, outputKind?: OutputKind): string | undefined {
  if (!output || typeof output !== "object") return undefined;

  const candidates: { url: string; noWatermark: boolean; kindMatch: boolean }[] = [];

  const visit = (node: unknown, keyHint: string) => {
    if (!node) return;
    if (typeof node === "string") {
      if (/^https?:\/\//.test(node)) {
        candidates.push({
          url: node,
          noWatermark: /no.?watermark/i.test(keyHint),
          kindMatch: matchesOutputKind(node, keyHint, outputKind),
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, keyHint));
      return;
    }
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        visit(value, key);
      }
    }
  };

  visit(output, "");
  if (candidates.length === 0) return undefined;

  const kindMatch = candidates.find((c) => c.kindMatch);
  if (kindMatch) return kindMatch.url;
  const noWatermark = candidates.find((c) => c.noWatermark);
  return (noWatermark ?? candidates[0]).url;
}

function matchesOutputKind(url: string, keyHint: string, outputKind?: OutputKind): boolean {
  if (!outputKind) return false;
  if (outputKind === "3d") {
    return /\.glb(\?|$)/i.test(url) || /model_file|^model$/i.test(keyHint);
  }
  if (outputKind === "audio") {
    return /\.(mp3|wav|ogg)(\?|$)/i.test(url) || /audio/i.test(keyHint);
  }
  return false;
}
