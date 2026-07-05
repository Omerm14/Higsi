// Live model-verification spike: exercise PiApiProvider against real PiAPI
// credentials for any candidate model in lib/models.ts before trusting its
// model/task_type strings. PiAPI's docs have repeatedly been stale (GPT
// Image, old Nano Banana) — this is what catches that before it ships.
//
// Usage: npx tsx scripts/piapi-spike.ts <modelId> [key=value ...]
// Example: npx tsx scripts/piapi-spike.ts flux-schnell aspectRatio=1:1
//          npx tsx scripts/piapi-spike.ts seedance-fast prompt="a dog running" duration=5
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

import { PiApiProvider } from "../lib/providers/piapi";
import { getModelOption, buildPiApiInput } from "../lib/models";

const DEFAULT_PROMPT =
  "A minimalist dark-mode dashboard UI mockup, clean typography, blue accent";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]): { modelId: string; overrides: Record<string, string> } {
  const [modelId, ...rest] = argv;
  const overrides: Record<string, string> = {};
  for (const arg of rest) {
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    overrides[arg.slice(0, eq)] = arg.slice(eq + 1);
  }
  return { modelId: modelId ?? "flux-schnell", overrides };
}

async function main() {
  const { modelId, overrides } = parseArgs(process.argv.slice(2));
  const option = getModelOption(modelId);
  if (!option) {
    console.error(`Unknown model id: ${modelId}`);
    console.error("Available ids: run `node -e \"require('./lib/models')\"` or check lib/models.ts");
    process.exit(1);
  }

  const promptField = option.fields.find((f) => f.type === "prompt");
  const values: Record<string, unknown> = { ...overrides };
  if (promptField && !values[promptField.key]) {
    values[promptField.key] = DEFAULT_PROMPT;
  }

  const input = buildPiApiInput(option, values);
  const provider = new PiApiProvider();
  console.log(`Creating task: model=${option.model} task_type=${option.taskType}`);
  console.log("input:", JSON.stringify(input, null, 2));

  const { taskId } = await provider.createTask({
    model: option.model,
    taskType: option.taskType,
    input,
  });
  console.log("task_id:", taskId);

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const result = await provider.getTask(taskId, option.outputKind);
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
