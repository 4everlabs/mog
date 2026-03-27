import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RuntimeStatus } from "@mog/types";
import type { Finding } from "@mog/types";
import type { Thread } from "@mog/types";

export interface RuntimeSnapshot {
  status: RuntimeStatus;
  threads: Thread[];
  findings: Finding[];
}

export class SnapshotStore {
  constructor(private filePath: string) {}

  load(): RuntimeSnapshot | null {
    try {
      return JSON.parse(readFileSync(this.filePath, "utf8")) as RuntimeSnapshot;
    } catch {
      return null;
    }
  }

  save(snapshot: RuntimeSnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(snapshot, null, 2), "utf8");
  }
}
