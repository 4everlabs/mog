/**
 * Validates Browserbase API key + project id via the official SDK (session create).
 * Does not require OpenAI. Run: `cd apps/mog && bun run browserbase:verify`
 */
import "./load-mog-env.js";
import { Browserbase } from "@browserbasehq/sdk";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing ${name}. Add it to the monorepo root .env or apps/mog/.env.`);
  }
  return v;
}

async function main(): Promise<void> {
  const apiKey = requireEnv("BROWSERBASE_API_KEY");
  const projectId = requireEnv("BROWSERBASE_PROJECT_ID");

  const bb = new Browserbase({ apiKey });
  const session = await bb.sessions.create({
    projectId,
    timeout: 120,
  });

  const id = session.id;
  const status = session.status;
  const region = session.region;
  const pid = session.projectId;

  console.log("Browserbase connector: OK");
  console.log(`  session id: ${id}`);
  console.log(`  status: ${status}`);
  console.log(`  region: ${region}`);
  console.log(`  projectId on session: ${pid}`);
  console.log(`  dashboard: https://browserbase.com/sessions/${id}`);

  if (pid !== projectId) {
    console.warn(
      "  warning: BROWSERBASE_PROJECT_ID env does not match session.projectId — check the id in Browserbase settings."
    );
  }

  const retrieved = await bb.sessions.retrieve(id);
  console.log(`  retrieve: ${retrieved.status}`);
}

main().catch((err: unknown) => {
  console.error("Browserbase connector: FAILED");
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
