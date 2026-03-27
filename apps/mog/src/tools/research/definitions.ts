import { z } from "zod";
import type { ZodTypeAny } from "zod";
import {
  ResearchListSourcesInputSchema,
  ResearchListSourcesResultSchema,
  ResearchReadSourceInputSchema,
  ResearchReadSourceResultSchema,
  ResearchRefreshSourceInputSchema,
  ResearchRefreshSourceResultSchema,
  ResearchRegisterSourceInputSchema,
  ResearchRegisterSourceResultSchema,
} from "./schema.ts";
import type { IntegrationCapabilitySnapshot, RegisteredTool } from "./types.ts";

const isResearchEnabled = (capabilities: IntegrationCapabilitySnapshot): boolean =>
  capabilities.research?.enabled ?? false;

const hasAnyResearchProvider = (capabilities: IntegrationCapabilitySnapshot): boolean =>
  Boolean(capabilities.research?.providers?.rss || capabilities.research?.providers?.twitter);

export const researchTools = [
  {
    name: "research_list_sources",
    title: "List Available Research Sources",
    description: "Use when you need to see which research sources are already registered and available to read or refresh.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchListSourcesInputSchema,
    outputSchema: ResearchListSourcesResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return isResearchEnabled(capabilities);
    },
    execute(services, input: z.infer<typeof ResearchListSourcesInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.listSources(input);
    },
  },
  {
    name: "research_read_source",
    title: "Read Entries From One Research Source",
    description: "Use when you already know a sourceId and need its cached research entries, metadata, and last update time.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchReadSourceInputSchema,
    outputSchema: ResearchReadSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return isResearchEnabled(capabilities);
    },
    execute(services, input: z.infer<typeof ResearchReadSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.readSource(input);
    },
  },
  {
    name: "research_refresh_source",
    title: "Refresh One Research Source",
    description: "Use when you need fresh entries from one registered research source and want the local cache updated.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchRefreshSourceInputSchema,
    outputSchema: ResearchRefreshSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return isResearchEnabled(capabilities);
    },
    execute(services, input: z.infer<typeof ResearchRefreshSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.refreshSource(input);
    },
  },
  {
    name: "research_register_source",
    title: "Register A New Research Source",
    description: "Use when you need to add a new RSS feed or Twitter/X account so future read and refresh calls can use it by sourceId.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchRegisterSourceInputSchema,
    outputSchema: ResearchRegisterSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return isResearchEnabled(capabilities) && hasAnyResearchProvider(capabilities);
    },
    execute(services, input: z.infer<typeof ResearchRegisterSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.registerSource(input);
    },
  },
] as const satisfies readonly RegisteredTool<ZodTypeAny, ZodTypeAny>[];
