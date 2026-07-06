import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PRESETS } from "@/lib/presets";
import { CREDIT_PACKS, SIGNUP_BONUS_CREDITS, formatCredits } from "@/lib/pricing";

const CAPABILITIES = [
  { emoji: "🖼️", title: "Images", blurb: "Product shots, social visuals, thumbnails" },
  { emoji: "🎬", title: "Video", blurb: "UGC-style clips, ads, b-roll — text or image to video" },
  { emoji: "🎵", title: "Audio", blurb: "Jingles and background tracks from a prompt" },
  { emoji: "🧊", title: "3D", blurb: "Turn a product photo into a 3D model" },
  { emoji: "🛠️", title: "Pro tools", blurb: "Upscale, cutout, outpaint, faceswap" },
  { emoji: "⚡", title: "Pay per use", blurb: "No subscription — credits only burn when you create" },
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(168,85,247,0.18),transparent_70%)]" />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-24 text-center">
          <p className="glass mb-6 rounded-full px-4 py-1.5 text-xs text-muted">
            ✦ {formatCredits(SIGNUP_BONUS_CREDITS)} free credits when you sign up
          </p>
          <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Make <span className="gradient-text">scroll-stopping</span> AI content for your clients
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted">
            {BRAND.description}
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/sign-up"
              className="btn-gradient rounded-full px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
            >
              Start creating — it&apos;s free
            </Link>
            <Link
              href="/pricing"
              className="glass rounded-full px-7 py-3.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="glass rounded-2xl border border-border p-6 transition-all hover:-translate-y-1 hover:border-border-strong"
            >
              <div className="mb-3 text-3xl">{c.emoji}</div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Presets teaser */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Start from a proven recipe</h2>
        <p className="mt-3 text-center text-muted">
          One-click presets tuned for UGC work — tweak the prompt, hit generate, deliver.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              className="group glass relative overflow-hidden rounded-2xl border border-border p-6 transition-all hover:-translate-y-1 hover:border-border-strong"
            >
              <div className="mb-3 text-3xl transition-transform group-hover:scale-125">{p.emoji}</div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Simple, honest pricing</h2>
        <p className="mt-3 text-center text-muted">
          Buy credits, spend them on whatever you create. They never expire.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack, i) => (
            <div
              key={pack.id}
              className={`glass rounded-2xl border p-8 text-center transition-all hover:-translate-y-1 ${
                i === 1 ? "gradient-ring border-transparent" : "border-border hover:border-border-strong"
              }`}
            >
              <h3 className="text-sm font-medium text-muted">{pack.label}</h3>
              <p className="mt-2 text-4xl font-bold">${pack.usd}</p>
              <p className="gradient-text mt-1 text-sm font-semibold">
                {formatCredits(pack.credits)} credits
              </p>
              <p className="mt-2 text-xs text-muted-2">{pack.blurb}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/sign-up"
            className="btn-gradient inline-block rounded-full px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
          >
            Claim your {formatCredits(SIGNUP_BONUS_CREDITS)} free credits
          </Link>
        </div>
      </section>
    </main>
  );
}
