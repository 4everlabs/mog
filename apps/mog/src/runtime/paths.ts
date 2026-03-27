import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchSourceProvider } from "../research/types.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export const getInstanceId = (): string => process.env["MOG_INSTANCE_ID"] ?? "example-instance";

export const resolveRepoPath = (...segments: string[]): string => resolve(repoRoot, ...segments);

export const resolveRuntimePath = (...segments: string[]): string =>
  resolve(appRoot, ".runtime", ...segments);

export const resolveInstanceWorkspacePath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "workspace");

export const resolveInstanceStoragePath = (instanceId: string = getInstanceId()): string =>
  resolveRuntimePath("instances", instanceId, "workspace", "storage");

export const resolveResearchProviderStoragePath = (
  provider: ResearchSourceProvider,
  instanceId: string = getInstanceId(),
): string => resolveRuntimePath("instances", instanceId, "workspace", "storage", provider);
