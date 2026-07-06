import type { ModelField, ModelOption } from "./models";

const PROMPT_MAX_CHARS = 2000;
const TEXT_MAX_CHARS = 5000;

export type ValidationResult =
  | { ok: true; clean: Record<string, unknown> }
  | { ok: false; error: string };

// Server-side enforcement of the ModelField schema. Only schema-known keys
// make it into `clean`, so a client can never inject arbitrary wire fields
// into the provider input bag. Image values must be same-origin
// /api/references/ paths — anything else is an SSRF-by-proxy vector (the
// provider would fetch an attacker-chosen URL on our behalf).
export function validateFieldValues(
  option: ModelOption,
  values: Record<string, unknown>
): ValidationResult {
  const clean: Record<string, unknown> = {};

  for (const field of option.fields) {
    const raw = values[field.key];
    const empty = raw === undefined || raw === null || raw === "";

    if (empty) {
      if (field.required) {
        return { ok: false, error: `${field.label} is required` };
      }
      continue;
    }

    const checked = validateField(field, raw);
    if (!checked.ok) return checked;
    clean[field.key] = checked.value;
  }

  return { ok: true, clean };
}

function validateField(
  field: ModelField,
  raw: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (field.type) {
    case "prompt":
    case "negative_prompt": {
      const text = String(raw);
      if (text.length > PROMPT_MAX_CHARS) {
        return { ok: false, error: `${field.label} is too long (max ${PROMPT_MAX_CHARS} characters)` };
      }
      return { ok: true, value: text };
    }
    case "text": {
      const text = String(raw);
      if (text.length > TEXT_MAX_CHARS) {
        return { ok: false, error: `${field.label} is too long (max ${TEXT_MAX_CHARS} characters)` };
      }
      return { ok: true, value: text };
    }
    case "select": {
      const value = String(raw);
      if (field.options && !field.options.some((o) => o.value === value)) {
        return { ok: false, error: `${field.label}: "${value}" is not a valid option` };
      }
      return { ok: true, value };
    }
    case "number": {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return { ok: false, error: `${field.label} must be a number` };
      }
      if (field.min !== undefined && num < field.min) {
        return { ok: false, error: `${field.label} must be at least ${field.min}` };
      }
      if (field.max !== undefined && num > field.max) {
        return { ok: false, error: `${field.label} must be at most ${field.max}` };
      }
      return { ok: true, value: num };
    }
    case "image": {
      const url = String(raw);
      if (!isOwnReferenceUrl(url)) {
        return {
          ok: false,
          error: `${field.label} must be an image uploaded through this app`,
        };
      }
      return { ok: true, value: url };
    }
    default:
      return { ok: true, value: raw };
  }
}

function isOwnReferenceUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (!url.pathname.startsWith("/api/references/")) return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (url.origin !== new URL(appUrl).origin) return false;
    } catch {
      // Malformed NEXT_PUBLIC_APP_URL — fall through to path-only check
      // rather than rejecting every generation.
    }
  }
  return true;
}

// Magic-byte sniffing for reference uploads — the client's MIME type and
// filename are attacker-controlled and ignored entirely.
export function sniffImageType(
  bytes: Uint8Array
): { ext: "jpg" | "png" | "webp"; contentType: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", contentType: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}
