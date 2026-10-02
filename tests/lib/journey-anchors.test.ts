import { describe, expect, it } from "vitest";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { ACTS } from "@/sections/CareerTree/acts";
import { careerEntries } from "@/content/portfolio";

/**
 * `journeyEntryAnchorId` builds a career entry's fragment from the entry id and
 * nothing else, and `./acts.ts` is what calls it — once per entry, on the act
 * that draws that entry.
 *
 * **What this file proves and what it does not.** It proves the id's shape, and
 * that the acts between them declare one fragment for every career entry,
 * exactly once. It does not prove an element carries the id:
 * `tests/sections/Stage.test.tsx` renders the stage and asserts that, and
 * `e2e/legacy-anchors.spec.ts` asserts the no-JavaScript landing a jsdom test
 * cannot reach. The gate that used to live here — `journeyEntryAnchor`, which
 * returned `undefined` for an id that was not a career entry — went with its
 * only caller; see the retirement note in
 * `src/sections/CareerTree/cross-link.tsx`.
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

describe("the acts declare one fragment per career entry", () => {
  it("covers every entry exactly once", () => {
    expect(careerEntries.length).toBeGreaterThan(0);
    const declared = ACTS.flatMap((act) => act.entryAnchorIds);
    // A sorted list rather than a set: an entry declared by two acts would ship
    // a duplicate id, and a membership check would not notice.
    expect(declared.toSorted()).toEqual(
      careerEntries.map((entry) => journeyEntryAnchorId(entry.id)).toSorted(),
    );
  });

  it("pairs each act's entry ids with its anchor ids, in order", () => {
    // `entryAnchorIds` is derived from `entryIds`; asserting the pairing is how
    // an edit that reorders one and not the other gets caught.
    let paired = 0;
    for (const act of ACTS) {
      expect(act.entryAnchorIds, act.id).toEqual(act.entryIds.map(journeyEntryAnchorId));
      paired += act.entryIds.length;
    }
    expect(paired, "no act names an entry, so the loop above proved nothing").toBe(
      careerEntries.length,
    );
  });
});
