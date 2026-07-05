import { NextResponse } from "next/server";
import { getGeneration, toClientGeneration } from "@/lib/db";
import { settleGeneration } from "@/lib/jobs";
import { requireUser, authErrorResponse } from "@/lib/users";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/ratelimit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const limit = await checkRateLimit(
    `jobs:${user.id}`,
    RATE_LIMITS.jobsPollPerMinute,
    60
  );
  if (!limit.ok) return rateLimitResponse();

  const { id } = await params;
  const generation = await getGeneration(id, user.id);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settled = await settleGeneration(generation);
  return NextResponse.json(toClientGeneration(settled));
}
