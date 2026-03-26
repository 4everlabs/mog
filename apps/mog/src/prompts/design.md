# 4ever Design

## Colors

- `#d4d8e0` — page background, the cool lavender-gray behind everything
- `#fafafa` — surface background (cards, dialogs, inputs, panels, menus)
- `#030201` — primary text, strong borders, dark button fills
- `#24211a` — secondary text
- `#3b342e` — muted text, timestamps, supporting copy
- `#6b615e` — disabled text, soft borders
- `#acacac` — neutral chips, muted fills, skeleton placeholders
- `#97B4ED` — Eve accent fill (Eve buttons, Eve message bubbles, selected chips, messenger sent bubbles)
- `#5973A8` — Eve deep accent (notification count badges)
- `#293D64` — darkest accent (gradient endpoints, checkbox accent)

## Fonts

- `Momo Trust Sans` — default UI font
- `Momo Trust Display` — hero and title moments
- `Funnel Sans` — selected draft and help headings
- `Red Hat Mono` — overlines, timestamps, badges, small utility text

## Stroke / Outline Widths

- Standard border: `1px`
- Standard divider: `1px`
- Strong connector / active line: `2px`
- Focus ring: `2px`
- Tour highlight inner ring: `1.5px`
- Icon stroke width: `2.4`

Most of the product uses `1px` borders.

## Radius

- Checkbox: `4px`
- Small: `8px`
- Medium: `16px`
- XL: `20px`
- 2XL: `24px`
- 3XL: `32px`
- Pill / full: `9999px`

Most common usage:

- buttons and tabs: pill
- inputs: `24px`
- cards, dialogs, menus, large panels: `32px`

## Shadows

- Low: `0 1px 2px rgba(3, 2, 1, 0.12)`
- High: `0 18px 36px rgba(3, 2, 1, 0.2)`

The system is border-first, not shadow-first.

## Common Surface Recipe

- Background: `#fafafa`
- Border: `1px solid #030201` or `1px solid #6b615e`
- Radius: `32px`
- Shadow: none or low

## Common Control Recipe

- Primary button: `#030201` fill, `#fafafa` text, pill radius
- Secondary button: `#fafafa` fill, `1px solid #030201`, pill radius
- Eve button: `#97B4ED` fill, `1px solid #030201`, pill radius
- Icon button: round or near-round, bordered
- Text input: `24px` radius, `1px solid #030201`

## Common Type Pattern

1. small uppercase mono label
2. medium heading
3. muted supporting copy

## Layout

- Main content width: `1000px`
- Layout style: centered, compact
