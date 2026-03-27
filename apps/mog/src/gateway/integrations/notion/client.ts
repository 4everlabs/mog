import type { IntegrationHealthView } from "@clog/types";
import type { NotionRuntimeConfig } from "../../../runtime/config.ts";

export class NotionIntegrationClient {
  constructor(private readonly config: NotionRuntimeConfig) {}

  async getHealth(): Promise<IntegrationHealthView> {
    const ready = Boolean(this.config.token);
    return {
      kind: "notion",
      status: ready ? "ready" : "missing-config",
      summary: ready
        ? `Notion todo reader is configured for "${this.config.todoSearchTitle}".`
        : "Notion todo reader is missing NOTION_SECRET.",
      lastCheckedAt: Date.now(),
    };
  }
}
