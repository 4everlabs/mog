import { RssResearchProvider } from "../integrations/rss/provider.ts";
import { TwitterResearchProvider } from "../integrations/twitter/provider.ts";
import { GatewayService } from "../gateway/service.ts";
import { ResearchService } from "../research/service.ts";
import { loadEnvironment } from "./config.ts";
import { RuntimeKernel } from "./kernel.ts";
import { MonitorLoop, type SourceRefreshPlan } from "./monitor-loop.ts";
import { RuntimeRepository } from "./state/repository.ts";
import type { RuntimeChannel } from "@mog/types";

export interface MogRuntime {
  env: Awaited<ReturnType<typeof loadEnvironment>>;
  repository: RuntimeRepository;
  gateway: GatewayService;
  monitorLoop: MonitorLoop;
  kernel: RuntimeKernel;
  researchService: ResearchService;
}

export async function bootstrap(): Promise<MogRuntime> {
  const env = await loadEnvironment();

  const repository = new RuntimeRepository({
    instanceId: env.instanceId,
  });
  repository.load();
  repository.setStatus("booting", {
    source: "runtime.bootstrap",
    message: `bootstrapping ${env.appName}`,
    details: {
      instanceId: env.instanceId,
      workspacePath: env.workspacePath,
      channels: env.channels,
      executionMode: env.executionMode,
    },
    emitWhenUnchanged: true,
  });

  const twitterProvider = env.twitter.enabled
    ? new TwitterResearchProvider(undefined, env.twitter.defaultLimit, env.twitter.sources)
    : null;
  const rssProvider = env.rss.enabled
    ? new RssResearchProvider(undefined, env.rss.defaultLimit, env.rss.sources)
    : null;

  const researchService = new ResearchService({
    rssProvider,
    twitterProvider,
  });

  const gateway = new GatewayService(env, repository, researchService);

  const refreshPlans: SourceRefreshPlan[] = [
    ...env.twitter.sources.map((source) => ({
      sourceId: source.id,
      intervalMs: env.twitter.refreshIntervalMs,
    })),
    ...env.rss.sources.map((source) => ({
      sourceId: source.id,
      intervalMs: env.rss.refreshIntervalMs,
    })),
  ];

  const monitorLoop = new MonitorLoop({
    repository,
    researchService,
    refreshPlans,
  });
  const kernel = new RuntimeKernel(env, monitorLoop);

  for (const channel of env.channels) {
    if (channel !== "system") {
      repository.ensureDefaultThread(channel as Exclude<RuntimeChannel, "system">);
    }
  }

  repository.setStatus("idle", {
    source: "runtime.bootstrap",
    message: `${env.appName} runtime ready`,
    details: {
      channels: env.channels,
      researchEnabled: env.researchEnabled,
      threadCount: repository.listThreads().length,
    },
  });

  return { env, repository, gateway, monitorLoop, kernel, researchService };
}
