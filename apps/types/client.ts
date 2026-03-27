import type { RuntimeEvent } from "./events.ts";
import type {
  FindingSummary,
  GatewayBootstrap,
  RuntimeView,
  SendMessageParams,
  SendMessageResponse,
  ThreadSummary,
} from "./gateway.ts";
import type { Thread } from "./threads.ts";
import type { ToolExecutionResult } from "./tools.ts";

export interface GatewayClient {
  bootstrap(): Promise<GatewayBootstrap>;
  readState(): Promise<RuntimeView>;
  listThreads(): Promise<ThreadSummary[]>;
  listFindings(): Promise<FindingSummary[]>;
  listEvents(): Promise<RuntimeEvent[]>;
  getThread(threadId: string): Promise<Thread | null>;
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;
  executeTool(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult>;
  executeResearchTool(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult>;
  subscribe(listener: (view: RuntimeView) => void): () => void;
}
