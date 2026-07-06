// Single source of truth for the product identity. The owner will pick a
// final name — change it here (plus the domain in NEXT_PUBLIC_APP_URL) and
// every page, title, and email reference follows.
export const BRAND = {
  name: "Higsi",
  tagline: "AI content studio for UGC creators",
  description:
    "Describe it in plain words — Eve, your AI creative director, turns it into scroll-stopping content for your clients. Pay only for what you create.",
  agentName: "Eve",
  // Single letter used in the logo mark until a real logo exists.
  logoLetter: "H",
} as const;
