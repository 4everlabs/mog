## Stagehand v2 -> v3 Migration Notes

Source:
- `https://docs.stagehand.dev/v3/migrations/v2.md`

This is a condensed local copy of the parts that mattered for the Hacker News script.

### Major v3 changes called out in the official migration guide

- Stagehand v3 is standalone and no longer depends on Playwright directly.
- Method signatures are simplified.
- Model configuration is unified under a single `model` field.
- Multi-page handling moved to the Context API.
- Caching and agent behavior changed.
- v3 improved type safety and consistency around timeouts.

### Important API shifts

#### Model config

Old pattern:

```ts
new Stagehand({
  modelName: "openai/gpt-5",
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY,
  },
});
```

v3 pattern:

```ts
new Stagehand({
  model: {
    modelName: "google/gemini-3-flash-preview",
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  },
});
```

#### Page access

Old direct page access was replaced by context-based access:

```ts
await stagehand.init();
const page = stagehand.context.pages()[0];
```

There is also an active-page pattern in v3:

```ts
const page = stagehand.context.activePage() ?? stagehand.context.pages().at(-1);
```

#### Primitive selection

The migration docs and current references together push toward a more explicit split:

- `observe()` to locate candidate actions
- `act()` to execute a known action
- `extract()` for typed structured data
- `agent()` for multi-step or unknown flows

That makes `observe() -> act()` the better fit for Hacker News comments navigation than `agent.execute(...)`.

### What changed in the local Hacker News script

- front page stories now come from `extract()` with a Zod schema
- comments link navigation now uses `observe()` plus deterministic `act(action, { page })`
- the old agent-specific prompt plumbing was removed from this folder's script
- the bulk comment-row parsing stayed DOM-based because it is deterministic, cheap, and preserves every row on long comment threads

### Repo-specific note

The installed package in this repo is already `@browserbasehq/stagehand@^3.2.0`, so this migration was mainly about using the v3 primitives properly rather than changing package versions.
