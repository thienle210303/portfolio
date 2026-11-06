# Design

Where a UI change is decided before it is built. The site imports nothing from
here.

## Design before code

Every significant UI change goes through these, in order:

1. **Board first.** Sketch it for desktop and for a phone (and the bands
   between, if they change) in `round-NN-…/vN/boards/`. A board is a small
   responsive HTML page drawn with the site's real tokens, fonts and copy;
   drawings that already exist are labelled boxes. Where a layout does not
   change, the as-built screenshot is the board.
2. **Review.** Put desktop and phone side by side on the round's `index.html`,
   next to the site as built. Settle layout, hierarchy and interaction there.
   Thien approves before anything in `src/` changes.
3. **Build** to the approved board, in the system
   ([system/README.md](system/README.md)): the three breakpoints, the type
   roles, the aliases. One implementation that adapts, not a desktop one and a
   phone one, unless the interaction really differs.
4. **Look at it.** `pnpm build && pnpm shots <label>` captures nine widths
   (320 – 1920), day and night, and the key states into
   `design/.shots/<label>/index.html` (not committed). Compare with the board.
   `pnpm shots --diff <before> <after>` proves a change that should move
   nothing. UI work is not done until the screenshots have been looked at.
5. **Keep this current.** If the build differs from the board, copy the board
   to `vN+1` and redraw it; if a rule changes, change `system/README.md`.

Mobile is not a smaller desktop: each band in `system/README.md §1` has its
own composition. Prefer a small reusable change to a rewrite, and ask what a
change does to the other three sections before making it.

## What is here

| Path | What |
|---|---|
| [`system/`](system/) | The responsive system: [`README.md`](system/README.md) (the rules), `index.html` (specimen, both themes), `states.html` (component states, captured), `tokens.css` (generated from `globals.css` by `pnpm design:tokens`; never edited) |
| [`round-25-responsive/`](round-25-responsive/) | The audit and the tablet and laptop boards |
| [`round-21-outdoors/`](round-21-outdoors/) | The original day and night boards |
| `.shots/` | Captures from `pnpm shots`, gitignored |

Each round gets a folder; each approved state of that round gets a `vN`
folder. Never edit an older version in place: copy it to `vN+1`, change the
copy, and record what changed below.

## round-25-responsive — the middle bands

Review page: [round-25-responsive/v1/index.html](round-25-responsive/v1/index.html)
(published, private: https://claude.ai/artifact/5WXE5X1oL6jC4UXrRLJswG)
Audit: [round-25-responsive/audit.md](round-25-responsive/audit.md)

| Version | Date | What it is |
|---|---|---|
| [v1](round-25-responsive/v1/) | 2026-11-05 | Audit at nine widths; boards for the hero (tablet), the Journey (tablet, laptop, and a board that scales from 1280), the Diary (a phone page at its own height, the spread from 1024) and Contact (the field pair, the card on a tablet, the postcard on a laptop). **Built 2026-11-06** (the review page's first section is the site now, with where the build differs from the boards). **Approved by Thien, 2026-11-05** (the About direction explicitly; the other boards with the recommended option for each open decision). Revised the same day after his first look: the About board is redrawn for phone and tablet (the line strung between two supports that stand in the ground; tags hung naturally, not on a ruler). |

Each version holds:

- `boards/` — one responsive sketch per section (`hero.html`, `journey.html`,
  `diary.html`, `contact.html`) on a shared kit (`board.css`, `board.js`).
  Open one in a browser and resize it; `?theme=night` for night, `?pins=off`
  to hide the numbered change pins. `<meta name="board-widths">` names the
  widths a board is drawn for.
- `previews/` — a PNG of every board at those widths
  (`pnpm shots --boards design/round-25-responsive/v1/boards`), and `built/`,
  the site as built at the time, as small JPEGs.
- `index.html` — the review page: audit, system, each board beside the site as
  built, and the decisions that are Thien's.

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

The hero's and the Journey's drawings reach the page through
`scripts/draw-scenery.mjs`, which ports the generator's drawing functions and
writes `public/scenery/`.
