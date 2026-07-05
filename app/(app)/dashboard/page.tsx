import Link from "next/link";
import { requireUser } from "@/lib/users";
import { listGenerations } from "@/lib/db";
import { PRESETS } from "@/lib/presets";
import { SIGNUP_BONUS_CREDITS, formatCredits } from "@/lib/pricing";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const CATEGORY_PATH: Record<string, string> = {
  image: "/create/image",
  video: "/create/video",
  audio: "/create/audio",
  "3d": "/create/3d",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const generations = await listGenerations(user.id);
  const isNew = generations.length === 0;

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {isNew ? (
          <div className="gradient-ring glass rounded-3xl p-8 text-center">
            <p className="text-3xl">🎉</p>
            <h1 className="mt-3 text-2xl font-bold">
              Welcome to {BRAND.name} — you&apos;ve got{" "}
              <span className="gradient-text">
                {formatCredits(Math.max(user.balance_credits, SIGNUP_BONUS_CREDITS))} credits
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              That&apos;s enough to try images, video, and audio. Pick a recipe below and make your
              first piece — it takes under a minute.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back{user.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatCredits(user.balance_credits)} credits ready to burn. What are we making today?
            </p>
          </div>
        )}

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
          Start from a recipe
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((p) => (
            <Link
              key={p.id}
              href={`${CATEGORY_PATH[p.category] ?? "/create/image"}?preset=${p.id}`}
              className="group glass rounded-2xl border border-border p-6 transition-all hover:-translate-y-1 hover:border-border-strong"
            >
              <div className="mb-3 text-3xl transition-transform group-hover:scale-125">
                {p.emoji}
              </div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            </Link>
          ))}
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
          Or start from scratch
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(CATEGORY_PATH).map(([cat, path]) => (
            <Link
              key={cat}
              href={path}
              className="glass rounded-full border border-border px-5 py-2.5 text-sm font-medium capitalize text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              {cat === "3d" ? "3D" : cat}
            </Link>
          ))}
          <Link
            href="/gallery"
            className="glass rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            My gallery →
          </Link>
        </div>
      </div>
    </div>
  );
}
