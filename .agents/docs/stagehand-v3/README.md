## Stagehand v3 Local Notes

Fetched from official Browserbase / Stagehand docs for the Hacker News scraper migration.

Sources:
- `https://docs.stagehand.dev/llms.txt`
- `https://docs.stagehand.dev/v3/references/act.md`
- `https://docs.stagehand.dev/v3/references/observe.md`
- `https://docs.stagehand.dev/v3/references/extract.md`
- `https://docs.stagehand.dev/v3/migrations/v2.md`
- `https://docs.browserbase.com/guides/stagehand-crash-course`

Saved files:
- `core-primitives.md`
- `migration-notes.md`

Why these were saved:
- `observe()` is the right primitive for locating the HN comments link.
- `act()` is the right primitive for executing that single click deterministically.
- `extract()` is the right primitive for turning the front page into structured story data.
- `agent()` is better reserved for open-ended, unknown, or multi-step workflows.
