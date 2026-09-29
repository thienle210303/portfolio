import { caseStudyAnchorId } from "@/sections/SelectedWork/anchors";
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
 *
 * The two Technology plaques link to their case studies via
 * `caseStudyAnchorId()` (`src/sections/SelectedWork/anchors.ts`) rather than
 * a hand-typed `#work-<id>` string — that helper is already the one spelling
 * of a case-study anchor every other jump link on the site agrees on
 * (`DrawnTree.tsx`, `KnowledgeTreeList.tsx`, `CaseStudy.tsx`,
 * `SelectedWork.tsx`), and a second, hand-rolled copy here is exactly the
 * kind of drift that convention exists to prevent.
 */
export const worlds = [
  {
    id: "vietnam",
    name: "Việt Nam",
    glyph: "comtam",
    anchor: { at: "origin-from" },
    where: "Kiên Giang, Việt Nam — province level, no city",
    plaques: [{ glyph: "comtam", ref: { of: "computed", id: "crossing" } }],
    decorations: [
      { glyph: "comtam", draws: "a plate of cơm tấm — broken rice, a grilled chop, a fried egg" },
    ],
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
      {
        glyph: "chip",
        ref: {
          of: "project",
          id: "dd-scraper-platform",
          field: "tagline",
          link: `#${caseStudyAnchorId("dd-scraper-platform")}`,
        },
      },
      {
        glyph: "magnifier",
        ref: {
          of: "project",
          id: "dd-feasibility-agent",
          field: "tagline",
          link: `#${caseStudyAnchorId("dd-feasibility-agent")}`,
        },
      },
      { glyph: "sat", ref: { of: "computed", id: "ai-tools" } },
    ],
    decorations: [],
  },
] satisfies readonly World[];
