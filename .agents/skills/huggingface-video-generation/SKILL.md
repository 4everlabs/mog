---
name: huggingface-video-generation
description: Use Hugging Face for video generation workflows. Use when the user asks to build, integrate, debug, or deploy text-to-video or image-guided video features with Hugging Face, including Inference Providers, `@huggingface/inference`, `huggingface_hub` `InferenceClient`, Diffusers-based local pipelines, frame and duration controls, prompt and negative prompt tuning, seeds, and handling returned video bytes.
---

# Hugging Face Video Generation

Use this skill for product-facing video generation features, not for model training.

## Check current docs first

Video generation changes fast across providers and model families. Verify the current official docs before coding:

- `text-to-video`: `https://huggingface.co/docs/inference-providers/tasks/text-to-video`
- JS client docs: `https://huggingface.co/docs/huggingface.js/main/en/inference/modules`
- Local video pipelines: `https://huggingface.co/docs/diffusers/main/using-diffusers/text-img2vid`

## Default approach

Prefer hosted inference first for app integrations and prototypes:

- Web or Node apps: `@huggingface/inference`
- Python apps or scripts: `huggingface_hub.InferenceClient`

Switch to local Diffusers when the user explicitly wants self-hosting, image-to-video support that is missing from hosted routes, custom schedulers, or lower-level pipeline control.

## Auth

- Read the token from `HF_TOKEN`.
- Never hardcode tokens.
- Keep provider-specific secrets separate and document them clearly.

## App integration checklist

- Confirm whether the requested flow is `text-to-video`, image-guided video, or a local Diffusers pipeline.
- Let callers pass `model`, `prompt`, `negative_prompt`, `seed`, `num_frames`, `guidance_scale`, and `num_inference_steps` when supported.
- Treat model capability as dynamic. Do not assume a `text-to-video` model also supports image-to-video.
- Prefer async jobs or queued work for generation-heavy paths instead of blocking synchronous HTTP handlers.
- Store large video outputs in object storage, temp files, or a media bucket rather than database rows.

## Good defaults

- Keep early clips short and low-cost while validating the UX.
- Expose `seed` whenever reproducibility matters.
- Surface duration, frame count, and resolution as explicit tradeoffs because latency and cost rise quickly with each of them.
- Frame model names as examples, not permanent defaults.

## JavaScript note

`@huggingface/inference` exposes `textToVideo`. Verify the exact task and output handling in the current docs before wiring an endpoint, especially for image-guided or provider-specific flows.

## Python note

Use `InferenceClient.text_to_video` for hosted workflows. Use Diffusers pipelines for local or advanced video generation.
