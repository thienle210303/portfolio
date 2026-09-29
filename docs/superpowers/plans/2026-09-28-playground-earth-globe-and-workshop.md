# Playground Earth: the globe (`#worlds`) and the Workshop (`#workshop`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two sections the redesign exists for — a draggable
no-dependency Canvas 2D globe holding seven worlds whose every drawn object is
either a verbatim quote of one authored field or a self-declared decoration,
and a Workshop that runs the nine authored loop steps against a real project
with an agent lane underneath.

**Architecture:** Three layers, in this order, and the order is the plan.
(1) A content layer: `src/content/worlds.ts` and `src/content/workshop.ts`
hold *references* to authored fields, never copies of them, and
`src/lib/worlds.ts` / `src/lib/workshop.ts` resolve those references against
`src/content/portfolio.ts` on the server. A reference that resolves to nothing
is dropped or disclosed, never rendered. (2) A static half: both sections are
server-rendered and complete — every plaque, every station, every
number — before one byte of canvas code loads. (3) A live half: one lazily
imported client island per section. The globe's ~53 KB of coastline data and
its projector live only in that lazy chunk, so the initial JS budget
(188.2 KB gz, measured) is untouched; a guard test fences the import.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind
v4 via `@theme`, Canvas 2D with no runtime dependency, Vitest + Testing
Library, Playwright + axe-core, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-02-playground-earth-design.md`

**Approved mockup:** https://claude.ai/code/artifact/b390f6dc-466f-47c8-acb4-bc47ba9e75f8
— the reference implementation for the projector, the drag model, the keyboard
map, the flight coupling and the panel layout. Where this plan and the mockup
disagree, this plan wins and says why (see "Three places the mockup is wrong",
below).

Plan 3 of the redesign. Plan 1
(`2026-09-02-foundation-perf-gate-and-chat-move.md`) added `pnpm perf` and
moved the chat into the hero. Plan 2
(`2026-09-02-demolition-philosophy-and-lab.md`) removed Philosophy and the AI
Workflow Lab and left `problemSolvingLoop`, `workflowStages` and
`scrapingPlaybook` in the content layer, unrendered, for this plan to re-home.
This plan re-homes two of the three.

**Deliberately out of scope**, from the spec's build sequence: step 6 (Work's
idea→i_did strips and the `scrapingPlaybook` coda) and step 11 (the Contact
postcard). They are their own plans. `scrapingPlaybook` therefore stays
unrendered after this plan; do not delete it, and do not re-home it here.

## Global Constraints

Every task's requirements implicitly include this section.

- **pnpm only.** Never introduce an npm or yarn lockfile.
- **No new runtime dependency.** Not one. Three researchers measured the
  alternatives: three.js ~133 KB gz, @react-three/fiber + drei ~254 KB,
  globe.gl ~509 KB, against a 188.2 KB total JS budget. `cobe` (~5.9 KB) ships
  dot-matrix rasters, attaches no listeners and has no SSR path. **Do not
  re-propose a 3D library.** The globe is an orthographic projector in about
  200 lines.
- TypeScript is strict; keep it that way. No `any`, and no non-null assertion
  on a lookup that can miss.
- Tailwind v4 is configured via `@theme` in `src/app/globals.css`. There is no
  `tailwind.config.js` and none may be created.
- **Components style against the semantic aliases only** — `text-fg`,
  `text-fg-muted`, `text-fg-subtle`, `border-rule`, `bg-surface`,
  `text-accent`, `bg-ground`. Never a raw `--color-*` token, never a literal
  hex. Canvas code cannot use a class, so it reads the aliases at draw time
  with `getComputedStyle(document.documentElement).getPropertyValue("--fg")`
  and friends — the same rule, expressed the only way a canvas can.
- **Blue is the only hue**, reserved for annotation, links, measured values and
  the single primary control per screen. On the globe blue is spent on exactly
  four things and nothing else: the two authored pins, the flight arc, the
  seed/sapling, and the one primary button ("Take the flight").
- **The margin rail carries facts already true in the content layer** —
  counts, dates, sources, computed from the data. It never restates the prose
  beside it, and never holds a fact that exists nowhere else.
- **`navItems` order must keep matching the render order in
  `src/app/page.tsx`.** The nav doubles as the page's table of contents. After
  this plan both must read: About · Worlds · Work · Skills · Journey ·
  Workshop · Contact.
- **Every chat answer must link to a section that exists.** Adding a section id
  to the corpus means widening `LINKABLE_SECTIONS` in
  `tests/lib/answers.test.ts:52` and the anchor regex in `e2e/ask.spec.ts:99`
  in the same commit.
- Targets: WCAG 2.2 AA, Lighthouse 90+/95+/95+/95+.
- `touch-action: pan-y` on the globe stage. **Never `none`** — that traps the
  page scroll on a phone.
- The gate is `pnpm verify` (typecheck → lint → contrast → test → build).
  **Run all of it, including lint, before every commit.** A plan-1 task shipped
  a lint break by running only tests and typecheck.
- After each task, also run `pnpm test:e2e` for the specs that task touched.
  The full matrix runs in Task 12.
- Node 22.12+. A dev server may already hold port 3000; `pnpm perf` wants a
  production build on port 3100.

## The honesty rule

This is the design's central invention and the thing most likely to be
"tidied" into a lie. Every drawn object on the globe, and every line in a
world's panel, is exactly one of two things:

- **A plaque.** A typed reference to *one field of one authored record*, or to
  *one named computation over authored records*, rendered **verbatim**. A
  plaque may render an attribution built from other whole fields of the same
  record (`organization · dateRange`), each verbatim, joined with ` · `. **No
  plaque may quote a sub-sentence**, paraphrase, or splice words from two
  records.
- **A decoration.** Carries no fact, and says so: the string
  `no plaque · decoration` appears in its own accessible name.

`tests/lib/worlds.test.ts` enforces this string-for-string (Task 4). If a
plaque's text is not `===` a string the content layer can produce, the test
fails. That test is the feature.

## Three places the mockup is wrong

The mockup is the approved *design*, not approved *content*. Three of its
strings do not survive the honesty rule, and an implementer who copies them
will ship an invented fact:

1. The Sky world's second plaque reads *"One flight, authored. Every season
   after it, computed."* — prose written for the mockup panel, existing in no
   content file. It is replaced by a **computed** plaque rendering the real
   count from `seasonsFor()` (Task 4).
2. The Animals world's third plaque reads *"Yarn · moth · dinner · chase ·
   peek · scratch · stalk"* — seven names, of which `dinner` does not exist.
   The real scene registry in `src/components/companion/companion-play.ts` has
   **eight**: `yarn moth bowl chase gift peek scratch stalk`. Task 3 extracts
   that list to a single non-client module so the plaque cites it instead of
   restating it.
3. The United States world's decorations are a mug and a book, and the
   mockup's own `needs` line admits nobody authored them. The spec's decision 1
   settled the equivalent question for Việt Nam by naming one real object and
   saying plainly that one is all there is. Do the same here: **ship no US
   decorations**, and let the panel's own disclosure carry it. Never invent a
   decoration to fill a row.

## Corrections folded in after review, and one thing deliberately not changed

A parallel research session reviewed this plan before execution. Three of its
findings were verified against this codebase and are now part of the plan; the
rest are recorded here so nobody re-raises them.

**Folded in.** WCAG 2.5.7 — the drag needs a single-pointer alternative and
keyboard support does not provide one (Task 2's `unproject`, Task 8's
click-to-orient, and an e2e that uses clicks only). Forced colours — a canvas
bitmap is not repainted by `forced-colors: active`, so the globe draws in
system colour keywords there (Task 8). The budget gate — `scripts/perf.mjs`
silently under-reports, verified at lines 67-72, so Task 12 now reconciles two
measurements and reports a delta rather than trusting one absolute.

**Checked and not applicable here.** `backdrop-filter` near the canvas (this
codebase uses none — `grep -rn "backdrop-filter\|backdrop-blur" src/` is
empty) and scroll-driven animations not being Baseline (no `animation-timeline`
anywhere). Both are good advice for work this plan does not do.

**Deliberately unchanged: the Euler spin/tilt model.** The suggestion was that
composing Euler angles gimbals near the poles, and that `versor` (977 B) fixes
it. This globe composes exactly two rotations with tilt clamped to ±40°, so
there is no third axis to collapse and gimbal lock is unreachable; drag feel at
high latitude degrades gently, which the approved mockup was judged on. The
no-new-dependency rule stands, and so does this model.

**Outside this plan.** The Newsreader measurement is disputed in a way that
changes the decision rather than the plan — see the note to the owner, not this
file. The follower-cat clearance `test.fixme` may not be a defect at AA;
re-read it before spending a round on it. Neither is touched here.

## Review Focus

Five failure modes the spec implies that no task's happy-path tests exercise.
Each one's test is pinned to the task that owns the code.

- **`pointercancel` mid-drag.** The browser fires it — not `pointerup` — the
  instant it claims the gesture for page scrolling. Handled differently from
  `pointerup`, the globe keeps spinning under a finger that has left and
  `drag` never clears. Test: Task 8.
- **A plaque reference that resolves to nothing.** A field holding a
  `[NEEDS INPUT: …]` marker, an out-of-range list index, or an id that no
  longer exists. Expected: the plaque is dropped and the rail's counts drop
  with it — never `undefined`, never the marker text, never a thrown render.
  Test: Task 4.
- **Reduced motion plus "Take the flight".** Expected: the finished frame and
  the landing caption, immediately, with no animation frame ever requested.
  Test: Task 9.
- **No canvas at all** — JS disabled, or the lazy chunk 404s on a flaky
  deploy. Expected: all seven worlds, every plaque and every rail number are
  still present and operable, because they were server-rendered. Test: Task 6.
- **A Workshop station whose project authors no field.** Four of the five
  projects author no `whatFailed`, and `automotive-genai` authors neither
  `assumption` nor `metrics`. Expected: the station states plainly that this
  run has nothing authored for it. Never an empty station, never a borrowed
  line from another project. Test: Task 10.
- **A pointer that cannot hold a drag** — a head pointer, eye-gaze, a mouth
  stick. WCAG 2.5.7 (Dragging Movements, AA, new in 2.2) requires the drag's
  function be achievable "by a single pointer without dragging", and keyboard
  support does **not** satisfy it (that is 2.1.1, a different criterion).
  Expected: click-to-orient on the canvas, the seven list buttons and "Take the
  flight" complete the whole section with single clicks. Test: Task 8.
- **Windows High Contrast.** `forced-colors: active` repaints CSS but **not a
  canvas bitmap**, so the globe would keep its authored palette against a
  forced black or white page and blue would stop being distinguishable as
  annotation. Expected: the globe redraws in system colour keywords. Test:
  Task 8.

---

## File structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/globe.ts` | Pure geometry: lon/lat → unit vector, rotate, orthographic project, great-circle arc, crossing distance, midpoint, apex, graticule, tilt clamp. No DOM, no React. |
| `src/content/worlds.ts` | The seven worlds as *references*: coordinates, plaque refs, decoration ids, disclosures. No quoted prose. |
| `src/lib/worlds.ts` | Resolves those references against the content layer into flat, serializable `ResolvedWorld`s. The honesty rule is implemented here. |
| `src/components/companion/scene-names.ts` | The eight play-scene names, as one non-client list both `companion-play.ts` and the Animals world read. |
| `src/sections/Worlds/Worlds.tsx` | The `#worlds` `<Section>`: heading, rail, stage, list, panels. Server component. |
| `src/sections/Worlds/WorldsStage.tsx` | Client. Owns `currentId`, renders the list + panel, lazily imports the canvas. |
| `src/sections/Worlds/WorldPanel.tsx` | One world's panel: plaques, decorations, disclosure. Pure presentation. |
| `src/sections/Worlds/glyphs.ts` | The glyph path vocabulary, one 24-unit box each, as plain strings for both `<svg>` and `Path2D`. |
| `src/sections/Worlds/GlobeCanvas.tsx` | Client, lazily imported. The canvas, the loop, the drag, the keyboard, the flight. |
| `src/sections/Worlds/coastline-data.ts` | Generated. Natural Earth 110m coastlines, simplified. Imported by `GlobeCanvas.tsx` and nothing else. |
| `src/content/workshop.ts` | The station→field map and the agent lane's stage selection. References, not prose. |
| `src/lib/workshop.ts` | Resolves a run: one project × nine stations, with every gap disclosed. |
| `src/sections/Workshop/Workshop.tsx` | The `#workshop` `<Section>`. Server component. |
| `src/sections/Workshop/WorkshopRun.tsx` | Client. The project switcher and the station list. |
| `src/sections/Workshop/AgentLane.tsx` | The agent lane under the stations, from `workflowStages`. |
| `tests/lib/globe.test.ts` | Projector and arc maths. |
| `tests/lib/worlds.test.ts` | The honesty rule, string-for-string. |
| `tests/lib/workshop.test.ts` | Station resolution and the disclosed gaps. |
| `tests/lib/coastline-data.test.ts` | Data shape, and the import fence. |
| `tests/sections/WorldsStage.test.tsx` | The list/panel contract without a canvas. |
| `tests/sections/WorkshopRun.test.tsx` | Switching the run's project. |
| `e2e/worlds.spec.ts` | Drag, keyboard, flight, rAF-at-rest, no-canvas completeness. |
| `e2e/workshop.spec.ts` | Stations, switcher, agent lane, keyboard. |

**Modified**

| File | Change |
|---|---|
| `src/types/portfolio.ts` | `GeoPoint`; `Origin` gains `coordinates`; `Companion`. |
| `src/content/portfolio.ts` | `origin.from` → "Kiên Giang, Việt Nam"; `origin.coordinates`; `companions`; two `navItems` entries. |
| `src/app/page.tsx` | `<Worlds />` after `<Hero />`, `<Workshop />` after `<CareerTree />`. |
| `src/components/companion/companion-play.ts` | `SceneKind` derives from `scene-names.ts`. |
| `src/components/companion/companion-tour.ts` | `GREY_MIDDLE` gains `worlds` and `workshop`. |
| `src/components/companion/companion-dialogue.ts` | `TOUR.worlds`, `TOUR.workshop`. |
| `src/lib/companion-facts.ts` | `worlds` and `workshop` fact groups. |
| `src/lib/answer-corpus.ts` | Documents for both sections. |
| `src/content/answer-expansion.ts` | `sectionExpansions.worlds`, `.workshop`. |
| `tests/lib/answers.test.ts`, `e2e/ask.spec.ts` | Widen the linkable-section guards. |
| `scripts/screenshots.mjs` | `SECTIONS` gains both ids. |
| `docs/editing.md`, `docs/feedback-tracker.md`, `CLAUDE.md` | Recipes, round log, the design-system note. |

---

### Task 1: The place is Kiên Giang, and the two pins have coordinates

Thien's decision 2: the place name is **"Kiên Giang, Việt Nam"**, province
level, no city. Taken at the content layer so one string serves the globe, the
origin story and every caption — the site must never carry two names for one
place. The career tree's origin captions will read "Kiên Giang" after this,
which is the intended consequence, not a regression.

Coordinates join `origin` rather than `worlds.ts` for the same reason: they are
facts about the crossing, which that record already owns, and the flight arc,
the Sea world's derived midpoint and the Sky world's derived apex must all
agree — which they only do if one pair of numbers exists.

**Files:**
- Modify: `src/types/portfolio.ts:76-81` (`Origin`)
- Modify: `src/content/portfolio.ts:93-98` (`origin`)
- Test: `tests/lib/origin-story.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export interface GeoPoint { readonly lat: number; readonly lon: number }`;
  `origin.coordinates: { readonly from: GeoPoint; readonly to: GeoPoint }`;
  `origin.from === "Kiên Giang, Việt Nam"`.

- [ ] **Step 1: Find every place the old string is pinned**

Run:

```bash
grep -rn "Rạch Giá" src tests e2e docs
```

Every hit is a line this task changes. Note them before editing — a pinned
literal in an e2e spec otherwise fails on a later task's machine, a long way
from the change that caused it.

- [ ] **Step 2: Write the failing test**

Append to `tests/lib/origin-story.test.ts`:

```ts
import { origin } from "@/content/portfolio";

describe("origin, as the globe's two pins", () => {
  it("names the place at province level, with no city", () => {
    expect(origin.from).toBe("Kiên Giang, Việt Nam");
    expect(origin.from).not.toContain("Rạch Giá");
  });

  it("carries coordinates for both ends of the crossing", () => {
    expect(origin.coordinates.from.lat).toBeCloseTo(10.0, 1);
    expect(origin.coordinates.from.lon).toBeCloseTo(105.1, 1);
    // The United States pin is the country centroid, unlabelled below country
    // level — decision 3. Not a city, on purpose: no city is authored
    // anywhere, and the globe may not be the one place that invents one.
    expect(origin.coordinates.to.lat).toBeCloseTo(39.83, 1);
    expect(origin.coordinates.to.lon).toBeCloseTo(-98.58, 1);
  });

  it("keeps latitudes and longitudes inside the real world", () => {
    for (const point of [origin.coordinates.from, origin.coordinates.to]) {
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(point.lon)).toBeLessThanOrEqual(180);
    }
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/origin-story.test.ts`
Expected: FAIL — `origin.coordinates` is undefined, and `origin.from` is
`"Rạch Giá, Việt Nam"`.

- [ ] **Step 4: Widen the type**

In `src/types/portfolio.ts`, above `Origin`:

```ts
/** A point on the globe, in degrees. Positive latitude is north, positive
 *  longitude is east — the convention Natural Earth and every web map use, so
 *  a coordinate can be read off a map and typed in unchanged. */
export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}
```

and inside `Origin`:

```ts
  /**
   * Where the two ends of the crossing are. Authored here rather than in
   * `src/content/worlds.ts` because they are facts about the crossing itself,
   * which this record already owns — and because the globe, the flight arc,
   * the Sea world's derived midpoint and the Sky world's derived apex must
   * every one of them agree, which they only do if there is one pair of
   * numbers on the site.
   *
   * `to` is the United States country centroid, deliberately not a city.
   */
  readonly coordinates: {
    readonly from: GeoPoint;
    readonly to: GeoPoint;
  };
```

- [ ] **Step 5: Change the content**

In `src/content/portfolio.ts`:

```ts
export const origin = {
  // Province level, no city (owner's decision, 2026-09-02). This one string
  // serves the globe's pin, the origin story's captions and the résumé — the
  // site must never carry two names for one place.
  from: "Kiên Giang, Việt Nam",
  to: "United States",
  arrived: "December 2018",
  arrivedYear: 2018,
  coordinates: {
    from: { lat: 10.0, lon: 105.1 },
    to: { lat: 39.83, lon: -98.58 },
  },
} satisfies Origin;
```

- [ ] **Step 6: Run the whole unit suite**

Run: `pnpm vitest run`
Expected: PASS, including `tests/lib/answers.test.ts` — it builds its corpus
set from `origin`, so the new string flows through rather than being pinned. If
a test fails on the literal "Rạch Giá", change it to read from `origin` rather
than re-pinning the new literal.

- [ ] **Step 7: Verify, then look at it**

Run: `pnpm verify`
Expected: all five stages pass.

Then `pnpm dev`, open `/#tree`, press "Watch how it grew", read the first
caption. Expected: it says Kiên Giang. Check `/resume` too.

- [ ] **Step 8: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts tests/lib/origin-story.test.ts
git commit -m "Name the place Kiên Giang, and give the crossing coordinates

The owner's decision, taken at the content layer so the globe, the origin
story and the résumé all read one string. The two pins join origin for the
same reason: the flight arc and the two derived worlds must agree, and they
only agree if one pair of numbers exists.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The projector

Pure maths, no DOM, no React, fully unit-tested before anything draws. This is
the whole reason the globe needs no dependency, and it is twelve functions.

**Files:**
- Create: `src/lib/globe.ts`
- Test: `tests/lib/globe.test.ts`

**Interfaces:**
- Consumes: `GeoPoint` from `src/types/portfolio.ts` (Task 1).
- Produces:

```ts
export type Vec3 = readonly [number, number, number];
export function toVector(point: GeoPoint): Vec3;
export function toGeo(v: Vec3): GeoPoint;
export function rotate(v: Vec3, spin: number, tilt: number): Vec3;
export interface Projected { readonly x: number; readonly y: number; readonly front: boolean; readonly depth: number }
export interface Viewport { readonly cx: number; readonly cy: number; readonly radius: number }
export function project(v: Vec3, spin: number, tilt: number, view: Viewport): Projected;
export interface GreatCircle { readonly points: readonly Vec3[]; readonly radians: number }
export function greatCircle(a: GeoPoint, b: GeoPoint, segments: number): GreatCircle;
export function arcKm(radians: number): number;
export function arcMidpoint(arc: GreatCircle): GeoPoint;
export function arcApex(arc: GreatCircle): GeoPoint;
export function graticule(stepDegrees: number): readonly (readonly GeoPoint[])[];
export function unproject(x: number, y: number, spin: number, tilt: number, view: Viewport): GeoPoint | null;
export function clampTilt(tilt: number): number;
export const MAX_TILT_RADIANS: number;
export const EARTH_RADIUS_KM = 6371;
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/globe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  arcApex,
  arcKm,
  arcMidpoint,
  clampTilt,
  graticule,
  greatCircle,
  MAX_TILT_RADIANS,
  project,
  rotate,
  toGeo,
  toVector,
  unproject,
  type Viewport,
} from "@/lib/globe";
import { origin } from "@/content/portfolio";

const VIEW: Viewport = { cx: 200, cy: 200, radius: 100 };

describe("toVector / toGeo", () => {
  it("puts 0°N 0°E on the +x axis, facing the viewer", () => {
    expect(toVector({ lat: 0, lon: 0 })).toEqual([1, 0, 0]);
  });

  it("puts the north pole on +z", () => {
    const [x, y, z] = toVector({ lat: 90, lon: 0 });
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(1, 10);
  });

  it("round-trips every point it is given", () => {
    for (const point of [
      { lat: 10, lon: 105.1 },
      { lat: -33.9, lon: 18.4 },
      { lat: 39.83, lon: -98.58 },
      { lat: 0, lon: 180 },
      { lat: -89.9, lon: -179.9 },
    ]) {
      const back = toGeo(toVector(point));
      expect(back.lat).toBeCloseTo(point.lat, 6);
      // ±180 is the same meridian; compare positions on the circle.
      expect(Math.cos(((back.lon - point.lon) * Math.PI) / 180)).toBeCloseTo(1, 6);
    }
  });

  it("returns a unit vector for every input", () => {
    for (const lat of [-90, -45, 0, 45, 90]) {
      for (const lon of [-180, -90, 0, 90, 180]) {
        const [x, y, z] = toVector({ lat, lon });
        expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
      }
    }
  });
});

describe("rotate", () => {
  it("is the identity at zero spin and zero tilt", () => {
    const v = toVector({ lat: 12, lon: 34 });
    const r = rotate(v, 0, 0);
    expect(r[0]).toBeCloseTo(v[0], 10);
    expect(r[1]).toBeCloseTo(v[1], 10);
    expect(r[2]).toBeCloseTo(v[2], 10);
  });

  it("brings a meridian to face the viewer when spin is its negated longitude", () => {
    const spin = (-105.1 * Math.PI) / 180;
    const [x, y] = rotate(toVector({ lat: 0, lon: 105.1 }), spin, 0);
    expect(x).toBeCloseTo(1, 6); // dead centre, nearest the viewer
    expect(y).toBeCloseTo(0, 6);
  });

  it("preserves length", () => {
    const [x, y, z] = rotate(toVector({ lat: -40, lon: 77 }), 1.2, -0.4);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
  });
});

describe("project", () => {
  it("puts the sub-viewer point at the centre of the disc", () => {
    const p = project(toVector({ lat: 0, lon: 0 }), 0, 0, VIEW);
    expect(p.x).toBeCloseTo(200, 6);
    expect(p.y).toBeCloseTo(200, 6);
    expect(p.front).toBe(true);
  });

  it("reports the far hemisphere as not front, and still inside the disc", () => {
    const p = project(toVector({ lat: 0, lon: 180 }), 0, 0, VIEW);
    expect(p.front).toBe(false);
    expect(Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy)).toBeLessThanOrEqual(VIEW.radius + 1e-9);
  });

  it("puts north above centre — screen y grows downward", () => {
    expect(project(toVector({ lat: 45, lon: 0 }), 0, 0, VIEW).y).toBeLessThan(VIEW.cy);
  });

  it("keeps every projected point inside the limb circle", () => {
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon <= 180; lon += 15) {
        const p = project(toVector({ lat, lon }), 0.7, -0.3, VIEW);
        expect(Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy)).toBeLessThanOrEqual(VIEW.radius + 1e-9);
      }
    }
  });

  it("gives a front point positive depth and a back point negative depth", () => {
    expect(project(toVector({ lat: 0, lon: 0 }), 0, 0, VIEW).depth).toBeGreaterThan(0);
    expect(project(toVector({ lat: 0, lon: 170 }), 0, 0, VIEW).depth).toBeLessThan(0);
  });
});

describe("greatCircle", () => {
  const arc = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

  it("returns segments + 1 points, starting and ending on the two pins", () => {
    expect(arc.points).toHaveLength(73);
    expect(toGeo(arc.points[0]).lat).toBeCloseTo(origin.coordinates.from.lat, 6);
    expect(toGeo(arc.points[arc.points.length - 1]).lat).toBeCloseTo(
      origin.coordinates.to.lat,
      6,
    );
  });

  it("keeps every interior point on the unit sphere", () => {
    for (const [x, y, z] of arc.points) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 8);
    }
  });

  it("measures the crossing at roughly 13,500 km", () => {
    const km = arcKm(arc.radians);
    expect(km).toBeGreaterThan(12_000);
    expect(km).toBeLessThan(15_000);
  });

  it("survives two identical points without dividing by zero", () => {
    const degenerate = greatCircle({ lat: 10, lon: 20 }, { lat: 10, lon: 20 }, 8);
    expect(degenerate.radians).toBeCloseTo(0, 10);
    expect(degenerate.points).toHaveLength(9);
    for (const [x, y, z] of degenerate.points) {
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 8);
    }
  });

  it("survives exact antipodes without returning NaN", () => {
    for (const [x, y, z] of greatCircle({ lat: 10, lon: 0 }, { lat: -10, lon: 180 }, 8).points) {
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
    }
  });
});

describe("derived worlds", () => {
  const arc = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

  it("puts the Sea's midpoint between the two pins, out over the Pacific", () => {
    const mid = arcMidpoint(arc);
    expect(mid.lat).toBeGreaterThan(origin.coordinates.from.lat);
    expect(Math.abs(mid.lon)).toBeGreaterThan(150);
  });

  it("puts the Sky's apex at the arc's highest latitude", () => {
    const apex = arcApex(arc);
    for (const point of arc.points) {
      expect(apex.lat).toBeGreaterThanOrEqual(toGeo(point).lat - 1e-9);
    }
  });
});

describe("graticule", () => {
  it("returns parallels and meridians at the given step, all in range", () => {
    const lines = graticule(30);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(2);
      for (const point of line) {
        expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(point.lon)).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("unproject", () => {
  // The inverse is what makes a single click able to do what a drag does —
  // WCAG 2.5.7 (see the Review Focus). Every assertion here is a round trip,
  // because that is the only property the caller actually depends on.
  it("round-trips a front-hemisphere point back to where it was projected from", () => {
    for (const spin of [0, 0.7, -2.1]) {
      for (const tilt of [0, 0.3, -0.5]) {
        for (const point of [
          { lat: 0, lon: 0 },
          { lat: 10, lon: 105.1 },
          { lat: 39.83, lon: -98.58 },
          { lat: -20, lon: 40 },
        ]) {
          const p = project(toVector(point), spin, tilt, VIEW);
          if (!p.front) continue;
          const back = unproject(p.x, p.y, spin, tilt, VIEW);
          expect(back).not.toBeNull();
          expect(back?.lat).toBeCloseTo(point.lat, 4);
          expect(Math.cos((((back?.lon ?? 0) - point.lon) * Math.PI) / 180)).toBeCloseTo(1, 4);
        }
      }
    }
  });

  it("returns null for a click outside the disc", () => {
    expect(unproject(VIEW.cx + VIEW.radius * 2, VIEW.cy, 0, 0, VIEW)).toBeNull();
  });

  it("returns a point, not null, exactly on the limb", () => {
    // The boundary is reachable by a real click and must not produce NaN from
    // a negative square root.
    const edge = unproject(VIEW.cx + VIEW.radius, VIEW.cy, 0, 0, VIEW);
    expect(edge).not.toBeNull();
    expect(Number.isFinite(edge?.lat ?? NaN)).toBe(true);
    expect(Number.isFinite(edge?.lon ?? NaN)).toBe(true);
  });
});

describe("clampTilt", () => {
  it("clamps to ±40° and leaves anything inside alone", () => {
    expect(clampTilt(-99)).toBeCloseTo(-MAX_TILT_RADIANS, 10);
    expect(clampTilt(99)).toBeCloseTo(MAX_TILT_RADIANS, 10);
    expect(clampTilt(0.1)).toBeCloseTo(0.1, 10);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/globe.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/globe"`.

- [ ] **Step 3: Write the projector**

Create `src/lib/globe.ts`:

```ts
import type { GeoPoint } from "@/types/portfolio";

/**
 * The whole reason this site draws a planet without a 3D library.
 *
 * An orthographic projection is three steps and no matrices worth the name:
 * put the point on a unit sphere, rotate the sphere, then throw away the axis
 * pointing at the viewer. What is left is a disc, and the discarded axis's
 * sign is the answer to "is this on the near side?" — the only hidden-surface
 * test a wireframe globe needs.
 *
 * Axis convention, chosen so the arithmetic stays boring:
 *   +x points at the viewer, +y points right on screen, +z points to the
 *   north pole. So 0°N 0°E at rest is `[1, 0, 0]`: dead centre, nearest.
 *
 * Screen y is negated at projection time, once, here — canvas y grows
 * downward and latitude grows upward, and every caller that does that
 * conversion for itself eventually gets it wrong in one place.
 *
 * Nothing in this file touches the DOM, React, or `document`. That is what
 * makes the interesting half of the globe testable in Vitest, and it is why
 * every geometric bug in this feature is a unit-test failure rather than a
 * screenshot someone has to squint at.
 */

const DEG = Math.PI / 180;

export const EARTH_RADIUS_KM = 6371;

/** Tilt clamp, from the spec: past 40° the graticule reads as a mistake and
 *  both pins can leave the visible hemisphere at once. */
export const MAX_TILT_RADIANS = 40 * DEG;

export type Vec3 = readonly [number, number, number];

export function toVector(point: GeoPoint): Vec3 {
  const phi = point.lat * DEG;
  const lambda = point.lon * DEG;
  const c = Math.cos(phi);
  return [c * Math.cos(lambda), c * Math.sin(lambda), Math.sin(phi)];
}

export function toGeo(v: Vec3): GeoPoint {
  // `v` is expected to be a unit vector; the clamp guards the one input that
  // can push asin out of domain — a component that arrived as 1 + 1e-16 from
  // an interpolation.
  const z = Math.max(-1, Math.min(1, v[2]));
  return { lat: Math.asin(z) / DEG, lon: Math.atan2(v[1], v[0]) / DEG };
}

/**
 * Spin about the polar axis, then tilt the pole toward or away from the
 * viewer. Two angles, in that order, and no third: a globe that can also roll
 * about the view axis is a globe whose horizon is crooked, which reads as a
 * bug rather than a feature.
 */
export function rotate(v: Vec3, spin: number, tilt: number): Vec3 {
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const x = v[0] * cs - v[1] * ss;
  const y = v[0] * ss + v[1] * cs;
  const z = v[2];
  return [x * ct - z * st, y, x * st + z * ct];
}

export interface Projected {
  readonly x: number;
  readonly y: number;
  /** True on the hemisphere facing the viewer. The pen lifts when this is
   *  false, which is what keeps coastlines from smearing across the limb. */
  readonly front: boolean;
  /** The discarded axis, in [-1, 1]. Nearest the viewer is 1. Used to scale a
   *  marker so the ones at the limb read as further away. */
  readonly depth: number;
}

export interface Viewport {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export function project(v: Vec3, spin: number, tilt: number, view: Viewport): Projected {
  const r = rotate(v, spin, tilt);
  return {
    x: view.cx + view.radius * r[1],
    y: view.cy - view.radius * r[2],
    front: r[0] > 0,
    depth: r[0],
  };
}

export interface GreatCircle {
  readonly points: readonly Vec3[];
  /** Angular separation of the two ends, in radians. */
  readonly radians: number;
}

/**
 * The shortest path between two places, sampled evenly, by spherical linear
 * interpolation.
 *
 * Two inputs break the textbook formula and both are reachable from authored
 * coordinates, so both are handled rather than documented as unlikely: two
 * identical points make `sin(d)` zero, and exact antipodes make the shortest
 * path ambiguous. Both return the start point repeated, which draws nothing
 * and flies nowhere — the honest rendering of "there is no crossing here".
 */
export function greatCircle(a: GeoPoint, b: GeoPoint, segments: number): GreatCircle {
  const va = toVector(a);
  const vb = toVector(b);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const radians = Math.acos(dot);
  const sin = Math.sin(radians);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    if (sin < 1e-9) {
      points.push(va);
      continue;
    }
    const t = i / segments;
    const A = Math.sin((1 - t) * radians) / sin;
    const B = Math.sin(t * radians) / sin;
    points.push([va[0] * A + vb[0] * B, va[1] * A + vb[1] * B, va[2] * A + vb[2] * B]);
  }
  return { points, radians };
}

export function arcKm(radians: number): number {
  return radians * EARTH_RADIUS_KM;
}

/** The Sea world's home: halfway along the crossing, derived rather than
 *  typed, so it cannot drift from the two pins. */
export function arcMidpoint(arc: GreatCircle): GeoPoint {
  return toGeo(arc.points[Math.floor(arc.points.length / 2)]);
}

/** The Sky world's home: the highest latitude the crossing reaches. */
export function arcApex(arc: GreatCircle): GeoPoint {
  let best = toGeo(arc.points[0]);
  for (const point of arc.points) {
    const geo = toGeo(point);
    if (geo.lat > best.lat) best = geo;
  }
  return best;
}

/**
 * Parallels and meridians as polylines, ready to project. One step value
 * drives both, because a graticule whose parallels and meridians disagree
 * about spacing reads as two overlaid grids.
 *
 * Parallels stop short of the poles (a parallel at ±90° is a point) and
 * meridians run pole to pole.
 */
export function graticule(stepDegrees: number): readonly (readonly GeoPoint[])[] {
  const lines: GeoPoint[][] = [];
  for (let lat = -90 + stepDegrees; lat <= 90 - stepDegrees + 1e-9; lat += stepDegrees) {
    const parallel: GeoPoint[] = [];
    for (let lon = -180; lon <= 180; lon += 5) parallel.push({ lat, lon });
    lines.push(parallel);
  }
  for (let lon = -180; lon < 180 - 1e-9; lon += stepDegrees) {
    const meridian: GeoPoint[] = [];
    for (let lat = -90; lat <= 90; lat += 5) meridian.push({ lat, lon });
    lines.push(meridian);
  }
  return lines;
}

/** `rotate` applies spin about the polar axis and then tilt; this undoes them
 *  in the opposite order, which is all an inverse is. */
function unrotate(v: Vec3, spin: number, tilt: number): Vec3 {
  const ct = Math.cos(-tilt);
  const st = Math.sin(-tilt);
  const x = v[0] * ct - v[2] * st;
  const z = v[0] * st + v[2] * ct;
  const cs = Math.cos(-spin);
  const ss = Math.sin(-spin);
  return [x * cs - v[1] * ss, x * ss + v[1] * cs, z];
}

/**
 * Screen point → the place on the near hemisphere under it, or `null` when the
 * click landed off the disc.
 *
 * This exists for one reason and it is not convenience: WCAG 2.5.7 requires
 * that anything a drag does be achievable with a single pointer and no drag.
 * With this, one click brings the place you clicked round to face you, which
 * is what the drag is for. See `GlobeCanvas.tsx`'s release handler.
 *
 * The `max(0, …)` before the square root is load-bearing: a click exactly on
 * the limb computes `1 - nx² - ny²` as a very small negative number about half
 * the time, and `Math.sqrt` of that is NaN — which would silently rotate the
 * globe to nowhere.
 */
export function unproject(
  x: number,
  y: number,
  spin: number,
  tilt: number,
  view: Viewport,
): GeoPoint | null {
  const nx = (x - view.cx) / view.radius;
  const ny = (view.cy - y) / view.radius;
  const squared = nx * nx + ny * ny;
  if (squared > 1) return null;
  const rx = Math.sqrt(Math.max(0, 1 - squared));
  return toGeo(unrotate([rx, nx, ny], spin, tilt));
}

export function clampTilt(tilt: number): number {
  return Math.max(-MAX_TILT_RADIANS, Math.min(MAX_TILT_RADIANS, tilt));
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run tests/lib/globe.test.ts`
Expected: PASS, every case.

If the Pacific assertion in `arcMidpoint` fails, do not loosen the test —
print `arcMidpoint(arc)` and check the sign convention in `toVector` first. A
midpoint in the Atlantic means +x and +y are swapped.

- [ ] **Step 5: Verify**

Run: `pnpm verify`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/globe.ts tests/lib/globe.test.ts
git commit -m "Add the orthographic projector the globe runs on

Rotate, project, lift the pen at the limb. No dependency, no DOM, and the
interesting half of the feature is a unit test rather than a screenshot.

Degenerate and antipodal great circles are handled rather than noted: both
are reachable from authored coordinates, and both otherwise return NaN.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The cats are facts, and there are eight scenes

The Animals world's three plaques need two things that do not exist yet: the
cats' names as authored content, and the play-scene list as something citable
rather than restatable.

Thien's decision 5: **Moon**, the blue cat, who leads; **Mi**, the grey tabby,
who follows. That is the most personal fact on the globe and it costs nothing.

The scene list is the mockup's second error (see "Three places the mockup is
wrong"): it lists seven names including `dinner`, which does not exist. The
registry has eight — `yarn moth bowl chase gift peek scratch stalk` — and it
lives in `companion-play.ts`, which carries `"use client"`. Importing that from
a server resolver would drag the whole play engine across the boundary, so the
list is extracted into its own tiny, directive-free module that both sides
read.

**Files:**
- Create: `src/components/companion/scene-names.ts`
- Modify: `src/components/companion/companion-play.ts:124-132` (`SceneKind`)
- Modify: `src/types/portfolio.ts` (add `Companion`)
- Modify: `src/content/portfolio.ts` (add `companions`)
- Test: `tests/lib/companion-scenes.test.ts` (exists — extend it)

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
// src/components/companion/scene-names.ts
export const SCENE_NAMES: readonly ["yarn","moth","bowl","chase","gift","peek","scratch","stalk"];
export type SceneName = (typeof SCENE_NAMES)[number];

// src/types/portfolio.ts
export interface Companion {
  readonly id: string;
  readonly name: string;
  readonly coat: string;
  readonly habit: string;
  readonly authoredOn: string;
}

// src/content/portfolio.ts
export const companions: readonly Companion[];   // Moon first (leads), Mi second
```

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/companion-scenes.test.ts`:

```ts
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { companions } from "@/content/portfolio";

describe("SCENE_NAMES, the one list of play scenes", () => {
  it("names all eight scenes the play engine actually weights", () => {
    // ROAM_WEIGHTS is the real registry — every scene the engine can pick has
    // a weight in it. If a scene is added there and not here, the Animals
    // world's plaque quietly under-reports, which is exactly the kind of
    // silent drift a duplicated list produces.
    expect([...SCENE_NAMES].sort()).toEqual(Object.keys(ROAM_WEIGHTS).sort());
  });

  it("has no duplicates", () => {
    expect(new Set(SCENE_NAMES).size).toBe(SCENE_NAMES.length);
  });

  it("does not contain the mockup's invented scene", () => {
    expect(SCENE_NAMES).not.toContain("dinner");
  });
});

describe("companions", () => {
  it("names both cats, in the order they walk", () => {
    expect(companions.map((cat) => cat.name)).toEqual(["Moon", "Mi"]);
  });

  it("gives each one a coat and a habit, and says when it was authored", () => {
    for (const cat of companions) {
      expect(cat.coat.length).toBeGreaterThan(0);
      expect(cat.habit.length).toBeGreaterThan(0);
      expect(cat.authoredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
```

`ROAM_WEIGHTS` is not exported today. Export it from `companion-play.ts` (add
`export` to its existing `const ROAM_WEIGHTS`) and import it at the top of the
test alongside whatever that file already imports. Exporting it is the point:
it makes the registry the single source the new list is checked against.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/companion-scenes.test.ts`
Expected: FAIL — `@/components/companion/scene-names` does not resolve.

- [ ] **Step 3: Create the scene-name list**

Create `src/components/companion/scene-names.ts`:

```ts
/**
 * The eight play scenes, by name, with no `"use client"` on this file.
 *
 * That last part is the only reason this module exists. `companion-play.ts`
 * is a client module, and the globe's Animals world needs to *cite* this list
 * from a server resolver (`src/lib/worlds.ts`) rather than restate it — the
 * site's rule is that a fact lives in exactly one place. A directive-free
 * list both sides import is the smallest thing that satisfies both.
 *
 * `companion-play.ts` derives its own `SceneKind` from this, so there is one
 * list and the type follows it rather than the other way round.
 * `tests/lib/companion-scenes.test.ts` checks it against `ROAM_WEIGHTS`, the
 * engine's real registry, so a ninth scene added there fails loudly here
 * instead of quietly under-reporting on the globe.
 */
export const SCENE_NAMES = [
  "yarn",
  "moth",
  "bowl",
  "chase",
  "gift",
  "peek",
  "scratch",
  "stalk",
] as const;

export type SceneName = (typeof SCENE_NAMES)[number];
```

- [ ] **Step 4: Point `SceneKind` at it**

In `src/components/companion/companion-play.ts`, replace the eight-member
union at lines 124-132 with:

```ts
// Derived, not duplicated: the names live in `scene-names.ts`, which carries
// no "use client" so the globe's Animals world can cite the same list from a
// server component. See that file's own note.
export type SceneKind = SceneName;
```

and add `import { type SceneName } from "./scene-names";` to the imports.
Also add `export` to `const ROAM_WEIGHTS` so the test can check the list
against the registry.

- [ ] **Step 5: Add the cats to the content layer**

In `src/types/portfolio.ts`:

```ts
/**
 * One of the two cats who live on this page — real animals, named by their
 * owner on 2026-09-02, which is why `authoredOn` is here: this is the one
 * record on the site whose provenance is "he told me", with no document
 * behind it, and the globe's Animals world says so on the plaque.
 */
export interface Companion {
  readonly id: string;
  readonly name: string;
  /** What she looks like, in the drawing's own terms. */
  readonly coat: string;
  /** What she does, which is also which of the two drawn cats she is. */
  readonly habit: string;
  /** ISO date the owner authored this. */
  readonly authoredOn: string;
}
```

In `src/content/portfolio.ts`, near `origin`:

```ts
/**
 * The two cats. Order is load-bearing: the lead cat is first, which is the
 * same order `Companion.tsx` draws them in and the order the globe's plinth
 * labels them under.
 */
export const companions = [
  {
    id: "moon",
    name: "Moon",
    coat: "the blue cat",
    habit: "Leads, and sets the pace.",
    authoredOn: "2026-09-02",
  },
  {
    id: "mi",
    name: "Mi",
    coat: "the grey tabby",
    habit: "Follows, and gets distracted.",
    authoredOn: "2026-09-02",
  },
] satisfies readonly Companion[];
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run`
Expected: PASS. `tests/lib/companion-scenes.test.ts` and every other companion
test stay green — `SceneKind` is the same eight-member union, arrived at from
the other direction.

- [ ] **Step 7: Verify**

Run: `pnpm verify`
Expected: green. Typecheck is the real check here: if `SceneKind` lost a member
in the swap, every `Record<SceneKind, …>` in `companion-play.ts` fails.

- [ ] **Step 8: Commit**

```bash
git add src/components/companion/scene-names.ts src/components/companion/companion-play.ts src/types/portfolio.ts src/content/portfolio.ts tests/lib/companion-scenes.test.ts
git commit -m "Name the cats, and give the scene list one home

Moon leads, Mi follows — the owner's own fact, so the globe's Animals world
can quote it rather than draw two anonymous cats.

The eight scene names move to a directive-free module both the client play
engine and the server-side globe resolver read. SceneKind now derives from it,
and a test checks the list against ROAM_WEIGHTS so a ninth scene cannot be
added in one place only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The seven worlds, and the test that makes them honest

The heart of the design. `src/content/worlds.ts` says *which field* each plaque
quotes; `src/lib/worlds.ts` fetches it and renders it verbatim;
`tests/lib/worlds.test.ts` proves string-for-string that nothing was invented.

Read "The honesty rule" and "Three places the mockup is wrong" at the top of
this plan before writing a line of this task.

**Files:**
- Modify: `src/types/portfolio.ts` (the world/plaque types)
- Create: `src/content/worlds.ts`
- Create: `src/lib/worlds.ts`
- Modify: `src/lib/knowledge-tree.ts` (extract `stillGrowingCaption()`)
- Modify: `src/sections/CareerTree/DrawnTree.tsx:459`,
  `src/sections/CareerTree/list-ink.tsx:234` (call it)
- Test: `tests/lib/worlds.test.ts`

**Interfaces:**
- Consumes: `origin.coordinates`, `companions` (Tasks 1, 3); `greatCircle`,
  `arcKm`, `arcMidpoint`, `arcApex` (Task 2); `SCENE_NAMES` (Task 3).
- Produces:

```ts
// src/types/portfolio.ts
export type GlyphId =
  | "comtam" | "cap" | "trophy" | "ribbon" | "chalk" | "net" | "buoy"
  | "jelly" | "bird" | "plane" | "sprout" | "cat" | "sat" | "chip" | "star";

export type WorldAnchor =
  | { readonly at: "origin-from" }
  | { readonly at: "origin-to" }
  | { readonly at: "arc-midpoint" }
  | { readonly at: "arc-apex" }
  | { readonly at: "plinth" }
  | { readonly at: "orbit" };

export type ComputedFactId =
  | "tree-shape" | "tree-still-growing" | "crossing" | "seasons" | "play-scenes" | "ai-tools";

export type PlaqueRef =
  | { readonly of: "careerEntry"; readonly id: string; readonly field: "role" | "context" | "learned" }
  | { readonly of: "careerEntryLine"; readonly id: string; readonly field: "impact" | "built"; readonly index: number }
  | { readonly of: "project"; readonly id: string; readonly field: "tagline" | "learned" | "nextQuestion"; readonly link?: string }
  | { readonly of: "companion"; readonly id: string }
  | { readonly of: "computed"; readonly id: ComputedFactId };

export interface WorldPlaque { readonly glyph: GlyphId; readonly ref: PlaqueRef }
export interface WorldDecoration { readonly glyph: GlyphId; readonly draws: string }
export interface World {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly anchor: WorldAnchor;
  readonly where: string;
  readonly plaques: readonly WorldPlaque[];
  readonly decorations: readonly WorldDecoration[];
  readonly disclosure?: string;
}

// src/lib/worlds.ts
export interface ResolvedPlaque {
  readonly glyph: GlyphId;
  readonly kind: "field" | "computed";
  readonly text: string;
  readonly source: string;
  readonly attribution?: string;
  readonly link?: string;
}
export interface ResolvedDecoration { readonly glyph: GlyphId; readonly label: string }
export interface ResolvedWorld {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly where: string;
  readonly disclosure?: string;
  readonly point: GeoPoint | null;
  readonly orbits: boolean;
  readonly plaques: readonly ResolvedPlaque[];
  readonly decorations: readonly ResolvedDecoration[];
}
export const DECORATION_LABEL = "no plaque · decoration";
export function resolveWorlds(): readonly ResolvedWorld[];
export function crossingKm(): number;

// src/lib/knowledge-tree.ts
export function stillGrowingCaption(): string;   // "still growing · 2025"
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/worlds.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  careerEntries,
  companions,
  aiTools,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds } from "@/content/worlds";
import { DECORATION_LABEL, crossingKm, resolveWorlds } from "@/lib/worlds";
import { buildCareerTree, careerYearSpan, stillGrowingCaption, totalTechnologies } from "@/lib/knowledge-tree";
import { seasonsFor } from "@/lib/origin-story";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { isNeedsInput } from "@/types/portfolio";

/**
 * Every string the content layer can hand a plaque. The honesty rule is that
 * a plaque's text is a *member of this set* — not similar to one, not derived
 * from one, a member. Assembled here rather than imported so the test is an
 * independent statement of the rule rather than a restatement of the
 * resolver's own code.
 */
const AUTHORED = new Set<string>();
for (const entry of careerEntries) {
  AUTHORED.add(entry.role);
  if (!isNeedsInput(entry.context)) AUTHORED.add(entry.context);
  if (entry.learned && !isNeedsInput(entry.learned)) AUTHORED.add(entry.learned);
  for (const line of entry.impact) AUTHORED.add(line);
  for (const line of entry.built) AUTHORED.add(line);
}
for (const project of projects) {
  AUTHORED.add(project.tagline);
  AUTHORED.add(project.learned);
  AUTHORED.add(project.nextQuestion);
}
for (const cat of companions) AUTHORED.add(`${cat.name}, ${cat.coat}. ${cat.habit}`);

/** What a `computed` plaque is allowed to say, recomputed here from the same
 *  functions the resolver calls. */
const COMPUTED = new Set<string>([
  `${buildCareerTree().length} branches · ${buildCareerTree().reduce((n, b) => n + b.leaves.length, 0)} authored leaves · ${totalTechnologies()} distinct technologies`,
  stillGrowingCaption(),
  `${origin.from} → ${origin.to} · ${origin.arrived}`,
  `${seasonsFor().length} seasons since ${origin.arrived}`,
  `${SCENE_NAMES.length} scenes: ${SCENE_NAMES.join(" · ")}`,
  aiTools.map((tool) => tool.name).join(" · "),
]);

const resolved = resolveWorlds();

describe("the seven worlds", () => {
  it("are seven, in the spec's order", () => {
    expect(resolved.map((world) => world.id)).toEqual([
      "vietnam",
      "usa",
      "sea",
      "sky",
      "plants",
      "animals",
      "tech",
    ]);
  });

  it("puts the two authored pins where origin says, and derives the rest", () => {
    const byId = new Map(resolved.map((world) => [world.id, world]));
    expect(byId.get("vietnam")?.point).toEqual(origin.coordinates.from);
    expect(byId.get("usa")?.point).toEqual(origin.coordinates.to);
    // Sea and Sky are derived from the arc, so they must not equal either pin.
    expect(byId.get("sea")?.point).not.toEqual(origin.coordinates.from);
    expect(byId.get("sky")?.point).not.toEqual(origin.coordinates.to);
    // Animals lives on the plinth and Technology in orbit: neither is on the
    // map, and both say so by having no point at all.
    expect(byId.get("animals")?.point).toBeNull();
    expect(byId.get("tech")?.point).toBeNull();
    expect(byId.get("tech")?.orbits).toBe(true);
  });
});

describe("the honesty rule", () => {
  it("renders every field plaque verbatim from the content layer", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (plaque.kind !== "field") continue;
        expect(
          AUTHORED.has(plaque.text),
          `${world.id}: "${plaque.text}" is not a string the content layer can produce`,
        ).toBe(true);
      }
    }
  });

  it("renders every computed plaque from a named computation, not from prose", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (plaque.kind !== "computed") continue;
        expect(
          COMPUTED.has(plaque.text),
          `${world.id}: "${plaque.text}" is not what its computation returns`,
        ).toBe(true);
      }
    }
  });

  it("gives every plaque a source naming where it came from", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(plaque.source.trim()).not.toBe("");
      }
    }
  });

  it("labels every decoration as carrying no fact", () => {
    for (const world of resolved) {
      for (const decoration of world.decorations) {
        expect(decoration.label).toContain(DECORATION_LABEL);
      }
    }
  });

  it("never lets a world's own prose become a plaque", () => {
    // `where` and `disclosure` are the one place worlds.ts authors prose, and
    // it is prose *about the drawing* ("country centroid, because no city is
    // authored"), never a fact about him. A plaque that quoted one would be
    // the site inventing a claim about its subject, which is the exact failure
    // the whole schema exists to prevent.
    const panelProse = new Set(
      resolved.flatMap((world) => [world.where, world.disclosure ?? ""]).filter(Boolean),
    );
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(panelProse.has(plaque.text)).toBe(false);
      }
    }
  });

  it("never surfaces a [NEEDS INPUT] marker", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(plaque.text).not.toContain("[NEEDS INPUT");
        expect(plaque.attribution ?? "").not.toContain("[NEEDS INPUT");
      }
    }
  });

  it("never renders the string 'undefined'", () => {
    const everything = JSON.stringify(resolved);
    expect(everything).not.toContain("undefined");
  });
});

describe("references that resolve to nothing are dropped, not rendered", () => {
  it("drops a plaque whose record id does not exist", () => {
    const dropped = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "cap", ref: { of: "careerEntry", id: "no-such-entry", field: "role" } },
          ...worlds[0].plaques,
        ],
      },
    ]);
    expect(dropped[0].plaques).toHaveLength(worlds[0].plaques.length);
  });

  it("drops a plaque whose list index is past the end", () => {
    const dropped = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "chalk", ref: { of: "careerEntryLine", id: "usc-ta", field: "impact", index: 99 } },
        ],
      },
    ]);
    expect(dropped[0].plaques).toHaveLength(0);
  });

  it("drops a plaque whose field is simply not authored", () => {
    // `careerEntries.graduation` authors no `learned` — it is `undefined`, the
    // same branch a `[NEEDS INPUT: …]` marker takes after `resolved()` unwraps
    // it. No field in `src/content/portfolio.ts` currently holds a marker, so
    // this is the reachable half of that behaviour; the invariant for the other
    // half is asserted over every real plaque above.
    const absent = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "book", ref: { of: "careerEntry", id: "graduation", field: "learned" } },
        ],
      },
    ]);
    expect(absent[0].plaques).toHaveLength(0);
  });

  it("drops a plaque whose companion id does not exist", () => {
    const animals = worlds.find((world) => world.id === "animals");
    if (!animals) throw new Error("the Animals world left the content layer");
    const dropped = resolveWorlds([
      { ...animals, plaques: [{ glyph: "cat", ref: { of: "companion", id: "not-a-cat" } }] },
    ]);
    expect(dropped[0].plaques).toHaveLength(0);
  });
});

describe("crossingKm", () => {
  it("computes the crossing from the two pins rather than carrying a number", () => {
    expect(crossingKm()).toBeGreaterThan(12_000);
    expect(crossingKm()).toBeLessThan(15_000);
  });
});
```

Note the two-signature shape this test requires: `resolveWorlds()` with no
argument resolves the real `worlds`, and `resolveWorlds(list)` resolves a list
the caller supplies. That parameter exists for exactly these three cases —
every failure mode above is otherwise unreachable without corrupting real
content.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/worlds.test.ts`
Expected: FAIL — `@/content/worlds` and `@/lib/worlds` do not resolve, and
`stillGrowingCaption` is not exported.

- [ ] **Step 3: Extract the "still growing" caption**

Add to `src/lib/knowledge-tree.ts`:

```ts
/**
 * The caption the drawing puts under the one shoot that never resolves into a
 * leaf. It lived as a JSX literal in two components (`DrawnTree.tsx` and
 * `list-ink.tsx`) and is now also quoted by the globe's Plants world, which
 * makes three — one too many for a string to be written down three times.
 */
export function stillGrowingCaption(): string {
  return `still growing · ${careerYearSpan().lastYear}`;
}
```

In `src/sections/CareerTree/DrawnTree.tsx:459` and
`src/sections/CareerTree/list-ink.tsx:234`, replace the literal
`still growing · {lastYear}` / `still growing · {year}` text node with
`{stillGrowingCaption()}` and import it. Both already compute `lastYear` from
`careerYearSpan()`, so nothing else changes.

- [ ] **Step 4: Run the tree tests before going further**

Run: `pnpm vitest run tests/lib/knowledge-tree.test.ts`
Expected: PASS. This is a refactor of two render sites and must be green on its
own before the worlds work builds on top of it.

- [ ] **Step 5: Add the world types**

Add to `src/types/portfolio.ts` the `GlyphId`, `WorldAnchor`, `ComputedFactId`,
`PlaqueRef`, `WorldPlaque`, `WorldDecoration` and `World` declarations exactly
as given in this task's **Interfaces** block, with this doc comment above
them:

```ts
/* -------------------------------------------------------------------------- */
/* Playground Earth                                                            */
/*                                                                             */
/* The globe's schema is deliberately a schema of *references*. A world does    */
/* not hold the sentence a plaque renders; it holds the address of the field    */
/* that sentence already lives in, and `src/lib/worlds.ts` fetches it. That is  */
/* the difference between a globe that is culturally rich and a globe that      */
/* invents things about its subject, and `tests/lib/worlds.test.ts` enforces    */
/* it string-for-string.                                                        */
/*                                                                             */
/* `where` and `disclosure` are the one exception, and they are not an           */
/* exception to the rule so much as outside its scope: they are prose about the  */
/* *drawing* ("country centroid, because no city is authored anywhere"), never  */
/* a claim about him. A test asserts no plaque ever renders one of them.         */
/* -------------------------------------------------------------------------- */
```

- [ ] **Step 6: Write the seven worlds**

Create `src/content/worlds.ts`:

```ts
import type { World } from "@/types/portfolio";

/**
 * Seven worlds, and not one sentence about Thien among them.
 *
 * Every plaque below is an *address*: which record, which field. The strings
 * a visitor reads come from `src/content/portfolio.ts` via
 * `src/lib/worlds.ts`, verbatim, and a reference that resolves to nothing is
 * dropped rather than rendered. See `src/types/portfolio.ts`'s Playground
 * Earth banner for why the schema is shaped this way, and
 * `tests/lib/worlds.test.ts` for the test that keeps it true.
 *
 * Order is the order the list renders and the numbering a visitor reads
 * (01–07). It runs the crossing's own story: where he left, where he landed,
 * what was under the flight, what was above it, what grew from it — then the
 * two worlds that are not on the map at all.
 */
export const worlds = [
  {
    id: "vietnam",
    name: "Việt Nam",
    glyph: "comtam",
    anchor: { at: "origin-from" },
    where: "Kiên Giang, Việt Nam — province level, no city",
    plaques: [{ glyph: "comtam", ref: { of: "computed", id: "crossing" } }],
    decorations: [{ glyph: "comtam", draws: "a plate of cơm tấm — broken rice, a grilled chop, a fried egg" }],
    // The owner named one object. The panel says so plainly rather than
    // padding the world out with four invented ones, which is what an earlier
    // draft of the spec proposed and he replaced.
    disclosure: "One object so far, and he named it himself. Nothing here was invented to fill the space.",
  },
  {
    id: "usa",
    name: "United States",
    glyph: "star",
    anchor: { at: "origin-to" },
    where: "Country centroid — no city, because no city is authored anywhere on this site",
    plaques: [
      { glyph: "cap", ref: { of: "careerEntry", id: "graduation", field: "role" } },
      { glyph: "trophy", ref: { of: "careerEntry", id: "cockyhacks", field: "role" } },
      { glyph: "trophy", ref: { of: "careerEntry", id: "code-to-give", field: "role" } },
      { glyph: "ribbon", ref: { of: "careerEntry", id: "magellan", field: "role" } },
      { glyph: "chalk", ref: { of: "careerEntryLine", id: "usc-ta", field: "impact", index: 1 } },
    ],
    // No decorations, on purpose: the mockup's mug and library were
    // placeholders nobody authored, and the honest move is the same one the
    // Việt Nam world makes — say what is here and stop.
    decorations: [],
  },
  {
    id: "sea",
    name: "Sea",
    glyph: "net",
    anchor: { at: "arc-midpoint" },
    where: "The midpoint of the crossing — derived from the two pins, not typed",
    plaques: [
      { glyph: "net", ref: { of: "careerEntryLine", id: "usc-scraping", field: "built", index: 1 } },
      { glyph: "buoy", ref: { of: "careerEntryLine", id: "usc-scraping", field: "impact", index: 0 } },
      { glyph: "book", ref: { of: "careerEntry", id: "usc-scraping", field: "learned" } },
    ],
    decorations: [{ glyph: "jelly", draws: "a jellyfish" }],
  },
  {
    id: "sky",
    name: "Sky",
    glyph: "bird",
    anchor: { at: "arc-apex" },
    where: "The apex of the flight arc — the highest latitude the crossing reaches",
    plaques: [
      { glyph: "bird", ref: { of: "computed", id: "crossing" } },
      { glyph: "plane", ref: { of: "computed", id: "seasons" } },
    ],
    decorations: [{ glyph: "plane", draws: "an aeroplane" }],
  },
  {
    id: "plants",
    name: "Plants",
    glyph: "sprout",
    anchor: { at: "origin-to" },
    where: "A sapling on the arrival pin — the seed the bird dropped, one beat later",
    plaques: [
      { glyph: "sprout", ref: { of: "computed", id: "tree-shape" } },
      { glyph: "sprout", ref: { of: "computed", id: "tree-still-growing" } },
    ],
    decorations: [],
  },
  {
    id: "animals",
    name: "Animals",
    glyph: "cat",
    anchor: { at: "plinth" },
    where: "Not on the globe — on the plinth. The cats live in the room, not on the map.",
    plaques: [
      { glyph: "cat", ref: { of: "companion", id: "moon" } },
      { glyph: "cat", ref: { of: "companion", id: "mi" } },
      { glyph: "cat", ref: { of: "computed", id: "play-scenes" } },
    ],
    decorations: [],
  },
  {
    id: "tech",
    name: "Technology",
    glyph: "sat",
    anchor: { at: "orbit" },
    where: "In orbit — it counter-rotates, so it always faces you",
    // The spec's table also listed the learning log here. Decision 4 retired it
    // from the page ("nobody is gonna read them"), so what survives is only the
    // short, concrete evidence: two case studies and the four tools. The log
    // itself stays in `src/content/ai-experiments.ts`, unrendered, which is what
    // makes that decision reversible.
    plaques: [
      { glyph: "chip", ref: { of: "project", id: "dd-scraper-platform", field: "tagline", link: "#work" } },
      { glyph: "magnifier", ref: { of: "project", id: "dd-feasibility-agent", field: "tagline", link: "#work" } },
      { glyph: "sat", ref: { of: "computed", id: "ai-tools" } },
    ],
    decorations: [],
  },
] satisfies readonly World[];
```

`GlyphId` must include every glyph named above — `book` and `magnifier` are
used, so add them to the union in Task 4 Step 5 if you typed the list from the
Interfaces block verbatim (it lists fifteen; `book` and `magnifier` make
seventeen).

- [ ] **Step 7: Write the resolver**

Create `src/lib/worlds.ts`:

```ts
import {
  aiTools,
  careerEntryById,
  companions,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds as authoredWorlds } from "@/content/worlds";
import {
  arcApex,
  arcKm,
  arcMidpoint,
  greatCircle,
  type GreatCircle,
} from "@/lib/globe";
import { buildCareerTree, careerYearSpan, stillGrowingCaption, totalTechnologies } from "@/lib/knowledge-tree";
import { seasonsFor } from "@/lib/origin-story";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import {
  resolved as unwrap,
  type ComputedFactId,
  type GeoPoint,
  type GlyphId,
  type PlaqueRef,
  type World,
  type WorldAnchor,
} from "@/types/portfolio";

/**
 * Turns the seven worlds' *references* into the flat, serializable shape the
 * section renders — and drops, silently and deliberately, anything that does
 * not resolve.
 *
 * "Silently" is the design. A plaque whose field now holds a `[NEEDS INPUT]`
 * marker, whose list index is past the end, or whose record id was renamed is
 * not an error the visitor should be shown: it is a fact the site does not
 * currently have, and the honest rendering of a fact the site does not have is
 * nothing at all. The rail's counts fall by one and the panel is one line
 * shorter. `tests/lib/worlds.test.ts` proves each of those three cases drops
 * rather than printing `undefined` or the marker text.
 *
 * Every output is a plain object of strings and numbers. That is not
 * incidental: `Worlds.tsx` is a server component and `WorldsStage.tsx` is a
 * client one, so everything here crosses that boundary as props. Put a
 * function or a class in here and the section stops building.
 */

const CROSSING_SEGMENTS = 72;

function crossing(): GreatCircle {
  return greatCircle(origin.coordinates.from, origin.coordinates.to, CROSSING_SEGMENTS);
}

export function crossingKm(): number {
  return Math.round(arcKm(crossing().radians));
}

/** The one string every decoration's accessible name carries, so a visitor
 *  using a screen reader is told a drawing is a drawing. */
export const DECORATION_LABEL = "no plaque · decoration";

function anchorPoint(anchor: WorldAnchor): GeoPoint | null {
  switch (anchor.at) {
    case "origin-from":
      return origin.coordinates.from;
    case "origin-to":
      return origin.coordinates.to;
    case "arc-midpoint":
      return arcMidpoint(crossing());
    case "arc-apex":
      return arcApex(crossing());
    case "plinth":
    case "orbit":
      return null;
  }
}

function computedFact(id: ComputedFactId): { text: string; source: string } | null {
  switch (id) {
    case "tree-shape": {
      const branches = buildCareerTree();
      const leaves = branches.reduce((total, branch) => total + branch.leaves.length, 0);
      return {
        text: `${branches.length} branches · ${leaves} authored leaves · ${totalTechnologies()} distinct technologies`,
        source: "buildCareerTree() — computed, not typed",
      };
    }
    case "tree-still-growing":
      return {
        text: stillGrowingCaption(),
        source: "the drawing's own caption for the shoot that never resolves into a leaf",
      };
    case "crossing":
      return {
        text: `${origin.from} → ${origin.to} · ${origin.arrived}`,
        source: "origin — the only geography this site authors",
      };
    case "seasons":
      return {
        text: `${seasonsFor().length} seasons since ${origin.arrived}`,
        source: "seasonsFor() — one flight authored, every season since computed",
      };
    case "play-scenes":
      return {
        text: `${SCENE_NAMES.length} scenes: ${SCENE_NAMES.join(" · ")}`,
        source: "companion-play.ts — the scenes the pair actually play",
      };
    case "ai-tools":
      return {
        text: aiTools.map((tool) => tool.name).join(" · "),
        source: "aiTools — each links to its vendor's own docs",
      };
  }
}

export interface ResolvedPlaque {
  readonly glyph: GlyphId;
  /** `field` quotes one authored field; `computed` renders one named
   *  computation. The test branches on this, because the two have different
   *  things to be checked against. */
  readonly kind: "field" | "computed";
  readonly text: string;
  readonly source: string;
  /** Whole fields of the same record — never a fragment — joined with " · ".
   *  A milestone's award text means nothing without its organisation and
   *  date, and both are already authored beside it. */
  readonly attribution?: string;
  readonly link?: string;
}

export interface ResolvedDecoration {
  readonly glyph: GlyphId;
  readonly label: string;
}

export interface ResolvedWorld {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly where: string;
  readonly disclosure?: string;
  /** `null` for the two worlds that are not on the map. */
  readonly point: GeoPoint | null;
  readonly orbits: boolean;
  readonly plaques: readonly ResolvedPlaque[];
  readonly decorations: readonly ResolvedDecoration[];
}

function resolvePlaque(glyph: GlyphId, ref: PlaqueRef): ResolvedPlaque | null {
  switch (ref.of) {
    case "careerEntry": {
      const entry = careerEntryById(ref.id);
      if (!entry) return null;
      const value = ref.field === "role" ? entry.role : unwrap(entry[ref.field]);
      if (!value) return null;
      return {
        glyph,
        kind: "field",
        text: value,
        source: `careerEntries.${entry.id} · ${ref.field}`,
        attribution: `${entry.organization} · ${entry.dateRange}`,
      };
    }
    case "careerEntryLine": {
      const entry = careerEntryById(ref.id);
      const line = entry?.[ref.field][ref.index];
      if (!entry || line === undefined) return null;
      return {
        glyph,
        kind: "field",
        text: line,
        source: `careerEntries.${entry.id} · ${ref.field}[${ref.index}]`,
        attribution: `${entry.organization} · ${entry.dateRange}`,
      };
    }
    case "project": {
      const project = projects.find((candidate) => candidate.id === ref.id);
      const value = project ? unwrap(project[ref.field]) : undefined;
      if (!project || !value) return null;
      return {
        glyph,
        kind: "field",
        text: value,
        source: `projects.${project.id} · ${ref.field}`,
        attribution: project.title,
        link: ref.link,
      };
    }
    case "companion": {
      const cat = companions.find((candidate) => candidate.id === ref.id);
      if (!cat) return null;
      return {
        glyph,
        kind: "field",
        // Three whole fields, joined. Not a sentence written about her.
        text: `${cat.name}, ${cat.coat}. ${cat.habit}`,
        source: `companions.${cat.id} — a real animal, named ${cat.authoredOn}`,
      };
    }
    case "computed": {
      const fact = computedFact(ref.id);
      if (!fact) return null;
      return { glyph, kind: "computed", text: fact.text, source: fact.source };
    }
  }
}

/**
 * `list` exists for the tests, which need to resolve a deliberately broken
 * world without corrupting the real content to do it. Production callers pass
 * nothing.
 */
export function resolveWorlds(list: readonly World[] = authoredWorlds): readonly ResolvedWorld[] {
  return list.map((world) => ({
    id: world.id,
    name: world.name,
    glyph: world.glyph,
    where: world.where,
    ...(world.disclosure ? { disclosure: world.disclosure } : {}),
    point: anchorPoint(world.anchor),
    orbits: world.anchor.at === "orbit",
    plaques: world.plaques
      .map((plaque) => resolvePlaque(plaque.glyph, plaque.ref))
      .filter((plaque): plaque is ResolvedPlaque => plaque !== null),
    decorations: world.decorations.map((decoration) => ({
      glyph: decoration.glyph,
      label: `${decoration.draws} — ${DECORATION_LABEL}`,
    })),
  }));
}
```

`careerEntryById` already exists in `src/content/portfolio.ts` — check its
exact name with `grep -n "careerEntryById" src/content/portfolio.ts` before
importing, and use whatever is actually exported. `unwrap` is that file's
`resolved()` helper, aliased on import because `resolved` is also the natural
name for a local variable in this module.

- [ ] **Step 8: Run the test**

Run: `pnpm vitest run tests/lib/worlds.test.ts`
Expected: PASS, all cases.

The likeliest failure is the "renders every field plaque verbatim" case on the
companion plaques, because the test's `AUTHORED` set and the resolver must join
the three cat fields the same way. If they disagree, change **both** to the
same join — do not weaken the test to a substring match. A substring match here
would accept exactly the paraphrase the rule forbids.

- [ ] **Step 9: Verify**

Run: `pnpm verify`
Expected: green.

- [ ] **Step 10: Commit**

```bash
git add src/types/portfolio.ts src/content/worlds.ts src/lib/worlds.ts src/lib/knowledge-tree.ts src/sections/CareerTree/DrawnTree.tsx src/sections/CareerTree/list-ink.tsx tests/lib/worlds.test.ts
git commit -m "Author the seven worlds as references, and test that they stay honest

A world holds the address of the field a plaque quotes, never a copy of the
sentence. The resolver fetches it verbatim and drops anything that does not
resolve — a NEEDS INPUT marker, an index past the end, a renamed id — because
the honest rendering of a fact the site does not have is nothing at all.

Three of the mockup's strings did not survive the rule and are replaced here:
the Sky world's invented prose becomes the real season count, the Animals
world's seven scene names become the registry's actual eight, and the United
States world ships no decorations rather than two placeholders.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The coastlines, and the fence around them

Natural Earth 110m coastlines, simplified, as a generated data module. About
53 KB raw and ~18 KB gzipped — which is affordable exactly once: inside the
lazily imported canvas chunk, and nowhere else. A single stray import from a
server component drops all of it into the initial bundle, which is why this
task ships a test that fails if anything but `GlobeCanvas.tsx` imports it.

The data itself comes out of the approved mockup, which already carries the
simplified rings. Natural Earth is public domain; the provenance goes in the
file header.

**Files:**
- Create: `src/sections/Worlds/coastline-data.ts`
- Test: `tests/lib/coastline-data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const COASTLINES: readonly (readonly number[])[]` — one
  entry per ring, each a flat `[lon, lat, lon, lat, …]` array.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/coastline-data.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COASTLINES } from "@/sections/Worlds/coastline-data";

describe("COASTLINES", () => {
  it("has enough rings to look like a planet", () => {
    expect(COASTLINES.length).toBeGreaterThan(50);
  });

  it("stores each ring as flat lon/lat pairs", () => {
    for (const ring of COASTLINES) {
      expect(ring.length % 2).toBe(0);
      expect(ring.length).toBeGreaterThanOrEqual(6); // at least a triangle
    }
  });

  it("keeps every coordinate inside the real world", () => {
    for (const ring of COASTLINES) {
      for (let i = 0; i < ring.length; i += 2) {
        expect(Math.abs(ring[i])).toBeLessThanOrEqual(180);
        expect(Math.abs(ring[i + 1])).toBeLessThanOrEqual(90);
      }
    }
  });

  it("stays small enough to be worth shipping", () => {
    const points = COASTLINES.reduce((total, ring) => total + ring.length / 2, 0);
    // The whole argument for a hand-simplified 110m set rather than a
    // dependency. If a regeneration blows past this, the globe stops being
    // cheap and the budget conversation has to happen again.
    expect(points).toBeLessThan(12_000);
  });
});

describe("the import fence", () => {
  it("is imported by GlobeCanvas and nothing else", () => {
    // 53 KB of raw data is affordable in one lazily imported chunk and
    // nowhere else. A server component that imports this — even for a type —
    // puts all of it in the initial bundle, and nothing in the test suite
    // would otherwise notice until `pnpm perf` was run by hand.
    const sources = globSync("src/**/*.{ts,tsx}", { cwd: process.cwd() });
    const importers = sources.filter((file) => {
      if (file.endsWith("coastline-data.ts")) return false;
      return /from\s+["'][^"']*coastline-data["']/.test(readFileSync(file, "utf8"));
    });
    expect(importers.map((file) => file.replace(/\\/g, "/"))).toEqual([
      "src/sections/Worlds/GlobeCanvas.tsx",
    ]);
  });
});
```

`globSync` lands in `node:fs` on Node 22; if the import fails on the local
Node, use `fs.readdirSync(dir, { recursive: true })` and filter by extension
instead. Do not add a glob dependency for a test.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/coastline-data.test.ts`
Expected: FAIL — the module does not exist. The fence case will also fail
until Task 8 creates `GlobeCanvas.tsx`; leave that one failing at the end of
this task only if Step 5 says so, and read Step 5 before deciding.

- [ ] **Step 3: Extract the data from the approved mockup**

The mockup's `LAND` array is the simplified set, already in flat lon/lat pair
form. Pull it out mechanically rather than by hand — it is one 53,000-character
line and hand-editing it will corrupt a ring.

Save the mockup HTML locally (the artifact read in this plan's preparation put
it at a path under the session's `tool-results/`; re-read the artifact if it is
gone), then:

```bash
node -e "
const fs = require('node:fs');
const html = fs.readFileSync(process.argv[1], 'utf8');
const start = html.indexOf('const LAND = [');
const end = html.indexOf('];', start) + 1;
const land = JSON.parse(html.slice(html.indexOf('[', start), end));
const header = fs.readFileSync('scripts/.coastline-header.txt', 'utf8');
fs.writeFileSync(
  'src/sections/Worlds/coastline-data.ts',
  header + 'export const COASTLINES: readonly (readonly number[])[] = ' + JSON.stringify(land) + ';\n'
);
console.log(land.length + ' rings, ' + land.reduce((n, r) => n + r.length / 2, 0) + ' points');
" <path-to-saved-mockup.html>
```

Write `scripts/.coastline-header.txt` first, with exactly this content, then
delete the temp file once the data module exists (it is scaffolding, not a
file the repo keeps):

```
/**
 * Natural Earth 110m coastlines, simplified — the planet's outline, and the
 * single largest thing the globe ships.
 *
 * Source: Natural Earth (naturalearthdata.com), 1:110m physical coastline.
 * Natural Earth is in the public domain: no attribution is required, and this
 * note is here for provenance rather than licence compliance.
 *
 * Shape: one entry per ring, each a flat [lon, lat, lon, lat, …] array. Flat
 * rather than [[lon, lat], …] on purpose — it halves the object count at
 * parse time, and the only consumer walks it two indices at a time anyway.
 *
 * Generated, not hand-edited. Regenerating it means re-running the extraction
 * in `docs/superpowers/plans/2026-09-28-playground-earth-globe-and-workshop.md`
 * (Task 5) and re-running `tests/lib/coastline-data.test.ts`, which pins the
 * ring count, the pair alignment, the coordinate ranges and the size budget.
 *
 * DO NOT IMPORT THIS FROM A SERVER COMPONENT. It is ~53 KB raw, ~18 KB
 * gzipped, and it is affordable precisely once: inside the lazily imported
 * `GlobeCanvas.tsx` chunk. `tests/lib/coastline-data.test.ts` fails if
 * anything else imports it.
 */
```

- [ ] **Step 4: Check the numbers the script printed**

Expected: on the order of 100 rings and a few thousand points — the test's
budget is 12,000 points. If the extraction printed nothing, the mockup's
variable is not named `LAND`; grep the saved HTML for `const LAND` and adjust
the offsets rather than guessing.

- [ ] **Step 5: Run the data tests**

Run: `pnpm vitest run tests/lib/coastline-data.test.ts`
Expected: the four `COASTLINES` cases PASS. The fence case FAILS, because
`GlobeCanvas.tsx` does not exist yet — that is correct, and it is the one test
this plan knowingly leaves red between two tasks.

To keep the suite green at this commit, mark **only the fence case** as
skipped with a comment naming the task that unskips it:

```ts
  // Unskipped in Task 8, which creates the one file allowed to import this.
  it.skip("is imported by GlobeCanvas and nothing else", () => {
```

- [ ] **Step 6: Verify**

Run: `pnpm verify`
Expected: green. Note the build time — 53 KB of literal array is the one thing
in this plan that can measurably slow typechecking. If `pnpm typecheck` gains
more than a couple of seconds, that is expected and acceptable; if it gains
thirty, the data was written as nested arrays rather than flat ones.

- [ ] **Step 7: Commit**

```bash
git add src/sections/Worlds/coastline-data.ts tests/lib/coastline-data.test.ts
git rm --cached scripts/.coastline-header.txt 2>/dev/null || true
git commit -m "Add the simplified coastlines, and a fence to keep them out of the bundle

Natural Earth 110m, public domain, flat lon/lat pairs, generated rather than
hand-edited. ~53 KB raw is affordable exactly once — inside the lazily
imported canvas chunk — so a test asserts GlobeCanvas is its only importer.
That case is skipped until Task 8 creates the file it names.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `#worlds`, the static half

The section, server-rendered and complete before any canvas exists: the
heading, the rail, the seven-button list, the panel, and a stage that is empty
for now. This is the half that has to work, and the half the next two tasks
decorate.

**Files:**
- Create: `src/sections/Worlds/glyphs.ts`
- Create: `src/sections/Worlds/WorldPanel.tsx`
- Create: `src/sections/Worlds/WorldsStage.tsx`
- Create: `src/sections/Worlds/Worlds.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/sections/WorldsStage.test.tsx`
- Test: `e2e/worlds.spec.ts` (created here, extended in Tasks 8 and 9)

**Interfaces:**
- Consumes: `resolveWorlds()`, `crossingKm()`, `ResolvedWorld`,
  `ResolvedPlaque`, `DECORATION_LABEL` (Task 4).
- Produces:

```ts
// src/sections/Worlds/glyphs.ts
export const GLYPHS: Record<GlyphId, string>;      // SVG path `d`, 24-unit box centred on origin
export const GLYPH_VIEWBOX = "-14 -14 28 28";

// src/sections/Worlds/WorldPanel.tsx
export function WorldPanel(props: { readonly world: ResolvedWorld }): JSX.Element;

// src/sections/Worlds/WorldsStage.tsx  ("use client")
export function WorldsStage(props: {
  readonly worlds: readonly ResolvedWorld[];
  readonly crossingKm: number;
}): JSX.Element;

// src/sections/Worlds/Worlds.tsx  (server)
export default function Worlds(): JSX.Element;
```

- [ ] **Step 1: Write the failing test**

Create `tests/sections/WorldsStage.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { crossingKm, resolveWorlds } from "@/lib/worlds";

const WORLDS = resolveWorlds();

function renderStage() {
  return render(<WorldsStage worlds={WORLDS} crossingKm={crossingKm()} />);
}

/**
 * The world list, scoped. Every query for a world's button goes through this —
 * "Face Việt Nam" is also a button whose name contains "Việt Nam", so an
 * unscoped `getByRole("button", { name: /Việt Nam/ })` matches two elements and
 * throws. The list has an accessible name ("The seven") precisely so this is
 * one line rather than a fragile regex.
 */
function worldButton(name: string) {
  return within(screen.getByRole("list", { name: /the seven/i })).getByRole("button", {
    name: new RegExp(name, "i"),
  });
}

describe("WorldsStage, with no canvas at all", () => {
  it("renders one button per world, numbered and counted", () => {
    renderStage();
    for (const world of WORLDS) {
      expect(worldButton(world.name)).toBeInTheDocument();
    }
    // Every list button names its own plaque count; the two globe controls do not.
    expect(
      within(screen.getByRole("list", { name: /the seven/i })).getAllByRole("button"),
    ).toHaveLength(WORLDS.length);
  });

  it("opens the first world by default and marks it current", () => {
    renderStage();
    expect(worldButton(WORLDS[0].name)).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { level: 3, name: WORLDS[0].name })).toBeInTheDocument();
  });

  it("switches the panel when another world is pressed", async () => {
    const user = userEvent.setup();
    renderStage();
    const usa = WORLDS.find((world) => world.id === "usa");
    if (!usa) throw new Error("the United States world is missing from the content layer");

    await user.click(worldButton(usa.name));

    expect(screen.getByRole("heading", { level: 3, name: usa.name })).toBeInTheDocument();
    for (const plaque of usa.plaques) {
      expect(screen.getByText(plaque.text)).toBeInTheDocument();
    }
  });

  it("shows every plaque's source line, so nothing reads as the site's own claim", async () => {
    const user = userEvent.setup();
    renderStage();
    for (const world of WORLDS) {
      await user.click(worldButton(world.name));
      for (const plaque of world.plaques) {
        expect(screen.getByText(plaque.text)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(plaque.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
      }
    }
  });

  it("says out loud that a decoration carries no fact", async () => {
    const user = userEvent.setup();
    renderStage();
    const vietnam = WORLDS.find((world) => world.id === "vietnam");
    if (!vietnam || vietnam.decorations.length === 0) {
      throw new Error("the Việt Nam world lost its one authored object");
    }
    await user.click(worldButton(vietnam.name));
    for (const decoration of vietnam.decorations) {
      expect(screen.getByLabelText(decoration.label)).toBeInTheDocument();
    }
  });

  it("gives the stage a focusable group with a globe roledescription", () => {
    renderStage();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).toHaveAttribute("aria-roledescription", "globe");
    expect(stage).toHaveAttribute("tabindex", "0");
  });

  it("announces the open world in a status region", async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByRole("button", { name: /united states/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/United States/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/sections/WorldsStage.test.tsx`
Expected: FAIL — `@/sections/Worlds/WorldsStage` does not resolve.

- [ ] **Step 3: Write the glyph vocabulary**

Create `src/sections/Worlds/glyphs.ts`:

```ts
import type { GlyphId } from "@/types/portfolio";

/**
 * Every figure on the globe, drawn the way the companion cats are: open
 * strokes, no fills, in a 24-unit box centred on the origin.
 *
 * Plain path strings rather than components because they are consumed twice,
 * in two different renderers — as the `d` of an `<svg><path>` in a world's
 * panel, and as a `new Path2D(d)` stroked onto the canvas. One vocabulary,
 * two renderers, no second set of drawings to keep in step.
 *
 * Centred on the origin, not on a corner, so the canvas can `translate` to a
 * marker's projected position and `scale` by its depth without doing any
 * arithmetic about the box first.
 */
export const GLYPH_VIEWBOX = "-14 -14 28 28";

export const GLYPHS: Record<GlyphId, string> = {
  // cơm tấm — the plate: broken rice, a grilled chop, a fried egg. Named by
  // the owner; the only object the Việt Nam world has, and it says so.
  comtam:
    "M-12 2A12 12 0 0012 2A12 12 0 00-12 2M-12 2C-12 6 -6 8 0 8S12 6 12 2" +
    "M-9 0C-8 -5 -3 -7 1 -6C0 -2 -3 0 -9 0" +
    "M2 -1C2 -5 6 -7 9 -5C11 -3 10 0 7 1C5 1.6 3 1 2 -1M4 -4L7.5 -2.6" +
    "M-6 1.5A3.2 3.2 0 00.4 1.5A3.2 3.2 0 00-6 1.5M-3.4 1.2A1.2 1.2 0 00-1 1.2A1.2 1.2 0 00-3.4 1.2",
  cap: "M-11 -3L0 -8L11 -3L0 2ZM-6 -1V5C-6 7 6 7 6 5V-1M11 -3V4",
  trophy:
    "M-6 -8H6V-2C6 2 3 4 0 4S-6 2 -6 -2ZM-6 -6H-9V-4C-9 -1 -7 0 -6 0M6 -6H9V-4C9 -1 7 0 6 0M0 4V8M-4 8H4",
  ribbon: "M0 -8A5 5 0 100 2A5 5 0 100 -8M-3 1L-5 9L0 6L5 9L3 1",
  chalk: "M-8 6L4 -6L8 -2L-4 10ZM-8 6L-9 10L-5 9",
  net: "M-10 -6H10L7 8H-7ZM-6 -6L-4 8M0 -6V8M6 -6L4 8M-9 -1H9M-8 3H8",
  buoy: "M-5 3H5L3 -3H-3ZM0 -3V-9M-3 -9H3M0 -11V-9M-7 5C-4 7 4 7 7 5M-9 8C-5 10 5 10 9 8",
  jelly: "M-8 -1A8 8 0 0116 0H-8ZM-5 -1C-5 4 -7 6 -6 9M-2 -1C-2 5 -3 7 -2 10M2 -1C2 5 1 7 2 10M5 -1C5 4 7 6 6 9",
  bird: "M-11 2Q-5 -7 0 0Q5 -7 11 2",
  plane: "M-10 -2L10 -7L2 3L0 9L-2 3Z M-2 3L10 -7",
  sprout: "M0 9V-2M0 1C-4 1 -7 -2 -7 -6C-3 -6 0 -3 0 1M0 -2C4 -2 7 -5 7 -9C3 -9 0 -6 0 -2",
  cat: "M-9 6Q-11 -4 -8 -8L-4 -3Q0 -5 4 -3L8 -8Q11 -4 9 6Q0 12 -9 6M-4 1V1.5M4 1V1.5M-1 5H1",
  sat: "M-3 -3H3V3H-3ZM-3 0H-11M3 0H11M-11 -4V4M11 -4V4M0 3V7M-3 7H3",
  chip:
    "M-7 -7H7V7H-7ZM-3 -3H3V3H-3M-4.5 -7V-11M0 -7V-11M4.5 -7V-11M-4.5 7V11M0 7V11M4.5 7V11" +
    "M-7 -4.5H-11M-7 0H-11M-7 4.5H-11M7 -4.5H11M7 0H11M7 4.5H11",
  star: "M0 -10L2.9 -3.1L10 -3.1L4.3 1.2L6.5 8L0 3.8L-6.5 8L-4.3 1.2L-10 -3.1L-2.9 -3.1Z",
  magnifier: "M-2 -2m-6 0a6 6 0 1012 0a6 6 0 10-12 0M2.4 2.4L9 9",
  book: "M-8 -7H0V8H-8ZM0 -7H8V8H0M0 -7V8",
};
```

- [ ] **Step 4: Write the panel**

Create `src/sections/Worlds/WorldPanel.tsx`:

```tsx
import { ExternalLink } from "@/components/ui/ExternalLink";
import { GLYPHS, GLYPH_VIEWBOX } from "./glyphs";
import type { ResolvedWorld } from "@/lib/worlds";

/**
 * One world, in words. Pure presentation — every string it renders was
 * resolved from the content layer by `src/lib/worlds.ts`, and this component
 * never composes a sentence of its own.
 *
 * The two halves are visually and semantically different on purpose: plaques
 * are a list of quotes each carrying its own source line, and decorations are
 * a row of drawings under a rule, each labelled as carrying no fact. A visitor
 * who cannot see either of them gets the same distinction from the accessible
 * names, which is the whole point of the honesty rule being in the DOM rather
 * than only in the design.
 */
export function WorldPanel({ world }: { readonly world: ResolvedWorld }) {
  return (
    <div className="mt-4 border border-rule bg-surface p-5">
      <h3 className="font-display text-[length:var(--step-2)] italic leading-tight text-[color:var(--fg)]">
        {world.name}
      </h3>
      <p className="eyebrow mt-1">{world.where}</p>

      {world.plaques.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {world.plaques.map((plaque) => (
            <li key={`${plaque.source}-${plaque.text}`} className="grid grid-cols-[1.9rem_1fr] items-start gap-3">
              <svg
                viewBox={GLYPH_VIEWBOX}
                aria-hidden="true"
                className="mt-0.5 h-6 w-6 fill-none stroke-[color:var(--fg-muted)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.1]"
              >
                <path d={GLYPHS[plaque.glyph]} />
              </svg>
              <span className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                {plaque.text}
                <span className="eyebrow mt-1 block normal-case">
                  {plaque.attribution ? `${plaque.attribution} · ` : ""}
                  plaque · {plaque.source}
                  {plaque.link ? (
                    <>
                      {" · "}
                      <a href={plaque.link} className="ink-link">
                        see it proven
                      </a>
                    </>
                  ) : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {world.decorations.length > 0 ? (
        <div className="mt-4 border-t border-dashed border-rule pt-3">
          <p className="eyebrow">no plaque · decoration</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {world.decorations.map((decoration) => (
              <svg
                key={decoration.label}
                viewBox={GLYPH_VIEWBOX}
                role="img"
                aria-label={decoration.label}
                className="h-6 w-6 fill-none stroke-[color:var(--fg-subtle)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.1]"
              >
                <path d={GLYPHS[decoration.glyph]} />
              </svg>
            ))}
          </div>
        </div>
      ) : null}

      {world.disclosure ? (
        <p className="mt-3 border-l-2 border-[color:var(--accent)] pl-3 text-[length:var(--step--1)] text-[color:var(--accent)]">
          {world.disclosure}
        </p>
      ) : null}
    </div>
  );
}

export default WorldPanel;
```

If `ExternalLink` turns out not to be needed (every plaque link is an in-page
fragment), drop that import rather than leaving it unused — lint will tell you.

- [ ] **Step 5: Write the stage**

Create `src/sections/Worlds/WorldsStage.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ResolvedWorld } from "@/lib/worlds";
import WorldPanel from "./WorldPanel";

/**
 * The seven worlds as a list of buttons, a panel, and a stage the canvas will
 * later mount into.
 *
 * Read the split before changing anything: **the list is the feature and the
 * canvas is decoration.** This component works with no canvas at all, which is
 * not a fallback but the design — `e2e/worlds.spec.ts` blocks the canvas chunk
 * and asserts every plaque is still reachable. That is why `currentId` lives
 * here rather than inside the canvas, and why the canvas is handed a
 * `currentId` and an `onSelect` rather than owning the selection itself.
 *
 * The canvas arrives by `import()` on first scroll into view, not by
 * `next/dynamic`: it is ~53 KB of coastline plus an engine, and nothing about
 * it should be in the initial bundle. `GlobeCanvas` hands back a `GlobeControls`
 * object on mount, which is how this component's keyboard handler and its two
 * buttons drive a globe they do not own. Before that object exists the two
 * globe controls are `aria-disabled` rather than absent — the same pattern
 * `WatchOrigin.tsx` uses for the origin-story player, and for the same reason:
 * a control that vanishes and reappears is worse than one that says "not yet".
 */

export interface GlobeControls {
  /** Rotate by a delta, in radians. */
  readonly nudge: (deltaSpin: number, deltaTilt: number) => void;
  /** Play the crossing. */
  readonly fly: () => void;
  /** Back to the Việt Nam pin, flight and seed cleared. */
  readonly reset: () => void;
  /** Turn a world to face the viewer. */
  readonly focusWorld: (id: string) => void;
}

type CanvasComponent = ComponentType<{
  readonly worlds: readonly ResolvedWorld[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
}>;

interface WorldsStageProps {
  readonly worlds: readonly ResolvedWorld[];
  readonly crossingKm: number;
}

/** One keyboard step, in radians — 12°, the same step the mockup settled on:
 *  large enough that a held arrow key visibly turns the planet, small enough
 *  that a single press does not lose the marker you were looking at. */
const KEY_STEP = (12 * Math.PI) / 180;

export function WorldsStage({ worlds, crossingKm }: WorldsStageProps) {
  const [currentId, setCurrentId] = useState(worlds[0]?.id ?? "");
  const [announcement, setAnnouncement] = useState("");
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  const controlsRef = useRef<GlobeControls | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const current = worlds.find((world) => world.id === currentId) ?? worlds[0];

  const select = useCallback(
    (id: string) => {
      const world = worlds.find((candidate) => candidate.id === id);
      if (!world) return;
      setCurrentId(id);
      setAnnouncement(
        `${world.name}. ${world.plaques.length} ${world.plaques.length === 1 ? "plaque" : "plaques"}, ` +
          `${world.decorations.length} ${world.decorations.length === 1 ? "decoration" : "decorations"}.`,
      );
      controlsRef.current?.focusWorld(id);
    },
    [worlds],
  );

  const handleReady = useCallback((controls: GlobeControls | null) => {
    controlsRef.current = controls;
    setControlsReady(controls !== null);
  }, []);

  const handleLanded = useCallback(() => {
    setAnnouncement(
      "The flight landed in the United States. A seed dropped at the arrival pin, and the career tree grows from that spot.",
    );
  }, []);

  // The canvas chunk, fetched once the stage is near the viewport. An
  // IntersectionObserver rather than a mount-time import: the section is below
  // the fold by design (the spec's central engineering decision), and fetching
  // 53 KB of coastline during the load of a page whose LCP is already 3.9s
  // would spend the whole budget this redesign was built to protect.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || Canvas) return;
    if (typeof IntersectionObserver === "undefined") return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        import("./GlobeCanvas")
          .then((module) => {
            if (!cancelled) setCanvas(() => module.default);
          })
          .catch(() => {
            // The chunk failed (offline, a flaky deploy). Nothing to do and
            // nothing to say: the list, the panel and every plaque are already
            // on screen, which is the whole feature.
          });
      },
      { rootMargin: "200px" },
    );
    observer.observe(stage);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [Canvas]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const controls = controlsRef.current;
    if (!controls) return;
    switch (event.key) {
      case "ArrowLeft":
        controls.nudge(-KEY_STEP, 0);
        break;
      case "ArrowRight":
        // Rolling east is what flies him — the same coupling a drag has, so
        // the keyboard reaches the signature moment rather than watching it.
        controls.nudge(KEY_STEP, 0);
        break;
      case "ArrowUp":
        controls.nudge(0, KEY_STEP);
        break;
      case "ArrowDown":
        controls.nudge(0, -KEY_STEP);
        break;
      case "Home":
        controls.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
      <div>
        <div
          ref={stageRef}
          tabIndex={0}
          role="group"
          aria-roledescription="globe"
          aria-label="Playground Earth. Drag to roll it, or use the arrow keys. Every world is also a button in the list beside it."
          // pan-y, never none: `none` would swallow the page scroll on a phone.
          className="relative mx-auto aspect-[1/1.12] w-full max-w-[560px] touch-pan-y"
        >
          {Canvas ? (
            <Canvas
              worlds={worlds}
              currentId={currentId}
              onSelect={select}
              onLanded={handleLanded}
              onReady={handleReady}
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={() => controlsRef.current?.fly()}
            className={cn(
              "min-h-11 border border-[color:var(--accent)] bg-[color:var(--accent)] px-5 text-[color:var(--fg-inverse)]",
              !controlsReady && "pointer-events-none opacity-70",
            )}
          >
            {controlsReady ? "Take the flight" : "Loading the globe…"}
          </button>
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={() => controlsRef.current?.reset()}
            className={cn(
              "min-h-11 border border-rule px-5 text-[color:var(--fg)]",
              !controlsReady && "pointer-events-none opacity-70",
            )}
          >
            Face Việt Nam
          </button>
        </div>
        <p className="eyebrow mt-2 text-center">
          {crossingKm.toLocaleString("en-US")} km · drag east to fly him yourself
        </p>
      </div>

      <div>
        <p className="eyebrow" id="worlds-list-label">
          The seven
        </p>
        <ul aria-labelledby="worlds-list-label" className="mt-2 grid gap-px">
          {worlds.map((world, index) => (
            <li key={world.id}>
              <button
                type="button"
                aria-current={world.id === currentId}
                onClick={() => select(world.id)}
                className={cn(
                  "grid w-full grid-cols-[1.6rem_1fr_auto] items-baseline gap-3 border border-transparent px-2 py-2 text-left",
                  world.id === currentId
                    ? "border-[color:var(--fg-subtle)] bg-surface"
                    : "hover:border-rule",
                )}
              >
                <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-display text-[length:var(--step-0)] italic text-[color:var(--fg)]">
                  {world.name}
                </span>
                <span className="eyebrow tabular-nums">
                  {world.plaques.length} {world.plaques.length === 1 ? "plaque" : "plaques"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {current ? <WorldPanel world={current} /> : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default WorldsStage;
```

Two notes for the implementer. `touch-pan-y` must exist as a Tailwind utility
in this setup — check with `grep -rn "touch-action" src/app/globals.css`; if
Tailwind v4 does not emit it here, add `style={{ touchAction: "pan-y" }}`
instead and say why in a comment. And `<Canvas />` renders nothing until Task
8 creates the module — the `import()` will reject, which the `.catch()` already
handles, so this task's tests pass against a stage that never gets a canvas.
That is the point.

- [ ] **Step 6: Write the section**

Create `src/sections/Worlds/Worlds.tsx`:

```tsx
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { crossingKm, resolveWorlds } from "@/lib/worlds";
import WorldsStage from "./WorldsStage";

/**
 * Playground Earth: seven worlds, two cats, and one rule.
 *
 * The rule is the section. Everything drawn on the globe is either a plaque —
 * one authored field, quoted whole, with its source named — or a decoration
 * that says in its own accessible name that it carries no fact. There is no
 * third category, and `tests/lib/worlds.test.ts` proves it string-for-string.
 * That is what lets a portfolio draw cơm tấm and a jellyfish without the site
 * inventing a single claim about the person it is about.
 *
 * Placement is the design's central engineering decision: one section, below
 * the fold, never in the LCP viewport. The measured LCP before this round was
 * already 3.88s on a throttled phone, so a drawn planet in the hero was ruled
 * out before it was designed. Everything expensive about the globe is in a
 * chunk that is not fetched until the stage is near the viewport, and the
 * section is complete before it arrives.
 *
 * The rail counts what a reader cannot count by looking: how many of the
 * panel's lines are quotes versus drawings, and how far the crossing actually
 * is. Both are computed from the content layer — see `src/lib/worlds.ts`.
 */

const HEADING_ID = "worlds-heading";

const WORLDS = resolveWorlds();
const KM = crossingKm();

const PLAQUE_COUNT = WORLDS.reduce((total, world) => total + world.plaques.length, 0);
const DECORATION_COUNT = WORLDS.reduce((total, world) => total + world.decorations.length, 0);

const RAIL: readonly RailNote[] = [
  { term: "Worlds", detail: `${WORLDS.length}` },
  { term: "Plaques", detail: `${PLAQUE_COUNT} — each one field, quoted whole` },
  { term: "Decorations", detail: `${DECORATION_COUNT} — drawings, carrying no fact` },
  { term: "Crossing", detail: `${KM.toLocaleString("en-US")} km · computed from the two pins` },
];

export default function Worlds() {
  return (
    <Section id="worlds" labelledBy={HEADING_ID} eyebrow="Worlds" tone="deep" rail={RAIL}>
      <SectionHeading
        id={HEADING_ID}
        lead="Roll the planet. Everything on it is something already written down somewhere else on this site — and anything that is only a drawing says so."
      >
        Seven worlds, and two cats who look after them.
      </SectionHeading>
      <WorldsStage worlds={WORLDS} crossingKm={KM} />
    </Section>
  );
}
```

- [ ] **Step 7: Put it on the page**

In `src/app/page.tsx`, import `Worlds from "@/sections/Worlds/Worlds"` and
render it immediately after `<Hero />`. Add to the existing comment block:

```
        Round 16 puts Playground Earth second, in the slot Philosophy used to
        hold: below the fold, before the evidence. It is the one section that
        is an argument about the person rather than the work, and it earns that
        position by being made entirely of the work's own facts.
```

- [ ] **Step 8: Run the unit tests**

Run: `pnpm vitest run tests/sections/WorldsStage.test.tsx`
Expected: PASS, every case.

- [ ] **Step 9: Write the e2e spec, canvas-free half**

Create `e2e/worlds.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { resolveWorlds } from "../src/lib/worlds";

const WORLDS = resolveWorlds();

test.describe("the worlds list is the feature; the canvas is decoration", () => {
  test("every world, plaque and source is reachable with the canvas chunk blocked", async ({
    page,
  }) => {
    // Not "with JavaScript off" — with the *canvas* gone, which is the claim
    // the spec actually makes and the one a flaky deploy actually produces.
    await page.route(/GlobeCanvas/, (route) => route.abort());
    await page.goto("/#worlds");

    const section = page.locator("#worlds");
    await expect(section).toBeVisible();

    // Scoped to the list: "Face Việt Nam" is also a button containing that name.
    const list = section.getByRole("list", { name: /the seven/i });
    for (const world of WORLDS) {
      await list.getByRole("button", { name: new RegExp(world.name, "i") }).click();
      await expect(section.getByRole("heading", { level: 3, name: world.name })).toBeVisible();
      for (const plaque of world.plaques) {
        await expect(section.getByText(plaque.text, { exact: true })).toBeVisible();
      }
    }
  });

  test("the rail's counts match the resolved content", async ({ page }) => {
    await page.goto("/#worlds");
    const rail = page.locator("#worlds dl");
    const plaques = WORLDS.reduce((total, world) => total + world.plaques.length, 0);
    await expect(rail).toContainText(String(WORLDS.length));
    await expect(rail).toContainText(String(plaques));
  });

  test("the seven buttons are reachable by keyboard alone", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const first = section
      .getByRole("list", { name: /the seven/i })
      .getByRole("button", { name: new RegExp(WORLDS[0].name, "i") });
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-current", "true");
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#worlds");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

- [ ] **Step 10: Run the e2e spec and look at the section**

Run: `pnpm test:e2e e2e/worlds.spec.ts`
Expected: PASS.

Then `pnpm dev`, open `/#worlds`, and check it **in both themes** (the theme
toggle is in the header): the panel's surface, the rule under the decorations,
the rail's blue labels. Then at 320px and at 1440px.

- [ ] **Step 11: Verify**

Run: `pnpm verify`
Expected: green, including `pnpm contrast` — no palette token changed, so
`docs/contrast.md` should be unmodified. If it changed, something used a raw
`--color-*` token; find it and use the alias.

- [ ] **Step 12: Commit**

```bash
git add src/sections/Worlds src/app/page.tsx tests/sections/WorldsStage.test.tsx e2e/worlds.spec.ts
git commit -m "Add the #worlds section — the half that does not need a canvas

Seven buttons, a panel per world, every plaque carrying the field it quotes
and the record it came from. The stage is empty for now and the section is
already complete: an e2e blocks the canvas chunk and walks all seven worlds.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The nav, the tour, the cats and the chat learn about `#worlds`

A new section is not finished when it renders. Six things point at the page's
section list, and two of them fail *silently* — this is the task plan 2 was
mostly written about, applied in the other direction.

**Files:**
- Modify: `src/content/portfolio.ts` (`navItems`)
- Modify: `src/components/companion/companion-tour.ts:64` (`GREY_MIDDLE`)
- Modify: `src/components/companion/companion-dialogue.ts:113-148` (`TOUR`)
- Modify: `src/lib/companion-facts.ts`
- Modify: `src/lib/answer-corpus.ts`
- Modify: `src/content/answer-expansion.ts:340-347`
- Modify: `tests/lib/answers.test.ts:52`, `e2e/ask.spec.ts:99`
- Modify: `scripts/screenshots.mjs:54`
- Test: `tests/lib/companion-tour.test.ts`, `tests/lib/companion-dialogue.test.ts`,
  `tests/lib/companion-facts.test.ts`

**Interfaces:**
- Consumes: the `#worlds` section (Task 6), `resolveWorlds()` (Task 4).
- Produces: `navItems` gains `{ id: "nav-worlds", sectionId: "worlds", label: "Worlds" }`
  in second position; `CompanionFacts` gains
  `worlds: { count: number; plaques: number; decorations: number; crossingKm: number }`.

- [ ] **Step 1: Understand the two silent failures before editing**

`TOUR_STOPS` derives from `navItems`, so it grows on its own. `GREY_MIDDLE`
(`companion-tour.ts:64`) does **not** — and `stopsFor` maps over it with a
non-null assertion:

```ts
...middle.map((sectionId) => STOP_BY_SECTION.get(sectionId)!)
```

Add a nav item without adding it to `GREY_MIDDLE` and the tour silently skips
the new stop. Add a wrong id and "Show me around" throws on `undefined`.

And `TOUR` in `companion-dialogue.ts` is keyed by section id; a stop with no
entry returns `null` from `sceneFor`, so the pair walk to the new section and
say nothing. No test fails. `tests/lib/companion-dialogue.test.ts` has an
`AMBIENT_SECTIONS` list at line 27 — extend the tour assertions the same way.

- [ ] **Step 2: Write the failing tests**

In `tests/lib/companion-tour.test.ts`, update the two `middle` assertions
(lines 70-71) and add:

```ts
  it("visits every nav section, in an order that includes the new ones", () => {
    const grey = stopsFor("grey").map((stop) => stop.sectionId);
    expect(grey).toEqual(navItems.map((item) => item.sectionId));
  });

  it("never yields an undefined stop for either route", () => {
    for (const route of ["grey", "tabby"] as const) {
      for (const stop of stopsFor(route)) {
        expect(stop).toBeDefined();
        expect(stop.sectionId).toBeTruthy();
      }
    }
  });
```

In `tests/lib/companion-dialogue.test.ts`:

```ts
  it("has a tour scene for every stop the tour actually visits", () => {
    for (const stop of TOUR_STOPS) {
      expect(
        sceneFor("tour", stop.sectionId, FACTS),
        `the pair walk to #${stop.sectionId} and have nothing to say`,
      ).not.toBeNull();
    }
  });
```

In `tests/lib/companion-facts.test.ts`:

```ts
  it("carries the globe's own counts", () => {
    const facts = buildCompanionFacts();
    expect(facts.worlds.count).toBe(7);
    expect(facts.worlds.plaques).toBeGreaterThan(0);
    expect(facts.worlds.crossingKm).toBeGreaterThan(12_000);
  });
```

Adjust the helper names to whatever those three files already use —
`tests/lib/companion-facts.test.ts` will already have a way of building facts;
do not introduce a second one.

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run tests/lib/companion-tour.test.ts tests/lib/companion-dialogue.test.ts tests/lib/companion-facts.test.ts`
Expected: FAIL on all three.

- [ ] **Step 4: Add the nav item**

In `src/content/portfolio.ts`:

```ts
export const navItems = [
  { id: "nav-about", sectionId: "about", label: "About" },
  // Round 16: Playground Earth takes the slot Philosophy used to hold.
  { id: "nav-worlds", sectionId: "worlds", label: "Worlds" },
  { id: "nav-work", sectionId: "work", label: "Work" },
  { id: "nav-skills", sectionId: "skills", label: "Skills" },
  { id: "nav-tree", sectionId: "tree", label: "Journey" },
  { id: "nav-contact", sectionId: "contact", label: "Contact" },
] satisfies readonly NavItem[];
```

`#workshop` joins in Task 11, not here — a nav item pointing at a section that
does not exist is exactly the dead link the site's rules forbid.

- [ ] **Step 5: Re-key the tour**

In `src/components/companion/companion-tour.ts`:

```ts
/** … Round 16: Playground Earth and the Workshop join the middle, so the fork
 *  is now three stops rather than two. `grey` walks the page's own order;
 *  `tabby` runs it backwards. */
const GREY_MIDDLE = ["worlds", "skills", "tree"] as const;
```

Careful: `stopsFor` builds `[TOUR_STOPS[0], TOUR_STOPS[1], ...middle, last]`,
so `TOUR_STOPS[1]` is now **Worlds** and putting `worlds` in `GREY_MIDDLE` too
would visit it twice. Read `stopsFor` and decide deliberately: either drop the
hard-coded `TOUR_STOPS[1]` and let the middle carry everything between the
first and last stop, or leave `worlds` out of `GREY_MIDDLE`. **Take the first
option** — it is the one that cannot rot when a sixth section is added:

```ts
export function stopsFor(route: TourRoute): readonly TourStop[] {
  const middle = route === "grey" ? GREY_MIDDLE : [...GREY_MIDDLE].reverse();
  const stops = middle
    .map((sectionId) => STOP_BY_SECTION.get(sectionId))
    .filter((stop): stop is TourStop => stop !== undefined);
  return [TOUR_STOPS[0], ...stops, TOUR_STOPS[TOUR_STOPS.length - 1]];
}
```

with `GREY_MIDDLE = ["worlds", "work", "skills", "tree"] as const;`. The
`filter` replaces the non-null assertion: a typo in that list now drops a stop
instead of throwing mid-tour. The new test in Step 2 catches the typo.

- [ ] **Step 6: Give the pair something to say there**

In `src/components/companion/companion-dialogue.ts`, add to `TOUR`:

```ts
  worlds: (f) => [
    tabby("Mrrrow!", `Seven worlds! ${f.worlds.plaques} plaques and we guard all of them!`),
    grey(
      "Mrp. Meow.",
      `${f.worlds.decorations} of these are just drawings. They say so themselves.`,
    ),
  ],
```

- [ ] **Step 7: Add the facts those lines quote**

In `src/lib/companion-facts.ts`, add to `CompanionFacts` and to the builder:

```ts
  /**
   * Round 16. The globe's own counts, computed by `resolveWorlds()` rather
   * than typed here — a dialogue line that quotes a number must quote a real
   * one, and these three are the only numbers about that section that are not
   * already visible on screen.
   */
  readonly worlds: {
    readonly count: number;
    readonly plaques: number;
    readonly decorations: number;
    readonly crossingKm: number;
  };
```

built from `resolveWorlds()` and `crossingKm()`.

- [ ] **Step 8: Teach the chat about the section**

In `src/content/answer-expansion.ts`:

```ts
  worlds: ["globe", "world", "map", "earth", "vietnam", "việt nam", "kiên giang", "cat", "cats", "moon", "mi", "origin"],
```

In `src/lib/answer-corpus.ts`, add one document per resolved plaque:

```ts
  // Round 16. Every plaque on the globe is already a verbatim authored field,
  // which makes the whole set exactly the shape this corpus wants: a quoted
  // string with a named source. They are indexed under `worlds` rather than
  // their original section so an answer's "Read it in Worlds →" link lands
  // where the visitor can actually see the plaque.
  for (const world of resolveWorlds()) {
    for (const plaque of world.plaques) {
      docs.push({
        text: plaque.text,
        source: `${world.name} — ${plaque.source}`,
        sectionId: "worlds",
        sectionLabel: "Worlds",
        label: label("worlds", undefined, world.name, plaque.source),
      });
    }
  }
```

Widen both guards in the same commit: `LINKABLE_SECTIONS` in
`tests/lib/answers.test.ts:52` to
`/^(about|worlds|work|journey|skills)$/`, and `e2e/ask.spec.ts:99` to
`/^#(about|worlds|work|journey|skills)$/`.

Then extend the `CORPUS` set at the top of `tests/lib/answers.test.ts` with the
plaque strings, or the "only ever returns strings that already exist" test
fails on the first plaque a probe retrieves. Build them from `resolveWorlds()`,
not by hand.

- [ ] **Step 9: Add the section to the screenshot script**

`scripts/screenshots.mjs:54` — `SECTIONS` gains `"worlds"` in page order.

- [ ] **Step 10: Run everything**

Run: `pnpm vitest run`
Expected: PASS.

Run: `pnpm test:e2e e2e/navigation.spec.ts e2e/ask.spec.ts e2e/companion.spec.ts`
Expected: PASS. `navigation.spec.ts` iterates `navItems`, so it now clicks six
links at two viewports; `companion.spec.ts` exercises the tour.

- [ ] **Step 11: Check the nav does not overflow**

Six desktop nav items at `gap-6`. Run `pnpm dev`, set the window to exactly
1024px wide, and look at the header. Then 1280px. Expected: no wrap, no
clipping, no horizontal scrollbar. If it wraps, do not shrink the type —
reduce the gap, and note the number in a comment, because Task 11 adds a
seventh item.

- [ ] **Step 12: Verify and commit**

Run: `pnpm verify`

```bash
git add src/content/portfolio.ts src/components/companion src/lib/companion-facts.ts src/lib/answer-corpus.ts src/content/answer-expansion.ts tests/lib scripts/screenshots.mjs e2e/ask.spec.ts
git commit -m "Point the nav, the tour, the cats and the chat at #worlds

Six things track the page's section list and two of them fail silently. The
tour's middle is now derived from one list rather than a hard-coded first stop
plus a partial middle, and its non-null assertion is a filter — a typo drops a
stop instead of throwing halfway through the walk.

Every plaque joins the chat's corpus: each one is already a verbatim authored
field with a named source, which is exactly the shape that index wants.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The canvas — you can roll the planet, and flying him is a drag east

The live half. One lazily imported client module holding the canvas, the draw
pass, the drag model, the keyboard map and the crossing. It owns no content: it
is handed resolved worlds and hands back a selection.

Everything about this task is measurable, so measure it: the mockup drew at
1.8 ms per frame at 1440px with **zero animation frames at rest**, and the e2e
in Step 7 asserts the second number.

**Files:**
- Create: `src/sections/Worlds/GlobeCanvas.tsx`
- Modify: `tests/lib/coastline-data.test.ts` (unskip the fence)
- Modify: `e2e/worlds.spec.ts` (add the live cases)

**Interfaces:**
- Consumes: `GLYPHS` (Task 6), `COASTLINES` (Task 5), everything in
  `src/lib/globe.ts` (Task 2), `ResolvedWorld` (Task 4), `GlobeControls`
  (Task 6).
- Produces: `export default function GlobeCanvas(props): JSX.Element` matching
  the `CanvasComponent` type `WorldsStage.tsx` already declares — worlds,
  currentId, onSelect, onLanded, onReady.

- [ ] **Step 1: Write the module**

Create `src/sections/Worlds/GlobeCanvas.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clampTilt,
  graticule,
  greatCircle,
  project,
  toVector,
  unproject,
  type GreatCircle,
  type Viewport,
} from "@/lib/globe";
import { companions, origin } from "@/content/portfolio";
import type { GeoPoint } from "@/types/portfolio";
import type { ResolvedWorld } from "@/lib/worlds";
import type { GlobeControls } from "./WorldsStage";
import { GLYPHS } from "./glyphs";
import { COASTLINES } from "./coastline-data";

/**
 * The planet. No dependency, one canvas, and zero animation frames once it
 * stops moving.
 *
 * ## Why this file is imperative
 *
 * Everything below lives in one mutable `view` object and a `requestAnimation-
 * Frame` loop that switches itself off, rather than in React state. A globe
 * that re-renders React on every frame of an inertial spin is a globe that
 * drops frames on the phone this site is measured on. React owns what a
 * visitor can *ask for* — which world is open — and this file owns what the
 * pixels are doing. The only line between them is `onSelect`, and it fires on
 * a tap, not on a frame.
 *
 * ## The rule about rest
 *
 * `loop()` requests the next frame **only if something is still moving**. When
 * the inertia decays below its threshold and no flight is in progress, the
 * loop returns without scheduling, `view.running` goes false, and the page
 * costs nothing until the visitor touches it again. `e2e/worlds.spec.ts`
 * counts `requestAnimationFrame` callbacks over two seconds at rest and
 * asserts zero. The satellite's orbit is deliberately excluded from
 * "something is moving" for exactly this reason: a decoration that never stops
 * is a decoration that never lets the CPU sleep.
 *
 * ## Colour
 *
 * A canvas cannot carry a class, so the semantic aliases are read at draw time
 * off `document.documentElement`. That is the same rule every component here
 * follows — never a raw `--color-*` token, never a hex — expressed the only
 * way this renderer can. A theme switch at rest produces no frame, so a
 * MutationObserver on `data-theme` and a `prefers-color-scheme` listener each
 * trigger exactly one redraw.
 *
 * ## Accessibility
 *
 * The canvas is `aria-hidden`. Every marker it draws is also a button in the
 * list beside it, which is the real feature — so there is deliberately no DOM
 * control on the canvas at all, and no tab stop that can point at a marker
 * currently on the far side of the planet. The stage's focus, its
 * `role="group"` and its keyboard handler live in `WorldsStage.tsx`, which
 * drives this file through the `GlobeControls` object handed back by
 * `onReady`.
 */

interface GlobeCanvasProps {
  readonly worlds: readonly ResolvedWorld[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
}

const DEG = Math.PI / 180;

/** Radians of eastward roll that completes the crossing. Tuned in the mockup:
 *  a comfortable phone-width swipe gets you most of the way, so the moment is
 *  discoverable by accident, which is the point of coupling it to the drag at
 *  all. */
const EAST_FOR_FLIGHT = 2.6;

/** A press that moves less than this is a tap on a marker, not a roll. */
const TAP_SLOP_PX = 6;

/** Below this, inertia is over. Chosen so a flick settles inside the 1.5s the
 *  spec asks for at the decay rate below. */
const REST_EPSILON = 4e-4;
const DECAY = 0.93;

const GRATICULE = graticule(30);
// The same 72 segments the resolver uses, so the arc drawn here and the
// distance printed in the rail describe one curve. The kilometre figure itself
// belongs to `src/lib/worlds.ts` and is not recomputed here.
const CROSSING: GreatCircle = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

interface Hit {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface Palette {
  readonly fg: string;
  readonly muted: string;
  readonly subtle: string;
  readonly accent: string;
  readonly rule: string;
  readonly ground: string;
}

/**
 * The mono family, as a literal font shorthand can use it. Check the token's
 * real name in `src/app/globals.css` before trusting `--font-mono`; if this
 * codebase does not expose one, drop the lookup and keep the fallback, with a
 * comment saying the canvas cannot reach the token.
 */
function monoFamily(): string {
  const value = getComputedStyle(document.body).getPropertyValue("--font-mono").trim();
  return value || "ui-monospace, SFMono-Regular, Menlo, monospace";
}

/**
 * The section's own ink, read off the document at draw time.
 *
 * The forced-colors branch is not a nicety. In Windows High Contrast the
 * browser overrides CSS colours, but **a canvas bitmap is not touched** — the
 * custom properties still hold their authored values, so a globe that trusted
 * them would draw a mid-blue graticule on a forced black page and the one hue
 * carrying meaning would stop being distinguishable. System colour keywords are
 * the only values the forced palette actually maps, so in that mode the globe
 * is drawn in `CanvasText` with `LinkText` for everything blue was doing.
 */
function palette(): Palette {
  if (window.matchMedia("(forced-colors: active)").matches) {
    return {
      fg: "CanvasText",
      muted: "CanvasText",
      subtle: "GrayText",
      accent: "LinkText",
      rule: "GrayText",
      ground: "Canvas",
    };
  }
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    fg: read("--fg"),
    muted: read("--fg-muted"),
    subtle: read("--fg-subtle"),
    accent: read("--accent"),
    rule: read("--rule-color"),
    ground: read("--ground"),
  };
}

export default function GlobeCanvas({
  worlds,
  currentId,
  onSelect,
  onLanded,
  onReady,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentIdRef = useRef(currentId);
  const onSelectRef = useRef(onSelect);
  const onLandedRef = useRef(onLanded);

  currentIdRef.current = currentId;
  onSelectRef.current = onSelect;
  onLandedRef.current = onLanded;

  // One mutable bag, deliberately. See the file's own note on why none of this
  // is React state.
  const view = useRef({
    spin: -origin.coordinates.from.lon * DEG,
    tilt: -12 * DEG,
    vSpin: 0,
    vTilt: 0,
    drag: null as { x: number; y: number; at: number; moved: number } | null,
    target: null as { spin: number; tilt: number } | null,
    flight: 0,
    landed: false,
    orbit: 0,
    running: false,
    hits: [] as Hit[],
    size: { width: 0, height: 0 },
    stroke: { cx: 0, cy: 0, radius: 0, plinth: 0 } as Viewport & { plinth: number },
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const v = view.current;
    const c = palette();
    const { width, height } = v.size;
    const geo = v.stroke;
    // `ctx.font` cannot resolve a CSS variable — a canvas given
    // `600 9px var(--font-mono)` silently falls back to its default sans. So
    // the family is read off the document once per draw and interpolated in.
    const mono = monoFamily();

    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const at = (point: GeoPoint) => project(toVector(point), v.spin, v.tilt, geo);
    const polyline = (points: readonly GeoPoint[]) => {
      let previous: { x: number; y: number; front: boolean } | null = null;
      for (const point of points) {
        const p = at(point);
        // The pen lifts at the limb rather than drawing a chord across the
        // planet — the one thing that separates a wireframe globe from a
        // scribble.
        if (previous && previous.front && p.front) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
        }
        previous = p;
      }
    };
    const glyph = (d: string, x: number, y: number, scale: number, colour: string, weight: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.strokeStyle = colour;
      ctx.lineWidth = weight / scale;
      ctx.stroke(new Path2D(d));
      ctx.restore();
    };

    /* The plinth, hatched below, with the two cats asleep on it. */
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(geo.cx, geo.plinth, geo.radius * 1.05, geo.radius * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = -6; i <= 6; i += 1) {
      const x = geo.cx + i * (geo.radius / 6.5);
      ctx.moveTo(x, geo.plinth + 13 + Math.abs(i));
      ctx.lineTo(x - 5, geo.plinth + 22 + Math.abs(i));
    }
    ctx.stroke();

    const animalsOpen = currentIdRef.current === "animals";
    const catX = geo.cx - geo.radius * 0.58;
    const catY = geo.plinth - 11;
    // A knockout in the section's own ground, so the cats read as sitting on
    // the plinth rather than being drawn through it.
    ctx.fillStyle = c.ground;
    ctx.beginPath();
    ctx.ellipse(catX + 16, catY + 2, 44, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    glyph(GLYPHS.cat, catX, catY, 1.05, animalsOpen ? c.accent : c.muted, 1.2);
    glyph(GLYPHS.cat, catX + 34, catY + 2, 0.88, animalsOpen ? c.accent : c.subtle, 1.2);
    ctx.fillStyle = c.subtle;
    ctx.font = `600 8.5px ${mono}`;
    ctx.textAlign = "center";
    // Read from the content layer, not typed here: these are the same two names
    // the Animals world's plaques quote, and `companions` order is load-bearing
    // — the lead cat is first, and the lead cat is the larger drawing.
    ctx.fillText((companions[0]?.name ?? "").toUpperCase(), catX, catY + 20);
    ctx.fillText((companions[1]?.name ?? "").toUpperCase(), catX + 34, catY + 20);

    /* The ball: limb, graticule, coastlines. */
    ctx.strokeStyle = c.subtle;
    ctx.beginPath();
    ctx.arc(geo.cx, geo.cy, geo.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = c.rule;
    ctx.beginPath();
    for (const line of GRATICULE) polyline(line);
    ctx.stroke();

    ctx.strokeStyle = c.subtle;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const ring of COASTLINES) {
      let previous: { x: number; y: number; front: boolean } | null = null;
      for (let i = 0; i < ring.length; i += 2) {
        const p = at({ lon: ring[i], lat: ring[i + 1] });
        if (previous && previous.front && p.front) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
        }
        previous = p;
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* The crossing, drawn only as far as he has flown. */
    if (v.flight > 0) {
      const upTo = Math.max(1, Math.floor(v.flight * (CROSSING.points.length - 1)));
      ctx.strokeStyle = c.accent;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      let previous: { x: number; y: number; front: boolean } | null = null;
      for (let i = 0; i <= upTo; i += 1) {
        const p = project(CROSSING.points[i], v.spin, v.tilt, geo);
        if (previous && previous.front && p.front) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
        }
        previous = p;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* The bird, at the head of the line he has drawn. */
      if (v.flight < 1) {
        const index = Math.min(CROSSING.points.length - 2, upTo);
        const a = project(CROSSING.points[index], v.spin, v.tilt, geo);
        const b = project(CROSSING.points[index + 1], v.spin, v.tilt, geo);
        if (a.front) {
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
          // Four strokes and a wingbeat: the vertical squash is the flap, and
          // it is driven by how far along he is rather than by a clock, so a
          // slow drag gives slow wingbeats.
          const flap = 0.5 + 0.5 * Math.abs(Math.sin(v.flight * 34));
          ctx.scale(1.5, 1.5 * flap);
          ctx.strokeStyle = c.fg;
          ctx.lineWidth = 1.3 / 1.5;
          ctx.stroke(new Path2D(GLYPHS.bird));
          ctx.restore();
        }
      }
    }

    /* The worlds that live on the ball. */
    v.hits = [];
    for (const world of worlds) {
      if (!world.point) continue;
      const p = at(world.point);
      // Far-side markers are not drawn at all rather than faded: a marker you
      // can half-see is a marker you try to press.
      if (!p.front) continue;
      const open = world.id === currentIdRef.current;
      const scale = 0.62 + 0.32 * p.depth;
      ctx.fillStyle = c.ground;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 * scale, 0, Math.PI * 2);
      ctx.fill();
      glyph(GLYPHS[world.glyph], p.x, p.y, scale * 0.82, open ? c.accent : c.fg, open ? 1.4 : 1.1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = open ? c.accent : c.rule;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (open || p.depth > 0.62) {
        ctx.fillStyle = open ? c.accent : c.muted;
        ctx.font = `600 9.5px ${mono}`;
        ctx.textAlign = "left";
        ctx.fillText(world.name.toUpperCase(), p.x + 15 * scale + 5, p.y + 3.4);
      }
      v.hits.push({ id: world.id, x: p.x, y: p.y, r: 18 * scale });
    }

    /* Technology, in orbit, counter-rotating so it always faces you. */
    const orbitCx = geo.cx;
    const orbitCy = geo.cy - geo.radius * 0.55;
    const ox = orbitCx + Math.cos(v.orbit) * geo.radius * 1.16;
    const oy = orbitCy - Math.sin(v.orbit) * geo.radius * 0.34;
    ctx.strokeStyle = c.rule;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.ellipse(orbitCx, orbitCy, geo.radius * 1.16, geo.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.ground;
    ctx.beginPath();
    ctx.arc(ox, oy, 13, 0, Math.PI * 2);
    ctx.fill();
    const techOpen = currentIdRef.current === "tech";
    glyph(GLYPHS.sat, ox, oy, 0.62, techOpen ? c.accent : c.fg, techOpen ? 1.4 : 1.1);
    v.hits.push({ id: "tech", x: ox, y: oy, r: 16 });

    /* Animals: the plinth is its marker. */
    v.hits.push({ id: "animals", x: catX + 16, y: geo.plinth - 9, r: 34 });
  }, [worlds]);

  const loop = useCallback(() => {
    const v = view.current;
    let busy = false;

    v.orbit = (v.orbit + 0.004) % (Math.PI * 2);

    if (v.target) {
      const dSpin = Math.atan2(
        Math.sin(v.target.spin - v.spin),
        Math.cos(v.target.spin - v.spin),
      );
      const dTilt = v.target.tilt - v.tilt;
      v.spin += dSpin * 0.13;
      v.tilt += dTilt * 0.13;
      if (Math.abs(dSpin) > 0.002 || Math.abs(dTilt) > 0.002) busy = true;
      else v.target = null;
    } else if (v.drag) {
      busy = true;
    } else {
      v.spin += v.vSpin;
      v.tilt += v.vTilt;
      v.vSpin *= DECAY;
      v.vTilt *= DECAY;
      if (Math.abs(v.vSpin) > REST_EPSILON || Math.abs(v.vTilt) > REST_EPSILON) busy = true;
      else {
        v.vSpin = 0;
        v.vTilt = 0;
      }
    }

    v.tilt = clampTilt(v.tilt);
    draw();

    // The orbit is *not* a reason to keep the loop alive. See the file note.
    if (busy) requestAnimationFrame(loop);
    else v.running = false;
  }, [draw]);

  const start = useCallback(() => {
    const v = view.current;
    if (v.running) return;
    v.running = true;
    requestAnimationFrame(loop);
  }, [loop]);

  /* Sizing. Measured from the element, drawn at the device ratio, capped at 2
     — past that a hairline stops being a hairline and the fill rate is spent
     on nothing a reader can see. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const v = view.current;
      v.size = { width: rect.width, height: rect.height };
      v.stroke = {
        cx: rect.width / 2,
        cy: rect.height * 0.44,
        radius: Math.min(rect.width, rect.height * 0.82) * 0.42,
        plinth: rect.height * 0.44 + Math.min(rect.width, rect.height * 0.82) * 0.42 + 26,
      };
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [draw]);

  /* A theme switch at rest produces no frame, so ask for exactly one — and the
     same is true of turning High Contrast on, which changes nothing about this
     canvas until it is told to redraw. */
  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    const queries = [
      window.matchMedia("(prefers-color-scheme: dark)"),
      window.matchMedia("(forced-colors: active)"),
    ];
    const redraw = () => draw();
    for (const query of queries) query.addEventListener("change", redraw);
    return () => {
      observer.disconnect();
      for (const query of queries) query.removeEventListener("change", redraw);
    };
  }, [draw]);

  /* Redraw when the open world changes — the marker and the cats change ink,
     and at rest nothing else would ask. */
  useEffect(() => {
    draw();
  }, [currentId, draw]);

  /* Pointer: drag to roll, tap to open, and rolling east flies him. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const v = view.current;

    const down = (event: PointerEvent) => {
      v.drag = { x: event.clientX, y: event.clientY, at: performance.now(), moved: 0 };
      v.target = null;
      v.vSpin = 0;
      v.vTilt = 0;
      canvas.setPointerCapture(event.pointerId);
      start();
    };

    const move = (event: PointerEvent) => {
      if (!v.drag) return;
      const dx = event.clientX - v.drag.x;
      const dy = event.clientY - v.drag.y;
      const k = 1 / Math.max(1, v.stroke.radius);
      v.drag.moved += Math.abs(dx) + Math.abs(dy);
      v.spin += dx * k;
      v.tilt -= dy * k;
      // The signature moment: rolling east advances the crossing by exactly as
      // much as you rolled. You are not watching an animation, you are flying
      // him.
      if (dx > 0 && !v.landed) {
        v.flight = Math.min(1, v.flight + (dx * k) / EAST_FOR_FLIGHT);
        if (v.flight >= 1) {
          v.landed = true;
          onLandedRef.current();
        }
      }
      const dt = Math.max(1, performance.now() - v.drag.at);
      v.vSpin = dx * k * (16 / dt);
      v.vTilt = -dy * k * (16 / dt);
      v.drag.x = event.clientX;
      v.drag.y = event.clientY;
      v.drag.at = performance.now();
    };

    /**
     * `pointerup` and `pointercancel` are the same event to this file, and
     * that is not a shortcut — the browser sends `pointercancel`, never
     * `pointerup`, the instant it decides the gesture belongs to the page
     * scroll. Handle only `pointerup` and a finger that scrolls away leaves
     * `drag` set forever: the loop stays busy, the planet keeps turning under
     * nobody, and the next tap is interpreted as the continuation of a drag
     * that ended a minute ago.
     */
    const release = (event: PointerEvent) => {
      if (!v.drag) return;
      const moved = v.drag.moved;
      v.drag = null;
      if (moved < TAP_SLOP_PX) {
        const rect = canvas.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        let hitSomething = false;
        for (let i = v.hits.length - 1; i >= 0; i -= 1) {
          const hit = v.hits[i];
          if ((px - hit.x) ** 2 + (py - hit.y) ** 2 <= hit.r ** 2) {
            onSelectRef.current(hit.id);
            hitSomething = true;
            break;
          }
        }
        // Click-to-orient: a single click on bare planet brings that place
        // round to face you. This is not a convenience — WCAG 2.5.7 (Dragging
        // Movements, AA) requires that everything a drag does be achievable
        // with a single pointer and no drag, for people using a head pointer,
        // eye-gaze or a mouth stick. Keyboard support does not satisfy it;
        // that is 2.1.1, a different criterion. This plus the seven list
        // buttons and "Take the flight" is the non-dragging path through the
        // whole section.
        if (!hitSomething) {
          const place = unproject(px, py, v.spin, v.tilt, v.stroke);
          if (place) {
            v.vSpin = 0;
            v.vTilt = 0;
            v.target = {
              spin: -place.lon * DEG,
              tilt: clampTilt(-place.lat * DEG * 0.55),
            };
          }
        }
      }
      start();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
    };
  }, [start]);

  /* Hand the controls up, so the stage's focus and buttons can drive a globe
     they do not own. */
  useEffect(() => {
    const controls: GlobeControls = {
      nudge: (deltaSpin, deltaTilt) => {
        const v = view.current;
        v.target = null;
        v.spin += deltaSpin;
        v.tilt = clampTilt(v.tilt + deltaTilt);
        if (deltaSpin > 0 && !v.landed) {
          v.flight = Math.min(1, v.flight + deltaSpin / EAST_FOR_FLIGHT);
          if (v.flight >= 1) {
            v.landed = true;
            onLandedRef.current();
          }
        }
        start();
      },
      fly: () => {
        // Task 9 replaces this with the played crossing. Until then, pressing
        // it does what a full eastward roll does.
        controls.nudge(EAST_FOR_FLIGHT, 0);
      },
      reset: () => {
        const v = view.current;
        v.flight = 0;
        v.landed = false;
        v.vSpin = 0;
        v.vTilt = 0;
        v.target = { spin: -origin.coordinates.from.lon * DEG, tilt: -12 * DEG };
        start();
      },
      focusWorld: (id) => {
        const world = worlds.find((candidate) => candidate.id === id);
        const v = view.current;
        if (!world?.point) return;
        v.vSpin = 0;
        v.vTilt = 0;
        v.target = {
          spin: -world.point.lon * DEG,
          tilt: clampTilt(-world.point.lat * DEG * 0.55),
        };
        start();
      },
    };
    onReady(controls);
    return () => onReady(null);
  }, [onReady, start, worlds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // pan-y, never none. See WorldsStage.
      className="absolute inset-0 block h-full w-full touch-pan-y"
    />
  );
}
```

One import to get right: the file needs `companions` as well as `origin` from
`@/content/portfolio` (the cat labels read from it), and `monoFamily()` above
depends on the mono token's real name. Run
`grep -n "font-mono\|--mono" src/app/globals.css` before trusting
`--font-mono`; keep the fallback either way.

- [ ] **Step 2: Unskip the import fence**

In `tests/lib/coastline-data.test.ts`, remove the `.skip` added in Task 5.

Run: `pnpm vitest run tests/lib/coastline-data.test.ts`
Expected: PASS — `GlobeCanvas.tsx` now exists and is the only importer.

- [ ] **Step 3: Run the existing unit tests**

Run: `pnpm vitest run`
Expected: PASS. `tests/sections/WorldsStage.test.tsx` still passes: jsdom has no
`IntersectionObserver`, so the canvas is never imported there, which is exactly
the no-canvas path that test is about.

- [ ] **Step 4: Look at it in a browser**

Run `pnpm dev`, open `/#worlds`, and check, in **both themes**:

1. The planet draws: limb, graticule, coastlines, the plinth, two cats.
2. Drag it. It rolls, and it keeps rolling briefly when you let go.
3. Drag east far enough and a bird lifts off the coast of Việt Nam and flies.
4. Tap a marker. The panel changes and the list's `aria-current` moves.
5. Tab to the stage and press the arrow keys. It rotates. Press Home. It
   returns to Việt Nam.
6. Toggle the theme while the globe is at rest. It redraws in the new ink.
7. On a phone-width window, drag vertically **over the globe**. The page
   scrolls. This is the `touch-action: pan-y` check and it is the one failure a
   desktop mouse cannot find.

- [ ] **Step 5: Add the live e2e cases**

Append to `e2e/worlds.spec.ts`:

```ts
test.describe("the live globe", () => {
  test("requests zero animation frames once it has settled", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    // Give the chunk time to arrive and the first inertia to decay.
    await page.waitForTimeout(2_000);

    const frames = await page.evaluate(async () => {
      let count = 0;
      const original = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        count += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      window.requestAnimationFrame = original;
      return count;
    });

    // The whole argument for a hand-written loop over a library: a globe at
    // rest costs nothing. A non-zero number here means something is animating
    // that nobody asked for — most likely the satellite's orbit being counted
    // as "busy".
    expect(frames).toBe(0);
  });

  test("a drag rolls the planet and then stops", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    await page.waitForTimeout(1_000);

    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step * 12, box.y + box.height / 2);
    }
    await page.mouse.up();
    await page.waitForTimeout(2_000);

    // Settled: nothing is still asking for frames.
    const frames = await page.evaluate(async () => {
      let count = 0;
      const original = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        count += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      window.requestAnimationFrame = original;
      return count;
    });
    expect(frames).toBe(0);
  });

  test("a pointercancel mid-drag ends the drag like a pointerup", async ({ page }) => {
    // The browser sends this, not pointerup, the moment it claims the gesture
    // for page scrolling. Handled differently, the planet keeps turning under
    // a finger that has left and the next tap continues a dead drag.
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    await page.waitForTimeout(1_000);

    await stage.evaluate((element) => {
      const canvas = element.querySelector("canvas");
      if (!canvas) throw new Error("no canvas");
      const base = { bubbles: true, pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 };
      canvas.dispatchEvent(new PointerEvent("pointerdown", base));
      canvas.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: 180 }));
      canvas.dispatchEvent(new PointerEvent("pointercancel", { ...base, clientX: 180 }));
    });

    await page.waitForTimeout(2_500);
    const frames = await page.evaluate(async () => {
      let count = 0;
      const original = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        count += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      window.requestAnimationFrame = original;
      return count;
    });
    expect(frames, "the globe never came to rest after a cancelled gesture").toBe(0);
  });

  test("the arrow keys rotate it and Home brings Việt Nam back", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await stage.focus();
    await expect(stage).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Home");
    // Nothing to assert about pixels here — what matters is that the page did
    // not scroll (the handler preventDefaults) and the stage kept focus.
    await expect(stage).toBeFocused();
  });

  test("everything the drag does is reachable with single clicks, no dragging", async ({
    page,
  }) => {
    // WCAG 2.5.7 Dragging Movements (AA, new in 2.2): the function must be
    // achievable "by a single pointer without dragging". Keyboard support does
    // not satisfy it — this criterion exists for head pointers, eye-gaze and
    // mouth sticks, which are pointers that cannot hold a drag. So this test
    // uses page.click() only and never mouse.down/move/up, deliberately.
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    await page.waitForTimeout(1_000);

    // 1. Orient the planet by clicking a point on it.
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.3);

    // 2. Open any world.
    await section
      .getByRole("list", { name: /the seven/i })
      .getByRole("button", { name: new RegExp(WORLDS[1].name, "i") })
      .click();
    await expect(
      section.getByRole("heading", { level: 3, name: WORLDS[1].name }),
    ).toBeVisible();

    // 3. Complete the signature moment.
    await section.getByRole("button", { name: /take the flight/i }).click();
    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("draws in system colours when forced colours are active", async ({ page }) => {
    // A canvas bitmap is the one thing forced-colors does not repaint: the CSS
    // custom properties still hold their authored values, so a globe that
    // trusted them would draw mid-blue on a forced black page and the one hue
    // that carries meaning would stop carrying it.
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    await page.waitForTimeout(1_500);

    const drewInSystemInk = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
      if (!canvas) return "no canvas";
      const ctx = canvas.getContext("2d");
      if (!ctx) return "no context";
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Forced colours are greys, black or white — never a saturated hue. Any
      // pixel whose channels differ by more than a rounding step means the
      // authored blue survived into the bitmap.
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 8) return `saturated pixel ${r},${g},${b}`;
      }
      return "ok";
    });
    expect(drewInSystemInk).toBe("ok");
  });

  test("scrolling works with a finger on the globe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await expect(stage).toBeVisible();
    const touchAction = await stage.evaluate((element) => getComputedStyle(element).touchAction);
    // `none` here would trap the page scroll on a phone, which is the single
    // worst thing a decorative canvas can do.
    expect(touchAction).toBe("pan-y");
  });
});
```

- [ ] **Step 6: Run the e2e spec**

Run: `pnpm test:e2e e2e/worlds.spec.ts`
Expected: PASS.

If the rAF assertion fails with a small non-zero number, do not raise the
threshold. Find what is animating: the likeliest cause is the orbit increment
being treated as `busy`, and the second likeliest is a `draw()` effect firing
in a loop because a `useCallback` dependency changes every render.

- [ ] **Step 7: Verify and commit**

Run: `pnpm verify`

```bash
git add src/sections/Worlds/GlobeCanvas.tsx tests/lib/coastline-data.test.ts e2e/worlds.spec.ts
git commit -m "Draw the planet, and let a drag east fly him

An orthographic wireframe in Canvas 2D: limb, graticule, coastlines with the
pen lifted at the limb, the plinth with both cats asleep on it, seven markers
and a satellite in orbit. Drag rolls it, a tap opens a world, the arrow keys
do both, and rolling east advances the crossing by exactly as much as you
rolled.

The loop switches itself off: an e2e counts requestAnimationFrame callbacks
over two seconds at rest and asserts zero, and the satellite's orbit is
deliberately not a reason to stay awake. pointercancel is handled identically
to pointerup, because that is what the browser sends when it takes the gesture
for scrolling.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: The landing — a seed, a sapling, and the handoff to the tree

The end of the signature moment, and the one place this section talks to
another. When the bird lands, a seed drops at the arrival pin, a sapling rises,
and the page says out loud that the career tree grows from that spot.

Also the reduced-motion path, which is not a lesser version: it is the finished
frame plus the caption, immediately, with no frame ever requested.

**Files:**
- Modify: `src/sections/Worlds/GlobeCanvas.tsx` (seed, sapling, played flight,
  reduced motion)
- Modify: `src/sections/Worlds/WorldsStage.tsx` (the handoff link)
- Modify: `e2e/worlds.spec.ts`
- Test: `tests/sections/WorldsStage.test.tsx`

**Interfaces:**
- Consumes: everything from Task 8.
- Produces: no new exports. `GlobeControls.fly` now plays the crossing rather
  than jumping it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/sections/WorldsStage.test.tsx`:

```tsx
  it("does not claim a seed was dropped before anything has flown", () => {
    renderStage();
    // The handoff link is a claim about something that happened. Before the
    // flight it must not be on the page at all — the section's whole argument
    // is that it only says things that are currently true.
    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
  });

  it("keeps the flight control present but disabled until the canvas is ready", () => {
    renderStage();
    // jsdom has no IntersectionObserver, so the canvas never loads here — which
    // makes this the exact state a visitor on a flaky deploy sees. The control
    // says "not yet" rather than vanishing, and it is not pressable.
    const fly = screen.getByRole("button", { name: /loading the globe/i });
    expect(fly).toHaveAttribute("aria-disabled", "true");
  });
```

That test as written asserts the *absence* before landing, which is the half
jsdom can see. Add the presence half to the e2e in Step 5 rather than faking a
canvas here — a test that mounts a fake canvas to check a link is testing the
fake.

- [ ] **Step 2: Add the seed and the sapling to the canvas**

In `GlobeCanvas.tsx`, add `seed: 0` to the `view` bag, grow it in `loop()`:

```ts
    if (v.seed > 0 && v.seed < 1) {
      // Forty frames, about two thirds of a second — long enough to read as
      // growth, short enough that nobody waits for it.
      v.seed = Math.min(1, v.seed + 1 / 40);
      busy = true;
    }
```

and draw it after the markers, before the orbit:

```ts
    /* The seed, one beat after the landing, and then the sapling it becomes.
       This is the page's one hand-off: the career tree grows from this spot,
       and the drawing says so before the prose does. */
    if (v.seed > 0) {
      const pin = at(origin.coordinates.to);
      if (pin.front) {
        glyph(GLYPHS.sprout, pin.x + 20, pin.y - 16, 0.5 + 0.5 * v.seed, c.accent, 1.2);
      }
    }
```

Set `v.seed = 0.001` in the landing path (both the drag path and `fly`), and
reset it to 0 in `controls.reset`.

- [ ] **Step 3: Make `fly()` play the crossing**

Replace the stub from Task 8:

```ts
      fly: () => {
        const v = view.current;
        v.flight = 0;
        v.landed = false;
        v.seed = 0;
        v.target = null;
        v.vSpin = 0;
        v.vTilt = 0;
        if (reducedMotion()) {
          // Not a lesser version: the finished frame, immediately. Someone who
          // has asked their operating system not to animate things has asked
          // for the outcome, not for a slower animation.
          v.flight = 1;
          v.landed = true;
          v.seed = 1;
          v.spin = -origin.coordinates.to.lon * DEG;
          v.tilt = clampTilt(-origin.coordinates.to.lat * DEG * 0.55);
          onLandedRef.current();
          draw();
          return;
        }
        v.playing = true;
        start();
      },
```

with `playing: false` in the bag, `reducedMotion()` as a module-level helper:

```ts
function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

and the played crossing driven in `loop()`, before the `target`/`drag` branch:

```ts
    if (v.playing) {
      // 130 frames, a little over two seconds at 60fps. The camera follows the
      // bird rather than the bird following a camera: spin and tilt chase the
      // point he is currently over, which is what makes the played version
      // look like the dragged one.
      v.flight = Math.min(1, v.flight + 1 / 130);
      const point = toGeo(CROSSING.points[Math.floor(v.flight * (CROSSING.points.length - 1))]);
      const delta = Math.atan2(
        Math.sin(-point.lon * DEG - v.spin),
        Math.cos(-point.lon * DEG - v.spin),
      );
      v.spin += delta * 0.1;
      v.tilt += (clampTilt(-point.lat * DEG * 0.55) - v.tilt) * 0.1;
      busy = true;
      if (v.flight >= 1) {
        v.playing = false;
        v.landed = true;
        v.seed = 0.001;
        onLandedRef.current();
      }
    }
```

Guard the `target`/`drag`/inertia branch with `if (!v.playing) { … }` so a
played flight is not fighting inertia for the same two angles.

- [ ] **Step 4: Add the handoff to the stage**

In `WorldsStage.tsx`, add `const [landed, setLanded] = useState(false);`, set it
in `handleLanded`, and render after the hint paragraph:

```tsx
        {landed ? (
          <p className="mt-3 text-center text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
            A seed dropped where he came down.{" "}
            <a href="#tree" className="ink-link">
              The career tree grows from that spot →
            </a>
          </p>
        ) : null}
```

The link appears rather than being always present: before the flight it would
be a claim about something that has not happened, and the section's whole
argument is that it only says things that are true.

- [ ] **Step 5: Add the e2e cases**

Append to `e2e/worlds.spec.ts`:

```ts
test.describe("the landing", () => {
  test("playing the flight lands him, drops a seed and offers the tree", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const fly = section.getByRole("button", { name: /take the flight/i });
    await expect(fly).toHaveText(/take the flight/i, { timeout: 10_000 });
    await fly.click();

    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(section.getByRole("status")).toContainText(/landed/i);
  });

  test("the landing link actually reaches the tree", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const fly = section.getByRole("button", { name: /take the flight/i });
    await expect(fly).toHaveText(/take the flight/i, { timeout: 10_000 });
    await fly.click();
    await section.getByRole("link", { name: /career tree/i }).click();
    await expect(page.locator("#tree")).toBeInViewport();
  });

  test("the keyboard alone reaches the whole signature moment", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await stage.focus();
    // Rolling east flies him, 12° at a time, and 2.6 radians completes the
    // crossing — so about thirteen presses, with a margin.
    for (let press = 0; press < 20; press += 1) {
      await page.keyboard.press("ArrowRight");
    }
    await expect(page.locator("#worlds").getByRole("status")).toContainText(/landed/i, {
      timeout: 10_000,
    });
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("gives the finished frame and the caption, and asks for no frames", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const fly = section.getByRole("button", { name: /take the flight/i });
    await expect(fly).toHaveText(/take the flight/i, { timeout: 10_000 });

    // The counter has to be installed *before* the press, so the click happens
    // in-page too. Everything else in this file uses Playwright locators; this
    // one block is the exception, and that is the reason.
    const frames = await page.evaluate(async () => {
      let count = 0;
      const original = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        count += 1;
        return original(callback);
      };
      const button = [...document.querySelectorAll<HTMLButtonElement>("#worlds button")].find(
        (candidate) => /take the flight/i.test(candidate.textContent ?? ""),
      );
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      window.requestAnimationFrame = original;
      return count;
    });

    // The outcome, not a slower animation — and not one frame requested to
    // produce it.
    expect(frames).toBe(0);
    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible();
    await expect(section.getByRole("status")).toContainText(/landed/i);
  });
});
```

Note what that last test does *not* assert: it does not check that the globe
looks different. Pixels are not the contract here — the contract is that the
outcome is reached and no frame was requested to reach it, and both of those are
observable.

- [ ] **Step 6: Run everything and look at it**

Run: `pnpm vitest run && pnpm test:e2e e2e/worlds.spec.ts`
Expected: PASS.

Then `pnpm dev`: press "Take the flight" and watch it, in both themes. Then
enable reduced motion in the OS (Windows: Settings → Accessibility → Visual
effects → Animation effects off) and press it again. Expected: the finished
frame appears at once, with the sapling and the caption, and nothing animates.

- [ ] **Step 7: Verify and commit**

Run: `pnpm verify`

```bash
git add src/sections/Worlds e2e/worlds.spec.ts tests/sections/WorldsStage.test.tsx
git commit -m "Land the bird, drop the seed, hand off to the tree

The end of the moment: a seed at the arrival pin, a sapling rising from it,
and a link that says the career tree grows from that spot — rendered only once
it is true.

Reduced motion gets the finished frame and the caption immediately, with an
e2e that installs a requestAnimationFrame counter before the press and asserts
zero. Someone who asked their system not to animate things asked for the
outcome, not for a slower animation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The Workshop's content map, and the gaps it has to admit

`#workshop` is the spec's answer to "turn an idea into an i_did": the nine
authored loop steps, run against a real project. The nine steps already exist
(`problemSolvingLoop`, kept unrendered by plan 2). The project fields already
exist. What does not exist is the **mapping** between them — which field is the
evidence for which step — and that mapping is a content decision, not a
rendering one, so it lives in `src/content/workshop.ts` where it can be
reviewed and changed without touching a component.

The mapping is also where this section can most easily lie. Four of the five
projects author no `whatFailed`, and `automotive-genai` authors neither
`assumption` nor `metrics`. A station with nothing behind it must say so.
Borrowing a neighbouring project's line, or quietly hiding the station, would
both make the loop look more complete than the record is.

**Files:**
- Modify: `src/types/portfolio.ts` (`WorkshopStation`)
- Create: `src/content/workshop.ts`
- Create: `src/lib/workshop.ts`
- Test: `tests/lib/workshop.test.ts`

**Interfaces:**
- Consumes: `problemSolvingLoop`, `projects`, `careerEntryById` from
  `src/content/portfolio.ts`; `workflowStages` from
  `src/content/ai-experiments.ts`.
- Produces:

```ts
// src/types/portfolio.ts
export type ProjectEvidenceField =
  | "problem" | "whyItMattered" | "assumption" | "constraints" | "responsibility"
  | "decisions" | "pathsExplored" | "whatFailed" | "failureLesson" | "built"
  | "proof" | "learned" | "nextQuestion";

export interface WorkshopStation {
  readonly step: string;
  readonly field: ProjectEvidenceField;
}

// src/content/workshop.ts
export const workshopStations: readonly WorkshopStation[];   // nine, in loop order
export const stationGap: (field: string) => string;
export const workshopIntro: string;
export const defaultRunProjectId: string;
export const agentLaneIntro: string;

// src/lib/workshop.ts
export interface ResolvedStation {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly field: ProjectEvidenceField;
  readonly evidence: readonly string[];
  readonly gap: string | null;
}
export interface ResolvedRun {
  readonly projectId: string;
  readonly title: string;
  readonly organization: string | undefined;
  readonly href: string;
  readonly stations: readonly ResolvedStation[];
  readonly authoredStations: number;
  readonly learned: string;
}
export function runnableProjects(): readonly { readonly id: string; readonly title: string }[];
export function resolveRun(projectId: string): ResolvedRun | null;
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/workshop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { problemSolvingLoop, projects } from "@/content/portfolio";
import { defaultRunProjectId, workshopStations } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";

describe("the station map", () => {
  it("has one station per authored loop step, in the loop's own order", () => {
    expect(workshopStations.map((station) => station.step)).toEqual(
      problemSolvingLoop.map((step) => step.id),
    );
  });

  it("names a real project field for every station", () => {
    const sample = projects[0] as unknown as Record<string, unknown>;
    for (const station of workshopStations) {
      expect(Object.keys(sample)).toContain(station.field);
    }
  });

  it("uses each field at most once, so no line is evidence for two steps", () => {
    const fields = workshopStations.map((station) => station.field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe("resolveRun", () => {
  it("runs the default project and quotes its fields verbatim", () => {
    const run = resolveRun(defaultRunProjectId);
    if (!run) throw new Error(`${defaultRunProjectId} is not a runnable project`);
    const project = projects.find((candidate) => candidate.id === defaultRunProjectId);
    if (!project) throw new Error("the default project left the content layer");

    expect(run.stations).toHaveLength(problemSolvingLoop.length);

    const observe = run.stations.find((station) => station.id === "observe");
    expect(observe?.evidence).toEqual([project.problem]);
    expect(observe?.gap).toBeNull();

    const constraints = run.stations.find((station) => station.id === "constraints");
    expect(constraints?.evidence).toEqual([...project.constraints]);
  });

  it("carries each step's own label and detail, unchanged", () => {
    const run = resolveRun(defaultRunProjectId);
    if (!run) throw new Error("no run");
    for (const step of problemSolvingLoop) {
      const station = run.stations.find((candidate) => candidate.id === step.id);
      expect(station?.label).toBe(step.label);
      expect(station?.detail).toBe(step.detail);
    }
  });

  it("returns null for a project that does not exist", () => {
    expect(resolveRun("no-such-project")).toBeNull();
  });

  it("offers every project as a possible run", () => {
    expect(runnableProjects().map((project) => project.id)).toEqual(
      projects.map((project) => project.id),
    );
  });
});

describe("the gaps are disclosed, never hidden and never borrowed", () => {
  it("keeps the station and states the gap when the project authors nothing for it", () => {
    // Four of the five projects author no `whatFailed`. The station stays —
    // dropping it would make the loop look more complete than the record is,
    // and filling it from another project would be a quiet lie about which
    // project failed how.
    const withoutFailure = projects.filter((project) => !project.whatFailed);
    expect(withoutFailure.length).toBeGreaterThan(0);

    for (const project of withoutFailure) {
      const run = resolveRun(project.id);
      const station = run?.stations.find((candidate) => candidate.id === "test");
      expect(station, `${project.id} lost its test station`).toBeDefined();
      expect(station?.evidence).toEqual([]);
      expect(station?.gap).toBeTruthy();
      expect(station?.gap).toContain("whatFailed");
    }
  });

  it("treats an unauthored Maybe field as a gap rather than printing anything", () => {
    // `automotive-genai` authors `assumption: undefined`, which is the same
    // branch a `[NEEDS INPUT: …]` marker takes once `resolved()` has unwrapped
    // it. Neither may ever reach the page.
    for (const project of projects) {
      const run = resolveRun(project.id);
      for (const station of run?.stations ?? []) {
        for (const line of station.evidence) {
          expect(line).not.toContain("[NEEDS INPUT");
        }
        expect(station.gap ?? "").not.toContain("[NEEDS INPUT");
      }
    }
  });

  it("counts how many of the nine stations this run can actually fill", () => {
    for (const project of projects) {
      const run = resolveRun(project.id);
      if (!run) throw new Error(`${project.id} did not resolve`);
      const filled = run.stations.filter((station) => station.evidence.length > 0).length;
      expect(run.authoredStations).toBe(filled);
      expect(run.authoredStations).toBeGreaterThan(0);
      expect(run.authoredStations).toBeLessThanOrEqual(run.stations.length);
    }
  });

  it("never renders the string 'undefined' anywhere in a run", () => {
    for (const project of projects) {
      expect(JSON.stringify(resolveRun(project.id))).not.toContain("undefined");
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/lib/workshop.test.ts`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write the map**

Add `ProjectEvidenceField` and `WorkshopStation` to `src/types/portfolio.ts`,
then create `src/content/workshop.ts`:

```ts
import type { WorkshopStation } from "@/types/portfolio";

/**
 * Which authored field is the evidence for which step of the loop.
 *
 * The nine steps in `problemSolvingLoop` are the method, stated in the
 * abstract. A case study's fields are one run of that method, stated
 * concretely. This file is the only place the two are joined, and the join is
 * authored rather than inferred — exactly like the career tree's refusal to
 * match skill names against technology strings. A loop step and a project
 * field are two different vocabularies, and the only honest way to relate them
 * is for a person to say which goes with which.
 *
 * Each field appears once. That is a real constraint, not tidiness: a line
 * used as evidence for two different steps is a line doing a job it was not
 * written for, and it makes the run look like it had more material than it did.
 *
 * Five fields are deliberately *not* mapped — `whyItMattered`,
 * `responsibility`, `proof`, `metrics` and `workflow`. They belong to the case
 * study's own telling in `#work`, and the Workshop links there rather than
 * repeating it.
 */
export const workshopStations = [
  { step: "observe", field: "problem" },
  { step: "question", field: "assumption" },
  { step: "constraints", field: "constraints" },
  { step: "reframe", field: "decisions" },
  { step: "explore", field: "pathsExplored" },
  { step: "experiment", field: "built" },
  { step: "test", field: "whatFailed" },
  { step: "learn", field: "failureLesson" },
  { step: "iterate", field: "nextQuestion" },
] satisfies readonly WorkshopStation[];

/**
 * What a station says when the project being run authors nothing for it.
 *
 * It names the field, on purpose. A visitor reading "nothing authored here"
 * learns only that something is missing; naming the field says *what* is
 * missing and makes the gap checkable against the case study. Four of the five
 * projects have no `whatFailed`, so this string is not an edge case — it is on
 * screen most of the time, and it should read as a deliberate statement rather
 * than an apology.
 */
export const stationGap = (field: string): string =>
  `Nothing is authored in this project's ${field}, so this station is empty on this run.`;

export const workshopIntro =
  "Nine steps, one real project, and every piece of evidence below quoted from that project's own write-up. Switch the project to see which steps it can fill — and which it cannot.";

/** The run a visitor sees first. `dd-feasibility-agent` is the only project
 *  that authors `whatFailed`, so it is the one run where all nine stations
 *  have something behind them. */
export const defaultRunProjectId = "dd-feasibility-agent";

export const agentLaneIntro =
  "Underneath, the ten stages where an agent actually helps — what it does, what stays a human decision, and what to watch for at each one.";
```

- [ ] **Step 4: Write the resolver**

Create `src/lib/workshop.ts`:

```ts
import { careerEntryById, problemSolvingLoop, projects } from "@/content/portfolio";
import { stationGap, workshopStations } from "@/content/workshop";
import {
  resolved as unwrap,
  type Maybe,
  type Project,
  type ProjectEvidenceField,
} from "@/types/portfolio";

/**
 * One run of the loop: nine stations, each holding its own authored step and
 * whatever the chosen project authored for it.
 *
 * The interesting behaviour is what happens when a project authored nothing.
 * The station stays, its `evidence` is empty, and `gap` says which field is
 * missing. That is the opposite of what a rendering layer usually does with an
 * empty list, and it is the point: four of the five projects have no
 * `whatFailed`, so a Workshop that hid empty stations would show a nine-step
 * loop completing perfectly every time, which is not true of the record it is
 * drawn from.
 *
 * Everything returned is plain strings and numbers — `WorkshopRun.tsx` is a
 * client component and receives this as props.
 */

export interface ResolvedStation {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly field: ProjectEvidenceField;
  /** One entry for a single-string field, many for a list field, none when the
   *  project authored nothing. */
  readonly evidence: readonly string[];
  readonly gap: string | null;
}

export interface ResolvedRun {
  readonly projectId: string;
  readonly title: string;
  readonly organization: string | undefined;
  /** The case study's own anchor in `#work`, so the run can point at the full
   *  telling rather than repeating it. */
  readonly href: string;
  readonly stations: readonly ResolvedStation[];
  readonly authoredStations: number;
  readonly learned: string;
}

function evidenceFor(project: Project, field: ProjectEvidenceField): readonly string[] {
  const value = project[field] as unknown;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  // A `Maybe<string>` currently holding a `[NEEDS INPUT: …]` marker unwraps to
  // undefined here, which lands in the same place as an absent field: a gap.
  const single = unwrap(value as Maybe<string>);
  return typeof single === "string" && single.length > 0 ? [single] : [];
}

export function runnableProjects(): readonly { readonly id: string; readonly title: string }[] {
  return projects.map((project) => ({ id: project.id, title: project.title }));
}

export function resolveRun(projectId: string): ResolvedRun | null {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;

  const stations: ResolvedStation[] = [];
  for (const station of workshopStations) {
    const step = problemSolvingLoop.find((candidate) => candidate.id === station.step);
    // A station naming a step that no longer exists is a content error, not a
    // gap — it is dropped, and `tests/lib/workshop.test.ts`'s first case fails
    // loudly rather than the page rendering eight stations quietly.
    if (!step) continue;
    const evidence = evidenceFor(project, station.field);
    stations.push({
      id: step.id,
      label: step.label,
      detail: step.detail,
      field: station.field,
      evidence,
      gap: evidence.length > 0 ? null : stationGap(station.field),
    });
  }

  return {
    projectId: project.id,
    title: project.title,
    organization: careerEntryById(project.careerEntryId)?.organization,
    href: `#work-${project.id}`,
    stations,
    authoredStations: stations.filter((station) => station.evidence.length > 0).length,
    learned: project.learned,
  };
}
```

Check the anchor convention before trusting `#work-${project.id}`:
`grep -n "work-" src/sections/SelectedWork/anchors.ts`. If that file exports a
helper, call it instead of building the string here — there must be one
spelling of a case study's anchor on this site, and `scrapingPlaybook`'s
`evidenceHref` values suggest the prefix but not the helper.

- [ ] **Step 5: Run the test**

Run: `pnpm vitest run tests/lib/workshop.test.ts`
Expected: PASS.

The "names a real project field" case is the one most likely to fail, because
`projects[0]`'s object literal omits fields it does not author (`whatFailed`
among them). If it fails, assert against a type-level list instead: build the
key set from every project rather than from the first one.

- [ ] **Step 6: Verify and commit**

Run: `pnpm verify`

```bash
git add src/types/portfolio.ts src/content/workshop.ts src/lib/workshop.ts tests/lib/workshop.test.ts
git commit -m "Map the nine loop steps onto one project's own fields

The steps are the method in the abstract; a case study's fields are one run of
it. The join is authored rather than inferred, for the same reason the career
tree refuses to match skill names against technology strings: two vocabularies
only relate if a person says how.

A station whose project authored nothing keeps its place and names the missing
field. Four of the five projects have no whatFailed, so hiding empty stations
would show a loop completing perfectly every time — which is not true of the
record it is drawn from.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: `#workshop` renders, and the page learns about it

The section, the project switcher, the agent lane, and the same six-point
wiring Task 7 did for `#worlds`. Read Task 7 Step 1 again before starting —
the tour's silent-skip failure is identical here.

**Files:**
- Create: `src/sections/Workshop/Workshop.tsx`
- Create: `src/sections/Workshop/WorkshopRun.tsx`
- Create: `src/sections/Workshop/AgentLane.tsx`
- Modify: `src/app/page.tsx`, `src/content/portfolio.ts` (`navItems`)
- Modify: `src/components/companion/companion-tour.ts`,
  `src/components/companion/companion-dialogue.ts`,
  `src/lib/companion-facts.ts`
- Modify: `src/lib/answer-corpus.ts`, `src/content/answer-expansion.ts`
- Modify: `tests/lib/answers.test.ts`, `e2e/ask.spec.ts`,
  `scripts/screenshots.mjs`
- Test: `tests/sections/WorkshopRun.test.tsx`, `e2e/workshop.spec.ts`

**Interfaces:**
- Consumes: `resolveRun`, `runnableProjects`, `ResolvedRun` (Task 10);
  `workflowStages` from `src/content/ai-experiments.ts`; `FilterGroup` from
  `src/components/ui/FilterGroup.tsx`; `Disclosure` from
  `src/components/ui/Disclosure.tsx`.
- Produces: `navItems` gains
  `{ id: "nav-workshop", sectionId: "workshop", label: "Workshop" }` between
  `nav-tree` and `nav-contact`; `CompanionFacts` gains
  `workshop: { steps: number; stages: number; authored: number }`.

- [ ] **Step 1: Write the failing test**

Create `tests/sections/WorkshopRun.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkshopRun from "@/sections/Workshop/WorkshopRun";
import { defaultRunProjectId } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";
import { problemSolvingLoop, projects } from "@/content/portfolio";

const RUNS = runnableProjects().map((project) => {
  const run = resolveRun(project.id);
  if (!run) throw new Error(`${project.id} did not resolve`);
  return run;
});

function renderRun() {
  return render(<WorkshopRun runs={RUNS} defaultProjectId={defaultRunProjectId} />);
}

describe("WorkshopRun", () => {
  it("renders all nine stations, labelled and numbered", () => {
    renderRun();
    for (const step of problemSolvingLoop) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
      expect(screen.getByText(step.detail)).toBeInTheDocument();
    }
  });

  it("quotes the default project's own fields", () => {
    renderRun();
    const project = projects.find((candidate) => candidate.id === defaultRunProjectId);
    if (!project) throw new Error("the default project left the content layer");
    expect(screen.getByText(project.problem)).toBeInTheDocument();
  });

  it("switches the run and swaps every station's evidence", async () => {
    const user = userEvent.setup();
    renderRun();
    const other = RUNS.find((run) => run.projectId !== defaultRunProjectId);
    if (!other) throw new Error("there is only one project");

    // A chip's accessible name is its label plus its count, so match loosely.
    await user.click(screen.getByRole("radio", { name: new RegExp(other.title, "i") }));

    const observe = other.stations.find((station) => station.id === "observe");
    for (const line of observe?.evidence ?? []) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("keeps an empty station and says which field is missing", async () => {
    const user = userEvent.setup();
    renderRun();
    const withGap = RUNS.find((run) => run.stations.some((station) => station.gap !== null));
    if (!withGap) throw new Error("no project has a gap — the fixture has changed");

    await user.click(screen.getByRole("radio", { name: new RegExp(withGap.title, "i") }));

    const gaps = withGap.stations.filter((station) => station.gap !== null);
    for (const station of gaps) {
      expect(screen.getByText(station.label)).toBeInTheDocument();
      expect(screen.getByText(station.gap ?? "")).toBeInTheDocument();
    }
  });

  it("links to the case study rather than retelling it", () => {
    renderRun();
    const run = RUNS.find((candidate) => candidate.projectId === defaultRunProjectId);
    expect(screen.getByRole("link", { name: /the whole case study/i })).toHaveAttribute(
      "href",
      run?.href,
    );
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/sections/WorkshopRun.test.tsx`
Expected: FAIL — the module does not resolve.

- [ ] **Step 3: Write the run**

Create `src/sections/Workshop/WorkshopRun.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FilterGroup } from "@/components/ui/FilterGroup";
import type { ResolvedRun } from "@/lib/workshop";

/**
 * The loop, run.
 *
 * Nine stations down the page, each carrying its own authored step (label and
 * detail, from `problemSolvingLoop`) and whatever the chosen project authored
 * for it. The switcher is the argument: the same nine steps against a
 * different project fill a different number of stations, and the ones that
 * stay empty say which field is missing. A visitor who switches twice has
 * learned something true about the record that no amount of prose would have
 * convinced them of.
 *
 * All five runs are resolved on the server and handed down as props, so
 * switching is instant and costs no request. They are small — nine stations of
 * quoted strings — and there are five of them, which is cheaper than one
 * round trip.
 */

interface WorkshopRunProps {
  readonly runs: readonly ResolvedRun[];
  readonly defaultProjectId: string;
}

export function WorkshopRun({ runs, defaultProjectId }: WorkshopRunProps) {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const run = runs.find((candidate) => candidate.projectId === projectId) ?? runs[0];
  if (!run) return null;

  return (
    <div className="mt-8">
      <FilterGroup
        label="Run the loop with"
        idPrefix="workshop-run"
        value={projectId}
        onChange={setProjectId}
        // `count` is not decoration: it is how many of the nine stations that
        // project can fill, which is the one number that makes switching worth
        // doing. `FilterGroup` renders it inside each chip, which is also what
        // keeps its selection from being colour-only.
        options={runs.map((candidate) => ({
          id: candidate.projectId,
          label: candidate.title,
          count: candidate.authoredStations,
        }))}
      />

      <p className="eyebrow mt-4">
        {run.authoredStations} of {run.stations.length} stations have something authored behind them
        {run.organization ? ` · ${run.organization}` : ""}
      </p>

      <ol className="mt-4 grid gap-px">
        {run.stations.map((station, index) => (
          <li key={station.id} className="border border-rule bg-surface p-4">
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} · {station.label}
            </p>
            <p className="mt-1 text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
              {station.detail}
            </p>
            {station.evidence.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {station.evidence.map((line) => (
                  <li
                    key={line}
                    className="border-l-2 border-[color:var(--accent)] pl-3 text-[length:var(--step--1)] text-[color:var(--fg-muted)]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
                {station.gap}
              </p>
            )}
            <p className="eyebrow mt-2 normal-case">
              quoted from projects.{run.projectId} · {station.field}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
        {run.learned}{" "}
        <a href={run.href} className="ink-link">
          Read the whole case study →
        </a>
      </p>
    </div>
  );
}

export default WorkshopRun;
```

`FilterGroup` renders `role="radiogroup"` with `aria-checked` chips, and each
chip's accessible name is its label **plus its count** — so every test locator
for one is `getByRole("radio", { name: new RegExp(title) })`, never an exact
string match. Read
`src/components/ui/FilterGroup.tsx:6-32` and match the props exactly; it also
announces nothing about the result count itself, which is why the "N of 9
stations" line above is this component's job rather than the chip's.

- [ ] **Step 4: Write the agent lane**

Create `src/sections/Workshop/AgentLane.tsx`:

```tsx
import { Disclosure } from "@/components/ui/Disclosure";
import { workflowStages } from "@/content/ai-experiments";
import { agentLaneIntro } from "@/content/workshop";

/**
 * The agent lane: ten stages, each collapsed to its label and its question
 * until someone opens it.
 *
 * Collapsed by default for a measured reason rather than a stylistic one. Plan
 * 2 removed 1,045 lines of client island from this page and took the DOM from
 * 4,369 nodes to 3,325; rendering ten stages' `agentDoes`, `humanOwns` and
 * `watchFor` open would put a few hundred of them straight back. A `<details>`
 * keeps the content in the document — findable by in-page search, reachable by
 * a screen reader, present with no JavaScript — while paying for the layout of
 * only what is open.
 *
 * `watchFor` is rendered last and is not optional. Every stage's failure mode
 * is the half of that stage a reader cannot get from a vendor's marketing, and
 * it is why this lane exists under the loop rather than as its own chapter.
 */
export function AgentLane() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Where the agent helps</p>
      <p className="prose-measure mt-2 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
        {agentLaneIntro}
      </p>
      <div className="mt-4 grid gap-px">
        {workflowStages.map((stage) => (
          <Disclosure
            key={stage.id}
            id={`workshop-stage-${stage.id}`}
            summary={stage.label}
            expandLabel="Open this stage"
            collapseLabel="Close this stage"
            className="border border-rule bg-surface p-4"
          >
            <p className="text-[length:var(--step--1)] italic text-[color:var(--fg-subtle)]">
              {stage.question}
            </p>
            <p className="eyebrow mt-3">The agent does</p>
            <ul className="mt-1 grid gap-1 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
              {stage.agentDoes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="eyebrow mt-3">A human owns</p>
            <ul className="mt-1 grid gap-1 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
              {stage.humanOwns.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3 border-l-2 border-[color:var(--accent)] pl-3 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
              Watch for: {stage.watchFor}
            </p>
          </Disclosure>
        ))}
      </div>
    </div>
  );
}

export default AgentLane;
```

`Disclosure` takes `id` (it derives `${id}-trigger` and `${id}-panel` from it),
`summary`, `defaultOpen`, `expandLabel`, `collapseLabel` and `className` — read
`src/components/ui/Disclosure.tsx:8-60` and confirm before relying on the call
above. Note its own doc comment about the collapsed panel staying in the DOM:
that is the property this lane is counting on, and it is also why the e2e in
Step 7 must *click* a stage open rather than asserting its text is already
visible.

- [ ] **Step 5: Write the section**

Create `src/sections/Workshop/Workshop.tsx`:

```tsx
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { problemSolvingLoop } from "@/content/portfolio";
import { workflowStages } from "@/content/ai-experiments";
import { defaultRunProjectId, workshopIntro } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";
import AgentLane from "./AgentLane";
import WorkshopRun from "./WorkshopRun";

/**
 * Turn an idea into an i_did.
 *
 * This is where the nine loop steps ended up. They used to be a 1,045-line
 * client island inside Philosophy, animating a diagram of the method in the
 * abstract; plan 2 deleted the island and kept the nine steps. Here they are
 * run against a real project, with every piece of evidence quoted from that
 * project's own write-up, and the steps a project cannot fill left visibly
 * empty. The method is the same. The difference is that this version can be
 * checked.
 *
 * The agent lane underneath is the surviving half of the AI Workflow Lab — the
 * ten stages, and specifically each one's failure mode. The five experiment
 * articles and the learning-log essays did not survive, on the owner's
 * instruction ("nobody is gonna read them"); they remain in
 * `src/content/ai-experiments.ts`, unrendered, which is what makes that
 * decision reversible.
 */

const HEADING_ID = "workshop-heading";

const RUNS = runnableProjects()
  .map((project) => resolveRun(project.id))
  .filter((run): run is NonNullable<typeof run> => run !== null);

const DEFAULT_RUN = RUNS.find((run) => run.projectId === defaultRunProjectId) ?? RUNS[0];

const RAIL: readonly RailNote[] = [
  { term: "Steps", detail: `${problemSolvingLoop.length} — authored, not generated` },
  { term: "Runs", detail: `${RUNS.length} projects` },
  {
    term: "Filled",
    detail: DEFAULT_RUN
      ? `${DEFAULT_RUN.authoredStations} of ${problemSolvingLoop.length} on the first run`
      : "—",
  },
  { term: "Agent stages", detail: `${workflowStages.length}, each with its failure mode` },
];

export default function Workshop() {
  return (
    <Section id="workshop" labelledBy={HEADING_ID} eyebrow="Workshop" tone="deep" rail={RAIL}>
      <SectionHeading id={HEADING_ID} lead={workshopIntro}>
        Turn an idea into an i_did.
      </SectionHeading>
      <WorkshopRun runs={RUNS} defaultProjectId={defaultRunProjectId} />
      <AgentLane />
    </Section>
  );
}
```

Tone note: `#tree` before it is `base` and `#contact` after it is `deep`, so
`deep` here keeps the boundary with the tree visible. Two adjacent `deep`
sections are separated by the hairline `<Section>` already draws; `contrast` is
not available, as `#closing` spends the page's one contrast chapter.

- [ ] **Step 6: Wire the page, the nav, the tour, the cats and the chat**

Exactly as Task 7, for `workshop`:

1. `src/app/page.tsx`: `<Workshop />` between `<CareerTree />` and `<Contact />`.
2. `navItems`: `{ id: "nav-workshop", sectionId: "workshop", label: "Workshop" }`
   between `nav-tree` and `nav-contact`. Seven items now.
3. `GREY_MIDDLE` in `companion-tour.ts`:
   `["worlds", "work", "skills", "tree", "workshop"] as const`.
4. `TOUR.workshop` in `companion-dialogue.ts`:

```ts
  workshop: (f) => [
    tabby("Mrrrow-meow!", `${f.workshop.steps} steps! He does them in order, mostly!`),
    grey("Mrp.", `${f.workshop.authored} of them have proof on this run. The empty ones say so.`),
  ],
```

5. `CompanionFacts.workshop = { steps, stages, authored }`, built from
   `problemSolvingLoop.length`, `workflowStages.length` and the default run's
   `authoredStations`.
6. `sectionExpansions.workshop = ["workflow", "process", "method", "loop", "agent", "ai", "how he works", "steps"]`.
7. `answer-corpus.ts`: one document per station's evidence line, plus one per
   `workflowStages[].watchFor`:

```ts
  // Round 16. The stations' evidence is already a verbatim project field, and
  // each `watchFor` is the one thing about an agent stage a reader cannot get
  // from a vendor. Both are indexed under `workshop`, where they are visible.
  const run = resolveRun(defaultRunProjectId);
  for (const station of run?.stations ?? []) {
    for (const line of station.evidence) {
      docs.push({
        text: line,
        source: `Workshop — ${station.label}`,
        sectionId: "workshop",
        sectionLabel: "Workshop",
        label: label("workshop", run?.projectId, station.label, station.field),
      });
    }
  }
  for (const stage of workflowStages) {
    docs.push({
      text: stage.watchFor,
      source: `Workshop — ${stage.label}`,
      sectionId: "workshop",
      sectionLabel: "Workshop",
      label: label("workshop", undefined, stage.label, stage.question, "risk", "failure"),
    });
  }
```

8. Widen `LINKABLE_SECTIONS` and the `e2e/ask.spec.ts` regex to include
   `workshop`, and extend that test's `CORPUS` set the same way Task 7 did.
9. `scripts/screenshots.mjs`: `SECTIONS` gains `"workshop"` in page order.

- [ ] **Step 7: Write the e2e spec**

Create `e2e/workshop.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { problemSolvingLoop } from "../src/content/portfolio";
import { workflowStages } from "../src/content/ai-experiments";
import { defaultRunProjectId } from "../src/content/workshop";
import { resolveRun, runnableProjects } from "../src/lib/workshop";

test.describe("#workshop", () => {
  test("renders all nine stations with the default run's evidence", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    for (const step of problemSolvingLoop) {
      await expect(section.getByText(step.label, { exact: true })).toBeVisible();
    }
    const run = resolveRun(defaultRunProjectId);
    const observe = run?.stations.find((station) => station.id === "observe");
    for (const line of observe?.evidence ?? []) {
      await expect(section.getByText(line, { exact: true })).toBeVisible();
    }
  });

  test("switching the project swaps the evidence and keeps the empty stations", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    const other = runnableProjects().find((project) => project.id !== defaultRunProjectId);
    if (!other) throw new Error("there is only one project");

    await section.getByRole("radio", { name: new RegExp(other.title, "i") }).click();

    const run = resolveRun(other.id);
    const gaps = run?.stations.filter((station) => station.gap !== null) ?? [];
    for (const station of gaps) {
      await expect(section.getByText(station.gap ?? "", { exact: true })).toBeVisible();
    }
  });

  test("every agent stage opens, and carries its failure mode", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    for (const stage of workflowStages) {
      await section.getByRole("button", { name: new RegExp(stage.label, "i") }).click();
      await expect(section.getByText(stage.watchFor, { exact: false })).toBeVisible();
    }
  });

  test("the whole section is reachable by keyboard", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    const first = section.getByRole("radio").first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(section.locator(":focus")).toBeVisible();
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#workshop");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

Adjust the locators to the roles `FilterGroup` and `Disclosure` really render —
read both components first, and change the test rather than the component.

- [ ] **Step 8: Run everything**

Run: `pnpm vitest run`
Run: `pnpm test:e2e e2e/workshop.spec.ts e2e/navigation.spec.ts e2e/ask.spec.ts e2e/companion.spec.ts`
Expected: PASS.

- [ ] **Step 9: Check the seven-item nav, at 1024px**

Seven desktop nav items is the most this design has ever carried. Run
`pnpm dev`, set the window to exactly 1024px, and look. Then 1152px, then
1440px. Expected: one row, no clipping, no horizontal scrollbar, and the active
underline still lands under the right item. If it does not fit, reduce the gap
before touching the type scale, and record the number you chose in a comment
next to it.

- [ ] **Step 10: Look at the section in both themes**

`pnpm dev`, `/#workshop`, both themes, 320px and 1440px. Check specifically:
the blue left rule on each evidence line (blue is annotation here, which is
allowed); the empty stations, which should read as deliberate rather than
broken; and the ten closed disclosures, which should not look like a wall.

- [ ] **Step 11: Verify and commit**

Run: `pnpm verify`

```bash
git add src/sections/Workshop src/app/page.tsx src/content src/lib src/components/companion tests e2e scripts/screenshots.mjs
git commit -m "Add #workshop — the loop, run against a real project

Nine authored steps, one project's own fields as the evidence, and the steps
that project cannot fill left visibly empty with the missing field named.
Switching the project is the argument: the same loop fills a different number
of stations, which is a true thing about the record that no prose would have
convinced anyone of.

The agent lane underneath is the surviving half of the AI Workflow Lab — ten
stages, each collapsed to its question, each carrying its own failure mode.

Nav is seven items again, so the companion tour keeps its stop count.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: The gate, the docs, and the number this cost

Nothing is done until the measurement is re-run. The whole design rests on two
numbers — 188.2 KB of initial JS and a 3.88s LCP — and this plan added a canvas
engine, 53 KB of coastline data and two sections. The point of the perf gate
from plan 1 is that this task cannot be skipped or estimated.

**Files:**
- Modify: `docs/feedback-tracker.md`
- Modify: `docs/editing.md`
- Modify: `CLAUDE.md`
- Modify: `README.md` (only if it enumerates the page's sections)

- [ ] **Step 1: Run the full unit and e2e matrix**

Run: `pnpm verify`
Run: `pnpm test:e2e`

Expected: green. The e2e suite audits both themes, all three tones, keyboard
nav, focus restoration, reduced motion and horizontal overflow at 320–1440px.
Two known-flaky retries are normal; if a spec fails twice, it is a real
failure. `e2e/companion.spec.ts` carries one `test.fixme` for the follower-cat
clearance defect — that is a pre-existing, separately-tracked issue and must
still be `fixme`, not deleted and not fixed here.

Record the exact command output for any spec that needed a retry.

- [ ] **Step 2: Re-run the accessibility audit against the two new sections**

The axe spec audits sampled sections by id. Add `#worlds` and `#workshop` to
whatever list `e2e/axe.spec.ts` iterates, in both themes, and run it:

Run: `pnpm test:e2e e2e/axe.spec.ts`
Expected: zero violations. A canvas with `aria-hidden="true"` and no
accessible name is correct here and axe agrees; if axe reports the canvas,
check that `aria-hidden` actually landed on the element rather than on a
wrapper.

- [ ] **Step 3: Re-measure**

```bash
pnpm build
```

Then start the production server on 3100 and measure:

```bash
PORT=3100 pnpm start
```

in one terminal, and in another:

```bash
pnpm perf
```

Record every row it prints. The numbers that matter, against plan 1's
baseline:

| Metric | After plans 1+2 | Now |
|---|---|---|
| JavaScript transferred | 188.2 KB gz | ? |
| Largest Contentful Paint | ? | ? |
| Total Blocking Time | ? | ? |
| Cumulative Layout Shift | 0 | ? |
| DOM nodes | 3,325 | ? |

**The initial-JS number is the one to read first.** If it moved by more than a
kilobyte or two, the coastline data or the canvas engine has leaked out of the
lazy chunk. `tests/lib/coastline-data.test.ts`'s fence catches the data; the
engine leaks if anything server-rendered imports `GlobeCanvas` directly instead
of through the `import()` in `WorldsStage`. Find it before writing the row.

**Do not trust a single `pnpm perf` run for that number.** The script swallows
any response whose `sizes()` throws — `scripts/perf.mjs:67-72`, and its own
comment admits it "under-reports rather than crashing". A parallel research
pass measured the same branch at 223.0 KB by summing transfer sizes directly,
against the tracker's 188.2 KB, and that 35 KB gap is larger than everything
this plan adds. Before writing any row:

1. Make the under-report visible instead of silent. In that `catch`, count the
   skipped responses and print the count beside the total, so a measurement
   that dropped three chunks says so rather than looking clean. This is a
   one-line honesty fix to a script whose whole job is honesty, and it belongs
   in this commit.
2. Cross-check with a second method — sum the `content-length` of every script
   the page requests, or run `next experimental-analyze` — and reconcile the
   two before recording. Note in the tracker which method produced the row.
3. Record the **delta** as the headline, not the absolute. Whichever baseline
   is right, both measurements were taken the same way on the same machine, so
   "this plan added N KB" survives the disagreement that "the budget is X"
   does not.

Two related facts worth putting in the tracker row while you are there: Next 16
dropped `First Load JS` from `next build` output as inaccurate for RSC, so that
line is not a substitute; and Turbopack merges chunks under 50 KB uncompressed,
which means "the lazy chunk does not touch the initial bundle" is a claim to
verify per build rather than a guarantee of the `import()`.

LCP should be unchanged: both new sections are below the fold, and the LCP
element is still the hero's intro paragraph. If LCP regressed, check whether
`#worlds` is above the fold at some viewport — the spec's central engineering
decision is that it never is.

- [ ] **Step 4: Write the round up in the tracker**

In `docs/feedback-tracker.md`'s Round 16 section, add a subsection for this
plan with: what shipped (both sections), the measured table from Step 3, the
three mockup strings that were replaced and why, and the two items the spec
still lists as open — the four rewritten strings awaiting the owner's approval,
and the Workshop's empty `test` station for four of five projects, which now
*discloses* rather than needing content.

- [ ] **Step 5: Add the recipes to `docs/editing.md`**

Three new recipes, in that file's existing style:

1. **Adding a plaque to a world.** Pick the record and the field, add a
   `{ glyph, ref }` entry to that world in `src/content/worlds.ts`, run
   `pnpm vitest run tests/lib/worlds.test.ts`. Note the rule: the text comes
   from the field, so if it reads badly on the globe, **edit the field**, not
   the plaque — that string is on screen somewhere else too.
2. **Adding a decoration.** Add a glyph path to
   `src/sections/Worlds/glyphs.ts` and a `{ glyph, draws }` entry. Say plainly
   that a decoration must carry no fact, and that `draws` is what the drawing
   *is*, because it becomes the accessible name alongside
   `no plaque · decoration`.
3. **Changing which field a Workshop station quotes.** Edit the one line in
   `src/content/workshop.ts`, run `pnpm vitest run tests/lib/workshop.test.ts`.
   Note the one-field-per-station rule and why.

- [ ] **Step 6: Update `CLAUDE.md`**

Three edits, each small:

1. Under "Changing what the site says", replace the paragraph about round 16
   removing the AI Workflow Lab with the current truth: `workflowStages` is
   rendered by `#workshop`'s agent lane and `problemSolvingLoop` by its
   stations; `experiments`, `learningLog` and `aiTools` are still retained and
   unrendered, and `scrapingPlaybook` is still waiting for the Work plan. Keep
   the "do not treat unreferenced as dead" instruction — it is still true of
   what is left, including `answer-sources.ts`'s `experimentsIndexable`.
2. Add a short "The globe" paragraph under the design-system section: the
   honesty rule in two sentences, the fact that
   `tests/lib/worlds.test.ts` enforces it string-for-string, the no-3D-library
   decision with the three measured numbers, and the import fence around
   `coastline-data.ts`.
3. Under "Before calling anything done", add that `pnpm perf` must be re-run
   and recorded for any change that touches the globe's chunk.

- [ ] **Step 7: Regenerate the screenshots**

Run: `pnpm screenshots`
Expected: it produces shots for nine sections now, including the two new ones.
Look at the two new images in both themes before committing them.

- [ ] **Step 8: Final verify, then commit**

Run: `pnpm verify && pnpm test:e2e`

```bash
git add docs CLAUDE.md README.md
git commit -m "Record what the globe and the Workshop cost

The measured table, before and after, plus the recipes for adding a plaque, a
decoration and a Workshop station. CLAUDE.md now states the honesty rule and
the import fence, and says which of the retained content arrays are finally
rendered again.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Open the pull request**

Stack it on `claude/round-16-demolition`, the same way that branch is stacked
on `claude/round-16-foundation`. The description carries: the two sections, the
honesty rule and its test, the three mockup strings that were replaced, the
measured table from Step 3, what is deliberately still out of scope (the Work
strips, the playbook coda, the Contact postcard), and the pre-existing
follower-clearance `test.fixme` that this branch does not touch.

---

## Notes for whoever executes this

**The order matters more than usual.** Tasks 1–5 are content and pure
functions; 6–9 build the globe outward from a static list; 10–11 do the same
for the Workshop; 12 measures. A task that reaches forward — a component that
imports something Task 8 has not written yet — will fail typecheck, which is
the intended guard rail rather than an obstacle to work around.

**Two tasks knowingly leave something red between commits**, and both say so
in place: Task 5's import fence is skipped until Task 8 creates the file it
names, and Task 6's stage renders a canvas that does not exist yet (the
`import()` rejects, which is already handled). Nothing else should be red at
any commit.

**The one thing not to compromise on** is `tests/lib/worlds.test.ts`. If a
plaque's text is not `===` a string the content layer produces, the fix is to
change the plaque's reference or to edit the authored field — never to relax
the assertion to a substring or a normalised comparison. That test is the
feature the whole section was designed around.
