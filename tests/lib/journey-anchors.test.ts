import { describe, expect, it } from "vitest";
import { journeyEntryAnchor, journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries } from "@/content/portfolio";

/**
 * `journeyEntryAnchor` decides whether an id names a career entry the Journey
 * is meant to own, and builds its fragment from the entry id and nothing else.
 *
 * **What this file does not prove, as of round 18:** that an element with the
 * id is in the document. Through round 17 it did, because the timeline rendered
 * exactly `careerEntries`; the pinned stage replaced the timeline and nothing
 * renders `journey-entry-<id>` today. The assertions below are therefore about
 * the id and the guard, and are named that way. Task 13 re-adds the anchors on
 * the acts and is where "every one resolves against the DOM" is asserted again
 * (`tests/sections/Stage.test.tsx` and `e2e/legacy-anchors.spec.ts`).
 */
describe("journeyEntryAnchorId", () => {
  it("derives the id from the entry id rather than an authored string", () => {
    expect(journeyEntryAnchorId("doordash")).toBe("journey-entry-doordash");
  });

  it("stays one suffix clear of the three ids the deleted timeline used to emit", () => {
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
  it("gives every career entry a fragment id (not proof that an element carries it — see the note above)", () => {
    expect(careerEntries.length).toBeGreaterThan(0);
    for (const entry of careerEntries) {
      expect(journeyEntryAnchor(entry.id), `no anchor for "${entry.id}"`).toBe(
        `journey-entry-${entry.id}`,
      );
    }
  });

  it("gives nothing to an id that is not a career entry", () => {
    expect(journeyEntryAnchor("no-such-entry")).toBeUndefined();
    expect(journeyEntryAnchor("")).toBeUndefined();
    // The anchor id itself is not an entry id — asking with one back is the
    // shape of a caller that round-tripped the wrong value.
    expect(journeyEntryAnchor(journeyEntryAnchorId(careerEntries[0].id))).toBeUndefined();
  });
});
