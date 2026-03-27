import { generateText, stepCountIs, tool as defineTool } from "ai";
import type { Thread } from "@mog/types";
import { loadBrainPromptBundle } from "../brain/prompt-loader.ts";
import type { MogEnvironment } from "../runtime/config.ts";
import type { ToolExecutor } from "../tools/research/executor.ts";
import { listRegisteredTools } from "../tools/research/registry.ts";
import type { ToolSummary } from "@mog/types";

const READ_ONLY_TOOL_NAMES = new Set<string>([
  "research_list_sources",
  "research_read_source",
]);

const hasAiCredentials = (): boolean =>
  Boolean(process.env["VERCEL_OIDC_TOKEN"] || process.env["AI_GATEWAY_API_KEY"]);

const formatThreadTranscript = (
  thread: Thread,
  maxMessages: number,
): Array<{ role: "user" | "assistant"; content: string }> =>
  thread.messages
    .filter((message): message is typeof message & { role: "user" | "assistant" } =>
      message.role === "user" || message.role === "assistant")
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

const getAllowedToolNames = (
  env: MogEnvironment,
  availableTools: ToolSummary[],
): Set<string> => {
  if (env.executionMode === "execute") {
    return new Set(availableTools.map((tool) => tool.name));
  }

  return new Set(
    availableTools
      .filter((tool) => READ_ONLY_TOOL_NAMES.has(tool.name))
      .map((tool) => tool.name),
  );
};

const buildToolCatalog = (
  availableTools: ToolSummary[],
  allowedToolNames: Set<string>,
): string => {
  const catalog = availableTools.map((tool) => {
    const suffix = allowedToolNames.has(tool.name)
      ? "available"
      : "listed for reference only; not executable in this mode";
    return `- ${tool.name}: ${tool.title}. ${tool.description} (${suffix})`;
  });

  return catalog.join("\n");
};

const buildSystemPrompt = async (
  env: MogEnvironment,
  availableTools: ToolSummary[],
  allowedToolNames: Set<string>,
): Promise<string> => {
  const prompts = await loadBrainPromptBundle();
  const providers = [
    env.rss.enabled ? "RSS" : null,
    env.twitter.enabled ? "Twitter/X" : null,
  ].filter(Boolean);

  return [
    prompts.system,
    prompts.project ? `## Product Context\n\n${prompts.project}` : "",
    prompts.primaryMode ? `## Active Mode\n\n${prompts.primaryMode}` : "",
    `## Runtime Execution Mode

- Current execution mode: \`${env.executionMode}\`
- Enabled research providers: ${providers.length > 0 ? providers.join(", ") : "none"}
- Workspace path: \`${env.workspacePath}\`
- If a tool result has \`success: false\`, explain the failure plainly and do not pretend the action succeeded.
- In \`observe\` and \`propose\` modes, only read-only tools are executable. Do not claim you refreshed, registered, or changed anything unless the tool actually ran successfully.`,
    `## Available Tools

${buildToolCatalog(availableTools, allowedToolNames)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const buildDisabledAiResponse = (env: MogEnvironment): string =>
  `AI execution is not configured for this runtime. Set \`AI_GATEWAY_API_KEY\` or \`VERCEL_OIDC_TOKEN\` to enable model-driven replies. Current execution mode is \`${env.executionMode}\`, and research tools remain available through the gateway tool surface.`;

const generateNonAiFallback = async (
  env: MogEnvironment,
  thread: Thread,
  toolExecutor: ToolExecutor,
): Promise<string> => {
  const latestUserMessage = [...thread.messages]
    .reverse()
    .find((message) => message.role === "user");
  const content = latestUserMessage?.content.toLowerCase() ?? "";

  if (
    content.includes("list") &&
    (content.includes("source") ||
      content.includes("research") ||
      content.includes("rss") ||
      content.includes("twitter"))
  ) {
    const result = await toolExecutor.execute("research_list_sources", {});
    if (result.success && result.output) {
      const output = result.output as {
        sources?: Array<{ id: string; provider: string; entryCount: number }>;
      };
      if (output.sources?.length) {
        return `Research sources:\n${output.sources.map((source) => `- ${source.id} [${source.provider}] (${source.entryCount} entries)`).join("\n")}`;
      }
      return "No research sources are registered yet.";
    }
  }

  return buildDisabledAiResponse(env);
};

export const generateGatewayReply = async (
  env: MogEnvironment,
  thread: Thread,
  toolExecutor: ToolExecutor,
): Promise<string> => {
  if (!env.ai.enabled || !hasAiCredentials()) {
    return generateNonAiFallback(env, thread, toolExecutor);
  }

  const availableTools = toolExecutor.listEnabledTools();
  const allowedToolNames = getAllowedToolNames(env, availableTools);
  const registeredTools = listRegisteredTools().filter((tool) => allowedToolNames.has(tool.name));
  const tools = Object.fromEntries(
    registeredTools.map((registeredTool) => [
      registeredTool.name,
      defineTool({
        description: `${registeredTool.title}. ${registeredTool.description}`,
        inputSchema: registeredTool.inputSchema,
        strict: true,
        execute: async (input) => toolExecutor.execute(registeredTool.name, input),
      }),
    ]),
  );

  const result = await generateText({
    model: env.ai.model,
    system: await buildSystemPrompt(env, availableTools, allowedToolNames),
    messages: formatThreadTranscript(thread, env.ai.maxHistoryMessages),
    tools,
    stopWhen: stepCountIs(env.ai.maxSteps),
  });

  const text = result.text.trim();
  if (text.length > 0) {
    return text;
  }

  return "I do not have a useful reply yet.";
};
