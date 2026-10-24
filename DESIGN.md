# Design: Thien Le — Portfolio ("The Pass, outdoors")

The locked system. Impeccable and Hallmark both read this file first; it
points at the sources rather than copying them, so it cannot drift. Change a
source, not this file. Where any tool's advice disagrees with these sources,
the sources win; the house taste and the tools' division of labour are in
[`.claude/skills/the-pass/SKILL.md`](.claude/skills/the-pass/SKILL.md).

## System
- Genre: atmospheric, hand-drawn. One painted sky over a lichen ground; real
  objects from my life carry the content (clothesline tags, a live oak, a
  notebook spread, a postcard, stamps).
- Shape: one narrative page in four sections — About `#about`, Journey
  `#tree`, Record `#record`, Contact `#contact`. Order and content:
  [CLAUDE.md § Changing what the site says](CLAUDE.md#changing-what-the-site-says).
- Theme: custom. Two axes that stay independent — **theme** (`day` | `night`,
  the visitor's) and **tone** (`base` | `deep` | `contrast`, per `<Section>`).
  [CLAUDE.md § The design system](CLAUDE.md#the-design-system-the-pass-outdoors).

## Tokens
[`src/app/globals.css`](src/app/globals.css) is the source of truth (Tailwind
v4 `@theme`; there is no `tailwind.config.js`). Components use the semantic
aliases only — never a raw `--color-*` token, never a literal colour:
- `--fg`, `--fg-muted` — text · `--ground`, `--surface` — grounds ·
  `--rule` — hairlines
- `--accent` — links, measured values, annotation
- `--control` — the one primary control per screen (moss-deep)
- `--mark` — the single mark (red)
- `--sky`, `--twine`, `--scene-*`, `--art-*` — scenery, swapped by theme in CSS

Contrast is computed, not eyeballed: `pnpm contrast` writes
[`docs/contrast.md`](docs/contrast.md) and fails below 4.5:1.

## Type
Set in [`src/app/layout.tsx`](src/app/layout.tsx): Bricolage Grotesque
(display and body), Courier Prime (tags, dates, data), Newsreader italic
(the hero's italic lines: hint, tag backs, captions).

## Drawings
Generated SVG in `public/scenery/` from
[`scripts/draw-scenery.mjs`](scripts/draw-scenery.mjs) — never edited by hand.
[CLAUDE.md § The scenery](CLAUDE.md#the-scenery).

## Copy
First person, surface vs depth, results not adjectives:
[`docs/voice.md`](docs/voice.md). Facts live only in
[`src/content/portfolio.ts`](src/content/portfolio.ts).

## Motion
Story belongs to motion; text never retells it. No motion library. Under
`prefers-reduced-motion` everything ends at once.

## Constraints
WCAG 2.2 AA; Lighthouse 90+/95+/95+/95+; no horizontal overflow 320–1440px;
both themes and all three tones pass `pnpm test:e2e`.

## Approved boards
[`design/round-21-outdoors/`](design/round-21-outdoors/) — refine by copying
to `vN+1`, never in place.

## Exports
None. The tokens stay in `globals.css`.
