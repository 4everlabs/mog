# Twitter Feed Storage

This folder stores Twitter feed data in JSONL format for persistent caching.

## File Structure

- `{username}.jsonl` - Each tweet stored as a JSON line
- `{username}.meta.json` - User profile and metadata
- `{username}.index.json` - Tweet ID to timestamp index

## Format

Each line in the `.jsonl` file is:
```json
{"id":"123","username":"Storyworth","tweet":{...},"fetchedAt":"2026-03-26T12:00:00Z"}
```
