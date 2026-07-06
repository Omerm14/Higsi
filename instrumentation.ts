import type { Instrumentation } from "next";

export async function register() {
  const { assertEnv } = await import("./lib/env");
  assertEnv();

  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Provider errors embed request context; make sure no secrets ride
      // along to Sentry.
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers["x-api-key"];
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }
        return event;
      },
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    await Sentry.captureRequestError(...args);
  }
};
