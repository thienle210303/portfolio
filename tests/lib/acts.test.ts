import { describe, expect, it } from "vitest";
import { ACTS } from "@/sections/CareerTree/acts";
import { ACT_IDS, actForEntry } from "@/lib/anchors";
import { careerEntries } from "@/content/portfolio";

describe("the seven acts", () => {
  it("is one act per anchor, in the same order", () => {
    expect(ACTS.map((act) => act.id)).toEqual([...ACT_IDS]);
  });

  it("draws every career entry in some act", () => {
    const drawn = new Set(ACTS.flatMap((act) => act.entryIds));
    for (const entry of careerEntries) {
      expect(drawn, entry.id).toContain(entry.id);
    }
  });

  it("puts each entry in the act the anchor map says", () => {
    for (const act of ACTS) {
      for (const entryId of act.entryIds) {
        expect(actForEntry(entryId), entryId).toBe(act.id);
      }
    }
  });

  it("shows the credentials strip exactly once", () => {
    expect(ACTS.filter((act) => act.showsCredentials)).toHaveLength(1);
  });

  it("starts at the crossing with no career entry of its own", () => {
    expect(ACTS[0].id).toBe("crossing");
    expect(ACTS[0].entryIds).toEqual([]);
  });
});
