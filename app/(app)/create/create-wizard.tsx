"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EVE_GOALS, VIBES, PLATFORMS, getGoal } from "@/lib/goals";
import { formatCredits } from "@/lib/pricing";
import { MediaTile, type OutputKind } from "../studio-results";

type Step = "goal" | "brief" | "review";

interface EveResponse {
  prompt: string;
  note: string;
  source: "eve" | "template";
  modelId: string;
  category: string;
  outputKind: OutputKind;
  promptKey: string | null;
  values: Record<string, unknown>;
  credits: number;
}

interface Job {
  id: string;
  status: string;
  media_url: string | null;
  error: string | null;
  outputKind: OutputKind;
  startedAt: number;
}

const EVE_THINKING_LINES = [
  "Eve is reading your brief…",
  "Picking the right camera and light…",
  "Writing something scroll-stopping…",
];

const GENERATING_LINES = [
  "Warming up the set…",
  "Setting the lighting…",
  "Rendering frames…",
  "Adding the magic…",
  "Almost there…",
];

function notifyCreditsChanged() {
  window.dispatchEvent(new Event("credits:changed"));
}

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 110,
    spread: 80,
    origin: { y: 0.65 },
    colors: ["#a855f7", "#ec4899", "#ffffff"],
  });
}

// One character at a time — Eve feels alive rather than instant-templated.
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    // Derived-state reset during render (React-sanctioned pattern).
    setPrevText(text);
    setShown(0);
  }
  useEffect(() => {
    if (!text) return;
    const t = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(t);
          return n;
        }
        return n + 2;
      });
    }, 18);
    return () => clearInterval(t);
  }, [text]);
  return <span>{text.slice(0, shown)}</span>;
}

function RotatingLine({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 2500);
    return () => clearInterval(t);
  }, [lines.length]);
  return <span className="animate-pulse">{lines[i]}</span>;
}

export default function CreateWizard() {
  const [step, setStep] = useState<Step>("goal");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [product, setProduct] = useState("");
  const [description, setDescription] = useState("");
  const [vibe, setVibe] = useState<string>("minimal");
  const [platform, setPlatform] = useState<string>("tiktok");
  const [extra, setExtra] = useState("");

  const [asking, setAsking] = useState(false);
  const [eve, setEve] = useState<EveResponse | null>(null);
  const [prompt, setPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const hadFirstCompletion = useRef(false);

  const goal = goalId ? getGoal(goalId) : undefined;
  const showPlatform = goal?.category !== "audio";

  function pickGoal(id: string) {
    setGoalId(id);
    setStep("brief");
    setErrorMsg(null);
  }

  async function askEve() {
    if (!goalId || !product.trim()) return;
    setAsking(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/eve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, product, description, vibe, platform, extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Eve couldn't write a prompt");
      setEve(json as EveResponse);
      setPrompt((json as EveResponse).prompt);
      setStep("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAsking(false);
    }
  }

  function pollJob(id: string) {
    const interval = setInterval(async () => {
      let res: Response;
      let json: Job;
      try {
        res = await fetch(`/api/jobs/${id}`);
        json = (await res.json()) as Job;
      } catch {
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, status: "failed", error: "Lost connection" } : j
          )
        );
        return;
      }
      if (!res.ok) {
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? { ...j, status: "failed", error: (json as { error?: string }).error ?? "Failed" }
              : j
          )
        );
        return;
      }
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...json } : j)));
      if (json.status === "completed" || json.status === "failed") {
        clearInterval(interval);
        if (json.status === "completed") {
          fireConfetti();
          if (!hadFirstCompletion.current) {
            hadFirstCompletion.current = true;
            setTimeout(fireConfetti, 350);
          }
        } else {
          notifyCreditsChanged();
        }
      }
    }, 4000);
  }

  async function generate() {
    if (!eve) return;
    setSubmitting(true);
    setErrorMsg(null);
    setNeedsCredits(false);
    try {
      const values = { ...eve.values };
      if (eve.promptKey) values[eve.promptKey] = prompt;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: eve.modelId, values }),
      });
      const json = await res.json();
      if (res.status === 402) {
        setNeedsCredits(true);
        throw new Error(json.error ?? "Not enough credits");
      }
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      notifyCreditsChanged();
      setJobs((prev) => [
        {
          id: json.id,
          status: json.status,
          media_url: json.media_url,
          error: json.error,
          outputKind: eve.outputKind,
          startedAt: Date.now(),
        },
        ...prev,
      ]);
      pollJob(json.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Step: pick a goal */}
        {step === "goal" && (
          <div>
            <h1 className="text-center text-3xl font-bold">
              What are we making <span className="gradient-text">today</span>?
            </h1>
            <p className="mt-2 text-center text-sm text-muted">
              Pick one — Eve handles the technical stuff.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVE_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => pickGoal(g.id)}
                  className="group glass rounded-2xl border border-border p-6 text-left transition-all hover:-translate-y-1 hover:border-border-strong"
                >
                  <div className="mb-3 text-3xl transition-transform group-hover:scale-125">
                    {g.emoji}
                  </div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="mt-1 text-sm text-muted">{g.tagline}</p>
                </button>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-2">
              Prefer full control?{" "}
              <Link href="/create/image" className="text-muted underline hover:text-foreground">
                Open the advanced studio
              </Link>
            </p>
          </div>
        )}

        {/* Step: plain-language brief */}
        {step === "brief" && goal && (
          <div>
            <button
              type="button"
              onClick={() => setStep("goal")}
              className="text-xs text-muted-2 hover:text-foreground"
            >
              ← All goals
            </button>
            <h1 className="mt-3 text-2xl font-bold">
              {goal.emoji} {goal.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Three quick questions and Eve writes the prompt for you.
            </p>

            <div className="mt-8 space-y-6">
              <label className="block">
                <span className="text-sm font-medium">What&apos;s the product or brand?</span>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. Glow Serum by Lumière"
                  maxLength={200}
                  className="glass mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Describe it in one line</span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. a vitamin-C face serum in a frosted glass dropper bottle"
                  maxLength={300}
                  className="glass mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-2"
                />
              </label>

              <div>
                <span className="text-sm font-medium">Pick a vibe</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVibe(v.id)}
                      className={`rounded-full px-4 py-2 text-sm transition-all ${
                        vibe === v.id
                          ? "btn-gradient font-medium text-accent-foreground"
                          : "glass text-muted hover:text-foreground"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {showPlatform && (
                <div>
                  <span className="text-sm font-medium">Where will it run?</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={`rounded-full px-4 py-2 text-sm transition-all ${
                          platform === p.id
                            ? "btn-gradient font-medium text-accent-foreground"
                            : "glass text-muted hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-medium text-muted">
                  Anything else? <span className="text-muted-2">(optional)</span>
                </span>
                <input
                  type="text"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="e.g. show it next to fresh oranges"
                  maxLength={300}
                  className="glass mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-2"
                />
              </label>

              <button
                type="button"
                onClick={askEve}
                disabled={!product.trim() || asking}
                className="btn-gradient w-full rounded-2xl px-6 py-4 text-sm font-semibold text-accent-foreground transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {asking ? <RotatingLine lines={EVE_THINKING_LINES} /> : "✨ Ask Eve to write it"}
              </button>
              {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
            </div>
          </div>
        )}

        {/* Step: review Eve's prompt + generate */}
        {step === "review" && eve && goal && (
          <div>
            <button
              type="button"
              onClick={() => setStep("brief")}
              className="text-xs text-muted-2 hover:text-foreground"
            >
              ← Tweak the brief
            </button>

            <div className="gradient-ring glass mt-4 rounded-3xl p-6">
              <div className="flex items-start gap-3">
                <span className="btn-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-accent-foreground">
                  E
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Eve</p>
                  <p className="mt-0.5 text-sm text-muted">
                    <Typewriter text={eve.note} />
                  </p>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                maxLength={2000}
                className="mt-4 w-full resize-none rounded-2xl bg-black/30 px-4 py-3 text-sm leading-relaxed outline-none"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-2">Edit anything — it&apos;s your prompt.</p>
                <button
                  type="button"
                  onClick={generate}
                  disabled={submitting || !prompt.trim()}
                  className="btn-gradient shrink-0 rounded-full px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Sending…" : `Generate · ✦ ${formatCredits(eve.credits)}`}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-center gap-3">
                <p className="text-sm text-danger">{errorMsg}</p>
                {needsCredits && (
                  <Link
                    href="/pricing"
                    className="btn-gradient rounded-full px-4 py-1.5 text-xs font-semibold text-accent-foreground"
                  >
                    Buy credits
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {jobs.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Your creations
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  {job.media_url ? (
                    <div className="reveal h-full">
                      <MediaTile src={`/api/media/${job.id}`} outputKind={job.outputKind} alt="" />
                    </div>
                  ) : job.status === "failed" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs">
                      <span className="text-danger">Failed — credits refunded</span>
                      {job.error && <span className="text-muted-2">{job.error}</span>}
                    </div>
                  ) : (
                    <div className="shimmer flex h-full flex-col items-center justify-center gap-3 text-xs text-muted">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
                      <RotatingLine lines={GENERATING_LINES} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {jobs.some((j) => j.status === "completed") && (
              <p className="mt-4 text-center text-xs text-muted-2">
                Everything lives in your <Link href="/gallery" className="underline">gallery</Link> —
                download from there anytime.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
