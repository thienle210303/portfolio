import { describe, expect, it } from "vitest";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";

/**
 * `journeyEntryAnchorId` builds a career entry's fragment from the entry id and
 * nothing else. This proves the id's shape only. That an element carries it —
 * a timeline row for a drawn entry, a credentials line for a demoted one,
 * exactly once each — is asserted by `tests/sections/CareerTree.test.tsx`, and
 * the no-JavaScript landing a jsdom test cannot reach by
 * `e2e/legacy-anchors.spec.ts`.
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
