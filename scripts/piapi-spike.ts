// Phase 0 spike: exercise PiApiProvider against real PiAPI credentials.
// Usage: npx tsx scripts/piapi-spike.ts <image|video>
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
import { MODEL_OPTIONS } from "../lib/models";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const kind = process.argv[2] === "video" ? "video" : "image";
  const option = MODEL_OPTIONS.find((m) =>
    kind === "video" ? m.id === "seedance-fast" : m.id === "flux-schnell"
  )!;

  const provider = new PiApiProvider();
  console.log(`Creating ${kind} task: model=${option.model} task_type=${option.taskType}`);

  const { taskId } = await provider.createTask({
    model: option.model,
    taskType: option.taskType,
    prompt:
      kind === "video"
        ? "A calm ocean wave rolling onto a sandy beach at sunset, cinematic, wide shot"
        : "A minimalist dark-mode dashboard UI mockup, clean typography, blue accent",
    duration: option.defaults.duration,
    aspectRatio: option.defaults.aspectRatio,
  });
  console.log("task_id:", taskId);

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const result = await provider.getTask(taskId);
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
