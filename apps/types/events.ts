export type RuntimeStatus = "booting" | "idle" | "monitoring" | "error";

export type RuntimeEventKind =
  | "status"
  | "thread"
  | "message"
  | "finding"
  | "tool"
  | "monitor"
  | "system";

export type RuntimeEventLevel = "debug" | "info" | "warning" | "error";

export interface RuntimeEvent {
  id: string;
  kind: RuntimeEventKind;
  level: RuntimeEventLevel;
  source: string;
  message: string;
  timestamp: string;
  correlationId?: string;
  threadId?: string;
  toolName?: string;
  artifactPath?: string;
  sourceId?: string;
  channel?: string;
  details?: Record<string, unknown>;
}
