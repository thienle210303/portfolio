---
name: round-18-scope
description: "Round 18 cuts Work/Skills/Workshop to four sections; owner decisions on WebGL globe, 7-act pinned Journey, and the gap years"
metadata:
  node_type: memory
  type: project
  originSessionId: ba9adc0c-7958-4cf7-aaaf-22655a7b388e
  modified: 2026-10-01T00:00:18.179Z
---

Round 18 (spec committed 2026-09-30, `docs/superpowers/specs/2026-09-30-round-18-design.md`, three
implementation plans in §9.1). Owner decisions made this session, so they are settled and should not
be re-litigated:

- **Globe engine: hand-written WebGL, no library.** Thien chose this over three.js explicitly, so
  CLAUDE.md's measured no-3D-dependency ruling stands. ~10–14 KB of our own shaders in the existing
  lazy chunk.
- **Modes split on two axes** — 6 chapters (carry plaques) × 5 skins (carry no fact, declare it via
  `DECORATION_LABEL`). Ice Age is a skin: Thien confirmed he meant animation, not a quote.
- **The robot walks twice** — unsupervised pass darkens cities, human-in-the-loop pass relights them.
  He asked "which is better" and this was the answer, grounded in the content layer's own
  "architecture and accountability stay human-owned".
- **Case-study metrics move into Journey acts as leaves**; `SelectedWork` is deleted only after the
  globe's plaques re-point to act anchors. See [[answer-gate-vs-index-surface]] for why the corpus
  re-index must not re-index `workflowStages`.

Facts Thien authored that the content layer did not have: born 3 March 2003, arrived Dec 2018 aged
15 with family, Taylors SC, Eastside High School, chef/server at family restaurant Fu of Kyoto,
Uber Eats, self-taught investing + plants + aquarium in the gap years, first year at USC was
*chemical engineering*, friends talked him into CS. Moon and Mi are his girlfriend's cats (the site
implied they were his).

**His résumé on disk is newer than the site and the site understates him** — $2.8M GOV restored,
17h→3min, 654→1,529 products, 3.9%→0 failures, 3M+ records, 40+ merchants, and Kotlin/Scrapy/
Snowflake/Databricks/Zyte/gRPC/Docker. Also `usc-scraping` starts Aug 2022, not Aug 2023. When
content feels thin here, check the résumé and `D:\Project\Portfolio-v2` before assuming the facts
don't exist.

**Why:** Thien's complaint was "content is made up too much" — the cause is an unsourced voice layer
over sound facts, plus stale evidence, not fabricated numbers. See [[evidence-before-claims]].

**How to apply:** rehome before deleting (globe plaques → act anchors, tree roots → the crossing);
`src/lib/worlds.ts` imports `caseStudyAnchorId` from `sections/SelectedWork/`, so that import must
move into `lib/` or the deletion won't compile.

**Status 2026-10-02:** Plan A (subtract and rewire) merged and PUSHED (origin/main 1c4cf84);
Plans B (About + Contact) and C (the Earth) unstarted. Tree roots were retired entirely, not
re-homed. Owner answers recorded: drafted prose approved; Fu of Kyoto ended summer 2022; the
hobby list (investing, plants, aquarium) is cut as "not that useful" — he wants LLMs/ML shown as
his current interest instead; Journey lead is "Started in a kitchen. Still growing." — he wants
copy SHORT and creative, not explanatory. Next ask: cats roam the whole page. Lesson that cost a
fix wave: "fails on base" must mean the merge-base with main, not a commit inside the branch.
