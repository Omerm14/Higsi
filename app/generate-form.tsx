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

const ASPECT_RATIOS = ["16:9", "9:16", "1:1"];

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
      let res: Response;
      let json: unknown;
      try {
        res = await fetch(`/api/jobs/${id}`);
        json = await res.json();
      } catch {
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, status: "failed", error: "Lost connection while checking job status" } : j
          )
        );
        return;
      }
      if (!res.ok) {
        clearInterval(interval);
        const message =
          (json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : null) ?? `Job status check failed (${res.status})`;
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "failed", error: message } : j))
        );
        return;
      }
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...(json as Job) } : j)));
      if ((json as Job).status === "completed" || (json as Job).status === "failed") {
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
    <div className="flex h-full flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="glass flex rounded-full p-1">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? "btn-gradient text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="glass rounded-full px-4 py-2 text-sm outline-none"
        >
          {modelsForMode.map((m) => (
            <option key={m.id} value={m.id} className="bg-[#111114]">
              {m.label}
            </option>
          ))}
        </select>

        <div className="glass flex rounded-full p-1">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar}
              type="button"
              onClick={() => setAspectRatio(ar)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                aspectRatio === ar
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {ar}
            </button>
          ))}
        </div>

        {activeOption?.costUnit === "per_second" && (
          <label className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted">
            Duration
            <input
              type="number"
              min={1}
              max={30}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="tabular w-10 bg-transparent text-center text-foreground outline-none"
            />
            s
          </label>
        )}

        {mode === "i2v" && (
          <label className="glass flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs text-muted hover:text-foreground">
            {uploading ? "Uploading…" : imageUrl ? "Image ✓" : "Upload image"}
            <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} className="hidden" />
          </label>
        )}

        <div className="ml-auto glass rounded-full px-4 py-2 text-xs text-muted">
          Est. cost <span className="tabular font-medium text-foreground">${estCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Results */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
        {jobs.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted">
            <p className="text-sm">Nothing generated yet</p>
            <p className="text-xs text-muted-2">Describe what you want below and hit generate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface"
              >
                {job.media_url ? (
                  job.mode === "t2i" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.media_url} alt={job.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <video src={job.media_url} controls className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted">
                    {job.status === "failed" ? (
                      <span className="text-danger">Failed</span>
                    ) : (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
                        Generating…
                      </>
                    )}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="line-clamp-2 text-xs text-white">{job.prompt}</p>
                  {job.error && <p className="text-xs text-danger">{job.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-6 py-4">
        <form
          onSubmit={onSubmit}
          className="glass gradient-ring mx-auto flex max-w-3xl items-end gap-3 rounded-3xl p-3"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to generate…"
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-2"
          />
          <button
            type="submit"
            disabled={submitting || !prompt.trim() || (mode === "i2v" && !imageUrl)}
            className="btn-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Generate"}
          </button>
        </form>
        {errorMsg && <p className="mx-auto mt-2 max-w-3xl text-sm text-danger">{errorMsg}</p>}
      </div>
    </div>
  );
}
