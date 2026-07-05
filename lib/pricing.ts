import type { ModelOption } from "./models";
import { estimateCostUsd } from "./models";

// 1 credit = $0.01 customer-facing. Balances and prices are always integer
// credits — no floating-point money anywhere. Customer price defaults to
// 2x the provider rate (ModelOption.priceMultiplier overrides per model).
export const CREDIT_USD = 0.01;
export const DEFAULT_PRICE_MULTIPLIER = 2;
export const SIGNUP_BONUS_CREDITS = 500;

export function customerCreditCost(
  option: ModelOption,
  values: Record<string, unknown>
): number {
  const usd =
    estimateCostUsd(option, values) * (option.priceMultiplier ?? DEFAULT_PRICE_MULTIPLIER);
  return Math.max(1, Math.ceil(usd / CREDIT_USD));
}

export interface CreditPack {
  id: string;
  usd: number;
  credits: number;
  label: string;
  blurb: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", usd: 10, credits: 1000, label: "Starter", blurb: "Try everything" },
  { id: "creator", usd: 25, credits: 2750, label: "Creator", blurb: "+10% bonus credits" },
  { id: "studio", usd: 50, credits: 6000, label: "Studio", blurb: "+20% bonus credits" },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function formatCredits(credits: number): string {
  return credits.toLocaleString("en-US");
}
