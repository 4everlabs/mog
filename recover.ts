import { readFileSync, writeFileSync } from "fs";

const logData = readFileSync("/Users/henryoman/.cursor/projects/Volumes-T9-cursor-mog/terminals/293241.txt", "utf8");
const lines = logData.split("\n");
const recovered = [];

for (const line of lines) {
  if (line.includes("result") && line.includes("screenName")) {
    try {
      const match = line.match(/result\x1b\[39m: "(.*)"/);
      if (match && match[1]) {
        // Unescape the string
        let unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        // Handle potential truncation... the log might be truncated if it's too long?
        if (unescaped.endsWith("...\"") || unescaped.endsWith("...")) {
           // Actually, the log shows `\"result\": \"{\\\"screenName\\\":...`
           // Let's see if it's truncated.
           // In Stagehand logs, long strings are often truncated.
        }
      }
    } catch (e) {}
  }
}
