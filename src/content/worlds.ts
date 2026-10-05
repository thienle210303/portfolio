import { origin } from "@/content/portfolio";
import type { World } from "@/types/portfolio";

/**
 * Six chapters, and not one sentence about Thien among them.
 *
 * Every plaque below is an *address*: which record, which field. The strings
 * a visitor reads come from `src/content/portfolio.ts` via
 * `src/lib/worlds.ts`, verbatim, and a reference that resolves to nothing is
 * dropped rather than rendered. See `src/types/portfolio.ts`'s Playground
 * Earth banner for why the schema is shaped this way, and
 * `tests/lib/worlds.test.ts` for the test that keeps it true.
 *
 * Order is the order the list renders and the numbering a visitor reads
 * (01–06). It runs the crossing's own story: both ends of it, what was under
 * the flight, what was above it, what grew from it — then the two chapters
 * that are not on the map at all.
 *
 * This file only ever holds a record id, a field name and — for a
 * `careerEntryLine` — a list index. Anything that has to be *computed* from
 * that address, including the Technology world's case-study links, is
 * `src/lib/worlds.ts`'s job: keeping this file to plain data is what keeps it
 * from importing outward into `src/sections/`.
 */
export const worlds = [
  {
    id: "living-earth",
    name: "Living Earth",
    glyph: "star",
    // Both ends of the crossing, in the order he travelled them. One chapter
    // owns both pins: they belong to the same moment, and a marker on either
    // opens this panel.
    anchors: [{ at: "origin-from" }, { at: "origin-to" }],
    where: `Both ends of the crossing — ${origin.from} (province level, no city) and ${origin.to}, the first place he lived here`,
    plaques: [
      { glyph: "comtam", ref: { of: "computed", id: "crossing" } },
      { glyph: "cap", ref: { of: "careerEntry", id: "graduation", field: "role" } },
      { glyph: "trophy", ref: { of: "careerEntry", id: "cockyhacks", field: "role" } },
      { glyph: "trophy", ref: { of: "careerEntry", id: "code-to-give", field: "role" } },
      { glyph: "ribbon", ref: { of: "careerEntry", id: "magellan", field: "role" } },
      // `index` is positional against `usc-ta.impact` as authored today — a
      // reorder of that array silently repoints this plaque to a different
      // line. Nothing fails, because every line in it is already in
      // `AUTHORED`; this is the one place that has to be kept in sync by eye.
      { glyph: "chalk", ref: { of: "careerEntryLine", id: "usc-ta", field: "impact", index: 1 } },
    ],
    decorations: [
      { glyph: "comtam", draws: "a plate of cơm tấm — broken rice, a grilled chop, a fried egg" },
    ],
    // The owner named one object. The panel says so plainly rather than
    // padding the chapter out with invented ones.
    disclosure: "One object so far, and he named it himself. Nothing here was invented to fill the space.",
  },
  {
    id: "sea",
    name: "Sea",
    glyph: "net",
    anchors: [{ at: "arc-midpoint" }],
    where: "The midpoint of the crossing — derived from the two pins, not typed",
    plaques: [
      // Positional against `usc-scraping.built`/`.impact` — see the note on
      // the USA world's `usc-ta` plaque above. A reorder of either array
      // silently repoints these two.
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
    anchors: [{ at: "arc-apex" }],
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
    anchors: [{ at: "origin-to" }],
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
    anchors: [{ at: "plinth" }],
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
    anchors: [{ at: "orbit" }],
    where: "In orbit — it counter-rotates, so it always faces you",
    // The spec's table also listed the learning log here. Decision 4 retired it
    // from the page ("nobody is gonna read them"), so what survives is only the
    // short, concrete evidence: two case studies and the four tools. Round 18
    // then deleted the log itself along with the rest of the AI Lab's content.
    plaques: [
      { glyph: "chip", ref: { of: "project", id: "dd-scraper-platform", field: "tagline" } },
      { glyph: "magnifier", ref: { of: "project", id: "dd-feasibility-agent", field: "tagline" } },
      { glyph: "sat", ref: { of: "computed", id: "ai-tools" } },
    ],
    decorations: [],
  },
] satisfies readonly World[];
