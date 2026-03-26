export interface Tool {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
  update?(): Promise<void>;
}

export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  poolable: boolean;
}

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;

  abstract execute(params: Record<string, unknown>): Promise<unknown>;

  update?(): Promise<void>;
}

export interface PoolableTool extends Tool {
  readonly poolId: string;
  acquire(): void;
  release(): void;
  readonly isAcquired: boolean;
}
