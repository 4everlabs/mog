export type FindingSeverity = "info" | "warning" | "critical";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}
