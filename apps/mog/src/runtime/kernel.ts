import type { MogEnvironment } from "./config.ts";
import type { MonitorLoop } from "./monitor-loop.ts";

export class RuntimeKernel {
  private started = false;

  constructor(
    private env: MogEnvironment,
    private monitorLoop: MonitorLoop,
  ) {}

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    if (this.env.twitter.enabled || this.env.rss.enabled) {
      this.monitorLoop.start();
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.monitorLoop.stop();
  }

  isRunning(): boolean {
    return this.started;
  }
}
