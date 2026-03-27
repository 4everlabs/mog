import type { ZodTypeAny } from "zod";
import type {
  ResearchListSourcesInput,
  ResearchListSourcesResult,
  ResearchReadSourceInput,
  ResearchReadSourceResult,
  ResearchRefreshSourceInput,
  ResearchRefreshSourceResult,
  ResearchRegisterSourceInput,
  ResearchRegisterSourceResult,
} from "./schema.ts";

export interface ResearchToolServices {
  listSources(input: ResearchListSourcesInput): Promise<ResearchListSourcesResult>;
  readSource(input: ResearchReadSourceInput): Promise<ResearchReadSourceResult>;
  refreshSource(input: ResearchRefreshSourceInput): Promise<ResearchRefreshSourceResult>;
  registerSource(input: ResearchRegisterSourceInput): Promise<ResearchRegisterSourceResult>;
}

export interface IntegrationCapabilitySnapshot {
  research?: {
    enabled: boolean;
    providers?: {
      rss?: boolean;
      twitter?: boolean;
    };
  };
  runtime?: Record<string, unknown>;
  shell?: {
    enabled?: boolean;
    execute?: boolean;
  };
}

export interface RegisteredTool<TInputSchema extends ZodTypeAny = ZodTypeAny, TOutputSchema extends ZodTypeAny = ZodTypeAny> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly integration: "research" | "runtime" | "shell";
  readonly approvalRequired: boolean;
  readonly implemented: boolean;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
  isEnabled(capabilities: IntegrationCapabilitySnapshot): boolean;
  execute?(services: ToolExecutionServices, input: unknown): Promise<unknown>;
}

export type AnyRegisteredTool = RegisteredTool<ZodTypeAny, ZodTypeAny>;

export interface ToolExecutionServices {
  readonly research: ResearchToolServices | null;
  readonly runtime?: Record<string, unknown> | null;
  readonly shell?: { execute: (cmd: string) => { output: string } } | null;
}

export interface ToolSummary {
  name: string;
  title: string;
  description: string;
  integration: string;
  approvalRequired: boolean;
  implemented: boolean;
}
