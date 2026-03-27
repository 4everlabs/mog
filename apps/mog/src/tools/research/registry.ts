import { researchTools } from "./definitions.ts";
import type { ToolSummary } from "@mog/types";
import type {
  AnyRegisteredTool,
  IntegrationCapabilitySnapshot,
  ToolExecutionServices,
} from "./types.ts";

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

const getEnabledResearchProviders = (capabilities: IntegrationCapabilitySnapshot): string[] => {
  const enabledProviders: string[] = [];

  if (capabilities.research?.providers?.rss) {
    enabledProviders.push("RSS");
  }

  if (capabilities.research?.providers?.twitter) {
    enabledProviders.push("Twitter/X");
  }

  return enabledProviders;
};

const getSummaryTitle = (
  tool: AnyRegisteredTool,
  capabilities: IntegrationCapabilitySnapshot,
): string => {
  if (tool.name !== "research_register_source") {
    return tool.title;
  }

  const enabledProviders = getEnabledResearchProviders(capabilities);
  if (enabledProviders.length === 0) {
    return tool.title;
  }

  return `${tool.title} (${enabledProviders.join(" or ")})`;
};

const getSummaryDescription = (
  tool: AnyRegisteredTool,
  capabilities: IntegrationCapabilitySnapshot,
): string => {
  if (tool.name !== "research_register_source") {
    return tool.description;
  }

  const enabledProviders = getEnabledResearchProviders(capabilities);
  if (enabledProviders.length === 0) {
    return tool.description;
  }

  if (enabledProviders.length === 1) {
    return `Use when you need to add a new ${enabledProviders[0]} research source so future read and refresh calls can use it by sourceId.`;
  }

  return `Use when you need to add a new ${enabledProviders.join(" or ")} research source so future read and refresh calls can use it by sourceId.`;
};

export const executeTool = async (
  toolName: string,
  services: ToolExecutionServices,
  input: unknown,
  capabilities?: IntegrationCapabilitySnapshot,
): Promise<unknown> => {
  const tool = getRegisteredTool(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  if (!tool.implemented) {
    throw new Error(`Tool not implemented: ${toolName}`);
  }

  const resolvedCapabilities = capabilities ?? {
    research: services.research ? { enabled: true } : undefined,
  };

  if (!tool.isEnabled(resolvedCapabilities)) {
    throw new Error(`Tool not enabled: ${toolName}`);
  }

  if (tool.execute) {
    return tool.execute(services, input);
  }

  throw new Error(`Tool has no execute function: ${toolName}`);
};

export const buildToolSummaries = (
  capabilities: IntegrationCapabilitySnapshot,
): ToolSummary[] =>
  resolveEnabledTools(capabilities).map((tool) => ({
    name: tool.name,
    title: getSummaryTitle(tool, capabilities),
    description: getSummaryDescription(tool, capabilities),
    integration: tool.integration,
    approvalRequired: tool.approvalRequired,
    implemented: tool.implemented,
  }));
