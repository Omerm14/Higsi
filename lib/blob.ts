import { put, get } from "@vercel/blob";

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
  const ext = contentType.includes("video") ? "mp4" : "png";
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
