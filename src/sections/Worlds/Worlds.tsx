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
