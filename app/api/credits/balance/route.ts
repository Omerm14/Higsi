import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/users";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ balance: user.balance_credits });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
