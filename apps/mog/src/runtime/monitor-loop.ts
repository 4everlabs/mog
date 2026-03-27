import type { ResearchToolServices } from "../tools/research/types.ts";
import type { RuntimeStore } from "./store.ts";

export interface SourceRefreshPlan {
  sourceId: string;
  intervalMs: number;
}

export interface MonitorLoopConfig {
  store: RuntimeStore;
  researchService: ResearchToolServices | null;
  refreshPlans: SourceRefreshPlan[];
}

export class MonitorLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private lastRefreshBySource = new Map<string, number>();

  constructor(private config: MonitorLoopConfig) {}

  private getTickIntervalMs(): number {
    const intervals = this.config.refreshPlans.map((plan) => plan.intervalMs);
    return intervals.length > 0 ? Math.min(...intervals) : 60000;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.config.store.addEvent({
      kind: "monitor",
      level: "info",
      source: "runtime.monitor",
      message: "monitor loop started",
      details: {
        planCount: this.config.refreshPlans.length,
        tickIntervalMs: this.getTickIntervalMs(),
      },
    });
    this.tick().catch(() => {});
    this.timer = setInterval(() => this.tick().catch(() => {}), this.getTickIntervalMs());
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.config.store.addEvent({
      kind: "monitor",
      level: "info",
      source: "runtime.monitor",
      message: "monitor loop stopped",
      details: {
        planCount: this.config.refreshPlans.length,
      },
    });
  }

  async tick(): Promise<void> {
    this.config.store.setStatus("monitoring", {
      source: "runtime.monitor",
      message: "monitor tick started",
      details: {
        planCount: this.config.refreshPlans.length,
      },
    });

    try {
      if (!this.config.researchService) {
        return;
      }

      const now = Date.now();

      for (const plan of this.config.refreshPlans) {
        const lastRefreshAt = this.lastRefreshBySource.get(plan.sourceId) ?? 0;
        if (now - lastRefreshAt < plan.intervalMs) {
          continue;
        }

        const result = await this.config.researchService.refreshSource({
          sourceId: plan.sourceId,
          force: false,
        });
        this.lastRefreshBySource.set(plan.sourceId, now);

        this.config.store.addEvent({
          kind: "monitor",
          level: result?.success ? "info" : "warning",
          source: "runtime.monitor",
          message: result?.success
            ? `refreshed source ${plan.sourceId}`
            : `refresh failed for ${plan.sourceId}`,
          details: {
            sourceId: plan.sourceId,
            intervalMs: plan.intervalMs,
            success: result?.success ?? false,
            newEntriesFound: result?.newEntriesFound ?? 0,
            totalCached: result?.totalCached ?? 0,
            lastUpdated: result?.lastUpdated,
          },
        });
      }
    } catch (error) {
      this.config.store.addEvent({
        kind: "monitor",
        level: "error",
        source: "runtime.monitor",
        message: "monitor tick crashed",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.config.store.setStatus("idle", {
        source: "runtime.monitor",
        message: "monitor tick complete",
      });
    }
  }
}
