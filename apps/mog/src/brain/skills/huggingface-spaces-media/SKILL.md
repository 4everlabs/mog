---
name: huggingface-spaces-media
description: Use Hugging Face Spaces to ship image and video generation demos or lightweight apps. Use when the user asks to publish, containerize, or integrate a Hugging Face Space for media generation, including Gradio Spaces, Docker Spaces, static HTML Spaces, GPU settings, secrets, persistent storage, and embedding a Space in another app.
---

# Hugging Face Spaces For Media Apps

Use this skill when the task is about packaging or deploying image and video generation features on Hugging Face Spaces.

## Check current docs first

Spaces capabilities and config details evolve. Verify the current official docs before coding:

- Spaces overview: `https://huggingface.co/docs/hub/main/spaces`
- Relevant subpages from that section: `Gradio Spaces`, `Docker Spaces`, `Static HTML Spaces`, `Spaces GPU Upgrades`, `Spaces Persistent Storage`, and `Spaces Configuration Reference`

## Choose the runtime deliberately

- Use Gradio for the fastest demo or internal tool.
- Use Docker when the app needs a custom stack, background workers, system packages, or nonstandard media tooling.
- Use Static HTML Spaces only when the app can safely run client-side and call approved APIs without exposing sensitive secrets.

## Media-specific guidance

- Keep `HF_TOKEN` and other secrets in Space secrets, not in client-side code.
- For long-running video jobs, prefer a queue or background-task pattern and return status plus a download URL.
- Store large outputs in persistent storage or external object storage when the app needs to keep results around.
- Ask for GPU upgrades only when the actual model runtime requires them.
- Treat Spaces as app hosting, not as a substitute for a durable asset pipeline.

## Integration checklist

- Decide whether the Space is only a demo UI or the production-facing app surface.
- Separate prompt input, job submission, progress display, and result download.
- Keep uploaded media in temp or mounted storage, then clean it up when practical.
- If the app embeds a Space elsewhere, keep the heavy generation work inside the Space and expose a stable interface outward.

## Deployment note

When building or updating a Space repo, follow the current Spaces configuration reference for SDK selection, hardware, storage, secrets, and startup behavior instead of relying on memory.
