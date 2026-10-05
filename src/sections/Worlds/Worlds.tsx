import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { crossingKm, resolveChapters } from "@/lib/worlds";
import { resolveSkins } from "@/lib/skins";
import WorldsStage from "./WorldsStage";

/**
 * Playground Earth: six chapters, two cats, and one rule.
 *
 * The rule is the section. Everything drawn on the globe is either a plaque or
 * a decoration — nothing is drawn that is neither, and
 * `tests/lib/worlds.test.ts` proves it string-for-string. A decoration says in
 * its own accessible name that it carries no fact. A plaque comes in two
 * kinds, both of which name their source in the panel: `kind: "field"` quotes
 * one authored field whole, and `kind: "computed"` renders one named
 * computation over the content layer (`computedFact()` in
 * `src/lib/worlds.ts` — a count of branches, a count of seasons, the list of
 * scene names). Neither kind is a sentence this section wrote, and the rail
 * below counts the two separately rather than claiming every plaque is a
 * quote. That is what lets a portfolio draw cơm tấm and a jellyfish without
 * the site inventing a single claim about the person it is about.
 *
 * Placement is the design's central engineering decision: one section, below
 * the fold, never in the LCP viewport. The measured LCP before this round was
 * already 3.88s on a throttled phone, so a drawn planet in the hero was ruled
 * out before it was designed. Everything expensive about the globe is in a
 * chunk that is not fetched until the stage is near the viewport, and the
 * section is complete before it arrives.
 *
 * The rail counts what a reader cannot count by looking: how the panels' lines
 * split between quoted fields, named computations and drawings, and how far
 * the crossing actually is. All of them are computed from the content layer —
 * see `src/lib/worlds.ts`.
 */

const HEADING_ID = "worlds-heading";

const WORLDS = resolveChapters();
const SKINS = resolveSkins();
const KM = crossingKm();

// Split by kind rather than totalled, because the total is the one number in
// this rail a reader *can* get by looking — every row of the list beside the
// globe already names its own plaque count. How many of those lines are a
// field quoted whole and how many are a computation over the content layer is
// only visible by opening all six panels and reading every source line.
// Counted off the resolved worlds, so a reference that stopped resolving
// leaves both numbers, not just the total.
const QUOTED_COUNT = WORLDS.reduce(
  (total, world) => total + world.plaques.filter((plaque) => plaque.kind === "field").length,
  0,
);
const COMPUTED_COUNT = WORLDS.reduce(
  (total, world) => total + world.plaques.filter((plaque) => plaque.kind === "computed").length,
  0,
);
const DECORATION_COUNT = WORLDS.reduce((total, world) => total + world.decorations.length, 0);
// Animals (the plinth) and Technology (orbit) are the two chapters
// `resolveChapters()` never gives a map point (`points` is empty for both — see
// `src/lib/worlds.ts`'s `anchorPoint`). A reader could only get this by
// opening both panels and noticing neither one's "where" line names a spot on
// the globe — unlike the raw chapter count, which the heading, the numbered
// list and its 01–06 numerals already all say by themselves.
const OFF_MAP_COUNT = WORLDS.filter((world) => world.points.length === 0).length;

const RAIL: readonly RailNote[] = [
  { term: "Off the map", detail: `${OFF_MAP_COUNT} — the plinth and the orbit, not projected onto the globe` },
  { term: "Plaques", detail: `${QUOTED_COUNT} quoted whole · ${COMPUTED_COUNT} computed` },
  { term: "Decorations", detail: `${DECORATION_COUNT} — drawings, carrying no fact` },
  // Not folded into Plaques or Decorations: a skin is a look, not a drawn object.
  { term: "Skins", detail: `${SKINS.length} — the look only, carrying no fact` },
  { term: "Crossing", detail: `${KM.toLocaleString("en-US")} km · computed from the two pins` },
];

export default function Worlds() {
  return (
    <Section id="worlds" labelledBy={HEADING_ID} eyebrow="Worlds" tone="deep" rail={RAIL}>
      <SectionHeading
        id={HEADING_ID}
        lead="Roll the planet. Everything on it is something already written down somewhere else on this site — and anything that is only a drawing says so."
      >
        Six chapters, and two cats who look after them.
      </SectionHeading>
      <WorldsStage worlds={WORLDS} skins={SKINS} crossingKm={KM} />
    </Section>
  );
}
