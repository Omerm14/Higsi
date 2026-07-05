import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser, authErrorResponse } from "@/lib/users";
import { getCreditPack, formatCredits } from "@/lib/pricing";
import { requireEnv } from "@/lib/env";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const body = await req.json().catch(() => null);
  const pack = getCreditPack((body as { packId?: string } | null)?.packId ?? "");
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack" }, { status: 400 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

  // Inline price_data — no Stripe product catalog to maintain. The grant
  // happens in the webhook (never here) so an abandoned checkout grants
  // nothing and a replayed webhook grants once.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: pack.usd * 100,
          product_data: {
            name: `${formatCredits(pack.credits)} credits — ${pack.label} pack`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      packId: pack.id,
      credits: String(pack.credits),
    },
    success_url: `${appUrl}/dashboard?purchase=success`,
    cancel_url: `${appUrl}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
