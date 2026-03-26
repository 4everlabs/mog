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
    this.tick().catch(() => {});
    this.timer = setInterval(() => this.tick().catch(() => {}), this.getTickIntervalMs());
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    this.config.store.setStatus("monitoring");

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

        await this.config.researchService.refreshSource({
          sourceId: plan.sourceId,
          force: false,
        });
        this.lastRefreshBySource.set(plan.sourceId, now);
      }
    } catch {
    } finally {
      this.config.store.setStatus("idle");
    }
  }
}
