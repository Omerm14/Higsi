"use client";

import { useEffect, useState } from "react";
import { formatCredits } from "@/lib/pricing";

// Always-visible balance. Studio dispatches a "credits:changed" window
// event after every submit/refund so the number visibly ticks without a
// page reload.
export default function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/credits/balance");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setBalance(json.balance);
      } catch {
        // header widget — never surface errors
      }
    }
    load();
    const onChange = () => load();
    window.addEventListener("credits:changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("credits:changed", onChange);
    };
  }, []);

  return (
    <div className="glass flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
      <span className="gradient-text text-sm leading-none">✦</span>
      <span className="tabular font-semibold text-foreground">
        {balance === null ? "—" : formatCredits(balance)}
      </span>
      <span className="text-muted-2">credits</span>
    </div>
  );
}
