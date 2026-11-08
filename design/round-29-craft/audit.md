# Round 29 audit — the furniture that is left

Captured 2026-11-07 from a production build of `main` (60e295e, round 28
built) with `pnpm shots audit-r29`: nine widths, day and night, plus states.
Read against the brief "less boxy, more human, break the grid, purposeful
micro-interactions, not a redesign" and the house rules (CLAUDE.md, the-pass).
Chromium only.

## The verdict first

The objects are done. The hero hangs a seed packet, a boarding stub, a library
card and a receipt; the oak carries manila tags; the Diary is a book; Contact
is one desk. The brief's screenshot is this site's own oak. So the big moves the
brief lists (silhouettes, clipped corners, overlap, asymmetry, distinct
compositions per section) are already the design, and redoing them would be a
redesign.

What is left is smaller and more telling: **the controls and the small parts
between the objects are still stock web UI.** A visitor's eye lands on the
paper, and then on a flat green rectangle, a pill, a circle-bullet list and a
grey bar. Those are the places that still say "template". And nothing on the
page answers the hand: you can press a chapter, but paper never moves when you
reach for it.

## What still reads as template, in order

| # | Where | What | Why it matters |
|---|---|---|---|
| 1 | Every section | **The one primary control is a flat 2px rectangle**: "See what I've built", "Watch it grow", "Send the postcard". It is the same button any starter kit ships, set against hand-made objects, and it is the thing the page most wants pressed. | The most-looked-at control is the least designed thing on the page. |
| 2 | Contact, the card | **Two pills and a round copy button** ("Résumé", "Save contact"). They are the only `rounded-full` controls on the site, a SaaS chip on a letterpress card. | Breaks the "paper is square-cut" rule (system §4) in the one place a recruiter clicks. |
| 3 | Contact, the Ask | **The notepad is a white rectangle with a web form on it**: an outlined "Ask" button, circle bullets before each suggestion, a dashed column rule. Round 28 called it a notepad sheet; only its position changed. | The suggestions read as a nav list, not as things I jotted down for you. |
| 4 | Diary, page 1 | **Five taped notes, one format**: same white card, same strip of tape, same layout, only the kind dot differs. Round 28 left this for later. | A page about variety ("wider rings, busier years") is the most repetitive spread in the book. |
| 5 | Everywhere | **Paper never answers the hand.** No hover or focus response on the hero's chapters, the oak's tags, the seedling markers or the Diary's notes, though all are links or buttons. | The brief's "micro-interactions": the one that belongs here is the obvious one, picking paper up. |
| 6 | Page foot | **The footer is a dark web bar**, 54px, flush and square. The page is a walk from a paddy to a desk, and it ends in a strip of `#1c2220`. | The last impression is the most generic one. |

## Considered and left alone

- **The objects themselves** (hero papers, oak tags, nursery, the book, the
  desk): rounds 27 – 28, approved and built today. Varying them more is noise.
- **Section titles.** Each section opens with a left-set title and an italic
  line. That is the system's type rhythm, not repetition: the compositions under
  them already differ (a line, a tree, a book, a desk).
- **Radius.** Corners are already 0 – 2px paper with clipped shoulders where a
  tag has them; the brief's "mix corners" is met by the objects. The pills in
  #2 are the exception, fixed there.
- **New decoration.** No new illustrations are needed for any of the six; each
  fix reuses a drawn mask (`nav-swash`, `bank-grass`, `paper-clip`) or is CSS on
  paper that already exists.
- **More motion.** Flips, turns, growth, weather and the cats already move. #5
  is the only addition, and it is hover/focus feedback, not animation to watch.
- **Copy and the "AI engineer" question** (round 28): unchanged, Thien's.

## Not covered

Real devices, Safari, Firefox. The live-model Ask.
