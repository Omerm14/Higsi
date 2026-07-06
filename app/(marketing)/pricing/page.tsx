import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { CREDIT_PACKS, SIGNUP_BONUS_CREDITS, formatCredits } from "@/lib/pricing";
import BuyPackButton from "./buy-pack-button";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="text-center text-4xl font-bold">Pricing</h1>
      <p className="mt-4 text-center text-muted">
        1 credit = $0.01. Credits never expire and only burn when you generate.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack, i) => (
          <div
            key={pack.id}
            className={`glass flex flex-col items-center rounded-2xl border p-8 text-center ${
              i === 1 ? "gradient-ring border-transparent" : "border-border"
            }`}
          >
            <h3 className="text-sm font-medium text-muted">{pack.label}</h3>
            <p className="mt-2 text-4xl font-bold">${pack.usd}</p>
            <p className="gradient-text mt-1 text-sm font-semibold">
              {formatCredits(pack.credits)} credits
            </p>
            <p className="mt-2 flex-1 text-xs text-muted-2">{pack.blurb}</p>
            <div className="mt-6 w-full">
              <Show
                when="signed-in"
                fallback={
                  <Link
                    href="/sign-up"
                    className="btn-gradient block w-full rounded-full px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                  >
                    Sign up to buy
                  </Link>
                }
              >
                <BuyPackButton packId={pack.id} />
              </Show>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-muted-2">
        New accounts start with {formatCredits(SIGNUP_BONUS_CREDITS)} free credits — no card needed.
      </p>
    </main>
  );
}
