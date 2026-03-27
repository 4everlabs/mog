export type { GatewayClient } from "./client.ts";
export type {
  FindingSummary,
  GatewayBootstrap,
  GatewayToolsConfig,
  RuntimeView,
  SendMessageParams,
  SendMessageResponse,
  ThreadSummary,
} from "./gateway.ts";
export type { RuntimeEvent, RuntimeEventKind, RuntimeEventLevel, RuntimeStatus } from "./events.ts";
export type { Finding, FindingSeverity } from "./findings.ts";
export type { RuntimeChannel, Thread, ThreadMessage, ThreadMessageRole } from "./threads.ts";
export type { ToolExecutionResult, ToolSummary } from "./tools.ts";
export type RuntimeBootstrap = {
  env: {
    telegram?: {
      botToken?: string;
      userName?: string;
      allowedChatIds?: readonly number[];
    };
    [key: string]: unknown;
  };
  gateway: {
    sendMessage: (params: {
      channel: string;
      title?: string;
      threadId?: string;
      message: string;
    }) => Promise<{
      thread: { id: string };
      replyMessage: { content: string };
    }>;
  };
  store: {
    listThreads: () => Array<{ id: string; channel: string; title?: string }>;
  };
};
