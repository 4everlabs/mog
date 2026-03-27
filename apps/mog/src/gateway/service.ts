import type {
  FindingSummary,
  GatewayBootstrap,
  RuntimeEvent,
  RuntimeView,
  SendMessageParams,
  SendMessageResponse,
  Thread,
  ThreadSummary,
  ToolExecutionResult,
} from "@mog/types";
import { ToolExecutor } from "../tools/research/executor.ts";
import type { ResearchToolServices } from "../tools/research/types.ts";
import type { MogEnvironment } from "../runtime/config.ts";
import type { RuntimeRepository } from "../runtime/state/repository.ts";
import type { GatewaySurface } from "./contracts.ts";
import { generateGatewayReply } from "./execution.ts";
import { emitToolExecutionEvent, subscribeToRuntime } from "./events.ts";
import { buildGatewayBootstrap, projectFindingSummary, projectRuntimeView, projectThreadSummary } from "./projections.ts";
import { resolveMessageThread } from "./sessions.ts";

export class GatewayService implements GatewaySurface {
  private serialQueue = Promise.resolve();
  private toolExecutor: ToolExecutor;

  constructor(
    private env: MogEnvironment,
    private repository: RuntimeRepository,
    researchService: ResearchToolServices | null,
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
      onExecution: ({ toolName, input, result }) => {
        emitToolExecutionEvent(this.repository, {
          toolName,
          input,
          result,
        });
      },
    });
  }

  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.serialQueue.then(fn, fn);
    this.serialQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async bootstrap(): Promise<GatewayBootstrap> {
    return buildGatewayBootstrap(this.env, this.repository, this.toolExecutor.listEnabledTools());
  }

  async readState(): Promise<RuntimeView> {
    return projectRuntimeView(this.repository);
  }

  async listThreads(): Promise<ThreadSummary[]> {
    return this.repository.listThreads().map(projectThreadSummary);
  }

  async listFindings(): Promise<FindingSummary[]> {
    return this.repository.listFindings().map(projectFindingSummary);
  }

  async listEvents(): Promise<RuntimeEvent[]> {
    return this.repository.listEvents();
  }

  async getThread(threadId: string): Promise<Thread | null> {
    return this.repository.getThread(threadId);
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    return this.runExclusive(async () => {
      const thread = resolveMessageThread(this.repository, params);
      this.repository.appendMessage(thread.id, { role: "user", content: params.message });
      const response = await this.generateResponse(thread.id);
      this.repository.appendMessage(thread.id, { role: "assistant", content: response });

      return {
        thread: {
          id: thread.id,
          channel: thread.channel,
          title: thread.title,
          externalId: thread.externalId,
        },
        replyMessage: {
          content: response,
        },
      };
    });
  }

  private async generateResponse(threadId: string): Promise<string> {
    const thread = this.repository.getThread(threadId);
    if (!thread) {
      return "I could not resolve the current conversation thread.";
    }

    try {
      return await generateGatewayReply(this.env, thread, this.toolExecutor);
    } catch (error) {
      return error instanceof Error
        ? `I hit an error while generating a reply: ${error.message}`
        : "I hit an unknown error while generating a reply.";
    }
  }

  async executeTool(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
    return this.runExclusive(() => this.toolExecutor.execute(toolName, input));
  }

  async executeResearchTool(toolName: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
    return this.executeTool(toolName, input);
  }

  subscribe(listener: (view: RuntimeView) => void): () => void {
    return subscribeToRuntime(this.repository, listener);
  }
}

export { GatewayService as Gateway };
