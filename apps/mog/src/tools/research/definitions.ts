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
import type { IntegrationCapabilitySnapshot, RegisteredTool, ResearchToolServices } from "./types.ts";

export const researchTools = [
  {
    name: "research_list_sources",
    title: "Research List Sources",
    description: "List all registered research sources that can be read or refreshed by the model.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchListSourcesInputSchema,
    outputSchema: ResearchListSourcesResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.research?.enabled ?? false;
    },
    execute(services: { research: ResearchToolServices | null }, input: z.infer<typeof ResearchListSourcesInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.listSources(input);
    },
  },
  {
    name: "research_read_source",
    title: "Research Read Source",
    description: "Read normalized research entries for a registered source from local cache.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchReadSourceInputSchema,
    outputSchema: ResearchReadSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.research?.enabled ?? false;
    },
    execute(services: { research: ResearchToolServices | null }, input: z.infer<typeof ResearchReadSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.readSource(input);
    },
  },
  {
    name: "research_refresh_source",
    title: "Research Refresh Source",
    description: "Refresh a registered research source and cache newly discovered entries.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchRefreshSourceInputSchema,
    outputSchema: ResearchRefreshSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.research?.enabled ?? false;
    },
    execute(services: { research: ResearchToolServices | null }, input: z.infer<typeof ResearchRefreshSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.refreshSource(input);
    },
  },
  {
    name: "research_register_source",
    title: "Research Register Source",
    description: "Register a new research source so it can be read and refreshed through the shared research tool surface.",
    integration: "research" as const,
    approvalRequired: false,
    implemented: true,
    inputSchema: ResearchRegisterSourceInputSchema,
    outputSchema: ResearchRegisterSourceResultSchema,
    isEnabled(capabilities: IntegrationCapabilitySnapshot) {
      return capabilities.research?.enabled ?? false;
    },
    execute(services: { research: ResearchToolServices | null }, input: z.infer<typeof ResearchRegisterSourceInputSchema>) {
      if (!services.research) {
        throw new Error("Research services are unavailable");
      }
      return services.research.registerSource(input);
    },
  },
] as const satisfies readonly RegisteredTool<ZodTypeAny, ZodTypeAny>[];
