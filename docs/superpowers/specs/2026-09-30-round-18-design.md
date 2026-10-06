# Round 18 — Four sections, one journey

**Status:** design, awaiting owner review
**Date:** 2026-09-30
**Owner decisions captured:** 2026-09-30, this session (33-question input sheet + four follow-ups)
**Design canvas:** https://claude.ai/artifact/EPdt7cYXt5FWeGRyFmkeM7

---

## 1. Why this round exists

The owner's report: *"I have a pretty much mixed feeling about content currently because it is
made up too much and not show a really strong journey as I want."*

The audit found that diagnosis is right and the cause is not what it looks like. Three findings,
in order of how much they matter.

**The facts are sourced; the voice is not.** Every number in `src/content/portfolio.ts` traces to
the résumé, the old `portfolio-v2` repo, or something the owner said. Sitting on top of that is a
second layer nothing produced: `positioning`, `headline`, `intro`, three `about` paragraphs,
`focus`, two `philosophyIntro` paragraphs, three `principles` with detail paragraphs, nine
`problemSolvingLoop` step details, and three `codeTabs` holding fabricated TypeScript. Roughly
forty-five sentences of self-description written *about* the owner rather than *by* him. That
layer is what reads as invented, because it is.

**The journey was data, never a story.** `origin` held six fields feeding a map pin, a caption and
a kilometre count. No sentence on the site said what the crossing was, and the record had a
two-year-eight-month hole between December 2018 and August 2021. The section named "Journey"
began in 2021 and therefore omitted the journey.

**The content layer is a year behind the owner, and it understates him badly.** This finding needed
the résumé on the owner's drive and the old repo, neither of which the site reads:

| On the page today | Current résumé |
|---|---|
| "99% runtime reduction", "2.3× coverage", "failures eliminated" | **17 hours → 3 minutes**, 654 → 1,529 products, 3.9% failures → zero, HTML crawling replaced with a direct API |
| *nothing* | **$2.8M cumulative GOV restored**, by collapsing an eight-stage SKU governance process into one run, plus a monthly pipeline protecting it |
| "18+ live retailer integrations" | **20+ integrations, 40+ merchants**, millions of SKU-location records, nationwide store audits automated |
| "2 million+ records" | **3M+ records**, named: Amazon and Kroger product and seller data |
| Python · Playwright · SQL · Selenium | **+ Kotlin, Scrapy, Snowflake, Databricks, Zyte API, gRPC, Docker, Google Cloud** |
| "demo mode" + "an ElevenLabs integration" | a no-account game preview letting a teacher play a lesson as the student; automated speech-QA using ElevenLabs **and Google Cloud speech recognition**, with transcript verification and automatic regeneration |
| research from **August 2023** | **August 2022** (per `portfolio-v2`) — a full year understated |

The site has never carried a dollar figure. `$2.8M` and `17h → 3min` are the strongest facts the
owner owns.

---

## 2. Scope

**Ships:** four sections — About, World, Journey, Contact — plus a rewritten content layer and a
WebGL globe.

**Removed:** `SelectedWork`, `Skills`, `Workshop`.

**Untouched:** `/resume`, `/api/contact` and its Resend-to-`mailto:` fallback, the companion
(cats), `SiteNav`, `SiteFooter`, `Closing`, the Blueprint token system, the theme/tone split.

**Explicitly out of scope:** a CMS, a 3D dependency, a motion library, any change to the
`day`/`night` × `base`/`deep`/`contrast` architecture.

---

## 3. The content layer

This is the largest part of the round and everything else depends on it. `src/content/portfolio.ts`
remains the single source of truth; nothing below relaxes that.

### 3.1 New authored facts

```
origin
  born:        "2003-03-03"
  arrivedAge:  15                      // derived from born + arrived, not typed twice
  from:        "Kiên Giang, Việt Nam"   // unchanged
  to:          "Taylors, South Carolina"  // was "United States"
  arrived:     "December 2018"          // unchanged
  withFamily:  true
  english:     "Basic reading, writing and listening. No speaking."   // owner's words, condensed
  coordinates.to: { lat: 34.9226, lon: -82.3068 }   // VERIFY before authoring
```

`origin.to` changing from a country to a city is load-bearing: `src/lib/worlds.ts` currently pins
the geographic centre of the United States *because no city was authored anywhere*, and the
`where` string on the USA world says so out loud. Both change with this field.

```
profile
  location:     "Taylors, South Carolina"
  availability: "Open to remote, and to relocation when it's worth it."
```

Both are currently `undefined` with a comment explaining the deliberate omission. That comment is
replaced, not deleted — the reason it existed (an availability line advertises a job search to a
current employer) is now an accepted trade, and the file should record that the owner decided so.

```
companions[].belongsTo: "my girlfriend"
```

A correction, not an addition: the site currently implies the cats are the owner's.

### 3.2 New career entries

Six, all owner-supplied or old-repo-sourced. Each needs `context`, `impact`, `learned` filled or
deliberately empty — an entry with three empty arrays is exactly the Finding-03 problem this round
is removing, so a new entry that cannot be filled is not added.

| id | type | dates | what |
|---|---|---|---|
| `eastside-high` | learning | 2018 — 2021 | Eastside High School, Taylors SC. High school in a language he could read but not speak. |
| `fu-of-kyoto` | work | 2019 — 2021 | Chef and server at the family restaurant. **The most humanising entry on the site.** |
| `self-taught-gap` | learning | 2019 — 2021 | Unassigned by anyone: investing and stocks, growing plants, keeping an aquarium. Uber Eats. |
| `usc-cheme` | learning | Aug 2021 — 2022 | Chemical engineering. The wrong major, kept on the record on purpose. |
| `cs-switch` | milestone | 2022 | Switched to CS on friends' recommendation, and it stuck. |
| `usc-honors-ta` | work | Aug 2023 — May 2025 | The honors section for non-CS majors, currently folded into `usc-ta` and lost. |

**Date correction:** `usc-scraping.dateRange` becomes `August 2022 — May 2025` and `sortKey`
`2022-08`. `portfolio-v2` is the source.

### 3.3 Career entries updated from the current résumé

- `doordash.impact` gains: `17 hours → 3 minutes` runtime; `654 → 1,529` products; `3.9% → 0`
  failures; `$2.8M cumulative GOV restored`; `40+ merchants`; `20+ live integrations` (replacing
  `18+`).
- `doordash.built` gains the agentic scraping platform framing — reusable AI skills, multi-agent
  orchestration, deterministic validation gates — and the monthly eight-stage SKU governance
  pipeline.
- `doordash.technologies` gains Kotlin, Scrapy, Snowflake, Databricks, Zyte API, gRPC, Docker.
- `usc-scraping.impact`: `2 million+` becomes `3M+`, and the targets are named (Amazon, Kroger).
- `wordification.built`/`.impact`: the no-account game preview and the Google Cloud half of the
  speech-QA pipeline.

Every one of these is a résumé line. `metrics[].source` on the affected projects updates to name
the September 2026 résumé revision.

### 3.4 New projects

Four, from `portfolio-v2`, each with a real screen recording:

| id | dates | source | media |
|---|---|---|---|
| `chess-minmax` | Nov 2023 — Jan 2024 | `github.com/thienle210303/Chess` | `chess.mp4` |
| `conscea` | Mar — Apr 2024 | Azure DevOps (private) | `conscea.mp4` |
| `degreeworks-rebuild` | Jan — Apr 2024 | `github.com/AlexRishmawi/degreeauditGUI` | `degreework.mp4` |
| `toy-storefront` | Jul — Aug 2023 | — | `toys.gif` |

`chess-minmax` is the only thing in the whole record built purely out of curiosity — no class, no
client, no résumé line. It carries weight the hackathon placings do not.

**The `.exe` is not shipped.** `portfolio-v2` links a Windows binary; this site links the GitHub
source instead. A portfolio should not hand a visitor an executable.

### 3.5 Copy rewritten from facts

Replaced with sentences that each trace to a career entry, `origin`, or a metric:
`profile.positioning`, `profile.headline`, `profile.intro`, `profile.about` (three paragraphs),
`profile.focus`.

The owner's own answer to "what do you do" — *"keep question/curious myself, explore the world"* —
is the seed. About opens on the crossing, not on abstraction, and it stays **brief** per the
owner's note (*"make quick less introduction"*).

### 3.6 Copy deleted

`philosophyIntro` (2 paragraphs), `principles` (3 entries incl. their `detail` and `evidence`),
`problemSolvingLoop` (9 steps — Workshop was its only renderer), and the four dead AI-Lab strings
`labPositioning`, `labIntro`, `labLiveNotice`, `heroAskCaption`.

Also deleted: `src/content/workshop.ts`, `src/lib/workshop.ts`, `tests/lib/workshop.test.ts`, and
the retained-but-unrendered `experiments`, `learningLog`, `scrapingPlaybook` arrays in
`src/content/ai-experiments.ts` (owner: delete).

`src/lib/answer-sources.ts`'s `experimentsIndexable` loses the content it adapted and goes with it.
CLAUDE.md's instruction to keep it as "the adapter the next plan re-uses" is superseded by this
plan: there is no Lab to re-home. **CLAUDE.md must be updated in the same commit** — leaving a
standing instruction that contradicts the tree is worse than either state.

### 3.7 Copy kept, against the audit's first recommendation

- `profile.philosophy` — *"Unsolved is not the same as unsolvable."* Autogenerated, and the owner
  likes it. It stays, reframed in the content layer's comments as **a motto he adopted**, not a
  claim the site makes about him. That distinction is the whole point of this round and the comment
  must say it.
- `codeTabs` — kept, but the three fabricated object literals are **replaced with real code**. The
  owner asked for real if possible. Candidates: the orthographic projector from
  `src/lib/globe.ts`, and the min-max search from the chess repo. Both are real, public, and
  verifiable — which is more interesting than an invented object claiming he is "curious".
- `closingSignoffs` — playful, and the owner explicitly wants playful.
- `contactIntents` — all four, including *"It's a secret 🤫"* (owner: *"this website is pretty
  playful + professional showcase, don't want to be serious"*).
- `aiTools` — required by the World section's Technology chapter.

---

## 4. About

**Verdict:** keep the section, rewrite every word, cut three of four layouts.

**Problem today.** A full-height fold, a three-column grid, a margin rail, and a second full-width
band below — four layouts before the first real fact, and the code panel out-weighs the headline.
All the copy is from the invented layer.

**Design.** One fold, two columns: identity left, code artifact right, rail as margin. The second
band (`HeroAbout`) folds into the fold: with the copy cut to a brief introduction it no longer
needs a band of its own, which removes the layout that existed only because the paragraphs were
too long.

The order is the argument: **who arrived, from where, and what he does now** — then the code, then
one primary action. `profile.availability` and `profile.location` appear in the rail, which is
where facts already true in the content layer belong.

**2026-10-05, owner:** location leaves the rail, because the first About paragraph already says where he moved from and to (Kiên Giang, Việt Nam; Taylors, South Carolina).

**Audience** (owner: HR, engineers, founders, "anyone but a bit technology side") means one heading
that works for a non-engineer and one artifact that rewards an engineer. That is the existing
identity/code split, kept, with the copy fixed.

**Primary action.** The owner's answer to "what should they do" was *"nothing, enjoy the page then
contact me or leave a big impress"*. So About does not ask for anything. One quiet link into the
World, which starts the show. The single primary control on the page — the only blue button — is
in Contact.

**Files:** `Hero.tsx`, `HeroIdentity.tsx`, `HeroAbout.tsx` (merged away), `HeroCodeArtifact.tsx`
(real code).

---

## 5. World — the living Earth

**Verdict:** keep the rule, rebuild the renderer.

### 5.1 The rule that does not change

Everything drawn is a **plaque** (quotes one authored field verbatim, or renders one named
computation, and names its source) or a **decoration** (carries no fact and says so in its own
accessible name). `tests/lib/worlds.test.ts` enforces this string-for-string. Nothing in this
round relaxes it. It is the best idea on the site.

### 5.2 Engine: hand-written WebGL, no dependency

**Owner decision.** Measured alternatives against a 188.2 KB initial-JS budget: three.js ≈133 KB
gz, `@react-three/fiber` + `drei` ≈254 KB, `globe.gl` ≈509 KB. CLAUDE.md forbids all three and the
ruling was measured, not assumed.

A single sphere with a vertex and fragment shader pair costs roughly 10–14 KB of our own code and
lives in the **existing lazy chunk**, so initial JS does not move. It buys real lighting, a real
day/night terminator, an atmosphere rim, real depth, and — decisively — makes every mode a few
lines of fragment shader rather than a new scene graph.

`src/lib/globe.ts`'s orthographic projector is **kept**, not replaced: it still computes great
circles, arc apex and midpoint, and those are unit-tested. The shader draws; the projector still
does the maths.

`src/sections/Worlds/coastline-data.ts` stays fenced — `GlobeCanvas.tsx` remains its only
permitted importer and `tests/lib/coastline-data.test.ts` keeps failing if that changes.
`GlobeCanvas` still reaches the page only through the `import()` in `WorldsStage.tsx`.

**Fallback:** no WebGL context → the Canvas 2D globe shipping today, with the mode dial reduced to
the labelled list. That is the current section, which works.

### 5.3 Two axes: chapters × skins

The owner asked for every mode. Eleven modes on one dial is a menu; two orthogonal axes is a
system — and it is the same trick Blueprint already plays with theme and tone, which is why it will
feel native.

A **chapter** decides which facts are on the planet. A **skin** decides what the planet looks like
and carries no facts at all.

**Chapters (6) — each carries plaques:**

| Chapter | What happens | Quotes |
|---|---|---|
| Living Earth *(default)* | Lit from one side, terminator crawling. On entry the camera finds Kiên Giang, a light comes on, and the crossing draws itself to a second light in Taylors. | `origin`; computed crossing km |
| Sea | The water rises, land thins to islands, the arc's midpoint surfaces as a buoy. Jellyfish drifts past, labelled as decoration. | `usc-scraping` built / impact / learned |
| Sky | Camera pulls back, a cloud band turns, the crossing becomes an aeroplane flying it, apex marked. | computed crossing, seasons |
| Plants | Green creeps from the landing pin; a shoot rises off the surface and keeps going — off the top of the section, into the Journey below, where it is the trunk. | computed tree shape, still-growing caption |
| Animals | Moon and Mi walk the limb. Moon leads; Mi falls behind and gets distracted — their two authored fields, rendered. | `companions`; computed scene names |
| Technology | Surface goes to lattice, satellite counter-rotates. **The robot walks twice.** | two case-study taglines; every `aiTools` name |

**The robot, decided.** The owner asked which is better: a robot destroying human life, or AI
helping it. Neither alone — it walks the terminator **twice**. First pass unsupervised: city lights
go out behind it, one by one. Second pass with a human in the loop: they come back on, brighter
than before. This is not a compromise between the two ideas; it is the argument the content layer
already makes (*"Architecture and accountability stay human-owned"*) rendered instead of asserted.
Same walk, two passes, and the visitor decides which one they believe.

**Skins (5) — each carries nothing, and declares it:**

Ice Age (poles advance until they meet, ocean stills, colour drains, arc freezes mid-flight) ·
Night side (planet turns into the dark, every city a point of light) · Volcanic (molten fissures
along the coastlines, rim burns orange) · Underwater (camera drops below the surface, looks up from
inside, light shafting down) · Desert (oceans retreat, surface to sand, dust hazes the limb).

**2026-10-05, owner:** skins are drawn in the theme's ink and paper only; the hue words above (orange, sand) describe intent, not a colour the shader paints.

Every skin's accessible name carries `DECORATION_LABEL` — the same string the jellyfish already
uses. This is the owner's answer to "Ice Age has no fact to quote": *"I mean the animation, not a
quote or status — just a playful interaction and design."* A skin is honest decoration, which the
rule already permits. **A skin never gets a plaque**, and `tests/lib/worlds.test.ts` gains a case
asserting exactly that.

Six chapters × five skins is thirty planets out of eleven pieces of code.

### 5.4 Việt Nam, furnished

Five objects, all owner-named, all decorations: cơm tấm, bún bò Huế, bún cá Rạch Giá, mắm, Tết.

**Bún cá Rạch Giá is not decoration in the ordinary sense** — Rạch Giá is the capital of Kiên
Giang. It is a dish from the exact place `origin.from` names, which makes it the one drawing on the
globe that is also the map. The `draws` string should say so; the plaque rule is unaffected because
it still carries no *claim*.

The world's current `disclosure` — *"One object so far, and he named it himself. Nothing here was
invented to fill the space"* — updates to five and keeps its point.

### 5.5 Interaction and motion

Drag to spin, wheel to tilt, tap or keyboard-activate a marker for its panel. The chapter dial and
the skin dial are both real `<button>` toolbars, arrow-key navigable.

**The crossing animation plays once per visit** (owner), does not loop, and does not start until
the section is near the viewport — so nothing animates while a visitor is reading the bottom of the
page.

**2026-10-05, owner:** the crossing replays while the stage is in view and stops on deliberate interaction (or "Stop the replay"), instead of playing once.

**`prefers-reduced-motion`:** nothing animates. Every chapter and skin jumps to its finished state,
the arc is simply drawn, the robot's two passes become two static states behind a toggle. Still
every chapter, every skin, every fact.

---

## 6. Journey — the pinned stage

**Verdict:** keep the record, restage it completely.

**Problem today.** The drawn tree is taller than four viewports, so the reader is stranded between
a heading above and a payoff below with only a year label changing. Fourteen branches, nine of
which have empty `built`, empty `impact` and no `learned`. And it starts in 2021, so the section
called Journey omits the journey.

**Design.** One sticky stage, one viewport tall, holding the tree and nothing else. Scroll advances
*time*, not the page: the trunk lengthens, a branch opens, leaves land, the year turns over. Scroll
up and it runs backwards, frame for frame. The reader is never between two things — always looking
at the whole drawing, at one moment in its life.

Three escapes, all required:

1. **A scrubber** — a real labelled-by-year `<input type="range">` under the stage. Drag it and the
   drawing follows, so the show is watchable without scrolling and reachable by keyboard.
2. **"Show me the whole tree"** — skips to the final frame and releases the pin.
3. **`prefers-reduced-motion`** — no pin, no scrub. The seven acts render as seven stacked cards
   with the finished tree above them. Same story, told as a page.

### 6.1 Seven acts

| # | When | Act | Lands |
|---|---|---|---|
| 01 | Dec 2018, age 15 | **Kiên Giang to Taylors.** Arriving with family. The globe's arc finishes overhead and drops a seed into bare ground. Reading and writing basic, speaking at zero. No branch yet — this act exists to explain why there is a tree. | `origin`, crossing km |
| 02 | 2018 — 2021 | **Eastside High, and the family restaurant.** High school in a language he could read but not speak. Chef and server at Fu of Kyoto. Uber Eats. And unassigned by anyone: stocks and investing, growing plants, keeping an aquarium alive. He called it *bored, living day by day* — it is the only stretch that shows what he does when nobody sets the problem. | `eastside-high`, `fu-of-kyoto`, `self-taught-gap` |
| 03 | Aug 2021 | **The wrong major.** Chemical engineering. The trunk starts, the first ring forms, and the branch that opens is not the one the tree grows from. | `usc-cheme` |
| 04 | 2022 | **Friends talk him into it.** The switch to CS on a recommendation rather than a plan, and it stuck. In August the research scraping begins — a year earlier than the site currently claims. | `cs-switch`, `usc-scraping` start |
| 05 | 2022 — 2025 | **Three million records, and two classrooms.** Amazon and Kroger product and seller data, unattended for months. Two teaching roles, not one. Six course projects hang off this branch, four with real recordings. | 3M+ · 99.9% · 95% faster · 30+/200+/24+ taught |
| 06 | 2024 — May 2025 | **Two jobs, one summer, still in school.** Schaeffler and Wordification overlap and the research never stopped, so three branches are alive at once — the honest shape the current timeline hides. Then the rings stop and the credentials strip appears. | 1M+ reconciled at 99.9% · 96% throughput · 99.9% audio · 3.8 GPA |
| 07 | Oct 2025 → now | **Retail data, and the biggest number he owns.** The heaviest branch, the only one still growing, ending in the shoot that never resolves into a leaf. Leaves land in order of force, and the last one is **$2.8M**. | 17h→3min · 654→1,529 · 3.9%→0 · 30+ in a week · 40+ merchants · $2.8M |

**Overlap is drawn, not flattened** (owner: *"Yup multiple job!! I work crazy back then with school
as well"*). Act 06 shows three concurrent branches. `buildCareerTree()` is chronological with one
branch per entry; it needs to admit simultaneity, which today it does not express.

**The nine hollow entries stop being branches.** Dean's List, Magellan, Webmaster, the graduation
marker, both hackathons, the capstone and the classifier collapse into one credentials strip that
appears during Act 06 and stays. **Nothing leaves the content layer** — `/resume` still reads all
of them, and `careerEntries` is unchanged for those ids apart from a rendering hint.

### 6.2 Where the case studies go

`SelectedWork` is deleted, so each project's metrics attach to its role's branch as leaves. Three
consequences:

- **The globe's Technology plaques currently link to `#case-study-<id>` anchors that will not
  exist.** They re-point to Journey act anchors. `tests/lib/worlds.test.ts` must assert the link
  target resolves to a real anchor — which it does not assert today, and is the reason this could
  break silently.

  There is a structural problem hiding here: `src/lib/worlds.ts` imports `caseStudyAnchorId` from
  `src/sections/SelectedWork/anchors.ts` — a `lib/` → `sections/` import, i.e. the library reaching
  outward into a section it should know nothing about. Deleting that section breaks `lib/worlds.ts`
  at compile time. The replacement act-anchor helper therefore lives in `src/lib/` (or a shared
  `anchors` module under `lib/`), and no `lib/` file imports from `sections/` when this round is
  done. This is the "targeted improvement to code we're working in" the design owes: it is not
  unrelated refactoring, it is the only way the deletion compiles.

- **Case-study rendering components move; they are not all deleted.** `CaseStudy.tsx`,
  `MetricTable.tsx` and `WorkflowDiagram.tsx` render the prose and metrics that §6.2 keeps, so they
  move into `src/sections/CareerTree/` (or a shared `components/ui/` home if two sections use them).
  Deleted outright: the `SelectedWork.tsx` section shell, `ProjectIndex.tsx` and
  `MetricHighlights.tsx` — a project index and a metric summary band only make sense for a section
  that no longer exists.
- `#work` and every `journey-entry-<id>` fragment must keep resolving. `src/sections/CareerTree/anchors.ts`
  already does this for `#journey`; the same zero-size real-element pattern covers the rest. No
  client-side hash rewriting — it has to work with JavaScript off.
- The full case-study prose (`problem`, `whyItMattered`, `assumption`, `constraints`, `decisions`,
  `pathsExplored`, `whatFailed`, `failureLesson`, `nextQuestion`) survives in the content layer and
  renders inside an opened branch. It is the site's best writing and it is not deleted to make a
  section shorter.

### 6.3 The tree's roots

`Skills` is deleted, so `skillCategories` stops being the tree's drawn roots. **The roots become
the crossing** — which is where the journey should have started anyway. `skillCategories` itself
stays in the content layer: `/resume` renders it, and `RootLabels.tsx`'s label-only treatment is
replaced rather than the data.

### 6.4 The recordings

Four real screen recordings exist in `Portfolio-v2/src/assets/experience`. Video is the one kind of
evidence this site has none of. Owner approved bringing them across.

**They cannot ship as they are.** Raw sizes: `toys.gif` **45.0 MB**, `degreework.mp4` **19.4 MB**,
`foodroute.gif` **10.6 MB**, `mentorhub.mp4` **7.5 MB**, `chess.mp4` **4.2 MB**, `conscea.mp4`
**2.1 MB** — about 89 MB total.

Requirements:

- Re-encode every one to H.264 MP4, **target ≤ 1.5 MB each**. The two GIFs become MP4; a 45 MB GIF
  is a ~1 MB video.
- `<video preload="none" muted loop playsinline>` with a poster frame, inside the branch's
  disclosure. Nothing fetches until a visitor opens that branch.

  **2026-10-05, owner:** recordings sit outside the disclosure, above the action row (on the credentials strip for Food Route), and each carries a `recordingDescription`; they still mount only on press.
- No `autoplay` outside an opened branch, and honour `prefers-reduced-motion` by showing the poster
  with a play control instead of looping.
- `pnpm perf` is re-run and the row recorded in `docs/feedback-tracker.md`. Initial JS must not
  move; if it does, the video is not lazy.

---

## 7. Contact — no typing required

**Verdict:** keep the intents, invert the reward.

**Problem today.** Choosing an intent earns a starter sentence and a blank `<textarea>` — the
choice promises less work and then asks for more. Three stacked asks in one column beside a sticky
card, and the lightest path is visually the smallest thing on screen.

**Design.** Choosing an intent produces a **complete, sendable message**. Editing is optional.

1. **Four intent cards** — `contactIntents` unchanged, all four, secret included.
2. **A finished draft appears**, plus two fields (name, reply-to) and one primary button, *"Send it
   as written"*. A secondary *"Add a line of my own"* expands the textarea that is mandatory today.
   Each draft is honest about being a template: it says what the sender wants, not what they feel.
   `contactIntents[].messageStarter` becomes `messageDraft` — a whole message, not an opening.
   **I write the four drafts** (owner: *"Do your"*).
3. **Four ways out with no form at all** — copy the email, LinkedIn, GitHub, résumé PDF. Currently
   buried; promoted to a row.
4. **Book twenty minutes** — Cal.com, as a plain `<a href>`, never an embedded widget. That keeps
   the JS budget and the no-dependency rule intact. **Blocked on the owner creating the event and
   supplying the URL.** Until then the control is not rendered — the same "a fact the site does not
   have renders as nothing" rule the rest of the site follows.
5. **Ask this site** — see §7.1.

The business card panel stays, and stays printable.

**One primary control per screen** is a Blueprint rule: the only blue button in this section is
*"Send it as written"*. Cal.com and Ask are secondary.

### 7.1 Where AskThisSite goes

The owner loves it and did not know where to put it (*"Keep it!! I love that but don't know where
to add it 🤔"*). It leaves the hero and becomes **Contact's fifth option**: *"Ask about my work"*,
beside the four drafts. A visitor who wants to interrogate the record rather than email is doing
the same thing the four drafts do — making contact with less effort. It belongs with them.

This has a content consequence. The retrieval corpus (`src/lib/answer-corpus.ts`,
`answer-sources.ts`, `src/content/answer-expansion.ts`) indexes the sections being deleted. It must
be re-indexed against the new four-section page, and `tests/lib/answers.test.ts` plus
`answers-retrieval.test.ts` re-run.

**Do not re-index `workflowStages`' `watchFor` strings.** CLAUDE.md records why: they were the
corpus's only carriers of the word "file", so *"how do I file my taxes"* retrieved them, and gating
the engine harder instead cost ten points of recall@3. `workflowStages` is deleted with Workshop,
so this resolves itself — but the retrieval eval must be re-run to confirm the precision hole
closed rather than moved.

Moving Ask out of the hero also removes `AskThienHeroTab.tsx` and shrinks the hero, which §4 wanted
anyway.

---

## 8. Cross-cutting

**Nav.** `navItems` goes from seven to four: About, World, Journey, Contact. It must stay in
`src/app/page.tsx`'s render order — the nav doubles as the table of contents. CLAUDE.md's note
about seven items fitting at 1024px is measured and now stale; it is updated, not deleted.

**Accessibility — WCAG 2.2 AA, unchanged.** The two new mechanisms are where the risk is:

- The pinned stage must not trap keyboard focus, must expose the scrubber as a real labelled range
  input, and must render completely under `prefers-reduced-motion`.
- The WebGL canvas is decorative-with-a-text-alternative: every plaque and marker is also a real
  focusable control in the DOM, not a hit-test on pixels. This is how the section works today and
  it does not regress.
- `e2e/accessibility.spec.ts` runs axe across both themes and all three tones. A new chapter or
  skin is a new visual state, so the sweep gains the chapter/skin matrix rather than testing the
  default only.

**Performance.** Lighthouse 90+/95+/95+/95+ and the initial-JS budget are design constraints.
Every rule in CLAUDE.md about the globe chunk still applies: the shader, the coastline data and the
video all load lazily, `pnpm perf` runs against a production build, initial JS is read first, and a
run reporting any skipped responses is not recorded.

**Contrast.** No palette token changes are planned. If any does, `pnpm contrast` regenerates
`docs/contrast.md` and fails below 4.5:1 — and tertiary tones are checked against
`--color-paper-deep`, not `--color-paper`.

**Tests.** Deleting three sections deletes their tests. New coverage required:

- `tests/lib/worlds.test.ts` — a skin never carries a plaque; every plaque link resolves to a real
  anchor.
- `tests/lib/knowledge-tree.test.ts` — concurrent branches; the credentials-strip demotion; roots
  are the crossing.
- `tests/lib/origin-story.test.ts` — `arrivedAge` derives from `born`, and is not typed twice.
- New: the act-anchor helper, and the seven-act ordering.
- `pnpm verify` (typecheck → lint → contrast → test → build) gates the whole thing.

---

## 9. Order of work

Deleting first breaks the site. The rehome comes before the cut, every time.

1. **Content layer.** New facts, new entries, résumé updates, new projects, rewritten copy,
   deletions. Nothing renders differently yet, but `pnpm verify` must pass — this step alone proves
   the content changes are type-safe.
2. **Journey stage.** Seven acts, the pin, the scrubber, the credentials strip, the case studies
   folded in, act anchors live. `#work` and every `journey-entry-<id>` still resolve.
3. **Re-point the globe's plaques** to act anchors, with the new test asserting they resolve.
4. **Delete `SelectedWork`.** Now safe: nothing links into it.
5. **Re-root the tree on the crossing, then delete `Skills`.**
6. **Move Ask into Contact, re-index the corpus, re-run the retrieval eval, then delete
   `Workshop`** (and `workshop.ts`, `lib/workshop.ts`, its test, the `ai-experiments` arrays,
   `experimentsIndexable`).
7. **Update CLAUDE.md** in the same commit as step 6 — its Workshop, Lab and `experimentsIndexable`
   instructions are superseded.
8. **About.** Rewrite, merge the band, real code in the artifact.
9. **Contact.** Drafts, the no-form row, Cal.com (if the URL exists), Ask in place.
10. **World.** The WebGL engine, six chapters, five skins, the two-pass robot, the five Việt Nam
    objects.
11. **Videos.** Re-encode, wire into branches, re-run `pnpm perf`, record the row.
12. **Verify.** `pnpm verify`, then `pnpm dev` in both themes, then `pnpm test:e2e`, then
    `pnpm perf` against a production build.

Steps 1–7 are subtraction and rewiring. Steps 8–11 are the new experience. The site is shippable
after step 7 and after every step thereafter.

### 9.1 This is three implementation plans, not one

The scope check is honest: twelve steps spanning a content-layer rewrite, three section deletions, a
new scroll mechanic and a hand-written WebGL renderer is too much for one plan to hold well. It
decomposes cleanly, because each part ends with a site that builds and ships:

- **Plan A — Subtract and rewire** (steps 1–7). The content layer is correct and current, the
  Journey stage exists with seven acts, and the page is four sections. The riskiest part, because
  everything else depends on the content layer being right, and the part with the clearest
  finish line: `pnpm verify` green with three sections gone and nothing linking into them.
- **Plan B — About and Contact** (steps 8–9). Small, independent, mostly copy and layout. Could be
  done before Plan C or in parallel with it.
- **Plan C — The living Earth** (steps 10–11, plus the videos). The WebGL engine, six chapters, five
  skins, the two-pass robot, and the re-encoded recordings. Self-contained behind the existing lazy
  chunk, and the only part with a hard performance gate of its own.

Plan A is written and executed first. Each gets its own plan → implementation → verification cycle
against this one spec.

---

## 10. Still blocked on the owner

1. **Cal.com URL** — the control is not rendered until it exists.
2. **Act 02's own sentence.** The facts are captured (Eastside High, Fu of Kyoto, Uber Eats,
   investing, plants, aquarium). The owner's note was *"don't public anything that not worth it"*,
   so the act will be drafted from those facts and **held for his approval before it ships**. He
   said one moment from those years was *"just being bored and live day by day"* — that line is
   better than anything written about him, and it is his to authorise.
3. **`coordinates.to` for Taylors** — 34.9226, −82.3068 to be verified before authoring.

None blocks starting at step 1.

---

## 11. Deliberately not doing

- No 3D library, no motion library, no component library, no CMS. (CLAUDE.md, and re-confirmed by
  the owner this round.)
- No résumé section. It is a route, and it was almost entirely a second rendering of the timeline.
- Not deleting `careerEntries` for the nine demoted milestones — they stop being drawn, not stored.
- Not publishing the phone number `portfolio-v2` published.
- Not shipping the chess `.exe`.
- Not re-indexing `workflowStages`' `watchFor` strings.
