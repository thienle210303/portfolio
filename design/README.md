# Design

The approved design boards, kept in the repo so they can be refined and
versioned. Each round gets a folder; each approved state of that round gets a
`vN` folder. Never edit an older version in place: copy it to `vN+1`, change
the copy, and record what changed below.

## round-21-outdoors — "The Pass, outdoors"

Live canvas (Claude Design): https://claude.ai/artifact/7qhYeRtHtWf3woKJPdH6sq
Spec: [docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md](../docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md)

| Version | Date | What it is |
|---|---|---|
| [v1](round-21-outdoors/v1/) | 2026-10-20 | Day and night boards for the hero (desktop and phone), the Journey, the whole record and Contact, as approved by Thien |

Each version holds:

- `boards/` — the canvas boards (`*.dc.html`) and `canvas.json`, the same
  files the Claude Design canvas publishes. They expect the canvas's
  `support.js`, so open them through the canvas; to view one locally, delete
  the `<helmet>` tags and open it in a browser.
- `previews/` — a PNG of every board (1440×900, phone boards 390×1800).
- `source/gen-nature.mjs` — the generator that draws every board, and
  `qr.svg`, the LinkedIn QR it embeds. Regenerate with
  `node source/gen-nature.mjs boards` (day) and
  `NIGHT=1 node source/gen-nature.mjs boards` (night).

The site does not import anything from here. The hero's and the Journey's
drawings reach the page through `scripts/draw-scenery.mjs`, which ports the
generator's drawing functions and writes `public/scenery/`.
