# Round 28 audit — what still reads generic, after 27 rounds

Captured 2026-11-07 from a production build of `main` (a80c7ae) with
`pnpm shots audit-r28`: nine widths, day and night, plus states. Read against
the brief "premium, creative, natural; break repetition; no AI-template look"
and against the house rules (CLAUDE.md, the-pass).

## The verdict first

The site is not generic. It has what most portfolios lack: one world (a
morning paddy and a dusk with a lit lantern), real objects carrying the
content (a clothesline, a live oak, a diary that turns, a postcard), a voice,
and measured numbers. A redesign would throw away its strongest asset. The
right move is **finishing**: find the few places where the old template
habits survive inside the world, and fix those.

Most of the brief's checklist is already met and stays as it is: there are no
gradient blobs, glass, glow, icon grids or card-grid sections; type has three
voices with fixed roles; colour is a strict alias system checked at 4.5:1;
motion is CSS-only with reduced-motion end states; the three middle bands
were redesigned in round 25.

## What still reads as template, in order

| # | Where | What | Why it matters |
|---|---|---|---|
| 1 | Hero, every width | The four chapter tags are **four copies of one white tag**, same size, same shape, same drawing slot, tops in a row. It is the last "row of identical cards" on the page, and it is the first thing on it. The oak's tags got varied papers in round 27; the hero's did not. | The first screen sets the bar. Four equal cards read as a component, not as four parts of a life. |
| 2 | Contact, from 1024 | **Three objects that ignore each other**: the postcard, a card floating top right with ~400px of nothing under it, and the Ask as a full-width grey slab, ~330px tall, that outweighs the postcard (the one thing the section asks for). | It is the only section without one composition. It reads as stacked blocks. |
| 3 | Contact, first screen | **Five reds plus the flag**: three red lanterns, the postcard's empty red sun ring, the seal on the card. The rule is one mark per screen, and the flag colours live in the flag. | Red stops meaning anything; the eye has nowhere to land. |
| 4 | Contact, phones | The postcard stands **picture over address**, so the form starts ~420px into the section after a picture of mostly sky. Round 22's rule is that the form is the first thing you reach. The email/phone pair has ~70px of blank above each line. | The one action on the page is a scroll and a half away. |
| 5 | Hero, from 1024 | The field tag (380px) is **wider than the headline's measure** and as heavy as the h1. | Two headlines compete. |
| 6 | Postcard picture | The red ring reads as an empty circle, not a sun. | Detail that looks unfinished. |

## Considered and left alone

- **The Journey's oak and the nursery crate**: round 27, approved today. The
  tags already vary; nothing generic left.
- **The Diary**: a working book with leaves, curls, tabs and a contents page.
  Page 1's five taped notes share one format; a later pass could give them the
  hero's object treatment, but it is a small win against a lot of risk in the
  most complex component on the site.
- **Typography**: the three faces and nine roles hold. No change.
- **New motion**: the site already moves (flips, turns, growth, weather, the
  cats). More would be noise. The new objects keep the tags' flip.
- **"AI engineer" positioning**: the brief asks for it, but the copy is a fact
  and claim question, not a design one, and the h1 is locked by Thien's own
  ruling (2026-10-28). Today AI shows up in the stamp (PRACTICE MAKES AI.), a
  seedling (TradeCorp, AI trading agents), the Diary (GenAI capstone, LLM
  reviewer) and the Ask itself. Raised as a decision, not drawn.

## Not covered

Real devices, Safari and Firefox (Chromium only). The live-model Ask.
