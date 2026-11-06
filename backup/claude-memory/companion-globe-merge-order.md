---
name: companion-globe-merge-order
description: "Merge-order constraint: the globe branch's rest assertion must be tightened in the same pass that claude/kind-feynman-b2f848 lands, or it silently stops catching anything"
metadata:
  node_type: memory
  type: project
  originSessionId: f2386ca9-838b-450d-8c80-bac25330f1d4
  modified: 2026-09-29T16:05:49.163Z
---

`claude/kind-feynman-b2f848` (2026-09-29) carries two companion fixes:
`d363739` — the rAF loop never reached its existing sleeping state on a page
nobody had touched (`dozing`/`wantsBed` were gated on `pointer !== null`), so
it ran 60 Hz indefinitely; and `99caf0a` — motion was spent per rAF callback
rather than per unit time (116/258/483 px/s at 30/60/120 Hz before,
274/269/266 after).

**The constraint:** `expectAtRest` in `e2e/worlds.spec.ts` on
`claude/round-16-playground-earth` asserts `pageHz < 100`, calibrated on the
cats holding 60 Hz forever. Once `d363739` lands that ceiling is stale and
would pass a globe spinning a loop that never draws — the exact thing it
exists to catch. It cannot be fixed on the globe branch alone (there the cats
still run, so a tightened ceiling fails immediately). **Whichever branch
merges second, drop that ceiling near zero and rewrite its comment in the same
pass.** Also recorded in
`.superpowers/sdd/2026-09-28-playground-earth-globe-and-workshop/progress.md`.

Related: [[playground-earth-round-16]].
