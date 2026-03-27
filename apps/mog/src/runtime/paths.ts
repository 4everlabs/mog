import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchSourceProvider } from "../research/types.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export const getInstanceId = (): string => process.env["MOG_INSTANCE_ID"] ?? "example-instance";

export const resolveRepoPath = (...segments: string[]): string => resolve(repoRoot, ...segments);

export const resolveRuntimePath = (...segments: string[]): string =>
  resolve(appRoot, ".runtime", ...segments);

export const resolveInstanceRootPath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId);

export const resolveInstanceWorkspacePath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "workspace");

export const resolveLegacyInstanceStoragePath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "workspace", "storage");

export const resolveInstanceStorageRootPath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "storage");

export const resolveInstanceStoragePath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "storage", "runtime");

export const resolveRuntimeStatePath = (instanceId: string = getInstanceId()): string =>
  resolve(resolveInstanceStoragePath(instanceId), "state.json");

export const resolveRuntimeEventLogPath = (instanceId: string = getInstanceId()): string =>
  resolve(resolveInstanceStoragePath(instanceId), "events.jsonl");

export const resolveRuntimeSnapshotPath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimeStatePath(instanceId);

export const resolveRuntimeMigrationPath = (instanceId: string = getInstanceId()): string =>
  resolve(resolveInstanceStoragePath(instanceId), "migrations.json");

export const resolveResearchProviderStoragePath = (
  provider: ResearchSourceProvider,
  instanceId: string = getInstanceId(),
): string => resolveRuntimePath("instances", instanceId, "storage", "providers", provider);
