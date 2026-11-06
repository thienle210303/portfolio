# The responsive system

How the site is laid out, sized and layered at every width. The tokens
themselves stay in [`src/app/globals.css`](../../src/app/globals.css);
[`tokens.css`](tokens.css) here is a generated mirror for the boards
(`pnpm design:tokens`, fenced by `tests/lib/design-tokens.test.ts`). Colour is
not repeated here: see [DESIGN.md](../../DESIGN.md) and
[docs/contrast.md](../../docs/contrast.md).

Each rule is marked **built** (true of the site today) or **round 25** (agreed
on the boards, lands in Stage B). [`index.html`](index.html) renders the
specimen in both themes; [`states.html`](states.html) is the component-state
catalogue.

## 1. Bands and breakpoints

Mobile is not a smaller desktop: each band has its own composition, and a
board shows all four.

| Band | Width | Breakpoint | Verified at | Composition |
|---|---|---|---|---|
| Phone | under 640 | — | 320, 375, 390, 430 | One column. The clothesline hangs down a bamboo pole, one Diary page, the postcard's sides stack. |
| Tablet | 640 – 1023 | `sm` 40rem | 768 | Still touch, still the menu tag, but two columns where an object has two sides. |
| Laptop | 1024 – 1279 | `lg` 64rem | 1024 | The desktop header and the horizontal clothesline; objects at their compact size. |
| Desktop | 1280 and up | `xl` 80rem | 1280, 1440, 1920 | The boards: the oak as one board, the Diary as a spread. Content stops growing at 1440; the sky and ground carry on. |

- **Three layout breakpoints, in rem, everywhere** (round 25): `40rem`,
  `64rem`, `80rem`. CSS, Tailwind prefixes and JavaScript `matchMedia` use the
  same three; no `px` media queries, no `md`.
- **Content fixes are not breakpoints.** A narrow-phone fix (today 339, 359,
  380px and 22.5rem) is first tried as fluid sizing or a container query on the
  object. Any that remain are listed in §8 with the copy they protect.
- **An object sizes to its own box.** The postcard already switches on a
  container query (`@container postcard`); new two-sided objects do the same
  rather than asking the viewport.
- **The shell** (built): `.shell` is `1120px + 2 × --gutter`, gutter
  `clamp(1.25rem, 5vw, 5rem)`, safe-area aware. Three things may leave it, and
  nothing else: the hero's scenery (bleeds to the edge), the Journey's board,
  the Diary's book (`min(1320px, 100vw - 4rem)`).

## 2. Type roles

Three faces: Bricolage Grotesque (display and body), Courier Prime (tags, dates,
data), Newsreader italic (my handwriting voice). Sizes come from the fluid
steps `--step--2 … --step-5` and `--step-chapter`; a role names one step.

| Role | Face | Step | Tracking | Used for |
|---|---|---|---|---|
| Display | sans 700 | `--step-5` (40 → 70px) | `display-lg` | The hero h1, and Contact's "say hi." |
| Chapter | sans 700 | `--step-chapter` (32 → 56px) | `display-lg` | A section's h2 on the sky: Journey, Contact |
| Page title | sans 700 | `--step-4` (28 → 36px) | `display` | A title on paper: a Diary page, the postcard |
| Heading | sans 600 | `--step-2` (20 → 24px) | `display` | Entry and card titles (h3) |
| Lead | sans 400 | `--step-1` (17 → 19px) | — | One sentence under a title |
| Body | sans 400 | `--step-0` (15 → 16px) | — | Everything read at length |
| Aside | serif italic | `--step-1` | — | Hints, tag backs, captions |
| Data | mono 400 | `--step--1` (13 → 14px) | — | Dates, values, sources |
| Label | mono 700 caps | `--step--2` (12 → 13px) | `caps` | Eyebrows, tabs, tag years, rail labels |

- **Floor: 12px** (round 25). Nothing read as text is smaller. Today 9, 10,
  10.5, 11 and 11.5px exist (`0.62rem` seven times); they move to Label.
- **One role per element** (round 25). The 23 ad hoc `text-[…px]` sizes in TSX
  map to the nearest role. The one exception is **object type**: lettering that
  is part of a drawing (a postmark, a stamp's value) scales with its object in
  `em` or `cqw`, never the viewport, and is `aria-hidden` when it is texture.
- Headings balance (`text-wrap: balance`), paragraphs are `pretty` (built).

## 3. Spacing

Tailwind's 4px base is the scale; these are the steps in use, and the only
ones a new layout reaches for:

`0.5` 2px · `1` 4 · `1.5` 6 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `16` 64 · `20` 80

- **Inside an object:** 8 / 12 / 16. **Between objects:** 24 / 32 / 40.
  **Between sections:** `--section-y` on each side (built: 24 → 32px each).
- **Edges:** `--gutter` and nothing else. No section sets its own side padding.
- Arbitrary pixel gaps (`[18px]`, `[26px]`, `[15px]`, `[13px]`, `[22px]`) snap
  to the scale (round 25) unless they place a drawn thing against another
  drawn thing (a string's drop, a tag's hole); those are measurements and stay
  beside the drawing they belong to.

## 4. Shape and elevation

Paper is square-cut and lies on something, so radius is small and shadow says
how far off the surface a thing is. Round 25 names what is in use:

| Token | Value | For |
|---|---|---|
| `--radius-paper` | 2px | Tags, cards, sheets, fields (today 1 – 4px) |
| `--radius-tab` | 6px | Index tabs and the tab row |
| `--radius-board` | 0.625rem | The Diary's cloth boards |
| `rounded-full` | — | Punched holes, dots, the theme switch |
| `--shadow-pinned` | `0 2px 3px -1px` | Taped or pinned flat: clippings, sticky notes |
| `--paper-shadow` (built) | `0 1px 0, 0 22px 40px` | Paper lying on the ground: the card, the postcard |
| `--shadow-lift` | `0 18px 40px -24px` | Paper picked up: hover, a turning leaf |

Shadows are neutral (`rgb(30 40 35 / …)` by day, black by night), never tinted.

## 5. Layers

| Layer | z | What |
|---|---|---|
| Scenery | −1 | Sky, paddy, oak, anything `aria-hidden` behind content |
| Content | 0 – 10 | Local stacking inside one object only (tape over paper, a leaf mid-turn) |
| Cats, menu open | 40 | The companion layer drops under the open phone menu |
| Header | 50 | The three bits of paper |
| Cats | 55 | Over everything, `pointer-events: none` when over a control |
| Skip link | 60 | |
| Dialogs | top layer | Native `<dialog>`: résumé, certificates |

Round 25 names 40 / 50 / 55 / 60 as tokens; a new component never picks a
number above 10.

## 6. Interaction

- **Targets:** 44 × 44px for anything pressed, at every width (built, with the
  exceptions the audit lists).
- **Focus:** 2px `--ring-color`, 3px offset, on `:focus-visible` (built).
- **Hover is an extra, never the only way.** Anything a hover shows, a tap or
  focus shows too; hover styles sit under `(hover: hover)`.
- **Touch:** phone and tablet are touch-first. Nothing pressable sits under
  the cats' resting box or within 8px of the screen edge; drags (the Diary's
  corner) have a button that does the same.
- **Motion:** `--dur-quick` 150ms (colour), `--dur-reveal` 200ms, `--dur-settle`
  500ms, `--dur-draw` 600ms, one curve `--ease-ink`. Every motion has a
  reduced-motion end state that says the same thing.
- **States every control shows:** rest, hover, focus-visible, pressed,
  disabled, and for forms empty / error / sending / sent, in first person.

## 7. Checking a change

1. Board first: `design/round-NN-…/vN/boards/`, desktop and phone side by side.
2. `pnpm build && pnpm shots <label>`: nine widths, both themes, key states,
   into `design/.shots/<label>/index.html`.
3. Compare with the board; `pnpm shots --diff <before> <after>` for a change
   that should move nothing.
4. The project gate in [CLAUDE.md](../../CLAUDE.md#before-calling-anything-done).

## 8. Named exceptions

Filled in as Stage B lands: each remaining content fix, the copy it protects,
and the test that fails without it.
