import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buildStops, crossingKm } from "@/lib/origin-stops";
import WorldsStage from "./WorldsStage";

/**
 * The origin story: one crossing, three stops. The globe plays the flight once
 * and turns to whichever stop the visitor picks; every word beside it — each
 * stop's place, date and caption — is read from the content layer by
 * `buildStops()`, never typed here.
 *
 * Placement is the design's central engineering decision: one section, below
 * the fold, never in the LCP viewport. The measured LCP before round 16 was
 * already 3.88s on a throttled phone, so a drawn planet in the hero was ruled
 * out before it was designed. Everything expensive about the globe is in a
 * chunk that is not fetched until the stage is near the viewport, and the
 * section is complete before it arrives.
 *
 * The rail carries the two numbers the section computes rather than states:
 * the crossing's length, from the two pins, and how many stops there are.
 */

const HEADING_ID = "worlds-heading";

const STOPS = buildStops();
const KM = crossingKm();

const RAIL: readonly RailNote[] = [
  { term: "Crossing", detail: `${KM.toLocaleString("en-US")} km · computed from the two pins` },
  { term: "Stops", detail: String(STOPS.length) },
];

export default function Worlds() {
  return (
    <Section id="worlds" labelledBy={HEADING_ID} eyebrow="Worlds" tone="deep" rail={RAIL}>
      <WorldsStage stops={STOPS} crossingKm={KM}>
        <SectionHeading id={HEADING_ID}>One crossing, three stops.</SectionHeading>
      </WorldsStage>
    </Section>
  );
}
