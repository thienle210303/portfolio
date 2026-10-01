# Round 18 Plan A — Subtract and Rewire: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the content layer current and complete, restage the Journey as seven acts on a pinned stage, and remove the Work, Skills and Workshop sections without breaking anything that links into them.

**Architecture:** Content layer first — every new fact, correction and deletion lands in `src/content/portfolio.ts` while the page still renders the old seven sections, so type-safety proves the content is right before any UI moves. Then the Journey stage absorbs the case studies and grows act anchors. Then, and only then, the three sections are deleted, in the order that keeps every inbound link resolving. The honesty rule never relaxes: a plaque quotes an authored field verbatim or renders a named computation, and `tests/lib/worlds.test.ts` enforces it string-for-string.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Tailwind v4 via `@theme` in CSS (no `tailwind.config.js`), vitest + jsdom, Playwright + axe-core, pnpm only.

**Spec:** [docs/superpowers/specs/2026-09-30-round-18-design.md](../specs/2026-09-30-round-18-design.md)

## Global Constraints

- **pnpm only.** Never introduce an npm or yarn lockfile.
- **TypeScript is strict.** No `any`, no non-null assertions added to make a type fit.
- **Tailwind v4 via `@theme` in `src/app/globals.css`.** There is no `tailwind.config.js`; do not create one.
- **Components style against semantic aliases only:** `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-rule`, `bg-surface`, `bg-ground`, `text-accent`. Never a raw `--color-*` token, never a literal hex.
- **Blue is the only hue**, reserved for annotation, links, measured values and the single primary control per screen. Never decoration.
- **The margin rail carries facts already true in the content layer**, computed from the data. It never restates the prose beside it and never holds a fact that exists nowhere else.
- **No new runtime dependency.** No 3D library, no motion library, no component library, no icon font.
- **Targets: WCAG 2.2 AA, Lighthouse 90+/95+/95+/95+.** Design constraints, not afterthoughts.
- **`navItems` order must match `src/app/page.tsx` render order** — the nav doubles as the page's table of contents.
- **Every task ends green:** `pnpm test` passes. Every task that changes a palette token also runs `pnpm contrast`. The final task runs `pnpm verify`.
- **Facts come from three sources only:** the September 2026 résumé (`C:\Users\thien\Downloads\Thien_Le_Software_Engineering_Resume.pdf`), `D:\Project\Portfolio-v2`, and the owner's answers recorded in the spec. Anything else is `[NEEDS INPUT: …]` and renders as nothing.

## Review Focus

Five things the spec implies, that no task's happy path exercises, and that would bite a real visitor. Each one's test is assigned to the task that owns the code.

1. **A plaque link pointing at an anchor that no longer exists** — the globe's Technology plaques link to `#case-study-<id>`; after Task 12 those ids are gone. A visitor clicks and lands nowhere, silently, with no error. → Task 10 asserts every resolved plaque `link` resolves to an id some act or branch actually renders.
2. **An old inbound URL** — `#work`, `#skills`, `#workshop`, `#journey`, `journey-entry-<id>` and `case-study-<id>` are in bookmarks, in the résumé PDF and possibly indexed. After the cut they must still land somewhere sensible with JavaScript disabled. → Task 13 asserts each legacy id resolves to a real element.
3. **A new career entry with nothing authored on it** — the whole point of Finding 03 is that an entry with empty `built`, empty `impact` and no `learned` is padding. Six new entries are added in Tasks 3–4; a careless one re-creates the problem this round removes. → Task 4 asserts every entry added this round carries at least one of `impact`, `built` or `learned`.
4. **Two spellings of one fact** — `origin.arrived` is prose ("December 2018") and `origin.arrivedOn` is machine-readable ("2018-12"). They can drift, and nothing would fail. Likewise `arrivedAge` typed by hand instead of derived. → Task 1 asserts the two agree and that the age is computed, not typed.
5. **Concurrent roles rendered as sequential** — the owner worked Schaeffler and Wordification *and* research *and* school at once. `buildCareerTree()` sorts by `sortKey` and says nothing about overlap, so Act 06 would silently draw three branches as a sequence. → Task 8 asserts the three 2024 entries are reported as concurrent.

---

## File Structure

**Content layer (Tasks 1–7)**
- Modify `src/types/portfolio.ts` — `Origin` gains `born`, `arrivedOn`, `withFamily`, `english`; `Companion` gains `belongsTo`; `Principle` and `LoopStep` are deleted.
- Modify `src/content/portfolio.ts` — the single source of truth. New origin fields, new profile fields, six new career entries, résumé corrections, four new projects, rewritten copy, deleted invented copy.
- Modify `src/lib/origin-story.ts` — gains `arrivedAge()`.
- Delete `src/content/workshop.ts`, `src/lib/workshop.ts`, `tests/lib/workshop.test.ts`.
- Modify `src/content/ai-experiments.ts` — delete `experiments`, `learningLog`, `scrapingPlaybook`, `workflowStages`, and the four dead Lab strings.

**Anchors (Task 9)**
- Create `src/lib/anchors.ts` — the seven act ids, `actAnchorId()`, and the entry → act and project → act maps. This is the file that lets `lib/` stop importing from `sections/`.

**Journey (Tasks 8, 10–11)**
- Modify `src/lib/knowledge-tree.ts` — `concurrentGroups()`, and branch demotion for the credentials strip.
- Create `src/sections/CareerTree/acts.ts` — the seven acts as data, each naming its entries and its anchor.
- Create `src/sections/CareerTree/Stage.tsx` — the pinned stage, the scroll-to-time mapping, the scrubber, the release.
- Create `src/sections/CareerTree/CredentialsStrip.tsx` — the nine demoted entries as one line.
- Move into `src/sections/CareerTree/`: `CaseStudy.tsx`, `MetricTable.tsx`, `WorkflowDiagram.tsx`.

**Deletions (Tasks 12–14)**
- Delete `src/sections/SelectedWork/` (shell, `ProjectIndex.tsx`, `MetricHighlights.tsx`, `anchors.ts`), `src/sections/Skills/`, `src/sections/Workshop/`.
- Modify `src/app/page.tsx`, `src/content/portfolio.ts` (`navItems`), `src/lib/companion-facts.ts`, `src/lib/answer-sources.ts`, `src/lib/answer-corpus.ts`, `CLAUDE.md`.

---

### Task 1: `origin` learns when he was born, and the age is computed

The spec's §3.1 adds the crossing's missing facts. The age must never be typed: it is `born` and `arrivedOn` subtracted, so it cannot go stale or disagree with itself.

**Files:**
- Modify: `src/types/portfolio.ts` (the `Origin` interface)
- Modify: `src/content/portfolio.ts` (the `origin` object)
- Modify: `src/lib/origin-story.ts` (add `arrivedAge`, `arrivedOnAgreesWithArrived`)
- Test: `tests/lib/origin-story.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `arrivedAge(): number`, `arrivedOnAgreesWithArrived(): boolean`, and `origin.born` / `origin.arrivedOn` / `origin.withFamily` / `origin.english` on the `Origin` type. Task 6 reads `origin.to`; Task 11 reads `arrivedAge()`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/origin-story.test.ts`:

```ts
describe("the crossing's own arithmetic", () => {
  it("computes his age on arrival rather than carrying a number", () => {
    // Born 2003-03-03, arrived 2018-12. Fifteen, and nothing in the content
    // layer says "15" — if it did, a birthday would silently make it wrong.
    expect(arrivedAge()).toBe(15);
    expect(JSON.stringify(origin)).not.toContain('"arrivedAge"');
  });

  it("keeps the prose date and the machine date agreeing", () => {
    // `arrived` is what a reader sees; `arrivedOn` is what the arithmetic
    // uses. Two spellings of one fact is exactly the drift this site exists
    // to prevent, so it is asserted rather than trusted.
    expect(arrivedOnAgreesWithArrived()).toBe(true);
  });

  it("derives arrivedYear from arrivedOn rather than carrying it separately", () => {
    expect(origin.arrivedYear).toBe(Number(origin.arrivedOn.slice(0, 4)));
  });
});
```

Add `arrivedAge` and `arrivedOnAgreesWithArrived` to the file's existing import from `@/lib/origin-story`, and `origin` to its import from `@/content/portfolio`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/origin-story.test.ts`
Expected: FAIL — `arrivedAge is not a function`.

- [ ] **Step 3: Extend the `Origin` type**

In `src/types/portfolio.ts`, inside `export interface Origin`:

```ts
  /** ISO date. The only birth date on the site; `arrivedAge()` subtracts it
   *  from `arrivedOn` so no age is ever typed twice. */
  readonly born: string;
  /** `YYYY-MM` — the machine-readable twin of `arrived`. `arrived` is prose a
   *  visitor reads; this is what arithmetic uses. `arrivedOnAgreesWithArrived()`
   *  asserts they never drift apart. */
  readonly arrivedOn: string;
  /** He did not arrive alone. One boolean, because the alternative is a
   *  sentence this file would be inventing. */
  readonly withFamily: boolean;
  /** His own description of the English he landed with, condensed from his
   *  words and nobody else's. */
  readonly english: string;
```

- [ ] **Step 4: Author the facts**

In `src/content/portfolio.ts`, replace the `origin` object body:

```ts
export const origin = {
  from: "Kiên Giang, Việt Nam",
  // Round 18: a city, not a country. Until now no city was authored anywhere
  // on this site, which is why the globe pinned the geographic centre of the
  // United States and said so out loud in the USA world's `where` line. Both
  // change with this one field.
  to: "Taylors, South Carolina",
  arrived: "December 2018",
  arrivedOn: "2018-12",
  arrivedYear: 2018,
  born: "2003-03-03",
  withFamily: true,
  english: "Basic reading, writing and listening. No speaking.",
  coordinates: {
    from: { lat: 10.0, lon: 105.1 },
    // Taylors, South Carolina. VERIFY against a gazetteer before shipping —
    // this is the one coordinate pair on the site not taken from a source
    // document.
    to: { lat: 34.9226, lon: -82.3068 },
  },
} satisfies Origin;
```

- [ ] **Step 5: Implement the two functions**

Append to `src/lib/origin-story.ts`:

```ts
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * His age when he landed, in whole years — `origin.born` subtracted from
 * `origin.arrivedOn`, never typed. Uses the first of the arrival month, which
 * is the conservative read: it can only ever understate the age by rounding
 * down, and it never needs a day that nobody authored.
 *
 * Deliberately not `Date.now()`-relative. The whole page is built once at
 * build time, so anything measured from "now" drifts stale between deploys
 * with no content change — the same reason `careerYearSpan()` reads `sortKey`
 * instead of `Date`.
 */
export function arrivedAge(): number {
  const [bornYear, bornMonth, bornDay] = origin.born.split("-").map(Number);
  const [arrivedYear, arrivedMonth] = origin.arrivedOn.split("-").map(Number);
  let age = arrivedYear - bornYear;
  // Arrived on the 1st, so a birthday later in the arrival month has not
  // happened yet.
  if (arrivedMonth < bornMonth || (arrivedMonth === bornMonth && bornDay > 1)) age -= 1;
  return age;
}

/**
 * Whether `origin.arrived` (prose) and `origin.arrivedOn` (machine) name the
 * same month. Two spellings of one fact is the drift this content layer exists
 * to prevent, so the test asserts it rather than a comment asking nicely.
 */
export function arrivedOnAgreesWithArrived(): boolean {
  const [year, month] = origin.arrivedOn.split("-").map(Number);
  const name = MONTHS[month - 1];
  return name !== undefined && origin.arrived === `${name} ${year}`;
}
```

If `origin` is not already imported in this file, add `import { origin } from "@/content/portfolio";`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/origin-story.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the full suite — `origin.to` changed, and things read it**

Run: `pnpm test`
Expected: `tests/lib/worlds.test.ts` FAILS. Its `COMPUTED` set builds `` `${origin.from} → ${origin.to} · ${origin.arrived}` ``, which is now a different string, and the USA world's `where` line claims no city is authored. Both are real and intended; fix them now rather than in a later task:

- In `src/content/worlds.ts`, the `usa` world's `where` becomes `"The arrival pin — Taylors, South Carolina, the first place he lived here"`.
- In `src/content/worlds.ts`, the `usa` world's `name` becomes `"United States"` still (unchanged — the world is the country, the pin is the town).

Re-run `pnpm test` until green.

- [ ] **Step 8: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts src/content/worlds.ts src/lib/origin-story.ts tests/lib/origin-story.test.ts
git commit -m "Author the crossing: born 2003, landed at fifteen, in Taylors

The site knew he arrived in December 2018 and nothing else about it. It now
knows when he was born, that he came with family, what English he had, and
the town rather than the country — which is why the globe pinned the
geographic centre of the United States until today.

The age is computed from born and arrivedOn, never typed, and a test asserts
the prose date and the machine date still name the same month. Two spellings
of one fact is the drift this content layer exists to prevent."
```

---

### Task 2: `profile` says where he is and that he is open

**Files:**
- Modify: `src/content/portfolio.ts` (the `profile` object)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `profile.location` and `profile.availability` as real strings rather than `undefined`. Plan B's hero rail reads both.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/content.test.ts`:

```ts
describe("the profile's own metadata row", () => {
  it("names a location and an availability, both resolved", () => {
    // Both were deliberately `undefined` through round 17, which made the
    // hero render no metadata row at all. Round 18 fills them, so the row
    // appears — and `resolved()` must give real strings, not markers.
    expect(resolved(profile.location)).toBe("Taylors, South Carolina");
    expect(resolved(profile.availability)).toBe(
      "Open to remote, and to relocation when it's worth it."
    );
  });

  it("names the same place the crossing lands in", () => {
    // One place, one spelling. If these ever disagree the site is carrying
    // two names for one town.
    expect(resolved(profile.location)).toBe(origin.to);
  });
});
```

Ensure the file imports `profile` and `origin` from `@/content/portfolio` and `resolved` from `@/types/portfolio`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/content.test.ts`
Expected: FAIL — received `undefined`.

- [ ] **Step 3: Author the two fields**

In `src/content/portfolio.ts`, replace the `location`/`availability` lines and the comment above them:

```ts
  // Round 18: both set, and the round-17 comment explaining why they were
  // deliberately blank is superseded rather than deleted — the reason it gave
  // was real (an availability line advertises a job search to a current
  // employer, and a location discourages inbound), and the owner has decided
  // that trade is worth making. Recording the decision matters more than
  // recording the hesitation.
  location: "Taylors, South Carolina",
  availability: "Open to remote, and to relocation when it's worth it.",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/content.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS. If `e2e` snapshots of the hero exist they are Playwright, not vitest, and are handled in Task 14.

- [ ] **Step 6: Commit**

```bash
git add src/content/portfolio.ts tests/lib/content.test.ts
git commit -m "Say where he is, and that he is open to work

Both fields were deliberately unset and the comment explaining why is kept
and superseded: the reasons were real, and the owner decided the trade is
worth it. A test pins the location to origin.to so the site can never carry
two names for one town."
```

---

### Task 3: the cats belong to someone

A one-field correction, and the smallest task in the plan. It ships on its own because it is a factual error on the live site and should not wait behind anything.

**Files:**
- Modify: `src/types/portfolio.ts` (`Companion`)
- Modify: `src/content/portfolio.ts` (`companions`)
- Test: `tests/lib/worlds.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Companion.belongsTo: string`. Plan C's Animals chapter reads it.

- [ ] **Step 1: Write the failing test**

Append to the `describe("the honesty rule", …)` block in `tests/lib/worlds.test.ts`:

```ts
  it("says whose cats they are", () => {
    // The site implied they were his. They are his girlfriend's, and a
    // portfolio that gets a fact about two cats wrong has no standing to
    // claim every plaque quotes a real field.
    for (const cat of companions) {
      expect(cat.belongsTo).toBe("my girlfriend");
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/worlds.test.ts -t "whose cats"`
Expected: FAIL — received `undefined`.

- [ ] **Step 3: Add the field to the type**

In `src/types/portfolio.ts`, inside `export interface Companion`:

```ts
  /** Whose cat this is. The site implied they were his through round 17;
   *  they are his girlfriend's. One field, because the alternative is the
   *  resolver composing a sentence about a relationship nobody authored. */
  readonly belongsTo: string;
```

- [ ] **Step 4: Author it on both cats**

In `src/content/portfolio.ts`, add `belongsTo: "my girlfriend",` to both the `moon` and `mi` entries.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts tests/lib/worlds.test.ts
git commit -m "The cats are his girlfriend's

A factual error on the live site: the Animals world implied Moon and Mi were
his. One field on each record, and the joke survives intact."
```

---

### Task 4: six career entries the record never had

Spec §3.2. These are the journey. Every one carries something authored — an entry with three empty arrays is the Finding-03 padding this round exists to remove, so the test enforces it.

**Files:**
- Modify: `src/content/portfolio.ts` (`careerEntries`)
- Test: `tests/lib/knowledge-tree.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: career entry ids `eastside-high`, `fu-of-kyoto`, `self-taught-gap`, `usc-cheme`, `cs-switch`, `usc-honors-ta`. Task 9 maps them to acts; Task 8 groups the concurrent ones.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/knowledge-tree.test.ts`:

```ts
const ROUND_18_ENTRIES = [
  "eastside-high",
  "fu-of-kyoto",
  "self-taught-gap",
  "usc-cheme",
  "cs-switch",
  "usc-honors-ta",
] as const;

describe("the entries round 18 adds", () => {
  it("adds all six", () => {
    for (const id of ROUND_18_ENTRIES) {
      expect(careerEntries.find((entry) => entry.id === id), id).toBeDefined();
    }
  });

  it("gives every one of them something authored to say", () => {
    // Finding 03 of the audit: nine of the fourteen existing entries have
    // empty `built`, empty `impact` and no `learned`, and exist only to be
    // counted. Adding a seventh of those would re-create the problem this
    // round is removing.
    for (const id of ROUND_18_ENTRIES) {
      const entry = careerEntries.find((candidate) => candidate.id === id);
      const authored =
        entry!.impact.length + entry!.built.length + (entry!.learned ? 1 : 0);
      expect(authored, `${id} has nothing authored on it`).toBeGreaterThan(0);
    }
  });

  it("starts the record in 2018, not 2021", () => {
    // The section is called Journey. Until this task it began at the degree.
    expect(careerYearSpan().firstYear).toBe(2018);
  });

  it("corrects the scraping start to August 2022", () => {
    // Portfolio-v2 is the source: "Undergraduate Research Assistant, from
    // August 2022". The site understated it by a year.
    const scraping = careerEntries.find((entry) => entry.id === "usc-scraping");
    expect(scraping?.sortKey).toBe("2022-08");
    expect(scraping?.dateRange).toBe("August 2022 — May 2025");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/knowledge-tree.test.ts -t "round 18 adds"`
Expected: FAIL — `expected undefined to be defined`.

- [ ] **Step 3: Author the six entries**

Insert into `careerEntries` in `src/content/portfolio.ts`. Order within the array does not matter — `sortKey` decides chronology — but keeping them grouped with a banner comment helps the next reader.

```ts
  /* ---------------------------------------------------------------------- */
  /* Round 18: the years before the degree.                                  */
  /*                                                                         */
  /* Every fact below came from the owner directly (2026-09-30 input sheet)   */
  /* or from `D:\Project\Portfolio-v2`. None of it is on the résumé, which is */
  /* exactly why the site did not have it: the content layer only ever read   */
  /* the résumé, the old repo's project list, and one DoorDash narrative      */
  /* detail. A résumé starts at the degree. A journey does not.               */
  /* ---------------------------------------------------------------------- */
  {
    id: "eastside-high",
    type: "learning",
    dateRange: "2018 — 2021",
    sortKey: "2018-12",
    role: "High school",
    organization: "Eastside High School, Taylors, South Carolina",
    locationOrMode: undefined,
    context:
      "Three years of American high school, started three weeks after landing, in a language he could read and write but not speak.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "Reading a language and speaking it are different skills, and only one of them can be practised alone.",
    technologies: [],
    lenses: [],
  },
  {
    id: "fu-of-kyoto",
    type: "work",
    dateRange: "2019 — 2021",
    sortKey: "2019-01",
    role: "Chef and server",
    organization: "Fu of Kyoto",
    locationOrMode: undefined,
    context:
      "The family restaurant. Both sides of it — cooking on the line, and waiting tables in the language he was still learning.",
    responsibilities: [
      "Cook on the line during service.",
      "Serve tables, take orders, and handle the front of house.",
    ],
    built: [],
    impact: [],
    learned:
      "Service is a system under load, and the kitchen teaches you where a process actually breaks faster than any diagram.",
    technologies: [],
    lenses: [],
  },
  {
    id: "self-taught-gap",
    type: "learning",
    dateRange: "2019 — 2021",
    sortKey: "2019-06",
    role: "Whatever he felt like learning",
    organization: "No institution",
    locationOrMode: undefined,
    // The owner's own description of this period was "just being bored and
    // live day by day". That line is better than anything this file could
    // write about him, and it is the one string in this round that must not
    // ship without him approving it — he asked that nothing go public that is
    // "not worth it". It is deliberately NOT authored here. What is authored
    // is only the list of things he actually did, which he supplied, and the
    // act renders exactly that until he says otherwise.
    context:
      "Nobody set him a problem for two and a half years, so he picked his own: investing and the stock market, growing plants, keeping an aquarium alive. Drove for Uber Eats.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "This is the only stretch of the record where nothing was assigned — which makes it the only evidence of what he does when nobody is asking.",
    technologies: [],
    lenses: [],
  },
  {
    id: "usc-cheme",
    type: "learning",
    dateRange: "August 2021 — 2022",
    sortKey: "2021-08-a",
    role: "Chemical engineering",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "The first major. Not the one he graduated in.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "Kept on the record on purpose. A portfolio that admits its author started somewhere else is worth more than one that pretends the line was straight.",
    technologies: [],
    lenses: [],
  },
  {
    id: "cs-switch",
    type: "milestone",
    dateRange: "2022",
    sortKey: "2022-01",
    role: "Switched to computer science",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "His friends told him to try it. He tried it, and it stuck — which is a more honest account of how most people find their field than any origin story about childhood computers.",
    responsibilities: [],
    built: [],
    impact: [],
    learned: "The recommendation was worth more than the plan.",
    technologies: [],
    lenses: [],
  },
  {
    id: "usc-honors-ta",
    type: "work",
    dateRange: "August 2023 — May 2025",
    sortKey: "2023-08-c",
    role: "Honors Teaching Assistant",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "The honors section of Introduction to Computer Concepts & General Applications Programming — students who are not computer science majors.",
    responsibilities: [
      "Support the honors section and lead open lab hours.",
      "Grade assignments and give written feedback.",
    ],
    built: [],
    impact: ["Supported and graded a 24+ student honors section."],
    learned:
      "Teaching people who did not choose this subject is the fastest way to find out which parts of it you only think you understand.",
    technologies: ["JavaScript", "HTML/CSS", "Python"],
    lenses: ["leadership", "engineering"],
  },
```

- [ ] **Step 4: Correct the scraping date**

In the `usc-scraping` entry, change `dateRange` to `"August 2022 — May 2025"` and `sortKey` to `"2022-08"`. Add above it:

```ts
    // Round 18 date fix. `D:\Project\Portfolio-v2`'s own experience data
    // records this role as starting August 2022; the résumé's "August 2023"
    // is the later revision and the earlier one is right. The site was
    // understating a year of research — and it is the year the CS switch
    // happened, which makes it the year the two halves of the story meet.
```

- [ ] **Step 5: Separate the honors track out of `usc-ta`**

`usc-ta` currently claims the honors section in its third `impact` line. That line now belongs to `usc-honors-ta`. Remove `"Assisted the honors section and graded assignments for 24+ students."` from `usc-ta.impact`, and remove `"Assist the honors section and grade assignments."` from its `responsibilities`.

**This is load-bearing and will break a test.** `src/content/worlds.ts`'s `usa` world has a plaque referencing `usc-ta.impact[1]` positionally, with a comment warning that a reorder silently repoints it. Deleting index 2 does not move index 1, so that plaque is safe — but re-run the suite to confirm rather than trusting this paragraph.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS. If `tests/lib/worlds.test.ts` fails on a plaque count, the positional reference moved: fix `src/content/worlds.ts`'s index, do not relax the assertion.

- [ ] **Step 7: Commit**

```bash
git add src/content/portfolio.ts tests/lib/knowledge-tree.test.ts
git commit -m "Add the six years before the degree

The record began in 2021, so the section called Journey omitted the journey.
It now starts in December 2018: Eastside High School three weeks after
landing, cooking and serving at the family restaurant, Uber Eats, and two and
a half years of learning things nobody assigned — investing, plants, an
aquarium. Then chemical engineering, and the switch to CS his friends talked
him into.

Also corrects the scraping start to August 2022 per Portfolio-v2 (the site
understated it by a year), and splits the honors teaching track out of usc-ta,
where it was one impact line inside another role.

Every new entry carries something authored. A test enforces that, because
nine of the existing fourteen do not, and adding a tenth would re-create the
problem this round removes."
```

---

### Task 5: bring the content layer up to the current résumé

Spec §3.3. This is the task that fixes the "all voice, no fresh evidence" half of the owner's complaint. `$2.8M` and `17 hours → 3 minutes` are the strongest facts on the site and it has never carried either.

**Files:**
- Modify: `src/content/portfolio.ts` (`careerEntries`: `doordash`, `usc-scraping`, `wordification`; `projects`: `dd-scraper-platform`)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the new `impact` lines and `technologies` the Journey acts render as leaves in Task 11.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/content.test.ts`:

```ts
describe("the content layer matches the September 2026 résumé", () => {
  const doordash = careerEntries.find((entry) => entry.id === "doordash")!;

  it("carries the figures the résumé carries, not rounded summaries of them", () => {
    const impact = doordash.impact.join("\n");
    // "99% runtime reduction" is true and useless: it hides that the real
    // number is seventeen hours to three minutes.
    expect(impact).toContain("17 hours to 3 minutes");
    expect(impact).toContain("654");
    expect(impact).toContain("1,529");
    expect(impact).toContain("$2.8M");
    expect(impact).toContain("40+");
  });

  it("knows the eight technologies it did not know", () => {
    for (const tech of [
      "Kotlin", "Scrapy", "Snowflake", "Databricks", "Zyte API", "gRPC", "Docker",
    ]) {
      expect(doordash.technologies, tech).toContain(tech);
    }
  });

  it("names the sites the research actually collected from", () => {
    const scraping = careerEntries.find((entry) => entry.id === "usc-scraping")!;
    const impact = scraping.impact.join("\n");
    expect(impact).toContain("3M+");
    expect(impact).toContain("Amazon");
    expect(impact).toContain("Kroger");
  });

  it("credits both halves of the speech pipeline", () => {
    const wordification = careerEntries.find((entry) => entry.id === "wordification")!;
    const text = [...wordification.built, ...wordification.impact].join("\n");
    expect(text).toContain("Google Cloud");
    expect(text).toContain("ElevenLabs");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/content.test.ts -t "September 2026 résumé"`
Expected: FAIL — `expected '…' to contain '17 hours to 3 minutes'`.

- [ ] **Step 3: Update `doordash`**

Replace its `built`, `impact` and `technologies`:

```ts
    built: [
      "An agentic scraping platform with reusable AI skills, multi-agent orchestration and deterministic validation gates.",
      "Production Python/Scrapy and Kotlin pipelines processing millions of SKU-location records.",
      "A monthly eight-stage SKU governance pipeline, collapsed from a manual process into a single run.",
      "Automated nationwide store-data audits across the live integrations.",
      "A multi-strategy agent workflow that assesses whether a retailer's public catalog can support an integration.",
    ],
    impact: [
      "Re-engineered a major retailer's catalog scraper from HTML crawling to a direct API: runtime 17 hours to 3 minutes, coverage 654 to 1,529 products, failures 3.9% to zero, plus hidden data the crawl never reached.",
      "Automated an eight-stage SKU governance process into one run, restoring SKUs that generated $2.8M cumulative GOV.",
      "Delivered 30+ production scrapers in a single week once the platform and its validation gates were in place.",
      "40+ merchants and 20+ live integrations kept current on hours, holidays and location data.",
      "Reduced cancellations caused by stale hours and unreported closures.",
    ],
    technologies: [
      "Python",
      "Kotlin",
      "Scrapy",
      "Playwright",
      "Snowflake",
      "Databricks",
      "PostgreSQL",
      "Zyte API",
      "gRPC",
      "Docker",
      "HTTP / API analysis",
      "SQL",
      "Claude Code",
    ],
```

Note `18+` becoming `20+`: the old number is not wrong, it is stale, and the spec requires the current one.

- [ ] **Step 4: Update `usc-scraping` and `wordification`**

`usc-scraping.impact`:

```ts
    impact: [
      "3M+ Amazon and Kroger product and seller records generated at a 99.9% success rate across months-long production runs.",
      "95% scraper runtime reduction by executing custom JavaScript inside Selenium for direct DOM extraction, replacing element-by-element WebDriver calls.",
      "Modelled seller–product relationships as a graph and crawled breadth-first, prioritising sellers by rating, review volume and product count while preventing duplicate traversal.",
    ],
```

`wordification.built` and `.impact`:

```ts
    built: [
      "A no-account interactive game preview, letting an educator play a lesson from the student's side and validate teacher-configured content before assigning it.",
      "An automated speech-generation QA pipeline using ElevenLabs and Google Cloud speech recognition, with transcript verification and automatic regeneration.",
    ],
    impact: [
      "The preview removed account creation as a prerequisite for evaluating the product.",
      "99.9% validated audio accuracy through transcript verification and automatic regeneration.",
      "50+ issues resolved across frontend, backend and database layers.",
    ],
```

- [ ] **Step 5: Re-source the affected metrics**

In `projects.dd-scraper-platform.metrics`, update the three `source` strings from `"Résumé — DoorDash, Software Engineer"` to `"Résumé, September 2026 revision — DoorDash, Software Engineer"`, and replace the runtime and coverage metrics with the real before/after values:

```ts
      {
        label: "Legacy scraper runtime",
        before: "17 hours",
        after: "3 minutes",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Product coverage",
        before: "654 products",
        after: "1,529 products",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Scraper failure rate",
        before: "3.9%",
        after: "Zero",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Production scrapers delivered",
        before: "Built individually",
        after: "30+ in a single week",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Sales restored",
        before: "SKUs lost to a manual eight-stage process",
        after: "$2.8M cumulative GOV",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS. `tests/lib/worlds.test.ts` may fail if a plaque quoted an `impact` line that changed text — that is the honesty rule working. Fix the reference in `src/content/worlds.ts`; never relax the assertion to a substring match.

- [ ] **Step 7: Commit**

```bash
git add src/content/portfolio.ts tests/lib/content.test.ts
git commit -m "Catch the site up to the résumé on his drive

The content layer was a year behind him and understated him badly. It has
never carried a dollar figure; it now carries \$2.8M of restored GOV. \"99%
runtime reduction\" becomes seventeen hours to three minutes, \"2.3x
coverage\" becomes 654 products to 1,529, and \"failures eliminated\" becomes
3.9% to zero. 2M records becomes 3M, and the sites are named.

Eight technologies the site had never heard of: Kotlin, Scrapy, Snowflake,
Databricks, Zyte API, gRPC, Docker, Google Cloud.

Part of why the page read as invented is that it was all voice and no fresh
evidence. This is the evidence."
```

---

### Task 6: four projects, and the one built out of curiosity

Spec §3.4. `chess-minmax` is the only thing in the record with no class, no client and no résumé line behind it, which makes it carry weight the hackathon placings do not.

**Files:**
- Modify: `src/content/portfolio.ts` (`projects`)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: career entry ids from Task 4 (`projects[].careerEntryId` must name a real entry).
- Produces: project ids `chess-minmax`, `conscea`, `degreeworks-rebuild`, `toy-storefront`. Task 9 maps them to acts; Plan C's video task attaches their recordings.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/content.test.ts`:

```ts
describe("the projects round 18 recovers from Portfolio-v2", () => {
  it("adds all four", () => {
    for (const id of ["chess-minmax", "conscea", "degreeworks-rebuild", "toy-storefront"]) {
      expect(projects.find((project) => project.id === id), id).toBeDefined();
    }
  });

  it("attaches every project to a career entry that exists", () => {
    // A project pointing at a missing entry renders as an orphan: the tree
    // has no branch to hang it off, and nothing fails.
    for (const project of projects) {
      expect(
        careerEntries.some((entry) => entry.id === project.careerEntryId),
        `${project.id} -> ${project.careerEntryId}`
      ).toBe(true);
    }
  });

  it("never links an executable", () => {
    // Portfolio-v2 shipped chess.exe as a download. A portfolio does not
    // hand a visitor a binary.
    for (const project of projects) {
      for (const href of [project.demo?.href, project.source?.href]) {
        expect(href ?? "").not.toMatch(/\.exe($|\?)/);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/content.test.ts -t "Portfolio-v2"`
Expected: FAIL — `expected undefined to be defined`.

- [ ] **Step 3: Author the four projects**

Append to `projects` in `src/content/portfolio.ts`. All four are `featured: false` — they are supporting evidence, not the headline work.

```ts
  /* ---------------------------------------------------------------------- */
  /* Round 18: recovered from `D:\Project\Portfolio-v2`.                     */
  /*                                                                         */
  /* Four builds the content layer never knew about, each with a real screen */
  /* recording in that repo's `src/assets/experience`. Plan C wires the       */
  /* recordings in; this file only records that they exist.                  */
  /* ---------------------------------------------------------------------- */
  {
    id: "chess-minmax",
    title: "A chess engine, for no reason",
    tagline:
      "A chess game and a min-max bot, built from a YouTube series — the only thing in this record with no class, no client and no deadline behind it.",
    careerEntryId: "usc-cheme",
    status: "shipped",
    featured: false,
    problem:
      "None. Nobody asked for this and nothing depended on it, which is the entire reason it is worth showing.",
    whyItMattered:
      "Every other project here answers to a course, an employer or a hackathon judge. This one is the only evidence of what he builds when the answer is nothing at all.",
    assumption: undefined,
    constraints: [
      "Following along with an existing tutorial series rather than designing from scratch.",
      "Min-max with no opening book and no endgame tables — the search is the whole engine.",
    ],
    responsibility: "Built it alone, start to finish.",
    decisions: [
      "Follow Eddie Sharick's series rather than invent an architecture, because the point was understanding search, not designing a program.",
      "Pygame for the board, so the loop and the rendering stayed simple enough to read in one sitting.",
    ],
    pathsExplored: [],
    built: [
      "A playable chess game in Pygame, with legal move generation.",
      "A min-max search bot playing against the human side.",
    ],
    proof: ["Public source, and a recorded game against the bot."],
    learned:
      "Min-max is simple to describe and unforgiving to implement — almost every bug was in move generation, not in the search.",
    nextQuestion:
      "Where does alpha-beta pruning stop helping and the evaluation function become the whole problem?",
    technologies: ["Python", "Pygame", "Min-max search"],
    source: {
      label: "github.com/thienle210303/Chess",
      href: "https://github.com/thienle210303/Chess",
    },
  },
  {
    id: "conscea",
    title: "Conscea — employee certificates",
    tagline:
      "A business application for managing employee certificates, fully functional, and demonstrated without showing a single real record.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem:
      "Certificate tracking spread across spreadsheets and inboxes, with no single place to see who holds what and when it expires.",
    whyItMattered:
      "An expired certificate nobody noticed is a compliance problem, not an admin problem.",
    assumption: undefined,
    constraints: [
      "A fixed academic term, delivered with a team.",
      "Real employee data, so the demo could not show records — only the protocol.",
    ],
    responsibility: "Full-stack developer on the team.",
    decisions: [
      "Record the demo showing the application's protocol rather than its data, because the data was real and the recording was going on a public portfolio.",
    ],
    pathsExplored: [],
    built: ["A certificate-management application with full CRUD, on Azure."],
    proof: ["Delivered as coursework; recorded demonstration of the protocol."],
    learned:
      "The constraint that shaped the deliverable was the demo, not the build: deciding what a public recording is allowed to contain is a design decision.",
    nextQuestion:
      "How do you demonstrate a data-heavy application convincingly without exposing any of its data?",
    technologies: ["C#/ASP.NET", "JavaScript/React", "Azure", "SQL"],
  },
  {
    id: "degreeworks-rebuild",
    title: "DegreeWorks, rebuilt",
    tagline:
      "A better version of the university's own degree-audit tool, built by the students who had to use it.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem:
      "The university's degree-audit tool was the only way to answer \"what do I still need to graduate\", and it was slow and hard to read.",
    whyItMattered:
      "Every student in the college depends on that answer at registration, twice a year.",
    assumption: undefined,
    constraints: [
      "A software-engineering course term, delivered with a team.",
      "A desktop GUI in Java, not a web application.",
    ],
    responsibility: "Developer on the team.",
    decisions: [
      "Rebuild rather than skin: the complaint was about what the tool showed and in what order, which a restyle cannot fix.",
    ],
    pathsExplored: [],
    built: ["A JavaFX degree-audit application, built with Maven."],
    proof: ["Public source, and a recorded walkthrough."],
    learned:
      "Rebuilding a tool you are forced to use is the fastest way to find out which of its problems are the data's and which are the interface's.",
    nextQuestion:
      "Which of this tool's problems were actually upstream, in how degree requirements are encoded?",
    technologies: ["Java", "JavaFX", "Maven", "OOP"],
    source: {
      label: "github.com/AlexRishmawi/degreeauditGUI",
      href: "https://github.com/AlexRishmawi/degreeauditGUI",
    },
  },
  {
    id: "toy-storefront",
    title: "A toy storefront",
    tagline:
      "A full e-commerce platform with a team of three — the first retail thing he built, two years before retail became the job.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem:
      "Build a working storefront end to end: catalog, cart, checkout flow, and the data behind all three.",
    whyItMattered:
      "It is his earliest full-stack build, and the only one that happens to rhyme with what he does now for a living.",
    assumption: undefined,
    constraints: [
      "A team of three over a summer.",
      "No payment provider — the checkout flow stops at the point a real one would take over.",
    ],
    responsibility: "Full-stack developer on the team.",
    decisions: [
      "MongoDB for the catalog, because the product shapes were still changing weekly.",
    ],
    pathsExplored: [],
    built: ["A React and Flask storefront with a MongoDB catalog and a cart."],
    proof: ["Recorded walkthrough of the storefront."],
    learned:
      "A catalog is the easy half. Everything difficult about retail data is in keeping the catalog true to the thing it describes — which is the job he has now.",
    nextQuestion:
      "Nothing open. This one is finished, and its interest is historical.",
    technologies: ["JavaScript/React", "Python/Flask", "Chakra UI", "MongoDB"],
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/portfolio.ts tests/lib/content.test.ts
git commit -m "Recover four builds from the old portfolio

Conscea, a DegreeWorks rebuild, a toy storefront, and a chess engine with a
min-max bot. The chess engine is the only thing in the whole record with no
class, no client and no résumé line behind it, which makes it the only
evidence of what he builds when nobody is asking.

The .exe the old portfolio offered as a download is not carried across, and a
test asserts no project ever links one."
```

---

### Task 7: delete the voice nobody wrote

Spec §3.5 and §3.6. The copy rewrite and the deletion ship together because they are one change: the invented layer comes out and sentences that trace to a fact go in.

Three things the audit recommended cutting are **kept**, per the owner: `profile.philosophy` (he likes it, and the comment now says it is a motto he adopted rather than a claim the site makes), `codeTabs` (Plan B replaces the fabricated objects with real code), and `closingSignoffs`.

**Files:**
- Modify: `src/content/portfolio.ts`
- Modify: `src/types/portfolio.ts` (delete `Principle`, `LoopStep`)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: `origin`, `arrivedAge()` from Task 1.
- Produces: rewritten `profile.positioning`, `.headline`, `.intro`, `.about`, `.focus`. Plan B's hero renders all five.

- [ ] **Step 1: Write the failing tests**

```ts
describe("the invented layer is gone", () => {
  it("no longer exports the copy nothing sourced", async () => {
    const content = await import("@/content/portfolio");
    for (const name of ["philosophyIntro", "principles", "problemSolvingLoop"]) {
      expect(name in content, `${name} still exported`).toBe(false);
    }
  });

  it("opens on the crossing, not on an abstraction", () => {
    // The old intro opened with "difficult, undefined problems". The reader
    // this site wants to keep has been given no reason to care yet.
    expect(profile.about[0]).toContain("Kiên Giang");
  });

  it("keeps the motto, because he likes it", () => {
    // Autogenerated, and he asked to keep it. It stays as a motto he
    // adopted, which is a different kind of claim from a fact.
    expect(profile.philosophy).toBe("Unsolved is not the same as unsolvable.");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/content.test.ts -t "invented layer"`
Expected: FAIL — `philosophyIntro still exported`.

- [ ] **Step 3: Rewrite the five copy fields**

```ts
  // Round 18. Every sentence below traces to `origin`, a career entry, or a
  // metric — which the previous drafts of these five fields did not. They
  // were written *about* Thien rather than *by* him, and that is what a
  // reader was picking up on.
  //
  // `about` is three short paragraphs, deliberately: the owner asked for a
  // "quick less introduction", and this section's job is sixty seconds, not
  // a biography.
  positioning:
    "I write software for retail data at DoorDash. Before that I was a chef in my family's restaurant.",
  focus:
    "Automated collection and integration systems — the pipelines that decide whether a retail partner can be described accurately at all.",
  philosophy: "Unsolved is not the same as unsolvable.",
  headline: "I keep asking, and I go and look.",
  intro:
    "Software engineer on retail data. I like the problems where nobody has checked recently whether the thing everyone works around is still necessary.",
  about: [
    "I moved from Kiên Giang, Việt Nam to Taylors, South Carolina in December 2018, at fifteen, with my family. I could read and write English. I could not speak it.",
    "For the next two and a half years nobody set me a problem, so I picked my own — investing, growing plants, keeping an aquarium alive — while I finished high school and worked the line and the floor at my family's restaurant. I started university in chemical engineering. My friends told me to try computer science instead.",
    "Since then: three million records collected unattended for a research group, a paper manufacturing process taken off paper, and a retail catalog scraper taken from seventeen hours to three minutes.",
  ],
```

- [ ] **Step 4: Delete the invented exports and their types**

From `src/content/portfolio.ts`, delete `philosophyIntro`, `principles` and `problemSolvingLoop` in full, and the `/* Philosophy */` banner above them. Remove `Principle` and `LoopStep` from the file's type import.

From `src/types/portfolio.ts`, delete the `Principle` and `LoopStep` interfaces.

`philosophyIntro` has **zero consumers** — already verified. `principles` is referenced only by `tests/lib/answers.test.ts` and `e2e/ask.spec.ts` via the retrieval corpus, which Task 13 re-indexes. `problemSolvingLoop` is consumed by `src/content/workshop.ts`, `src/lib/workshop.ts`, `src/lib/companion-facts.ts` and the Workshop section — all handled in Task 12. **Expect this step to break the build**; that is correct, and Steps 5–6 narrow it.

- [ ] **Step 5: Stub the Workshop consumers so the build stays green until Task 12**

Do **not** fix them by inventing replacement data. Instead, delete the Workshop section's render from `src/app/page.tsx` now (remove the `Workshop` import and the `<Workshop />` element) and delete `src/sections/Workshop/`, `src/content/workshop.ts`, `src/lib/workshop.ts` and `tests/lib/workshop.test.ts`. Workshop was always the first of the three cuts and nothing links into it.

In `src/lib/companion-facts.ts`, remove the fact(s) derived from `problemSolvingLoop` and `workflowStages`, and update `tests/lib/companion-facts.test.ts`'s expected counts to match. Read the file before editing: the counts are asserted exactly, so the test tells you the number to change.

- [ ] **Step 6: Delete the four dead Lab strings and the unrendered arrays**

From `src/content/ai-experiments.ts` delete `labPositioning`, `labIntro`, `labLiveNotice`, `heroAskCaption`, `experiments`, `learningLog`, `scrapingPlaybook` and `workflowStages`. From `src/lib/answer-sources.ts` delete `experimentsIndexable`.

If the file is left with no exports, delete `src/content/ai-experiments.ts` outright and remove every import of it.

- [ ] **Step 7: Run the tests and the typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. Any remaining failure is an unhandled importer of something deleted — find it with `grep -rn "<name>" src/ tests/ e2e/` and remove the usage, never re-add the data.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Cut the voice nobody wrote, and open on the crossing

Roughly forty-five sentences of self-description sat on top of sound facts:
philosophyIntro, three principles, nine loop-step aphorisms, and five copy
fields written about Thien rather than by him. That layer is what read as
invented, because it was.

What replaces it traces to something: About now opens in Kiên Giang in
December 2018 at fifteen, unable to speak the language, and ends at
seventeen hours to three minutes. The motto stays, because he likes it, and
the comment now says it is a motto he adopted rather than a fact the site
asserts.

Workshop goes with it — it was the purest instance of the same problem and
nothing linked into it. Its nine loop steps, the agent lane, the four dead
AI-Lab strings and the three retained-but-unrendered arrays all leave in one
piece, along with experimentsIndexable, which existed to re-home content that
no longer exists."
```

---

### Task 8: the tree learns that roles overlap

Review Focus item 5. The owner worked Schaeffler and Wordification and the research and school simultaneously (*"Yup multiple job!! I work crazy back then with school as well"*). `buildCareerTree()` sorts by `sortKey` and says nothing about overlap, so Act 06 would draw three concurrent branches as a sequence — which misrepresents the single most impressive thing about 2024.

**Files:**
- Modify: `src/lib/knowledge-tree.ts`
- Test: `tests/lib/knowledge-tree.test.ts`

**Interfaces:**
- Consumes: career entries from Task 4.
- Produces: `concurrentGroups(): readonly (readonly string[])[]` and `TreeBranch.concurrentWith: readonly string[]`. Task 11's stage reads `concurrentWith` to draw branches side by side.

- [ ] **Step 1: Write the failing test**

```ts
describe("concurrency", () => {
  it("reports the 2024 roles as running at the same time", () => {
    const groups = concurrentGroups();
    const group = groups.find((ids) => ids.includes("schaeffler"));
    expect(group).toBeDefined();
    expect(group).toContain("wordification");
    expect(group).toContain("usc-scraping");
  });

  it("marks each branch with what it overlapped", () => {
    const tree = buildCareerTree();
    const schaeffler = tree.find((branch) => branch.id === "schaeffler")!;
    expect(schaeffler.concurrentWith).toContain("wordification");
    // And never itself.
    expect(schaeffler.concurrentWith).not.toContain("schaeffler");
  });

  it("leaves a role that genuinely stood alone with no overlaps", () => {
    const tree = buildCareerTree();
    const highSchool = tree.find((branch) => branch.id === "eastside-high")!;
    // He was at the restaurant during high school, so this one DOES overlap —
    // assert the mechanism works in the direction that is easy to get wrong.
    expect(highSchool.concurrentWith).toContain("fu-of-kyoto");
  });
});
```

Import `concurrentGroups` from `@/lib/knowledge-tree`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/knowledge-tree.test.ts -t "concurrency"`
Expected: FAIL — `concurrentGroups is not a function`.

- [ ] **Step 3: Add an end key to the entries that need one**

Overlap needs an end, and `dateRange` is prose. Add `endSortKey` to `CareerEntry` in `src/types/portfolio.ts`:

```ts
  /** `YYYY-MM`, or `undefined` for an entry that is still running. The
   *  machine-readable end of `dateRange`, added in round 18 so overlap can be
   *  computed rather than eyeballed — the owner held three roles and a degree
   *  at once in 2024, and a tree that draws that as a sequence is telling the
   *  wrong story about the most impressive year in the record. */
  readonly endSortKey?: string;
```

Then author it on every entry whose `dateRange` has an end. For the ones this task's test touches: `eastside-high` `"2021-06"`, `fu-of-kyoto` `"2021-08"`, `self-taught-gap` `"2021-08"`, `usc-cheme` `"2022-05"`, `usc-scraping` `"2025-05"`, `usc-ta` `"2025-05"`, `usc-honors-ta` `"2025-05"`, `schaeffler` `"2024-08"`, `wordification` `"2025-05"`, `usc-degree` `"2025-05"`. `doordash` has none (still running). Milestones are points and get none.

- [ ] **Step 4: Implement the overlap computation**

Append to `src/lib/knowledge-tree.ts`:

```ts
/** An entry's span as two comparable `YYYY-MM` keys. A milestone is a point,
 *  so its end is its start. An open-ended role runs to a sentinel that sorts
 *  after every real key. */
function span(entry: CareerEntry): { start: string; end: string } {
  const start = entry.sortKey.slice(0, 7);
  return { start, end: entry.endSortKey ?? (entry.type === "milestone" ? start : "9999-12") };
}

/**
 * Which entries were running at the same time as which. Two entries overlap
 * when neither one's span finishes before the other's begins — the standard
 * interval test, and deliberately inclusive, because a role that ended the
 * same month another started did genuinely overlap by a month.
 *
 * Milestones are excluded: a point in time technically overlaps whatever it
 * lands inside, and reporting that "Dean's List overlapped DoorDash" is noise
 * rather than information.
 */
export function concurrentWith(entryId: string): readonly string[] {
  const subject = ENTRIES.find((entry) => entry.id === entryId);
  if (!subject || subject.type === "milestone") return [];
  const own = span(subject);
  return ENTRIES
    .filter((other) => other.id !== entryId && other.type !== "milestone")
    .filter((other) => {
      const theirs = span(other);
      return own.start <= theirs.end && theirs.start <= own.end;
    })
    .map((other) => other.id);
}

/**
 * The overlap relation collapsed into groups: every set of entries that were
 * all running together. Transitively closed, so A-overlaps-B and
 * B-overlaps-C puts all three in one group even where A and C do not touch —
 * which is what a stage drawing "this is what one year looked like" needs.
 */
export function concurrentGroups(): readonly (readonly string[])[] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const entry of ENTRIES) {
    if (entry.type === "milestone" || seen.has(entry.id)) continue;
    const group: string[] = [];
    const queue = [entry.id];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      for (const neighbour of concurrentWith(id)) {
        if (!seen.has(neighbour)) queue.push(neighbour);
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}
```

- [ ] **Step 5: Carry it onto the branch**

Add to `TreeBranch`:

```ts
  /** The ids of every other branch that was running at the same time. The
   *  stage draws these side by side rather than stacked. */
  readonly concurrentWith: readonly string[];
```

and in both `buildCareerTree()` and `buildKnowledgeTree()`'s `.map((entry): TreeBranch => …)`, add `concurrentWith: concurrentWith(entry.id),`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts src/lib/knowledge-tree.ts tests/lib/knowledge-tree.test.ts
git commit -m "Let the tree say that three roles ran at once

He held Schaeffler, Wordification and the research simultaneously, in school,
in 2024 — and the tree sorted everything by start date and drew it as a
sequence, which misrepresents the most impressive year in the record.

Entries gain a machine-readable endSortKey so overlap is computed rather than
eyeballed. Milestones are excluded: a point in time overlaps whatever it
lands inside, and \"Dean's List overlapped DoorDash\" is noise."
```

---

### Task 9: act anchors, and getting `lib/` out of `sections/`

Spec §6.2. `caseStudyAnchorId` lives in `src/sections/SelectedWork/anchors.ts` and is imported by `src/lib/worlds.ts`, `src/lib/workshop.ts` (already deleted in Task 7) and `src/sections/CareerTree/DrawnTree.tsx` and `KnowledgeTreeList.tsx`. Deleting the section breaks the library at compile time. This task moves the concept into `lib/` before anything is deleted.

**Files:**
- Create: `src/lib/anchors.ts`
- Modify: `src/lib/worlds.ts`
- Test: `tests/lib/anchors.test.ts`

**Interfaces:**
- Consumes: career entry and project ids from Tasks 4 and 6.
- Produces: `ACT_IDS`, `type ActId`, `actAnchorId(id: ActId): string`, `actForEntry(entryId: string): ActId | undefined`, `actForProject(projectId: string): ActId | undefined`. Task 10 asserts plaque links resolve; Task 11's stage renders the ids.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/anchors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { careerEntries, projects } from "@/content/portfolio";
import { ACT_IDS, actAnchorId, actForEntry, actForProject } from "@/lib/anchors";

describe("act anchors", () => {
  it("has seven acts, in story order", () => {
    expect(ACT_IDS).toEqual([
      "crossing",
      "high-school",
      "wrong-major",
      "the-switch",
      "research",
      "two-jobs",
      "retail-data",
    ]);
  });

  it("prefixes every anchor so an id can never collide with a section id", () => {
    for (const id of ACT_IDS) {
      expect(actAnchorId(id)).toBe(`act-${id}`);
    }
  });

  it("places every career entry in exactly one act", () => {
    // An entry with no act is an entry the stage never draws — it would
    // vanish from the page with nothing failing.
    for (const entry of careerEntries) {
      expect(actForEntry(entry.id), entry.id).toBeDefined();
    }
  });

  it("places every project in the act its career entry is in", () => {
    for (const project of projects) {
      expect(actForProject(project.id), project.id).toBe(
        actForEntry(project.careerEntryId)
      );
    }
  });

  it("returns undefined for an id that does not exist, rather than guessing", () => {
    expect(actForEntry("not-a-real-entry")).toBeUndefined();
    expect(actForProject("not-a-real-project")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/anchors.test.ts`
Expected: FAIL — cannot resolve `@/lib/anchors`.

- [ ] **Step 3: Create the module**

```ts
import { careerEntries, projects } from "@/content/portfolio";

/**
 * The Journey's seven acts, and the one place that knows which career entry
 * belongs to which.
 *
 * This file exists in `lib/` rather than in the section that renders it for a
 * structural reason, not a stylistic one. Through round 17, `src/lib/worlds.ts`
 * imported `caseStudyAnchorId` from `src/sections/SelectedWork/anchors.ts` —
 * the library reaching outward into a section it should know nothing about.
 * Round 18 deletes that section, which broke the library at compile time.
 * Nothing under `lib/` imports from `sections/` once this lands, and nothing
 * should again.
 *
 * Order is story order, not date order, and it is what the stage scrubs
 * through. `crossing` has no career entry of its own: it is the arrival
 * itself, authored on `origin` rather than on an entry.
 */
export const ACT_IDS = [
  "crossing",
  "high-school",
  "wrong-major",
  "the-switch",
  "research",
  "two-jobs",
  "retail-data",
] as const;

export type ActId = (typeof ACT_IDS)[number];

/**
 * Which act each career entry is drawn in. Authored, not inferred from dates:
 * three of these entries overlap several acts, and the act a role *belongs*
 * to is an editorial judgement about the story, not a fact about its
 * calendar. `usc-degree` and the milestones land in `two-jobs`, which is
 * where the credentials strip appears.
 */
const ENTRY_ACTS: Readonly<Record<string, ActId>> = {
  "eastside-high": "high-school",
  "fu-of-kyoto": "high-school",
  "self-taught-gap": "high-school",
  "usc-cheme": "wrong-major",
  "cs-switch": "the-switch",
  "usc-scraping": "research",
  "usc-ta": "research",
  "usc-honors-ta": "research",
  "usc-degree": "two-jobs",
  schaeffler: "two-jobs",
  wordification: "two-jobs",
  capstone: "two-jobs",
  "llm-classifier": "two-jobs",
  graduation: "two-jobs",
  cockyhacks: "research",
  "code-to-give": "research",
  magellan: "two-jobs",
  "acm-webmaster": "research",
  "deans-list": "two-jobs",
  doordash: "retail-data",
};

/** The DOM id for an act. Prefixed, so an act id can never collide with a
 *  section id like `about` or `worlds`. */
export function actAnchorId(id: ActId): string {
  return `act-${id}`;
}

export function actForEntry(entryId: string): ActId | undefined {
  if (!careerEntries.some((entry) => entry.id === entryId)) return undefined;
  return ENTRY_ACTS[entryId];
}

export function actForProject(projectId: string): ActId | undefined {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return undefined;
  return actForEntry(project.careerEntryId);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/anchors.test.ts`
Expected: PASS. If "places every career entry in exactly one act" fails, an entry id is missing from `ENTRY_ACTS` — add it rather than loosening the test.

- [ ] **Step 5: Repoint `src/lib/worlds.ts`**

Replace the import:

```ts
import { actAnchorId, actForProject } from "@/lib/anchors";
```

and in `resolvePlaque`'s `case "project":` replace the `link` line:

```ts
        // Round 18: the Selected Work section is gone, so a case study is no
        // longer a thing with its own anchor — it is rendered inside the
        // Journey act of the role that produced it. Computed from the id
        // already in hand, never carried on the content layer as a second
        // hand-typed string.
        ...(() => {
          const act = actForProject(project.id);
          return act ? { link: `#${actAnchorId(act)}` } : {};
        })(),
```

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/anchors.ts src/lib/worlds.ts tests/lib/anchors.test.ts
git commit -m "Move anchors into lib, where the library can reach them

src/lib/worlds.ts imported caseStudyAnchorId from
src/sections/SelectedWork/anchors.ts — the library reaching outward into a
section it should know nothing about. Round 18 deletes that section, so the
import had to move before the deletion could compile.

The seven acts and the entry-to-act map live here now. A test asserts every
career entry lands in exactly one act, because an entry with no act is an
entry the stage never draws, and nothing would fail."
```

---

### Task 10: a plaque may not link into nothing

Review Focus item 1. The globe's Technology plaques carry a `link`, and `tests/lib/worlds.test.ts` does not currently check that the target exists. After Task 12 those targets change entirely; this test is what makes that change loud instead of silent.

**Files:**
- Modify: `tests/lib/worlds.test.ts`

**Interfaces:**
- Consumes: `ACT_IDS`, `actAnchorId` from Task 9; `resolveWorlds` from `src/lib/worlds.ts`.
- Produces: nothing — this task is a test.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/worlds.test.ts`:

```ts
describe("plaque links", () => {
  /**
   * Every id the content layer DECLARES as a link target — the seven acts,
   * plus the section ids.
   *
   * Read the name precisely: these are *declared*, not *rendered*. This test
   * is deliberately one link in a two-link chain, and on its own it proves
   * only that a plaque's target is a declared id rather than a hand-typed
   * string that drifted. The other link — that every declared act id is an id
   * something actually puts in the DOM — is asserted by
   * `tests/ui/Stage.test.tsx`, which renders the stage and requires
   * `document.getElementById(actAnchorId(act.id))` to be non-null for all
   * seven acts.
   *
   * Both halves are needed and neither is sufficient. This one cannot catch a
   * declared act that nothing renders, because `ACT_IDS` is also where the
   * link is built from; that one cannot catch a plaque pointing at a string
   * outside `ACT_IDS` altogether.
   */
  const DECLARED_IDS = new Set<string>([
    ...ACT_IDS.map(actAnchorId),
    ...navItems.map((item) => item.sectionId),
  ]);

  it("points every link at a declared id, never a hand-typed string", () => {
    // A plaque linking to a dead anchor is the quietest possible failure:
    // the visitor clicks, nothing happens, and no test, type or build
    // complains. Round 18 deletes the section every project link pointed at,
    // which is exactly when this needs to be loud.
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (!plaque.link) continue;
        expect(plaque.link.startsWith("#"), plaque.link).toBe(true);
        expect(DECLARED_IDS, `${world.id}: ${plaque.link}`).toContain(
          plaque.link.slice(1)
        );
      }
    }
  });
});
```

Add imports: `ACT_IDS`, `actAnchorId` from `@/lib/anchors`, and `navItems` from `@/content/portfolio`.

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run tests/lib/worlds.test.ts -t "plaque links"`
Expected: PASS — Task 9 already repointed the links. **If it fails, Task 9 is wrong**, not this test.

- [ ] **Step 3: Prove the test can fail**

**Do not mutate `actAnchorId` to prove this.** Changing it moves *both* sides of the comparison — the link is built through the same function the expected set is built from — so the test would still pass and you would have proved nothing. That was a defect in this plan, found in Task 9's review.

Instead, temporarily hard-code a bad target in `src/lib/worlds.ts`'s project branch — `link: "#work-dd-scraper-platform"`, the anchor this round deletes. Run the test. Expected: FAIL, naming that link. Revert and re-run. Expected: PASS.

A test that has never been seen to fail is not evidence of anything — and a mutation that cannot make it fail is not a demonstration.

- [ ] **Step 4: Commit**

```bash
git add tests/lib/worlds.test.ts
git commit -m "Assert a plaque never links into nothing

The globe's project plaques carry an anchor and nothing checked the target
existed. A dead anchor is the quietest failure available: the visitor clicks,
nothing happens, no test or build complains. Round 18 deletes the section
every one of those links pointed at, which is precisely when it needs to be
loud. Verified by making it fail before trusting it."
```

---

### Task 11: the pinned stage, seven acts

Spec §6. The reader stops moving and time moves instead.

**Files:**
- Create: `src/sections/CareerTree/acts.ts`
- Create: `src/sections/CareerTree/Stage.tsx`
- Create: `src/sections/CareerTree/CredentialsStrip.tsx`
- Modify: `src/sections/CareerTree/CareerTree.tsx`
- Move: `src/sections/SelectedWork/CaseStudy.tsx`, `MetricTable.tsx`, `WorkflowDiagram.tsx` → `src/sections/CareerTree/`
- Test: `tests/lib/acts.test.ts`, `tests/ui/Stage.test.tsx`

**Interfaces:**
- Consumes: `ACT_IDS`, `actAnchorId`, `actForEntry` (Task 9); `buildCareerTree`, `concurrentWith` (Task 8); `arrivedAge`, `origin` (Task 1).
- Produces: `ACTS: readonly Act[]` where `Act = { id: ActId; year: string; title: string; entryIds: readonly string[]; showsCredentials: boolean }`; `<Stage acts={ACTS} tree={TREE} />`.

- [ ] **Step 1: Write the failing test for the act data**

Create `tests/lib/acts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ACTS } from "@/sections/CareerTree/acts";
import { ACT_IDS, actForEntry } from "@/lib/anchors";
import { careerEntries } from "@/content/portfolio";

describe("the seven acts", () => {
  it("is one act per anchor, in the same order", () => {
    expect(ACTS.map((act) => act.id)).toEqual([...ACT_IDS]);
  });

  it("draws every career entry in some act", () => {
    const drawn = new Set(ACTS.flatMap((act) => act.entryIds));
    for (const entry of careerEntries) {
      expect(drawn, entry.id).toContain(entry.id);
    }
  });

  it("puts each entry in the act the anchor map says", () => {
    for (const act of ACTS) {
      for (const entryId of act.entryIds) {
        expect(actForEntry(entryId), entryId).toBe(act.id);
      }
    }
  });

  it("shows the credentials strip exactly once", () => {
    expect(ACTS.filter((act) => act.showsCredentials)).toHaveLength(1);
  });

  it("starts at the crossing with no career entry of its own", () => {
    expect(ACTS[0].id).toBe("crossing");
    expect(ACTS[0].entryIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/acts.test.ts`
Expected: FAIL — cannot resolve `@/sections/CareerTree/acts`.

- [ ] **Step 3: Write the act data**

Create `src/sections/CareerTree/acts.ts`:

```ts
import { careerEntries, origin } from "@/content/portfolio";
import { ACT_IDS, actForEntry, type ActId } from "@/lib/anchors";
import { arrivedAge } from "@/lib/origin-story";

/**
 * The seven acts the stage scrubs through.
 *
 * `title` and `year` are the only prose in this file, and both are editorial
 * labels for a span of time rather than claims about the owner — the facts
 * each act shows come from the career entries it names, verbatim. Nothing
 * here restates what an entry already says.
 *
 * `entryIds` is derived from `actForEntry` rather than typed twice, so the map
 * in `src/lib/anchors.ts` stays the single place that decides where an entry
 * is drawn.
 */
export interface Act {
  readonly id: ActId;
  /** The label in the stage's corner. Prose, because "2018 — 2021" is not a
   *  number and the scrubber needs something human to stop on. */
  readonly year: string;
  readonly title: string;
  readonly entryIds: readonly string[];
  /** The act during which the nine demoted milestones appear as one line. */
  readonly showsCredentials: boolean;
}

const TITLES: Readonly<Record<ActId, { year: string; title: string }>> = {
  crossing: {
    year: `December 2018 · age ${arrivedAge()}`,
    title: `${origin.from} to ${origin.to}`,
  },
  "high-school": { year: "2018 — 2021", title: "Eastside High, and the family restaurant" },
  "wrong-major": { year: "August 2021", title: "The wrong major" },
  "the-switch": { year: "2022", title: "Friends talk him into it" },
  research: { year: "2022 — 2025", title: "Three million records, and two classrooms" },
  "two-jobs": { year: "2024 — May 2025", title: "Two jobs, one summer, still in school" },
  "retail-data": { year: "October 2025 — now", title: "Retail data" },
};

export const ACTS: readonly Act[] = ACT_IDS.map((id) => ({
  id,
  year: TITLES[id].year,
  title: TITLES[id].title,
  entryIds: careerEntries
    .filter((entry) => actForEntry(entry.id) === id)
    .toSorted((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
    .map((entry) => entry.id),
  showsCredentials: id === "two-jobs",
}));
```

**`crossing` holds no entries**, and the test asserts it. Its content is `origin` — the one act whose facts are not on a career entry.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run tests/lib/acts.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the stage's behaviour**

Create `tests/ui/Stage.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Stage from "@/sections/CareerTree/Stage";
import { ACTS } from "@/sections/CareerTree/acts";
import { buildCareerTree } from "@/lib/knowledge-tree";

describe("the pinned stage", () => {
  it("renders every act as a real anchor target", () => {
    render(<Stage acts={ACTS} tree={buildCareerTree()} />);
    for (const act of ACTS) {
      // Real elements with real ids, so an inbound link lands with
      // JavaScript disabled. Not a client-side hash rewrite.
      expect(document.getElementById(`act-${act.id}`), act.id).not.toBeNull();
    }
  });

  it("exposes the scrubber as a labelled range input", () => {
    render(<Stage acts={ACTS} tree={buildCareerTree()} />);
    const scrubber = screen.getByRole("slider", { name: /year/i });
    expect(scrubber).toHaveAttribute("min", "0");
    expect(scrubber).toHaveAttribute("max", String(ACTS.length - 1));
  });

  it("offers a way out of the pin", () => {
    render(<Stage acts={ACTS} tree={buildCareerTree()} />);
    expect(
      screen.getByRole("button", { name: /whole tree/i })
    ).toBeInTheDocument();
  });

  it("renders every act's content without scripting, not just the active one", () => {
    // The pin is an enhancement. With no JavaScript and with reduced motion,
    // all seven acts must be readable — so they are all in the DOM and the
    // stage hides them visually, never conditionally renders them.
    render(<Stage acts={ACTS} tree={buildCareerTree()} />);
    for (const act of ACTS) {
      expect(screen.getByText(act.title), act.title).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/Stage.test.tsx`
Expected: FAIL — cannot resolve `@/sections/CareerTree/Stage`.

- [ ] **Step 7: Build the stage**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { actAnchorId } from "@/lib/anchors";
import type { TreeBranch } from "@/lib/knowledge-tree";
import type { Act } from "./acts";
import { DEMOTED_ENTRY_IDS } from "./CredentialsStrip";
import CredentialsStrip from "./CredentialsStrip";
import DrawnTree from "./DrawnTree";

/**
 * The Journey's pinned stage.
 *
 * One screen holds still and time moves through it. The drawing is `sticky`;
 * the seven acts scroll behind it, and whichever one is crossing the middle of
 * the viewport is the moment the drawing is showing.
 *
 * Three rules this component exists to keep:
 *
 * 1. **Every act is always in the DOM.** Visibility is CSS. Conditional
 *    rendering would mean six of seven acts are unreachable with JavaScript
 *    off and under `prefers-reduced-motion`, and this section is the page's
 *    whole argument — it does not get to require scripting.
 * 2. **The active act comes from an IntersectionObserver, never a scroll
 *    listener.** A scroll handler on the main thread is what makes this kind
 *    of effect stutter on a mid-range phone.
 * 3. **Nothing steals focus.** No `inert`, no `tabindex="-1"` on act content,
 *    no focus moved when the act changes. A reader tabbing through is reading,
 *    not navigating a carousel.
 *
 * The pin is released two ways: the button, and `prefers-reduced-motion`,
 * which is handled in `globals.css` rather than here — see the note on
 * `data-stage` below.
 */
interface StageProps {
  readonly acts: readonly Act[];
  readonly tree: readonly TreeBranch[];
}

export default function Stage({ acts, tree }: StageProps) {
  const [active, setActive] = useState(0);
  const [released, setReleased] = useState(false);
  const actRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (released) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // The act whose box covers the middle of the viewport wins. Taking the
        // most-intersecting entry rather than the first means a short act
        // between two long ones still gets its turn.
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const index = actRefs.current.indexOf(best.target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      // A band across the middle of the viewport, so an act becomes current
      // when it is being read rather than when its top edge appears.
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );
    for (const element of actRefs.current) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [released, acts.length]);

  const onScrub = useCallback(
    (value: number) => {
      setActive(value);
      actRefs.current[value]?.scrollIntoView({ block: "center" });
    },
    [],
  );

  const drawnBranches = tree.filter(
    (branch) => !DEMOTED_ENTRY_IDS.includes(branch.id as never),
  );
  const current = acts[active];

  return (
    // `data-stage` is what globals.css hangs the reduced-motion rule on:
    // `@media (prefers-reduced-motion: reduce) { [data-stage] [data-stage-pin]
    // { position: static } [data-stage] [data-act] { opacity: 1 } }`. The CSS
    // is the implementation, not a mirror of a JS branch, so it cannot
    // disagree with the user's setting.
    <div data-stage="" data-released={released ? "" : undefined} className="mt-10">
      <div
        data-stage-pin=""
        className="top-[var(--header-h)] h-[calc(100svh-var(--header-h))] data-[released]:static sticky"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
            <p className="font-mono text-[length:var(--step--1)] text-fg-muted">
              {current.year}
            </p>
            <button
              type="button"
              onClick={() => setReleased(true)}
              className="min-h-11 text-[length:var(--step--1)] text-fg underline decoration-rule hover:decoration-fg"
            >
              Show me the whole tree
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <DrawnTree
              tree={drawnBranches}
              throughAct={released ? acts.length - 1 : active}
            />
          </div>

          <label className="mt-3 flex items-center gap-4 border-t border-rule pt-3">
            <span className="eyebrow shrink-0">Year</span>
            <input
              type="range"
              min={0}
              max={acts.length - 1}
              step={1}
              value={active}
              onChange={(event) => onScrub(Number(event.target.value))}
              aria-valuetext={`${current.year} — ${current.title}`}
              className="w-full accent-[color:var(--accent)]"
            />
          </label>
        </div>
      </div>

      {acts.map((act, index) => (
        <section
          key={act.id}
          id={actAnchorId(act.id)}
          ref={(element) => {
            actRefs.current[index] = element;
          }}
          data-act=""
          aria-current={index === active ? "step" : undefined}
          // Always rendered. `opacity` and nothing else — no `display: none`,
          // no `visibility: hidden`, so the text stays in the accessible tree
          // and Ctrl-F still finds it.
          className="scroll-mt-20 py-[18vh] transition-opacity duration-500 data-[dim]:opacity-35"
          data-dim={index === active || released ? undefined : ""}
        >
          <h3 className="text-[length:var(--step-2)] tracking-[var(--tracking-display)] text-fg">
            {act.title}
          </h3>
          <p className="mt-2 font-mono text-[length:var(--step--1)] text-fg-muted">
            {act.year}
          </p>
          {act.showsCredentials ? <CredentialsStrip className="mt-8" /> : null}
        </section>
      ))}
    </div>
  );
}
```

`DrawnTree` gains one prop, `throughAct: number`, and draws branches whose act index is at or below it. Everything else about it is unchanged — the existing drawing code is correct and well-tested.

Two details that are load-bearing rather than stylistic:

- **`opacity`, never `display` or `visibility`.** A dimmed act is still in the accessible tree and still found by the browser's own find-in-page. Hiding it would make the pin a reason the content is unreachable.
- **`data-released` toggles `position: static`** through a Tailwind data variant rather than inline styles, so the reduced-motion `@media` rule in CSS can do the same thing without JavaScript agreeing to it.

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm vitest run tests/ui/Stage.test.tsx`
Expected: PASS.

- [ ] **Step 9: Build the credentials strip**

Create `src/sections/CareerTree/CredentialsStrip.tsx`. It renders the nine demoted entries — `graduation`, `magellan`, `acm-webmaster`, `deans-list`, `capstone`, `llm-classifier`, `cockyhacks`, `code-to-give`, `usc-degree` — as one line of `role · organization · dateRange`, read from `careerEntries`, never retyped. A Server Component; it has no interactivity.

The nine ids live in **one** exported constant so the stage can exclude them from the branches it draws:

```ts
/** The entries that stop being branches in round 18 and become one line.
 *  Every one of them has empty `built`, empty `impact` and no `learned` —
 *  they were padding the tree to fourteen branches and saying nothing. They
 *  are not deleted: `/resume` still reads all of them. */
export const DEMOTED_ENTRY_IDS = [
  "usc-degree", "graduation", "cockyhacks", "code-to-give", "capstone",
  "llm-classifier", "magellan", "acm-webmaster", "deans-list",
] as const;
```

- [ ] **Step 10: Wire the stage into the section**

In `src/sections/CareerTree/CareerTree.tsx`: replace `<ViewToggle />` plus the two view panels with `<Stage acts={ACTS} tree={TREE} />`, keep the `#journey` compatibility span, and update the rail. The rail's `Branches` note becomes the count *after* demotion, and a new note names the demotion, because a reader cannot count what is no longer drawn:

```ts
  { term: "Branches", detail: `${TREE.length - DEMOTED_ENTRY_IDS.length} drawn · ${DEMOTED_ENTRY_IDS.length} as credentials` },
```

Delete `ViewToggle.tsx`, `view-state.ts`, `Timeline.tsx` and `TimelineEntry.tsx` only if nothing else imports them — `grep -rn` first. If the timeline is still the reduced-motion fallback, keep it and say so in a comment.

- [ ] **Step 11: Move the case-study components**

```bash
git mv src/sections/SelectedWork/CaseStudy.tsx src/sections/CareerTree/CaseStudy.tsx
git mv src/sections/SelectedWork/MetricTable.tsx src/sections/CareerTree/MetricTable.tsx
git mv src/sections/SelectedWork/WorkflowDiagram.tsx src/sections/CareerTree/WorkflowDiagram.tsx
```

Fix their imports, and render `<CaseStudy>` inside an opened branch in the stage. The full prose — `problem`, `whyItMattered`, `assumption`, `constraints`, `decisions`, `pathsExplored`, `whatFailed`, `failureLesson`, `nextQuestion` — is the site's best writing and is not trimmed to make a section shorter.

- [ ] **Step 12: Run the full suite and the typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Stand the Journey up as seven acts on a pinned stage

The tree was taller than four viewports, so a reader spent the section
stranded between a heading above and a payoff below with only a year label
changing. Now one screen is pinned and scroll advances time: the trunk
lengthens, a branch opens, leaves land, the year turns over.

Three ways out, all required: a labelled range input that scrubs the same
state, a button that jumps to the finished tree and releases the pin, and a
reduced-motion rule in CSS that drops the pin entirely. All seven acts are
always in the DOM — visibility is CSS, never conditional rendering — so the
section reads with JavaScript off.

Nine entries with nothing authored on them stop being branches and become one
credentials line. Nothing leaves the content layer; /resume still reads all of
them. The case-study components move here rather than being deleted, because
their prose is the best writing on the site."
```

---

### Task 12: delete Selected Work and Skills

Everything that linked into them has been repointed. Workshop went in Task 7.

**Files:**
- Delete: `src/sections/SelectedWork/`, `src/sections/Skills/`
- Modify: `src/app/page.tsx`, `src/content/portfolio.ts` (`navItems`), `src/sections/CareerTree/RootLabels.tsx`

**Interfaces:**
- Consumes: Task 9's anchors, Task 11's stage.
- Produces: a four-section page.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/content.test.ts`:

```ts
describe("the page is four sections", () => {
  it("lists exactly About, Worlds, Journey and Contact", () => {
    expect(navItems.map((item) => item.sectionId)).toEqual([
      "about", "worlds", "tree", "contact",
    ]);
  });

  it("keeps skillCategories, which /resume still renders", () => {
    // Deleting the Skills *section* is not deleting the skills. The résumé
    // route reads this, and so does the answer corpus.
    expect(skillCategories.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/content.test.ts -t "four sections"`
Expected: FAIL — seven section ids received.

- [ ] **Step 3: Re-root the tree on the crossing**

In `src/sections/CareerTree/RootLabels.tsx`, replace the `skillCategories`-derived labels with the crossing: one root, `origin.from`, labelled as where the tree started. `skillCategories` stays in the content layer — only this component stops reading it.

- [ ] **Step 4: Delete the two sections**

```bash
git rm -r src/sections/SelectedWork src/sections/Skills
```

Remove their imports and elements from `src/app/page.tsx`, and cut `nav-work` and `nav-skills` from `navItems`. Update the long comment in `page.tsx` explaining section order — it argues for a seven-section page that no longer exists, and a stale rationale is worse than none.

- [ ] **Step 5: Run the typecheck and fix every orphan**

Run: `pnpm typecheck`
Expected: errors naming each remaining importer. Fix each by removing the usage. Do not re-add deleted data to satisfy an import.

- [ ] **Step 6: Run the suite**

Run: `pnpm test`
Expected: PASS. Delete tests whose subject no longer exists; never delete a test whose subject moved.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Four sections: About, World, Journey, Contact

Selected Work and Skills are gone. Nothing links into them any more: the
globe's plaques point at act anchors, the case studies render inside the
branches of the roles that produced them, and the tree is rooted on the
crossing rather than on the skill categories.

skillCategories itself stays — /resume renders it and the answer corpus
indexes it. Deleting the Skills section is not deleting the skills."
```

---

### Task 13: every old URL still lands

Review Focus item 2. `#work`, `#skills`, `#workshop`, `#journey`, `journey-entry-<id>` and `case-study-<id>` are in bookmarks, possibly in the résumé PDF, and possibly indexed. They must resolve with JavaScript disabled.

**Files:**
- Modify: `src/sections/CareerTree/CareerTree.tsx`
- Create: `e2e/legacy-anchors.spec.ts`
- Test: `tests/ui/Stage.test.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `tests/ui/Stage.test.tsx`:

```tsx
describe("legacy anchors", () => {
  const LEGACY = ["work", "skills", "workshop", "journey"];

  it("keeps every retired section id resolvable", () => {
    render(<CareerTree />);
    for (const id of LEGACY) {
      // A real zero-size element, not a client-side hash rewrite: a bookmark
      // has to land with JavaScript disabled, the same way `#journey`
      // already does.
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it("keeps every per-entry fragment resolvable", () => {
    render(<CareerTree />);
    for (const entry of careerEntries) {
      expect(
        document.getElementById(`journey-entry-${entry.id}`),
        entry.id
      ).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/Stage.test.tsx -t "legacy anchors"`
Expected: FAIL — `#work` is null.

- [ ] **Step 3: Add the compatibility anchors**

In `CareerTree.tsx`, beside the existing `#journey` span, add the same pattern for `work`, `skills` and `workshop`, and one `journey-entry-<id>` per career entry on the act content that draws it. Follow the existing comment's reasoning exactly: real zero-size elements with `scroll-mt-20`, `aria-hidden`, `sr-only`.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run tests/ui/Stage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the end-to-end check**

Create `e2e/legacy-anchors.spec.ts` asserting that navigating to `/#work`, `/#skills`, `/#workshop` and `/#journey` scrolls to a visible element, **with JavaScript disabled** in the browser context. A unit test cannot prove the no-JS case.

- [ ] **Step 6: Re-index the answer corpus**

`src/lib/answer-corpus.ts`, `src/lib/answer-sources.ts` and `src/content/answer-expansion.ts` index the deleted sections. Re-index against the four-section page.

**Do not re-index `workflowStages`' `watchFor` strings** — they are deleted, and CLAUDE.md records why re-indexing them is a precision hole: three of them were the corpus's only carriers of the word "file", so *"how do I file my taxes"* retrieved them, and gating the engine harder instead cost ten points of recall@3.

Run: `pnpm vitest run tests/lib/answers.test.ts tests/lib/answers-retrieval.test.ts`
Expected: PASS. If recall@3 drops, the corpus lost a document it needed — find which, and re-home its content rather than re-adding the gate.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Keep every retired URL landing somewhere

#work, #skills, #workshop, #journey and every journey-entry fragment are in
bookmarks and possibly in the résumé PDF. They resolve to real zero-size
elements, so a bookmark lands with JavaScript disabled — the same pattern
#journey already used. An e2e spec proves the no-JS case, which a unit test
cannot.

The answer corpus is re-indexed against four sections. workflowStages'
watchFor strings are not re-indexed: they were the corpus's only carriers of
the word \"file\", and gating the engine instead cost ten points of recall@3."
```

---

### Task 14: update CLAUDE.md, then verify everything

CLAUDE.md carries standing instructions about Workshop, the AI Lab, `experimentsIndexable`, the seven-item nav and the career tree's roots. All are now false. A standing instruction that contradicts the tree is worse than either state.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/feedback-tracker.md`

- [ ] **Step 1: Update CLAUDE.md**

Rewrite these passages against what the tree now is:
- The Workshop/`workflowStages` paragraph — the section is gone; keep **only** the standing rule that `watchFor` must never be re-indexed, with its measured reason.
- The `experimentsIndexable` instruction — the adapter is deleted; the Lab content it was held for is deleted too.
- The career tree section — roots are the crossing, not `skillCategories`; branches exclude the nine demoted entries; `concurrentWith` exists.
- The nav measurement note — four items, not seven.
- The `src/lib/` boundary — add that nothing under `lib/` imports from `sections/`, and why (`src/lib/anchors.ts`).

- [ ] **Step 2: Run the full verification**

```bash
pnpm verify
```

Expected: PASS — typecheck, lint, contrast, test, build.

- [ ] **Step 3: Check it in a real browser, both themes**

```bash
pnpm dev
```

Walk all four sections in `day` and `night`. Confirm: the stage pins and releases, the scrubber moves the drawing, "show me the whole tree" works, the credentials strip appears once, every globe plaque link lands on an act.

- [ ] **Step 4: Run the accessibility and responsive suites**

```bash
pnpm test:e2e
```

Expected: PASS across both themes and all three tones, including keyboard nav, focus restoration, reduced motion, and no horizontal overflow at 320–1440px.

**Never pipe this through `tail`** — it discards the error messages and the re-run costs half an hour. If it fails at the default worker count, re-run with `--workers=2`; this repo has a documented saturation flake at 1440 viewport on post-animation `toBeVisible` assertions.

- [ ] **Step 5: Measure the globe chunk**

```bash
pnpm perf
```

Initial JS must not have moved more than a kilobyte or two. A larger move means something leaked out of the lazy chunk. A run reporting any skipped responses is under-reported and must not be recorded. Record the row in `docs/feedback-tracker.md`.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/feedback-tracker.md
git commit -m "Update CLAUDE.md for a four-section site

Its Workshop, AI Lab and experimentsIndexable instructions describe a tree
that no longer exists, and a standing instruction that contradicts the
codebase is worse than either state. What survives is the one measured rule
worth keeping: never re-index workflowStages' watchFor strings.

Adds the boundary this round had to fix: nothing under src/lib/ imports from
src/sections/. Records the perf row for the cut."
```
