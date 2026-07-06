// Hand-rolled env validation — a zod schema buys nothing over this list.
// assertEnv() runs once at server boot via instrumentation.ts register(),
// so a misconfigured deploy fails loudly instead of 500ing on the first
// customer request.

const REQUIRED = [
  "PIAPI_KEY",
  "POSTGRES_URL",
  "BLOB_READ_WRITE_TOKEN",
] as const;

// Required once the corresponding phase is live; warn-only until then so a
// partially configured preview deploy still boots.
const RECOMMENDED = [
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "CRON_SECRET",
  "ADMIN_CLERK_USER_ID",
] as const;

export function assertEnv(): void {
  // next build boots workers without runtime secrets; only enforce on a
  // real serving process.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing = REQUIRED.filter((name) => !process.env[name] && !fallback(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `See SETUP.md for where each one comes from.`
    );
  }

  const soft = RECOMMENDED.filter((name) => !process.env[name]);
  if (soft.length > 0) {
    console.warn(`[env] Not set (some features disabled): ${soft.join(", ")}`);
  }
}

function fallback(name: string): string | undefined {
  if (name === "POSTGRES_URL") return process.env.DATABASE_URL;
  return undefined;
}

export function requireEnv(name: string): string {
  const value = process.env[name] ?? fallback(name);
  if (!value) {
    throw new Error(`${name} is not set. See SETUP.md.`);
  }
  return value;
}
