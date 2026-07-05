"use client";

import { useMemo, useState } from "react";
import type { Generation } from "@/lib/db";

const MODE_LABEL: Record<string, string> = {
  all: "All",
  t2v: "Text → Video",
  i2v: "Image → Video",
  t2i: "Text → Image",
};

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
    <div className="scrollbar-thin flex h-full flex-col gap-6 overflow-y-auto px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass flex rounded-full p-1">
          {Object.keys(MODE_LABEL).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                modeFilter === m
                  ? "btn-gradient text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {models.length > 0 && (
          <div className="glass flex flex-wrap gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => setModelFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                modelFilter === "all"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All models
            </button>
            {models.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModelFilter(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  modelFilter === m
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto text-xs text-muted-2">{filtered.length} results</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
          <p className="text-sm">No generations yet</p>
          <p className="text-xs text-muted-2">Anything you generate will show up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface transition-transform hover:-translate-y-0.5 hover:border-border-strong"
            >
              {g.media_url ? (
                g.mode === "t2i" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${g.id}`} alt={g.prompt} className="h-full w-full object-cover" />
                ) : (
                  <video src={`/api/media/${g.id}`} controls className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  {g.status}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-2 text-xs text-white">{g.prompt}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
                  <span>{g.model}</span>
                  <span className="tabular">
                    ${Number(g.actual_cost_usd ?? g.est_cost_usd).toFixed(2)}
                  </span>
                </div>
                {g.media_url && (
                  <a
                    href={`/api/media/${g.id}`}
                    download
                    className="pointer-events-auto mt-2 self-start rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/20"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
