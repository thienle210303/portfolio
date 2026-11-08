# The responsive system

How the site is laid out, sized and layered at every width. The tokens
themselves stay in [`src/app/globals.css`](../../src/app/globals.css);
[`tokens.css`](tokens.css) here is a generated mirror for the boards
(`pnpm design:tokens`, fenced by `tests/lib/design-tokens.test.ts`). Colour is
not repeated here: see [DESIGN.md](../../DESIGN.md) and
[docs/contrast.md](../../docs/contrast.md).

Rules marked **round 25** were agreed on the boards and are built as of
2026-11-06, except where a line says **not yet**. [`index.html`](index.html) renders the
specimen in both themes; [`states.html`](states.html) is the component-state
catalogue.

## 1. Bands and breakpoints

Mobile is not a smaller desktop: each band has its own composition, and a
board shows all four.

| Band | Width | Breakpoint | Verified at | Composition |
|---|---|---|---|---|
| Phone | under 640 | — | 320, 375, 390, 430 | One column. The line crosses three times between two bamboo poles that stand in the paddy, one Diary page as tall as its content, the postcard's sides stack. |
| Tablet | 640 – 1023 | `sm` 40rem | 768 | Still touch, still the menu tag, but two columns where an object has two sides: the headline beside the field tag, boughs in pairs, a landscape card. |
| Laptop | 1024 – 1279 | `lg` 64rem | 1024 | The desktop header and the horizontal clothesline; objects at their compact size; the Diary opens to a spread; the postcard is address over picture beside the card (round 28: stacked, the form comes first). |
| Desktop | 1280 and up | `xl` 80rem | 1280, 1440, 1920 | The boards: the oak as one board in board units (1/1440 of its own width, to 1680), the Diary's tabs down its side, Contact as one desk (round 28: the card clipped over the postcard's corner, the Ask a sheet across their foot). Content otherwise stops growing at 1440; the sky and ground carry on. |

- **Three layout breakpoints, in rem, everywhere** (round 25): `40rem`,
  `64rem`, `80rem`. CSS, Tailwind prefixes and JavaScript `matchMedia` (`BAND` in `src/lib/breakpoints.ts`) use the same three; no `px` media queries, no `md`.
- **Content fixes are not breakpoints.** A narrow-phone fix is first tried as fluid sizing or a container query on the object. The few that remain are listed in §8.
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

- **Floor: 12px** (round 25). Nothing read as text is smaller. Built: the cats' labels, the Ask, the card and the menu came up to it. What is still smaller is lettering inside a drawing (§8).
- **One role per element** (round 25). An element's size is a role's step. **Not yet** everywhere: 17 ad hoc `text-[…px]` sizes remain in TSX (from 23), all 12px or more; they move to roles as their components are next touched. The one exception is **object type**: lettering that
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
- Arbitrary pixel gaps (`[18px]`, `[26px]`, `[15px]`, `[13px]`, `[22px]`) snap to the scale as their components are touched (**not yet** swept) unless they place a drawn thing against another
  drawn thing (a string's drop, a tag's hole); those are measurements and stay
  beside the drawing they belong to.

## 4. Shape and elevation

Paper is square-cut and lies on something, so radius is small and shadow says
how far off the surface a thing is. Round 25 names what is in use. The tokens are in `globals.css` (`rounded-paper`, `rounded-tab`, `rounded-board`, `shadow-pinned`, `shadow-lift`); new work uses them, and existing values have **not yet** been swapped for them wholesale:

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

These four are tokens (`--z-cats-under-menu`, `--z-header`, `--z-cats`, `--z-skip`) and the header, the cats' layer and the skip link read them; a new component never picks a number above 10.

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

What deliberately sits outside the rules above, and why.

| Where | What | Why |
|---|---|---|
| `Hero/Scenery.tsx` | `max-[1440px]:` on four scenery pieces | Art drawn for the 1440 board that steps aside below it; a drawing's own measure, not a layout breakpoint |
| `Hero/Scenery.tsx` | `max-[359px]:` on one piece | The phone paddy's framing on the narrowest phones |
| Postmark, SENT stamp, the cats' snoring z's | lettering at 9 – 11.5px | Object type: part of a drawing, `aria-hidden`, scaled with its object; the words are said beside it |
| `.rail` in `globals.css` | 0.7rem / 0.62rem | An unused path: no section passes a rail. It comes up to the floor if a rail returns |
| Diary contents rows | 28px tall with a mouse alone | 44px below 1024 and on any touch device. At 44px everywhere the contents page would be 300px taller than every other spread page |
| Diary, reduced-motion track on a phone | pages share the tallest height | CSS cannot size each scroll-snap page on its own across browsers |

Tests that hold the system: `e2e/clipping.spec.ts` (no visible text cut off at
the nine widths, both themes), `e2e/responsive.spec.ts` (no sideways scroll,
44px targets), `tests/lib/design-tokens.test.ts` (the boards' token mirror),
`tests/lib/scenery.test.ts` (the drawings), and each section's own spec.
