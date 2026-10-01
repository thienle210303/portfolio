import { describe, expect, it } from "vitest";
import { careerEntries, projects } from "@/content/portfolio";
import { ACT_IDS, actAnchorId, actForEntry, actForProject } from "@/lib/anchors";

describe("act anchors", () => {
  it("has seven acts, in story order", () => {
    expect(ACT_IDS).toEqual([
      "crossing",
      "high-school",
      "wrong-major",
      "the-switch",
      "research",
      "two-jobs",
      "retail-data",
    ]);
  });

  it("prefixes every anchor so an id can never collide with a section id", () => {
    for (const id of ACT_IDS) {
      expect(actAnchorId(id)).toBe(`act-${id}`);
    }
  });

  it("places every career entry in exactly one act", () => {
    // An entry with no act is an entry the stage never draws — it would
    // vanish from the page with nothing failing.
    for (const entry of careerEntries) {
      expect(actForEntry(entry.id), entry.id).toBeDefined();
    }
  });

  it("places every project in the act its career entry is in", () => {
    for (const project of projects) {
      expect(actForProject(project.id), project.id).toBe(
        actForEntry(project.careerEntryId)
      );
    }
  });

  it("returns undefined for an id that does not exist, rather than guessing", () => {
    expect(actForEntry("not-a-real-entry")).toBeUndefined();
    expect(actForProject("not-a-real-project")).toBeUndefined();
  });
});
