import { bootstrap } from "./src/runtime/bootstrap.ts";

async function main() {
  const runtime = await bootstrap();

  console.log(`[mog] Starting ${runtime.env.appName} runtime...`);
  console.log(`[mog] Instance: ${runtime.env.instanceId}`);
  console.log(`[mog] Mode: ${runtime.env.executionMode}`);
  console.log(`[mog] Channels: ${runtime.env.channels.join(", ")}`);

  if (runtime.env.twitter.enabled) {
    console.log(`[mog] Twitter enabled with ${runtime.env.twitter.accounts.length} accounts`);
  }

  if (runtime.env.rss.enabled) {
    console.log(`[mog] RSS enabled with ${runtime.env.rss.feeds.length} feeds`);
  }

  if (runtime.env.twitter.enabled || runtime.env.rss.enabled) {
    runtime.monitorLoop.start();
    console.log("[mog] Monitoring loop started");
  }

  const info = await runtime.gateway.bootstrap();
  console.log(`[mog] Bootstrap complete. Threads: ${info.threads.length}, Findings: ${info.findings.length}`);

  return runtime;
}

main().catch(console.error);