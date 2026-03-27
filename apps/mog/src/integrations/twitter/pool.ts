import type { PoolableTool } from "./contracts.ts";

export interface PoolStats {
  total: number;
  available: number;
  inUse: number;
}

export class ToolPool {
  private tools: Map<string, PoolableTool> = new Map();
  private available: Set<string> = new Set();
  private readonly maxPoolSize: number;

  constructor(maxPoolSize = 10) {
    this.maxPoolSize = maxPoolSize;
  }

  register(tool: PoolableTool): void {
    if (this.tools.size >= this.maxPoolSize) {
      throw new Error(`Pool max size (${this.maxPoolSize}) reached`);
    }
    this.tools.set(tool.poolId, tool);
    this.available.add(tool.poolId);
  }

  acquire(poolId: string): PoolableTool | null {
    if (!this.available.has(poolId)) {
      return null;
    }

    const tool = this.tools.get(poolId);
    if (!tool) {
      return null;
    }

    this.available.delete(poolId);
    tool.acquire();
    return tool;
  }

  acquireAny(): PoolableTool | null {
    if (this.available.size === 0) {
      return null;
    }

    const poolId = this.available.values().next().value as string;
    return this.acquire(poolId);
  }

  release(poolId: string): void {
    const tool = this.tools.get(poolId);
    if (tool) {
      tool.release();
      this.available.add(poolId);
    }
  }

  get(poolId: string): PoolableTool | undefined {
    return this.tools.get(poolId);
  }

  has(poolId: string): boolean {
    return this.tools.has(poolId);
  }

  remove(poolId: string): boolean {
    const tool = this.tools.get(poolId);
    if (!tool) {
      return false;
    }

    tool.release();
    this.tools.delete(poolId);
    this.available.delete(poolId);
    return true;
  }

  getStats(): PoolStats {
    return {
      total: this.tools.size,
      available: this.available.size,
      inUse: this.tools.size - this.available.size,
    };
  }

  async updateAll(): Promise<void> {
    const promises = Array.from(this.tools.values()).map(async (tool) => {
      if (tool.update) {
        await tool.update();
      }
    });
    await Promise.all(promises);
  }

  getAvailableIds(): string[] {
    return Array.from(this.available);
  }

  getAllIds(): string[] {
    return Array.from(this.tools.keys());
  }
}

export class ToolRegistry {
  private pool: ToolPool;
  private toolFactory: (poolId: string) => PoolableTool;

  constructor(
    factory: (poolId: string) => PoolableTool,
    maxPoolSize = 10,
  ) {
    this.toolFactory = factory;
    this.pool = new ToolPool(maxPoolSize);
  }

  createPooledTool(id: string): PoolableTool {
    if (this.pool.has(id)) {
      const existing = this.pool.get(id);
      if (existing) {
        return existing;
      }
    }

    const tool = this.toolFactory(id);
    this.pool.register(tool);
    return tool;
  }

  acquire(id: string): PoolableTool | null {
    return this.pool.acquire(id);
  }

  release(id: string): void {
    this.pool.release(id);
  }

  getPool(): ToolPool {
    return this.pool;
  }

  async updateAll(): Promise<void> {
    await this.pool.updateAll();
  }

  getStats(): PoolStats {
    return this.pool.getStats();
  }
}
