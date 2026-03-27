import { RssResearchProvider } from "../integrations/rss/provider.ts";
import { TwitterResearchProvider } from "../integrations/twitter/provider.ts";
import { ResearchService } from "../research/service.ts";
import { loadEnvironment } from "./config.ts";
import { Gateway } from "./gateway.ts";
import { MonitorLoop, type SourceRefreshPlan } from "./monitor-loop.ts";
import { RuntimeStore } from "./store.ts";

export interface MogRuntime {
  env: Awaited<ReturnType<typeof loadEnvironment>>;
  store: RuntimeStore;
  gateway: Gateway;
  monitorLoop: MonitorLoop;
  researchService: ResearchService;
}

export async function bootstrap(): Promise<MogRuntime> {
  const env = await loadEnvironment();

  const store = new RuntimeStore(env.storagePath);
  store.load();
  store.setStatus("booting");

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

  const gateway = new Gateway(env, store, researchService);

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
    store,
    researchService,
    refreshPlans,
  });

  for (const channel of env.channels) {
    if (channel !== "system") {
      store.ensureDefaultThread(channel as "cli" | "telegram" | "web");
    }
  }

  store.setStatus("idle");

  return { env, store, gateway, monitorLoop, researchService };
}
