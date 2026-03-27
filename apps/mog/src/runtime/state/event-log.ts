import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RuntimeEvent } from "@mog/types";

export class EventLog {
  constructor(private filePath: string) {}

  load(): RuntimeEvent[] {
    try {
      const content = readFileSync(this.filePath, "utf8").trim();
      if (!content) {
        return [];
      }

      return content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RuntimeEvent);
    } catch {
      return [];
    }
  }

  append(event: RuntimeEvent): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }

  replace(events: RuntimeEvent[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const content = events.map((event) => JSON.stringify(event)).join("\n");
    writeFileSync(this.filePath, content ? `${content}\n` : "", "utf8");
  }
}
