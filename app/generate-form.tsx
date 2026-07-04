"use client";

import { useMemo, useState } from "react";
import { MODEL_OPTIONS, type Mode, estimateCostUsd, getModelOption } from "@/lib/models";

type JobStatus = "pending" | "processing" | "staged" | "completed" | "failed";

interface Job {
  id: string;
  status: JobStatus;
  media_url: string | null;
  error: string | null;
  prompt: string;
  mode: Mode;
}

const MODE_LABEL: Record<Mode, string> = {
  t2v: "Text → Video",
  i2v: "Image → Video",
  t2i: "Text → Image",
};

export default function GenerateForm() {
  const [mode, setMode] = useState<Mode>("t2v");
  const modelsForMode = useMemo(
    () => MODEL_OPTIONS.filter((m) => m.mode === mode),
    [mode]
  );
  const [modelId, setModelId] = useState(modelsForMode[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const activeOption = getModelOption(modelId) ?? modelsForMode[0];
  const estCost = activeOption ? estimateCostUsd(activeOption, { duration }) : 0;

  function onModeChange(next: Mode) {
    setMode(next);
    const first = MODEL_OPTIONS.find((m) => m.mode === next);
    setModelId(first?.id ?? "");
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setImageUrl(json.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function pollJob(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${id}`);
      const json = await res.json();
      if (!res.ok) {
        clearInterval(interval);
        return;
      }
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...json } : j)));
      if (json.status === "completed" || json.status === "failed") {
        clearInterval(interval);
      }
    }, 4000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOption || !prompt.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: activeOption.id,
          prompt,
          duration: activeOption.costUnit === "per_second" ? duration : undefined,
          aspectRatio,
          imageUrl: mode === "i2v" ? imageUrl : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setJobs((prev) => [{ ...json }, ...prev]);
      pollJob(json.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:flex-row">
      <aside className="w-full shrink-0 rounded-xl border border-border bg-surface p-5 lg:w-72">
        <h2 className="mb-4 text-sm font-medium text-muted">Model & params</h2>

        <div className="mb-4 flex flex-col gap-1">
          <label className="text-xs text-muted">Mode</label>
          <div className="flex flex-col gap-1">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  mode === m
                    ? "border-accent bg-surface-2 text-foreground"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-1">
          <label className="text-xs text-muted">Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            {modelsForMode.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {activeOption?.costUnit === "per_second" && (
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-xs text-muted">Duration (seconds)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="mb-4 flex flex-col gap-1">
          <label className="text-xs text-muted">Aspect ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
          </select>
        </div>

        {mode === "i2v" && (
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-xs text-muted">Reference image</label>
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              disabled={uploading}
              className="text-xs text-muted"
            />
            {uploading && <span className="text-xs text-muted">Uploading…</span>}
            {imageUrl && !uploading && (
              <span className="truncate text-xs text-success">Uploaded ✓</span>
            )}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-border bg-surface-2 p-3">
          <div className="text-xs text-muted">Estimated cost</div>
          <div className="tabular text-lg font-medium">${estCost.toFixed(2)}</div>
          <div className="mt-1 text-xs text-muted">
            {activeOption?.tier === "full" ? "Full-quality tier" : "Cheap tier (default)"}
          </div>
        </div>
      </aside>

      <section className="flex flex-1 flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to generate…"
            rows={5}
            className="rounded-xl border border-border bg-surface p-4 text-sm outline-none focus:border-accent"
          />
          {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
          <button
            type="submit"
            disabled={submitting || !prompt.trim() || (mode === "i2v" && !imageUrl)}
            className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Generate"}
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-surface-2">
                {job.media_url ? (
                  job.mode === "t2i" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.media_url} alt={job.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <video src={job.media_url} controls className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    {job.status === "failed" ? "Failed" : "Generating…"}
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-xs text-muted">{job.prompt}</p>
              {job.error && <p className="text-xs text-danger">{job.error}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
