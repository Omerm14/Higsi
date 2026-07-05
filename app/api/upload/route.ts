import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const blob = await put(`references/${Date.now()}-${file.name}`, file, {
    access: "private",
  });

  // PiAPI fetches this URL directly from its own servers, so it needs a
  // real internet-reachable URL rather than an app-authenticated one —
  // /api/references proxies the private blob back out unauthenticated.
  const url = new URL(
    `/api/references/${blob.pathname.replace(/^references\//, "")}`,
    req.url
  ).toString();

  return NextResponse.json({ url });
}
