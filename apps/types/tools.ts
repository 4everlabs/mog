export interface ToolExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  workspaceFile?: string;
}

export interface ToolSummary {
  name: string;
  title: string;
  description: string;
  integration: string;
  approvalRequired: boolean;
  implemented: boolean;
}
