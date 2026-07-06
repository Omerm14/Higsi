// Live model-verification spike: exercise a real provider (PiAPI or Fal)
// with real credentials for any candidate model before trusting its
// model/task_type strings in lib/models.ts. Provider docs have repeatedly
// been stale (GPT Image, old Nano Banana) — this is what catches that
// before it ships.
//
// Usage: npx tsx scripts/provider-spike.ts <modelId> [key=value ...]
//        npx tsx scripts/provider-spike.ts --provider fal --model fal-ai/flux/schnell --input '{"prompt":"a dog"}'
// Examples:
//   npx tsx scripts/provider-spike.ts flux-schnell aspectRatio=1:1
//   npx tsx scripts/provider-spike.ts seedance-fast prompt="a dog running" duration=5
import { config } from "dotenv";
config({ path: ".env.local" });

// This sandbox routes all outbound HTTPS through a local proxy that Node's
// native fetch doesn't pick up automatically (unlike curl, which reads
// HTTPS_PROXY). Wire undici's ProxyAgent in for this standalone script only —
// the deployed app runs outside this sandbox and doesn't need it.
import { setGlobalDispatcher, ProxyAgent } from "undici";
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

import { getProvider, type ProviderName } from "../lib/providers";
import type { Provider, OutputKind } from "../lib/providers/types";
import { getModelOption, buildProviderInput } from "../lib/models";

const DEFAULT_PROMPT =
  "A minimalist dark-mode dashboard UI mockup, clean typography, blue accent";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SpikeTarget {
  provider: Provider;
  model: string;
  taskType: string;
  input: Record<string, unknown>;
  outputKind?: OutputKind;
}

function parseTarget(argv: string[]): SpikeTarget {
  // Raw mode: --provider fal --model fal-ai/flux/schnell --input '{...}'
  // for spiking a candidate that isn't in lib/models.ts yet.
  if (argv[0] === "--provider") {
    const flags: Record<string, string> = {};
    for (let i = 0; i < argv.length; i += 2) {
      flags[argv[i].replace(/^--/, "")] = argv[i + 1] ?? "";
    }
    if (!flags.provider || !flags.model) {
      console.error("Raw mode needs --provider and --model (and usually --input '{...}')");
      process.exit(1);
    }
    return {
      provider: getProvider(flags.provider as ProviderName),
      model: flags.model,
      taskType: flags["task-type"] ?? "",
      input: flags.input ? JSON.parse(flags.input) : { prompt: DEFAULT_PROMPT },
      outputKind: (flags["output-kind"] as OutputKind) || undefined,
    };
  }

  // Registered mode: spike an existing lib/models.ts entry by id.
  const [modelId, ...rest] = argv;
  const option = getModelOption(modelId ?? "flux-schnell");
  if (!option) {
    console.error(`Unknown model id: ${modelId} — check lib/models.ts`);
    process.exit(1);
  }
  const overrides: Record<string, string> = {};
  for (const arg of rest) {
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    overrides[arg.slice(0, eq)] = arg.slice(eq + 1);
  }
  const promptField = option.fields.find((f) => f.type === "prompt");
  const values: Record<string, unknown> = { ...overrides };
  if (promptField && !values[promptField.key]) {
    values[promptField.key] = DEFAULT_PROMPT;
  }
  return {
    provider: getProvider(option.provider),
    model: option.model,
    taskType: option.taskType,
    input: buildProviderInput(option, values),
    outputKind: option.outputKind,
  };
}

async function main() {
  const target = parseTarget(process.argv.slice(2));

  console.log(`Creating task: model=${target.model} task_type=${target.taskType}`);
  console.log("input:", JSON.stringify(target.input, null, 2));

  const { taskId } = await target.provider.createTask({
    model: target.model,
    taskType: target.taskType,
    input: target.input,
  });
  console.log("task_id:", taskId);

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const result = await target.provider.getTask(taskId, target.outputKind);
    console.log(`[${i}] status:`, result.status);
    if (result.status === "completed") {
      console.log("output url:", result.outputUrl);
      return;
    }
    if (result.status === "failed") {
      console.error("failed:", result.error);
      process.exit(1);
    }
  }
  console.error("timed out waiting for completion");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
