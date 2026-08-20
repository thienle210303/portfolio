import { describe, expect, it } from "vitest";
import { journeyEntryAnchor, journeyEntryAnchorId } from "@/sections/CareerJourney/anchors";
import { careerEntries } from "@/content/portfolio";

/**
 * `journeyEntryAnchor` is the guard between a cross-reference and a dead
 * fragment. The career tree's leaves call it and link only when it returns a
 * string, so the question it answers — "will an element with this id be in
 * the document?" — has to stay answered from `careerEntries` and nothing
 * else. A version that returned an id unconditionally would look correct
 * everywhere except in the browser, where the browser follows the link,
 * finds nothing, and does nothing at all.
 *
 * The e2e suite checks the other half — that every link the tree renders
 * resolves against the rendered DOM, and that following one lands on and
 * focuses its entry even through the timeline's filter. This file checks the
 * decision itself, without a browser.
 */
describe("journeyEntryAnchorId", () => {
  it("derives the id from the entry id rather than an authored string", () => {
    expect(journeyEntryAnchorId("doordash")).toBe("journey-entry-doordash");
  });

  it("stays one suffix clear of the three ids TimelineEntry already emits", () => {
    const anchor = journeyEntryAnchorId("doordash");
    for (const taken of [
      "journey-doordash-role",
      "journey-doordash-trigger",
      "journey-doordash-panel",
    ]) {
      expect(anchor).not.toBe(taken);
    }
  });
});

describe("journeyEntryAnchor", () => {
  it("gives every entry the timeline renders an anchor", () => {
    expect(careerEntries.length).toBeGreaterThan(0);
    for (const entry of careerEntries) {
      expect(journeyEntryAnchor(entry.id), `no anchor for "${entry.id}"`).toBe(
        `journey-entry-${entry.id}`,
      );
    }
  });

  it("gives nothing to an id the timeline does not render", () => {
    expect(journeyEntryAnchor("no-such-entry")).toBeUndefined();
    expect(journeyEntryAnchor("")).toBeUndefined();
    // The anchor id itself is not an entry id — asking with one back is the
    // shape of a caller that round-tripped the wrong value.
    expect(journeyEntryAnchor(journeyEntryAnchorId(careerEntries[0].id))).toBeUndefined();
  });
});
