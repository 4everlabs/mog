import { twitterTools } from "./tool-definitions.ts";
import type { IntegrationCapabilitySnapshot } from "../../tools/research/types.ts";
import type { TwitterToolExecutionServices } from "./tool-types.ts";

const registeredTools = [...twitterTools];

const toolMap = new Map<string, (typeof registeredTools)[number]>(
  registeredTools.map((tool) => [tool.name, tool]),
);

export const listTwitterTools = () => registeredTools;

export const getTwitterTool = (toolName: string) => toolMap.get(toolName) ?? null;

export const resolveEnabledTwitterTools = (
  capabilities: IntegrationCapabilitySnapshot,
) => registeredTools.filter((tool) => tool.implemented && tool.isEnabled(capabilities));

export const executeTwitterTool = async (
  toolName: string,
  services: TwitterToolExecutionServices,
  input: unknown,
): Promise<unknown> => {
  const tool = getTwitterTool(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  if (!tool.implemented) {
    throw new Error(`Tool not implemented: ${toolName}`);
  }

  if (!tool.isEnabled({
    twitter: services.twitter ? { enabled: true } : undefined,
  } as IntegrationCapabilitySnapshot)) {
    throw new Error(`Tool not enabled: ${toolName}`);
  }

  if (tool.execute) {
    return tool.execute({ twitter: services.twitter }, input);
  }

  throw new Error(`Tool has no execute function: ${toolName}`);
};

export const buildTwitterToolSummaries = (
  capabilities: IntegrationCapabilitySnapshot,
): Array<{
  name: string;
  title: string;
  description: string;
  integration: string;
  approvalRequired: boolean;
  implemented: boolean;
}> =>
  resolveEnabledTwitterTools(capabilities).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    integration: tool.integration,
    approvalRequired: tool.approvalRequired,
    implemented: tool.implemented,
  }));
