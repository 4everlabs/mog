# Website Design

## Purpose

This document defines the current design direction for the `website/` app so future changes stay aligned with the existing brand and implementation.

The website is a focused landing page for MOG. It should feel like a polished terminal interface for modern marketers: opinionated, quiet, fast, and slightly technical without feeling cold.

## Product Framing

- Product name: `MOG`
- Primary message: "The marketing agent that ships."
- Core value proposition: audience research, content creation, posting, and campaign loops that learn from real outcomes
- Primary user impression: capable, lean, direct, and operator-friendly

## Design Principles

- Keep the experience single-purpose. The page should quickly explain what MOG is and how to try it.
- Preserve the terminal-native personality. The interface should feel like software for people who like tools, not generic SaaS chrome.
- Favor restraint over decoration. One strong visual metaphor is better than adding extra sections, cards, or effects.
- Keep the copy compact and outcome-oriented. Avoid buzzwords and broad AI language.
- Maintain a premium dark-mode presentation with crisp contrast and sparse color accents.

## Visual Direction

The current site uses a terminal-window metaphor placed inside a full-screen dark canvas with a faint grid. The composition should feel centered, minimal, and deliberate.

Visual character:

- Dark, almost black background
- Flat panels with thin borders instead of rounded consumer-style cards
- Mono-forward typography with a serif accent for contrast
- Small bursts of color used semantically, not decoratively
- Light motion only where it reinforces the terminal motif

The design should stay closer to "editorial command line" than "startup landing page."

## Color System

Current design tokens:

- Background: `#000000`
- Soft background: `#0a0a0a`
- Panel: `#000000`
- Panel border: `rgba(104, 181, 252, 0.18)`
- Accent blue: `#68b5fc`
- Accent yellow: `#e0af68`
- Accent red: `#f7768e`
- Primary text: `#d4d4d4`
- Muted text: `#666666`
- Grid line: `rgba(224, 175, 104, 0.1)`

Usage guidance:

- Use black and near-black for the main canvas and panel surfaces.
- Use blue for the headline, key commands, and interactive emphasis.
- Use yellow for prompts, highlights, and the italic accent line.
- Use red for secondary accents like labels and download treatment.
- Do not introduce extra accent colors unless there is a strong brand reason.

## Typography

Current font stack:

- Primary UI and code font: `Roboto Mono`
- Accent serif: `Instrument Serif`

Guidelines:

- Use the mono face for navigation, commands, UI labels, and most body copy.
- Use the serif face sparingly for emphasis, atmosphere, and contrast.
- Keep font weights light to medium. The site should feel airy, not heavy.
- Preserve tight headline tracking and compact command-line rhythm.

## Layout

The current page is a single-screen hero.

Layout structure:

1. Full-viewport hero canvas
2. Background grid texture
3. Terminal shell container
4. Terminal chrome bar
5. Logo
6. Eyebrow prompt
7. Accent line
8. Headline
9. Supporting copy
10. Install command card with copy action
11. Alternate command and download link
12. Secondary outbound links

Layout rules:

- Keep the terminal shell centered and dominant.
- Prefer one strong column over multi-column marketing layouts.
- Keep content density tight enough to fit comfortably within one viewport on desktop.
- Use generous negative space around the shell so the page feels intentional and calm.

## Core Components

### Terminal Shell

The shell is the main brand frame. It is not just a container; it establishes the product personality.

Requirements:

- Square corners
- Thin borders
- Subtle panel separation
- Simple desktop-window chrome with three status lights

### Eyebrow Prompt

This is a lightweight framing device that reinforces the CLI tone.

Requirements:

- Compact pill-like treatment
- Yellow prompt indicator
- Minimal copy

### Hero Copy

The hero copy should remain concise and specific.

Requirements:

- One clear headline
- One short value-proposition paragraph
- One short supporting paragraph

### Command Card

This is the primary call-to-action surface.

Requirements:

- A clearly readable install command
- Visible copy button
- Strong code styling
- Subtle hover feedback only

### Secondary Actions

Secondary actions should stay visibly less important than the primary install path.

Current secondaries:

- Alternate `npx` command
- Download link
- GitHub
- Docs
- Discord

## Interaction Design

Current interaction patterns are intentionally minimal.

Allowed interactions:

- Copy install command to clipboard
- Hover and focus states on buttons and links
- Blinking terminal cursor

Interaction rules:

- Motion should be brief and functional.
- Hover states should feel like signal changes, not animated marketing polish.
- Keep transitions in the 150ms to 200ms range.
- Avoid scroll-dependent reveals, parallax, or elaborate entrance animation unless the site expands and specifically needs them.

## Tone And Copy

The copy voice should feel:

- Crisp
- Slightly technical
- Confident
- Low-hype
- Output-focused

Avoid:

- Corporate marketing filler
- Overexplaining AI mechanics
- Friendly-but-generic startup language
- Excessive exclamation or exaggerated claims

## Responsiveness

The page should remain usable from mobile through desktop while preserving the single-panel concept.

Current responsive behavior to preserve:

- Tightened padding on smaller screens
- Stacked command card actions
- Full-width buttons on narrow layouts
- Vertical alignment changes for header/meta rows

If more sections are added later, they should still inherit the same visual language rather than introducing a different mobile pattern system.

## Accessibility

The current design should continue to follow these baseline rules:

- Maintain strong text contrast against the black background
- Keep all interactive elements keyboard reachable
- Preserve visible `:focus-visible` states
- Use descriptive link and button labels
- Treat decorative effects like the grid and cursor as non-essential

## Implementation Notes

- Framework: `SvelteKit`
- Runtime/build setup: `Vite` with Vercel adapter
- Main page implementation lives in `src/routes/+page.svelte`
- Global tokens and base styles live in `src/routes/+layout.svelte`
- Fonts are loaded in `src/app.html`

## Guardrails

- Do not round corners unless there is a deliberate redesign.
- Do not replace the mono-first identity with a generic SaaS aesthetic.
- Do not add multiple competing CTA styles.
- Do not turn the landing page into a long scrolling feature grid without revisiting this document.
- Do not dilute the terminal metaphor with unrelated visual motifs.

## Future Expansion

If the website grows beyond the current hero page, new sections should still inherit the same design system:

- terminal-informed framing
- restrained color use
- mono-led typography
- concise outcome-driven copy
- high-contrast dark presentation

Any major departure from those rules should be treated as a redesign, not an incremental edit.
