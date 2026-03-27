import type { RuntimeEvent, RuntimeStatus } from "./events.ts";
import type { Finding, FindingSeverity } from "./findings.ts";
import type { Thread, ThreadMessage, RuntimeChannel } from "./threads.ts";
import type { ToolSummary } from "./tools.ts";

export type GatewayToolsConfig = Record<string, unknown>;

export interface ThreadSummary {
  id: string;
  channel: RuntimeChannel;
  externalId?: string;
  title?: string;
  messageCount: number;
  updatedAt: string;
}

export interface FindingSummary {
  id: string;
  severity: FindingSeverity;
  category: string;
  message: string;
  acknowledged: boolean;
}

export interface RuntimeView {
  status: RuntimeStatus;
  threads: Thread[];
  findings: Finding[];
  events: RuntimeEvent[];
}

export interface GatewayBootstrap {
  appName: string;
  workspacePath: string;
  status: RuntimeStatus;
  tools: GatewayToolsConfig;
  availableTools: ToolSummary[];
  threads: ThreadSummary[];
  findings: FindingSummary[];
}

export interface SendMessageParams {
  channel: RuntimeChannel;
  threadId?: string;
  externalId?: string;
  title?: string;
  message: string;
}

export interface SendMessageResponse {
  thread: Pick<Thread, "id" | "channel" | "title" | "externalId">;
  replyMessage: Pick<ThreadMessage, "content">;
}
