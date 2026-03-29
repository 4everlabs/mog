## Stagehand v3 Core Primitives

Fetched from:
- `https://docs.browserbase.com/guides/stagehand-crash-course`
- `https://docs.stagehand.dev/v3/references/act.md`
- `https://docs.stagehand.dev/v3/references/observe.md`
- `https://docs.stagehand.dev/v3/references/extract.md`

### Crash course summary

Stagehand is built on 4 primitives:

- `agent()` for autonomous multi-step execution
- `observe()` to inspect current page state and discover actionable elements
- `act()` to perform a single atomic action
- `extract()` to pull structured data from a page

The official crash course explicitly frames the split like this:

- `act()` -> best for an atomic action like "click login"
- `agent()` -> best for a multi-step workflow or unknown page structure

That is why a stable flow like Hacker News comments navigation should prefer `observe()` + `act()` over `agent()`.

### `observe()`

Official reference: `https://docs.stagehand.dev/v3/references/observe.md`

TypeScript signatures:

```ts
await stagehand.observe(instruction: string): Promise<Action[]>
await stagehand.observe(instruction: string, options: ObserveOptions): Promise<Action[]>
```

Important options:

- `model`
- `timeout`
- `selector`
- `page`
- `serverCache`

Returned `Action` shape:

```ts
interface Action {
  selector: string;
  description: string;
  method?: string;
  arguments?: string[];
}
```

Best-practice notes from the docs:

- Use specific instructions, not vague ones.
- Use `observe()` to discover candidate actions first.
- Validate what came back before acting.
- Reuse observed actions with `act(action)` for deterministic replays.

Good fit for Hacker News:

- find the exact comments/discuss link for a known story title
- verify Stagehand found a click action on the right row

### `act()`

Official reference: `https://docs.stagehand.dev/v3/references/act.md`

TypeScript signatures:

```ts
await stagehand.act(instruction: string): Promise<ActResult>
await stagehand.act(action: Action): Promise<ActResult>
await stagehand.act(instruction: string, options: ActOptions): Promise<ActResult>
```

Important options:

- `model`
- `variables`
- `timeout`
- `page`
- `serverCache`

Returned `ActResult` includes:

- `success`
- `message`
- `actionDescription`
- `actions`

Useful guidance from the docs:

- `act(action)` is deterministic and avoids another LLM planning step.
- `act()` is ideal once `observe()` already found the target.
- Pass the same `page` you observed so the action hits the right tab/page.

Good fit for Hacker News:

- click the previously observed comments link
- avoid agent wandering into story links or unrelated rows

### `extract()`

Official reference: `https://docs.stagehand.dev/v3/references/extract.md`

TypeScript signatures:

```ts
await stagehand.extract(): Promise<{ pageText: string }>
await stagehand.extract(options: ExtractOptions): Promise<{ pageText: string }>
await stagehand.extract(instruction: string): Promise<{ extraction: string }>
await stagehand.extract<T extends ZodTypeAny>(
  instruction: string,
  schema: T,
  options?: ExtractOptions
): Promise<z.infer<T>>
```

Important options:

- `model`
- `timeout`
- `selector`
- `page`
- `serverCache`

Docs guidance that matters here:

- use a schema for structured extraction
- add clear field descriptions to improve accuracy
- narrow scope with selectors when needed
- combine `observe()` and `extract()` when page structure discovery helps precision

Good fit for Hacker News:

- extract the first N stories from the front page with rank/title/URLs/meta
- keep the output typed instead of manually scraping row-by-row

### Practical rule of thumb

For this repo's Browserbase integrations:

- use `observe()` when you need to find a concrete element on a stable page
- use `act()` to execute the discovered action
- use `extract()` when you want typed data out of a page
- use `agent()` only when the flow is truly open-ended or you do not know the steps ahead of time
