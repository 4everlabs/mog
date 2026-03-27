import type { GatewayBootstrap, FindingSummary, RuntimeView, ThreadSummary, ToolSummary } from "@mog/types";
import type { MogEnvironment } from "../runtime/config.ts";
import type { RuntimeRepository } from "../runtime/state/repository.ts";
import type { Finding, Thread } from "@mog/types";

export const projectThreadSummary = (thread: Thread): ThreadSummary => ({
  id: thread.id,
  channel: thread.channel,
  externalId: thread.externalId,
  title: thread.title,
  messageCount: thread.messages.length,
  updatedAt: thread.updatedAt,
});

export const projectFindingSummary = (finding: Finding): FindingSummary => ({
  id: finding.id,
  severity: finding.severity,
  category: finding.category,
  message: finding.message,
  acknowledged: finding.acknowledged,
});

export const projectRuntimeView = (repository: RuntimeRepository): RuntimeView =>
  repository.readState();

export const buildGatewayBootstrap = (
  env: MogEnvironment,
  repository: RuntimeRepository,
  availableTools: ToolSummary[],
): GatewayBootstrap => ({
  appName: env.appName,
  workspacePath: env.workspacePath,
  status: repository.getStatus(),
  tools: env.tools as Record<string, unknown>,
  availableTools,
  threads: repository.listThreads().map(projectThreadSummary),
  findings: repository.listFindings().map(projectFindingSummary),
});
