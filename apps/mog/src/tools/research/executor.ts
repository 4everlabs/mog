import { mkdir } from "node:fs/promises";
import { buildToolSummaries, getRegisteredTool } from "./registry.ts";
import type { IntegrationCapabilitySnapshot, ResearchToolServices } from "./types.ts";

export interface ToolExecutorConfig {
  researchService: ResearchToolServices | null;
  capabilities?: IntegrationCapabilitySnapshot;
  workspacePath?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  workspaceFile?: string;
}

export class ToolExecutor {
  private researchServices: ResearchToolServices | null = null;
  private capabilities: IntegrationCapabilitySnapshot;
  private workspacePath: string | null;

  constructor(private config: ToolExecutorConfig) {
    this.researchServices = config.researchService;
    this.capabilities = config.capabilities ?? {
      research: config.researchService ? { enabled: true } : undefined,
    };
    this.workspacePath = config.workspacePath ?? null;
  }

  private sanitizeFileSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "result";
  }

  private async writeWorkspaceArtifact(
    toolName: string,
    input: unknown,
    output: unknown,
  ): Promise<string | undefined> {
    if (!this.workspacePath) {
      return undefined;
    }

    const sourceId =
      typeof input === "object" &&
      input !== null &&
      "sourceId" in input &&
      typeof (input as { sourceId?: unknown }).sourceId === "string"
        ? (input as { sourceId: string }).sourceId
        : null;

    const suffix = sourceId ? `-${this.sanitizeFileSegment(sourceId)}` : "";
    const directory = `${this.workspacePath}/research`;
    const filePath = `${directory}/${toolName}${suffix}.json`;
    const payload = {
      toolName,
      executedAt: new Date().toISOString(),
      input,
      output,
    };

    await mkdir(directory, { recursive: true });
    await Bun.write(filePath, JSON.stringify(payload, null, 2));

    return filePath;
  }

  async execute(toolName: string, input: unknown): Promise<ToolExecutionResult> {
    const tool = getRegisteredTool(toolName);

    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolName}` };
    }

    if (!tool.implemented) {
      return { success: false, error: `Tool not implemented: ${toolName}` };
    }

    if (!tool.isEnabled(this.capabilities)) {
      return { success: false, error: `Tool not enabled: ${toolName}` };
    }

    try {
      const parsedInput = tool.inputSchema.safeParse(input);
      if (!parsedInput.success) {
        return {
          success: false,
          error: parsedInput.error.issues.map((issue) => issue.message).join("; "),
        };
      }

      if (!tool.execute) {
        return { success: false, error: `Tool has no execute function: ${toolName}` };
      }

      const rawOutput = await tool.execute({ research: this.researchServices }, parsedInput.data);
      const parsedOutput = tool.outputSchema.safeParse(rawOutput);

      if (!parsedOutput.success) {
        return {
          success: false,
          error: parsedOutput.error.issues.map((issue) => issue.message).join("; "),
        };
      }

      const workspaceFile =
        tool.integration === "research"
          ? await this.writeWorkspaceArtifact(tool.name, parsedInput.data, parsedOutput.data)
          : undefined;

      return { success: true, output: parsedOutput.data, workspaceFile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  listEnabledTools(): Array<{
    name: string;
    title: string;
    description: string;
    integration: string;
    approvalRequired: boolean;
    implemented: boolean;
  }> {
    return buildToolSummaries(this.capabilities);
  }
}
