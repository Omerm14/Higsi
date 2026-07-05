import { NextResponse } from "next/server";
import { getGeneration } from "@/lib/db";
import { getBlobStream } from "@/lib/blob";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const generation = await getGeneration(id);
  if (!generation || !generation.media_url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await getBlobStream(generation.media_url);
  if (!result?.stream) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
