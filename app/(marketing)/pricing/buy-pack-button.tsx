"use client";

import { useState } from "react";

export default function BuyPackButton({ packId }: { packId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBuy}
        disabled={loading}
        className="btn-gradient w-full rounded-full px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Buy credits"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
