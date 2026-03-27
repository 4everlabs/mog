---
name: huggingface-image-generation
description: Use Hugging Face for image generation and image editing workflows. Use when the user asks to build, integrate, debug, or deploy text-to-image or image-to-image features with Hugging Face, including Inference Providers, `@huggingface/inference`, `huggingface_hub` `InferenceClient`, model selection, prompt and negative prompt tuning, seeds, dimensions, and handling returned image bytes or blobs.
---

# Hugging Face Image Generation

Use this skill for product-facing image generation and editing features, not for training or fine-tuning.

## Check current docs first

Hugging Face image APIs and provider support change quickly. Verify the current official docs before coding:

- `text-to-image`: `https://huggingface.co/docs/inference-providers/tasks/text-to-image`
- `image-to-image`: `https://huggingface.co/docs/inference-providers/en/tasks/image-to-image`
- JS client docs: `https://huggingface.co/docs/huggingface.js/main/en/inference/modules`

## Default approach

Prefer hosted inference first:

- Web or Node apps: `@huggingface/inference`
- Python apps or scripts: `huggingface_hub.InferenceClient`

Only switch to local Diffusers when the user explicitly wants self-hosting, GPU-local inference, or lower-level pipeline control.

## Auth

- Read the token from `HF_TOKEN`.
- Never hardcode tokens in source, tests, docs, or examples.
- If a provider-specific key is required, keep it in a separate env var and document it explicitly.

## App integration checklist

- Decide whether the workflow is `text-to-image` or `image-to-image`.
- Let callers pass `model`, `prompt`, `negative_prompt`, `seed`, `width`, `height`, `guidance_scale`, and `num_inference_steps` when supported.
- Treat provider and model support as dynamic. Check the current task docs and model card instead of assuming every parameter is available everywhere.
- Return binary image data safely: `Blob`, `ArrayBuffer`, or a file response in JS; `PIL.Image` or raw bytes in Python.
- Save generated files outside source trees unless the user explicitly wants checked-in assets.

## Good defaults

- Start with moderate image sizes and step counts.
- Expose `seed` whenever reproducibility matters.
- If the user asks for an editor, prefer `image-to-image` with a source image plus prompt instead of regenerating from scratch.
- Frame model names as examples, not permanent defaults, because the recommended set changes frequently.

## JavaScript note

Prefer `InferenceClient` from `@huggingface/inference`. Keep file handling explicit when converting between `Blob`, buffers, form uploads, and saved files.

## Python note

Prefer `InferenceClient` from `huggingface_hub` for hosted inference. Use local Diffusers only when the task actually needs local generation or advanced control.
