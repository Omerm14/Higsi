import { NextResponse } from "next/server";
import Stripe from "stripe";
import { grantCredits } from "@/lib/credits";
import { requireEnv } from "@/lib/env";

// Public route (Stripe can't sign in) — authenticity comes from the
// webhook signature. Idempotency comes from the DB unique index on
// stripe_session_id, so Stripe's retries and replays are no-ops.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const userId = session.metadata?.userId;
      const credits = Number(session.metadata?.credits);
      if (userId && Number.isInteger(credits) && credits > 0) {
        await grantCredits(userId, credits, "purchase", session.id);
      } else {
        console.error("Stripe session missing metadata:", session.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
