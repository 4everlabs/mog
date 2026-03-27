import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { RuntimeEvent, RuntimeStatus } from "@mog/types";
import type { Finding } from "@mog/types";
import type { Thread } from "@mog/types";
import type { RuntimeSnapshot } from "./snapshot-store.ts";

interface LegacyRuntimeState {
  status?: RuntimeStatus;
  threads?: Thread[];
  findings?: Finding[];
  events?: RuntimeEvent[];
}

interface RuntimeMigrationRecord {
  version: number;
  name: string;
  appliedAt: string;
}

interface RuntimeMigrationPaths {
  storagePath: string;
  snapshotPath: string;
  eventLogPath: string;
  migrationPath: string;
  legacyRuntimeFilePath: string;
}

const DEFAULT_SNAPSHOT: RuntimeSnapshot = {
  status: "idle",
  threads: [],
  findings: [],
};

const MIGRATION_NAME = "legacy-runtime-json-to-state-and-events";

const readLegacyState = (path: string): LegacyRuntimeState | null => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LegacyRuntimeState;
  } catch {
    return null;
  }
};

const writeMigrationRecords = (path: string, records: RuntimeMigrationRecord[]): void => {
  writeFileSync(path, JSON.stringify(records, null, 2), "utf8");
};

export const migrateRuntimeStorage = (paths: RuntimeMigrationPaths): void => {
  mkdirSync(paths.storagePath, { recursive: true });

  const hasSnapshot = existsSync(paths.snapshotPath);
  const hasEventLog = existsSync(paths.eventLogPath);
  const hasMigrationLog = existsSync(paths.migrationPath);

  if (hasSnapshot && hasEventLog) {
    if (!hasMigrationLog) {
      writeMigrationRecords(paths.migrationPath, []);
    }
    return;
  }

  const legacyState = readLegacyState(paths.legacyRuntimeFilePath);

  if (legacyState) {
    const snapshot: RuntimeSnapshot = {
      status: legacyState.status ?? DEFAULT_SNAPSHOT.status,
      threads: legacyState.threads ?? DEFAULT_SNAPSHOT.threads,
      findings: legacyState.findings ?? DEFAULT_SNAPSHOT.findings,
    };

    writeFileSync(paths.snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
    const events = legacyState.events ?? [];
    const eventLogContent = events.map((event) => JSON.stringify(event)).join("\n");
    writeFileSync(paths.eventLogPath, eventLogContent ? `${eventLogContent}\n` : "", "utf8");
    writeMigrationRecords(paths.migrationPath, [{
      version: 1,
      name: MIGRATION_NAME,
      appliedAt: new Date().toISOString(),
    }]);
    return;
  }

  if (!hasSnapshot) {
    writeFileSync(paths.snapshotPath, JSON.stringify(DEFAULT_SNAPSHOT, null, 2), "utf8");
  }

  if (!hasEventLog) {
    writeFileSync(paths.eventLogPath, "", "utf8");
  }

  if (!hasMigrationLog) {
    writeMigrationRecords(paths.migrationPath, []);
  }
};
