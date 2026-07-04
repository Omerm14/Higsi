import { put } from "@vercel/blob";

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
    access: "public",
    contentType,
  });

  return blob.url;
}
