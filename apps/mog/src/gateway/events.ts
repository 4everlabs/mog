import type { RuntimeView, ToolExecutionResult } from "@mog/types";
import type { RuntimeRepository } from "../runtime/state/repository.ts";

export const emitToolExecutionEvent = (
  repository: RuntimeRepository,
  payload: {
    toolName: string;
    input: unknown;
    result: ToolExecutionResult;
    source?: string;
  },
): void => {
  const details: Record<string, unknown> = {
    input: payload.input,
  };

  if (payload.result.workspaceFile) {
    details["workspaceFile"] = payload.result.workspaceFile;
  }

  if (!payload.result.success && payload.result.error) {
    details["error"] = payload.result.error;
  }

  if (payload.result.success && !payload.result.workspaceFile && payload.result.output !== undefined) {
    details["output"] = payload.result.output;
  }

  repository.addEvent({
    kind: "tool",
    level: payload.result.success ? "info" : "error",
    source: payload.source ?? "runtime.gateway",
    message: payload.result.success
      ? `tool ${payload.toolName} completed`
      : `tool ${payload.toolName} failed`,
    toolName: payload.toolName,
    artifactPath: payload.result.workspaceFile,
    details,
  });
};

export const subscribeToRuntime = (
  repository: RuntimeRepository,
  listener: (view: RuntimeView) => void,
): (() => void) => {
  const handleChange = () => {
    listener(repository.readState());
  };

  repository.on("change", handleChange);
  return () => repository.off("change", handleChange);
};
