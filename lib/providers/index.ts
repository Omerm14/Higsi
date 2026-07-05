import type { Provider } from "./types";
import { PiApiProvider } from "./piapi";
import { FalProvider } from "./fal";

export type ProviderName = "piapi" | "fal";

const providers: Record<ProviderName, Provider> = {
  piapi: new PiApiProvider(),
  fal: new FalProvider(),
};

export function getProvider(name: ProviderName): Provider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}
