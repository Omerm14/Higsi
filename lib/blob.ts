import { put, get } from "@vercel/blob";

// 3D outputs (e.g. Trellis) are unconfirmed at time of writing whether they
// arrive with a proper model/gltf-binary content-type or a generic
// octet-stream — treat octet-stream as glb since nothing else in this app
// produces raw binary output. Re-verify against a real 3D spike before
// trusting this for a model whose output isn't actually a glb.
function extensionFor(contentType: string): string {
  if (contentType.includes("video")) return contentType.includes("webm") ? "webm" : "mp4";
  if (contentType.includes("audio")) {
    if (contentType.includes("wav")) return "wav";
    if (contentType.includes("ogg")) return "ogg";
    return "mp3";
  }
  if (
    contentType.includes("gltf-binary") ||
    contentType.includes("glb") ||
    contentType.includes("octet-stream")
  ) {
    return "glb";
  }
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "bin";
}

// Vercel Blob stores are private-only (no public-access option in the
// dashboard), so uploads use access: "private" and are served back to the
// browser through /api/media/:id, which streams via getBlobStream() using
// the server-side token. The stored "pathname" (not a public URL) is what
// we save on the generation row and pass back into get() to fetch it.
export async function persistOutputToBlob(
  sourceUrl: string,
  generationId: string
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to download PiAPI output (${res.status}): ${sourceUrl}`);
  }
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const ext = extensionFor(contentType);
  const buffer = await res.arrayBuffer();

  const blob = await put(`generations/${generationId}.${ext}`, Buffer.from(buffer), {
    access: "private",
    contentType,
  });

  return blob.pathname;
}

export async function getBlobStream(pathname: string) {
  return get(pathname, { access: "private" });
}
