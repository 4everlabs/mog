import { researchTools } from "./definitions.ts";
import type { AnyRegisteredTool, IntegrationCapabilitySnapshot, ToolExecutionServices } from "./types.ts";

const registeredTools: readonly AnyRegisteredTool[] = [
  ...researchTools,
];

const toolMap = new Map<string, AnyRegisteredTool>(
  registeredTools.map((tool) => [tool.name, tool]),
);

export const listRegisteredTools = (): readonly AnyRegisteredTool[] => registeredTools;

export const getRegisteredTool = (toolName: string): AnyRegisteredTool | null =>
  toolMap.get(toolName) ?? null;

export const resolveEnabledTools = (
  capabilities: IntegrationCapabilitySnapshot,
): readonly AnyRegisteredTool[] =>
  registeredTools.filter((tool) => tool.implemented && tool.isEnabled(capabilities));

export const executeTool = async (
  toolName: string,
  services: ToolExecutionServices,
  input: unknown,
): Promise<unknown> => {
  const tool = getRegisteredTool(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  if (!tool.implemented) {
    throw new Error(`Tool not implemented: ${toolName}`);
  }

  if (!tool.isEnabled({
    research: services.research ? { enabled: true } : undefined,
  } as IntegrationCapabilitySnapshot)) {
    throw new Error(`Tool not enabled: ${toolName}`);
  }

  if (tool.execute) {
    return tool.execute({ research: services.research }, input);
  }

  throw new Error(`Tool has no execute function: ${toolName}`);
};

export const buildToolSummaries = (
  capabilities: IntegrationCapabilitySnapshot,
): Array<{
  name: string;
  title: string;
  description: string;
  integration: string;
  approvalRequired: boolean;
  implemented: boolean;
}> =>
  resolveEnabledTools(capabilities).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    integration: tool.integration,
    approvalRequired: tool.approvalRequired,
    implemented: tool.implemented,
  }));
