"use client";

import { useMemo, useState } from "react";
import type { Generation } from "@/lib/db";

export default function GalleryGrid({ generations }: { generations: Generation[] }) {
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");

  const models = useMemo(
    () => Array.from(new Set(generations.map((g) => g.model))),
    [generations]
  );

  const filtered = generations.filter((g) => {
    if (modeFilter !== "all" && g.mode !== modeFilter) return false;
    if (modelFilter !== "all" && g.model !== modelFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap gap-3">
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="all">All modes</option>
          <option value="t2v">Text → Video</option>
          <option value="i2v">Image → Video</option>
          <option value="t2i">Text → Image</option>
        </select>
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="all">All models</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No generations yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-surface-2">
                {g.media_url ? (
                  g.mode === "t2i" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.media_url} alt={g.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <video src={g.media_url} controls className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    {g.status}
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-xs text-foreground">{g.prompt}</p>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{g.model}</span>
                <span className="tabular">
                  ${Number(g.actual_cost_usd ?? g.est_cost_usd).toFixed(2)}
                </span>
              </div>
              {g.media_url && (
                <a
                  href={g.media_url}
                  download
                  className="text-xs text-accent hover:underline"
                >
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
