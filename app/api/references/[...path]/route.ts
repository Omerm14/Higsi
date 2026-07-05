import { NextResponse } from "next/server";
import { getBlobStream } from "@/lib/blob";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = `references/${path.join("/")}`;

  const result = await getBlobStream(pathname);
  if (!result?.stream) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
