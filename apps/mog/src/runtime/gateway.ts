import { ToolExecutor } from "../tools/research/executor.ts";
import type { ResearchToolServices } from "../tools/research/types.ts";
import type { MogEnvironment, MogToolsConfig } from "./config.ts";
import type { RuntimeStore } from "./store.ts";

export interface SendMessageParams {
  channel: string;
  threadId?: string;
  externalId?: string;
  title?: string;
  message: string;
}

export interface SendMessageResponse {
  thread: { id: string };
  replyMessage: { content: string };
}

export interface GatewaySurface {
  bootstrap(): Promise<{
    appName: string;
    workspacePath: string;
    status: string;
    tools: MogToolsConfig;
    availableTools: Array<{
      name: string;
      title: string;
      description: string;
      integration: string;
      approvalRequired: boolean;
      implemented: boolean;
    }>;
    threads: Array<{ id: string; channel: string; messageCount: number }>;
    findings: Array<{ id: string; severity: string; message: string }>;
  }>;
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;
  listThreads(): Promise<Array<{ id: string; channel: string; messageCount: number }>>;
  listFindings(): Promise<Array<{ id: string; severity: string; message: string }>>;
  executeTool(toolName: string, input: Record<string, unknown>): Promise<{ success: boolean; output?: unknown; error?: string; workspaceFile?: string }>;
  executeResearchTool(toolName: string, input: Record<string, unknown>): Promise<{ success: boolean; output?: unknown; error?: string; workspaceFile?: string }>;
}

export class Gateway implements GatewaySurface {
  private serialQueue = Promise.resolve();
  private toolExecutor: ToolExecutor;

  constructor(
    private env: MogEnvironment,
    private store: RuntimeStore,
    private researchService: ResearchToolServices,
  ) {
    this.toolExecutor = new ToolExecutor({
      researchService,
      capabilities: {
        research: {
          enabled: env.researchEnabled,
          providers: {
            rss: env.rss.enabled,
            twitter: env.twitter.enabled,
          },
        },
      },
      workspacePath: env.workspacePath,
    });
  }

  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.serialQueue.then(fn, fn);
    this.serialQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async bootstrap() {
    return {
      appName: this.env.appName,
      workspacePath: this.env.workspacePath,
      status: this.store.getStatus(),
      tools: this.env.tools,
      availableTools: this.toolExecutor.listEnabledTools(),
      threads: this.store.listThreads().map((thread) => ({
        id: thread.id,
        channel: thread.channel,
        messageCount: thread.messages.length,
      })),
      findings: this.store.listFindings().map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        message: finding.message,
      })),
    };
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    return this.runExclusive(async () => {
      let thread = params.threadId ? this.store.getThread(params.threadId) : null;

      if (!thread && params.externalId) {
        thread = this.store
          .listThreads()
          .find((entry) => entry.externalId === params.externalId && entry.channel === params.channel) ?? null;
      }

      if (!thread) {
        thread = this.store.createThread(params.channel as "cli" | "telegram" | "web", params.externalId, params.title);
      }

      this.store.appendMessage(thread.id, { role: "user", content: params.message });
      const response = await this.generateResponse(params.message);
      this.store.appendMessage(thread.id, { role: "assistant", content: response });

      return { thread: { id: thread.id }, replyMessage: { content: response } };
    });
  }

  private async generateResponse(content: string): Promise<string> {
    const lower = content.toLowerCase();

    if (lower.includes("list") && (lower.includes("source") || lower.includes("research") || lower.includes("rss") || lower.includes("twitter"))) {
      const result = await this.toolExecutor.execute("research_list_sources", {});
      if (result.success && result.output) {
        const output = result.output as { sources?: Array<{ id: string; provider: string; entryCount: number }> };
        if (output.sources?.length) {
          return `Research sources:\n${output.sources.map((source) => `- ${source.id} [${source.provider}] (${source.entryCount} entries)`).join("\n")}`;
        }
      }
      return "No research sources registered yet.";
    }

    return `Got: "${content}". I can help with research sources. Try "list research sources".`;
  }

  async listThreads() {
    return this.store.listThreads().map((thread) => ({
      id: thread.id,
      channel: thread.channel,
      messageCount: thread.messages.length,
    }));
  }

  async listFindings() {
    return this.store.listFindings().map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      message: finding.message,
    }));
  }

  async executeTool(toolName: string, input: Record<string, unknown>) {
    return this.runExclusive(() => this.toolExecutor.execute(toolName, input));
  }

  async executeResearchTool(toolName: string, input: Record<string, unknown>) {
    return this.executeTool(toolName, input);
  }
}
