"use client";

import { useMemo, useState } from "react";
import {
  MODEL_OPTIONS,
  estimateCostUsd,
  getModelOption,
  type Category,
  type ModelField,
  type ToolKind,
} from "@/lib/models";
import { MediaTile, type OutputKind } from "./studio-results";

type JobStatus = "pending" | "processing" | "staged" | "completed" | "failed";

interface Job {
  id: string;
  status: JobStatus;
  media_url: string | null;
  error: string | null;
  prompt: string;
  outputKind: OutputKind;
}

export default function Studio({
  category,
  toolKind,
}: {
  category: Category;
  toolKind?: ToolKind;
}) {
  const modelsForCategory = useMemo(
    () =>
      MODEL_OPTIONS.filter(
        (m) => m.category === category && (!toolKind || m.toolKind === toolKind)
      ),
    [category, toolKind]
  );

  const [modelId, setModelId] = useState(modelsForCategory[0]?.id ?? "");
  const activeOption = getModelOption(modelId) ?? modelsForCategory[0];

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const estCost = activeOption ? estimateCostUsd(activeOption, values) : 0;

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onModelChange(nextId: string) {
    setModelId(nextId);
    setValues({});
  }

  async function onUploadImage(field: ModelField, file: File) {
    setUploading((prev) => ({ ...prev, [field.key]: true }));
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setValue(field.key, json.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [field.key]: false }));
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
            j.id === id
              ? { ...j, status: "failed", error: "Lost connection while checking job status" }
              : j
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
    if (!activeOption) return;
    const missingRequired = activeOption.fields.find(
      (f) => f.required && !values[f.key]
    );
    if (missingRequired) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: activeOption.id, values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      const promptField = activeOption.fields.find((f) => f.type === "prompt");
      setJobs((prev) => [
        {
          id: json.id,
          status: json.status,
          media_url: json.media_url,
          error: json.error,
          prompt: promptField ? String(values[promptField.key] ?? "") : "",
          outputKind: activeOption.outputKind,
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

  if (!activeOption) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No models available for this category yet.
      </div>
    );
  }

  const promptField = activeOption.fields.find((f) => f.type === "prompt");
  const otherFields = activeOption.fields.filter((f) => f.type !== "prompt");
  const canSubmit =
    !submitting &&
    activeOption.fields.every((f) => !f.required || Boolean(values[f.key])) &&
    (!promptField || Boolean(String(values[promptField.key] ?? "").trim()));

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <select
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          className="glass rounded-full px-4 py-2 text-sm outline-none"
        >
          {modelsForCategory.map((m) => (
            <option key={m.id} value={m.id} className="bg-[#111114]">
              {m.label}
            </option>
          ))}
        </select>

        {otherFields.map((field) => {
          if (field.type === "select") {
            const current = String(values[field.key] ?? field.default ?? "");
            return (
              <div key={field.key} className="glass flex rounded-full p-1">
                {field.options?.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue(field.key, opt.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      current === opt.value
                        ? "bg-surface-2 text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            );
          }
          if (field.type === "number") {
            return (
              <label
                key={field.key}
                className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted"
              >
                {field.label}
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={String(values[field.key] ?? field.default ?? "")}
                  onChange={(e) => setValue(field.key, Number(e.target.value))}
                  className="tabular w-12 bg-transparent text-center text-foreground outline-none"
                />
              </label>
            );
          }
          if (field.type === "image") {
            const isUploading = uploading[field.key];
            const uploaded = Boolean(values[field.key]);
            return (
              <label
                key={field.key}
                className="glass flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs text-muted hover:text-foreground"
              >
                {isUploading ? "Uploading…" : uploaded ? `${field.label} ✓` : field.label}
                <input
                  type="file"
                  accept={field.accept ?? "image/*"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadImage(field, file);
                  }}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            );
          }
          if (field.type === "text" || field.type === "negative_prompt") {
            return (
              <label
                key={field.key}
                className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted"
              >
                {field.label}
                <input
                  type="text"
                  value={String(values[field.key] ?? field.default ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  className="w-32 bg-transparent text-foreground outline-none"
                />
              </label>
            );
          }
          return null;
        })}

        <div className="ml-auto glass rounded-full px-4 py-2 text-xs text-muted">
          Est. cost <span className="tabular font-medium text-foreground">${estCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Results */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
        {jobs.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted">
            <p className="text-sm">Nothing generated yet</p>
            <p className="text-xs text-muted-2">
              {promptField
                ? "Describe what you want below and hit generate."
                : "Fill in the inputs above and hit generate."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface"
              >
                {job.media_url ? (
                  <MediaTile src={`/api/media/${job.id}`} outputKind={job.outputKind} alt={job.prompt} />
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
                {job.prompt && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs text-white">{job.prompt}</p>
                    {job.error && <p className="text-xs text-danger">{job.error}</p>}
                  </div>
                )}
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
          {promptField ? (
            <textarea
              value={String(values[promptField.key] ?? "")}
              onChange={(e) => setValue(promptField.key, e.target.value)}
              placeholder={
                promptField.label === "Prompt"
                  ? "Describe what you want to generate…"
                  : `${promptField.label}…`
              }
              rows={1}
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-2"
            />
          ) : (
            <div className="flex-1 px-2 py-2 text-sm text-muted-2">
              No prompt needed — fill in the inputs above and generate.
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
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
