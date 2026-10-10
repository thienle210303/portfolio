# Round 19 — Voice rules and the Journey, in first person

Owner: Thien. Design agreed in conversation 2026-10-10. This is piece 1 and 2 of
the whole-page content rewrite; About, Worlds and Contact follow as their own
specs under the rules set here.

## 1. Why

The page carries ~7,800 words of visible copy (inventory, 2026-10-10), most of
it written *about* Thien in the third person. The Journey alone is ~3,900; on
desktop every `impact` sentence (up to 30 words each, ~230 words) is drawn as a
tree leaf at rest. The owner wants:

- **Audience:** everyone — recruiters, engineers, founders.
- **Voice:** plain and lightly playful; the *story* is told by motion and
  interaction (globe, crossing, stage, cats), not by prose; what text there is
  stays crisp and professional and shows the work.
- **Depth on demand:** how-and-why only after a click.
- **First person:** the site speaks as Thien ("I", "my"), never "he/his".

## 2. Voice rules — `docs/voice.md`

A one-page guide every later section follows:

1. **First person everywhere.** No "he / his / him / himself" in any rendered
   content field. Quotations of other people are the only exception.
2. **Surface vs depth.** At rest: titles, results, evidence (numbers, chips,
   recordings). Behind a click: context, responsibilities, impact sentences,
   case-study deep dives.
3. **Story belongs to motion.** Text never retells what an animation shows.
4. **Headlines:** ≤ 12 words, phrased as a result, every figure taken from the
   same record's own content. "I" allowed, not required. No adjectives about
   the person.
5. **Taste:** one idea per line; numbers beat adjectives; playful only where it
   costs nothing.
6. 3–4 before/after examples taken from the real page.

## 3. Data model

- `CareerEntry.headline?: string` (`src/types/portfolio.ts`), authored in
  `src/content/portfolio.ts` beside each entry.
- Required on every **drawn** entry (all except `DEMOTED_ENTRY_IDS`); not
  required on the nine demoted entries, which keep their one-line credential.
- Not indexed by the chat corpus: every headline restates facts the corpus
  already holds, so indexing adds duplicates and moves no retrieval floor.

### Approved headlines (owner, 2026-10-10)

| entry | headline |
|---|---|
| doordash | Reverse engineering scraper: 17 hours to 3 minutes. (owner's own words, 2026-10-10; "reverse engineering" is his description of the work) |
| wordification | Built a speech QA pipeline with 99.9% validated audio accuracy. |
| schaeffler | Moved paper setup sheets to low-code; my Java lifted throughput 96%. |
| usc-scraping | Collected 3M+ Amazon and Kroger records at 99.9% success, unattended for months. |
| usc-ta | Led Algorithm Design labs for 30+ students; helped 200+ in open lab. |
| eastside-high | Started American high school three weeks after I landed. |
| fu-of-kyoto | Our family restaurant, both sides: cooking on the line, waiting tables. |
| self-taught-gap | Drove for Uber Eats and taught myself whatever I was curious about. |
| usc-cheme | Chemical engineering: my first major, not the one I graduated in. |
| cs-switch | My friends said try it. I did, and it stuck. |
| usc-honors-ta | Graded and supported a 24+ student honors section of non-majors. |

Sources for every figure: `docs/superpowers/specs/2026-10-10-journey-headline-sources.md` (third-person drafts; the approved first-person lines are in the table above). The 96% stays
attached to the custom Java functions, as the source credits it.

### Owner facts settled 2026-10-10

- `usc-ta` ("…& General Programming") and `usc-honors-ta` ("…& General
  Applications Programming") are **two different courses** — both names stay.
- Eastside High is **three years** (grades 9, 11, 12 — one year skipped); the
  existing "Three years" wording is correct and stays.

## 4. Rendering

- **Desktop tree (`DrawnTree.tsx`):** branch label `role · org · year`, the
  headline beneath it, **technology chips are the only leaves**. Impact lines
  are no longer drawn as leaves.
- **Branch panel (click):** "What it changed" — the entry's impact lines,
  verbatim and in order — then kind · dates, "Ran alongside", case studies
  (unchanged).
- **Mobile list (`KnowledgeTreeList.tsx`):** at rest shows title, headline and
  chips without opening; the disclosure holds impact, dates, siblings, case
  studies.
- **No-JS and print:** same server-rendered content; print still expands every
  disclosure.
- **Unchanged:** credentials strip, stage animation, act structure, case-study
  component.

## 5. First-person pass (Journey scope)

Convert every third-person string the Journey renders or that career entries
carry: career-entry `context`, `learned`, `responsibilities`, `built`, `impact`
where they use he/his/him; act titles in `src/sections/CareerTree/acts.ts`
(e.g. "Friends talk him into it" → first person); the Journey lead. Owner-approved
lines (e.g. the 2026-10-02 learned lines) change **pronouns only**, same words.
Because one career entry feeds the Journey, `/resume`, globe plaques and the chat,
the change shows everywhere those fields are quoted — plaques stay verbatim
(they read the same field), and the retrieval eval is re-run with floors
unchanged. Every changed string is listed in the implementation plan for the
owner to see before it ships.

Out of scope here: About, Worlds and Contact copy beyond what career-entry
fields feed; those get their own first-person specs.

## 6. Tests

- Every drawn entry has a `headline`, ≤ 12 words; demoted entries need none.
- **Fact trace:** every number in a headline appears in the same entry's
  `impact`, `context` or `built` (normalised only for thousands separators and
  `%`). A headline can never introduce a figure.
- **Tree rule:** leaves are exactly the entry's own `technologies`, verbatim;
  every `impact` line renders verbatim in that entry's panel; "every authored
  fact is shown somewhere" still holds.
- **No third person:** a test fails if " he ", " his ", " him " or " himself "
  (word-bounded, case-insensitive) appears in any rendered content field, with
  an explicit allowlist for quotations of others.
- Unchanged and green: plaques 12 quoted + 7 computed string-for-string (texts
  update through the content layer); retrieval floors 0.9/0.95/0.7/0.8; e2e
  sections, axe, responsive, legacy-anchors.
- `CLAUDE.md`'s tree rule ("leaves are that entry's own `technologies` and
  `impact` fields") is updated to the new rule; `docs/editing.md` gains the
  headline recipe.

## 7. Constraints

No new dependency; semantic aliases only; blue never decoration; WCAG 2.2 AA;
initial JS must not grow by more than a few hundred bytes (headlines are short
server-rendered strings); `pnpm verify` + e2e green before merge.
