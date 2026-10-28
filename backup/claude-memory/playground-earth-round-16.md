---
name: playground-earth-round-16
description: "Round 16 (2026-09-02/04) — playful globe redesign; PR #9 moved the chat into the hero, PR #10 deleted Philosophy and the AI Workflow Lab; plan 3 (globe + Workshop) not started"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9beee380-2f4f-4f07-a4ae-33e838b3aa29
  modified: 2026-09-02T22:58:46.543Z
---

On 2026-09-02 Thien redirected the portfolio: "more interactive and playful!!",
a draggable Earth holding many worlds (Vietnamese, USA, animal, plant, sea,
fly, technology), the page rebuilt around turning an idea into real work,
remove Philosophy, move the chat into the hero code artifact, remove the old
AI Workflow Lab, keep Contact with a creative add-on, redesign and install
anything if needed.

A 20-agent design round (6 readers, 5 concepts, 3 tech researchers, 3 judges,
synthesis + critic + repair) ran as workflow `wf_a9a26606-821`. **Playground
Earth won all three judge lenses** (191 vs 183/181/173/170): the globe is ONE
section below the fold, the cats look after it, and rolling it east flies the
December 2018 crossing at exactly your speed.

Committed at `20166f2`: the spec
`docs/superpowers/specs/2026-09-02-playground-earth-design.md` and plan 1
`docs/superpowers/plans/2026-09-02-foundation-perf-gate-and-chat-move.md`
(perf script + the chat's move into the hero tab). Plans 2 and 3 (content
layer + demolition, then the globe) are not written yet.
Mockup: https://claude.ai/code/artifact/b390f6dc-466f-47c8-acb4-bc47ba9e75f8
The earlier Structure First proposal is superseded and its spec was deleted.

**Thien's five blocking answers, 2026-09-02:** (1) Việt Nam world = **cơm
tấm**, one object he named; nothing else invented. (2) The place name is
**"Kiên Giang, Việt Nam"**, province level — NOT Rạch Giá. This changes
`origin.from` itself so one string serves the globe, the origin story and
every caption. (3) US pin at a country centroid, unlabelled. (4) **Delete
the AI Workflow Lab outright** — his words were "nobody is gonna read them",
which is stronger than the spec's original re-homing plan: the five
experiment articles and the learning-log essays are retired from the page,
though `src/content/ai-experiments.ts` stays in the repo unrendered so the
call is reversible. (5) The cats are real: **Moon**, the blue cat, leads;
**Mi**, the grey tabby, follows.

**Measured baseline (production build, 4x CPU, ~1.6Mbps) — real, not
estimated:** JS 207.4 KB gz, fonts 331.4 KB, LCP 3.88 s, TBT 359 ms, CLS 0,
rootMainFiles 130.7 KB gz. Newsreader *italic* alone is 143.6 KB and is used
in exactly two places (BusinessCard.tsx:275, Closing.tsx:76) — the single
biggest available win, tracked as a separate decision.

**Why:** three.js/r3f/globe.gl were all rejected on verified size (133/254/509
KB gz) against that budget; the shipped approach is a no-dependency
orthographic Canvas 2D globe (24.5 KB engine + 18.4 KB gz coastlines, 1.8
ms/frame, 0 rAF at rest). Do not re-propose a 3D library.

**Shipped so far (both open as PRs against main, unmerged):** PR #9 `claude/round-16-foundation` — perf script + chat into the hero tab. PR #10 `claude/round-16-demolition`, stacked on #9 so its diff contains #9 — Philosophy and the AI Workflow Lab deleted with every dependent. Measured across both: initial JS 207.4 -> 188.2 KB, DOM nodes 4369 -> 3325. Plans: docs/superpowers/plans/2026-09-02-foundation-perf-gate-and-chat-move.md and 2026-09-02-demolition-philosophy-and-lab.md.

**Open live-site defect, recorded not fixed:** a jump to #contact leaves the companion follower 19px from the theme toggle against WCAG's 24px floor (18px on main, so pre-existing); a compound jump measures -45px, unverified against main. Recorded as a test.fixme in e2e/companion.spec.ts and in the tracker's Round 16 section. Needs its own round.

**How to apply:** Plan 3 is the globe + Workshop. Still open and
non-blocking: four authored strings become false when the chat moves and need
Thien's approval; the Workshop's `test` station is empty for four of five
projects; `automotive-genai` has no `assumption` and no `metrics`. The
design's key invention is the plaque/decoration rule: every drawn
object either quotes ONE authored field verbatim with a typed
`{type,id,field,index}` reference, or is labelled `no plaque · decoration`.
Related: [[feedback-tracker-2026-08]].
