import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser, authErrorResponse } from "@/lib/users";
import { sniffImageType } from "@/lib/validate";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/ratelimit";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const limit = await checkRateLimit(
    `upload:${user.id}`,
    RATE_LIMITS.uploadPerMinute,
    60
  );
  if (!limit.ok) return rateLimitResponse();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  // Client MIME type and filename are attacker-controlled — sniff the
  // actual bytes and derive both the extension and content type from them.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are supported" },
      { status: 400 }
    );
  }

  // Random UUID path: user input never touches the blob path, and the
  // resulting /api/references URL is unguessable — which is what makes it
  // safe for that proxy to stay public (generation providers fetch it
  // server-side and can't send our session cookie).
  const blob = await put(`references/${crypto.randomUUID()}.${sniffed.ext}`, Buffer.from(bytes), {
    access: "private",
    contentType: sniffed.contentType,
  });

  const url = new URL(
    `/api/references/${blob.pathname.replace(/^references\//, "")}`,
    process.env.NEXT_PUBLIC_APP_URL ?? req.url
  ).toString();

  return NextResponse.json({ url });
}
