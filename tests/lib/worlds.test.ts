import { describe, expect, it } from "vitest";
import {
  careerEntries,
  companions,
  aiTools,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds } from "@/content/worlds";
import { DECORATION_LABEL, crossingKm, resolveWorlds } from "@/lib/worlds";
import { buildCareerTree, stillGrowingCaption, totalLeaves, totalTechnologies } from "@/lib/knowledge-tree";
import { seasonsFor } from "@/lib/origin-story";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { isNeedsInput } from "@/types/portfolio";

/**
 * Every string the content layer can hand a plaque. The honesty rule is that
 * a plaque's text is a *member of this set* — not similar to one, not derived
 * from one, a member. Assembled here rather than imported so the test is an
 * independent statement of the rule rather than a restatement of the
 * resolver's own code.
 */
const AUTHORED = new Set<string>();
for (const entry of careerEntries) {
  AUTHORED.add(entry.role);
  if (!isNeedsInput(entry.context)) AUTHORED.add(entry.context);
  if (entry.learned && !isNeedsInput(entry.learned)) AUTHORED.add(entry.learned);
  for (const line of entry.impact) AUTHORED.add(line);
  for (const line of entry.built) AUTHORED.add(line);
}
for (const project of projects) {
  AUTHORED.add(project.tagline);
  AUTHORED.add(project.learned);
  AUTHORED.add(project.nextQuestion);
}
// Just the name: the companion plaque's `text` is `cat.name` alone (`coat`
// and `habit` ride in `attribution` instead), so this stays a genuinely
// independent check rather than seeding AUTHORED with the same composition
// the resolver builds.
for (const cat of companions) AUTHORED.add(cat.name);

/** What a `computed` plaque is allowed to say, recomputed here from the same
 *  functions the resolver calls. */
const COMPUTED = new Set<string>([
  `${buildCareerTree().length} branches · ${totalLeaves(buildCareerTree())} authored leaves · ${totalTechnologies()} distinct technologies`,
  stillGrowingCaption(),
  `${origin.from} → ${origin.to} · ${origin.arrived}`,
  `${seasonsFor().length} seasons since ${origin.arrived}`,
  `${SCENE_NAMES.length} scenes: ${SCENE_NAMES.join(" · ")}`,
  aiTools.map((tool) => tool.name).join(" · "),
]);

const resolved = resolveWorlds();

describe("the seven worlds", () => {
  it("are seven, in the spec's order", () => {
    expect(resolved.map((world) => world.id)).toEqual([
      "vietnam",
      "usa",
      "sea",
      "sky",
      "plants",
      "animals",
      "tech",
    ]);
  });

  it("puts the two authored pins where origin says, and derives the rest", () => {
    const byId = new Map(resolved.map((world) => [world.id, world]));
    expect(byId.get("vietnam")?.point).toEqual(origin.coordinates.from);
    expect(byId.get("usa")?.point).toEqual(origin.coordinates.to);
    // Sea and Sky are derived from the arc, so they must not equal either pin.
    expect(byId.get("sea")?.point).not.toEqual(origin.coordinates.from);
    expect(byId.get("sky")?.point).not.toEqual(origin.coordinates.to);
    // Animals lives on the plinth and Technology in orbit: neither is on the
    // map, and both say so by having no point at all.
    expect(byId.get("animals")?.point).toBeNull();
    expect(byId.get("tech")?.point).toBeNull();
    expect(byId.get("tech")?.orbits).toBe(true);
  });
});

describe("resolution keeps everything it should", () => {
  // The resolver's designed failure mode is silent dropping — a broken
  // `careerEntryById`, a renamed content id — and the honesty-rule tests
  // below only ever iterate the plaques that *did* survive. A field-path
  // failure that drops every field plaque would leave those tests green on
  // an empty set. These two pin the actual numbers, so that failure mode
  // shows up here instead of on the page.
  it("resolves the exact plaque and decoration count for every world", () => {
    expect(
      resolved.map((world) => [world.id, world.plaques.length, world.decorations.length]),
    ).toEqual([
      ["vietnam", 1, 1],
      ["usa", 5, 0],
      ["sea", 3, 1],
      ["sky", 2, 1],
      ["plants", 2, 0],
      ["animals", 3, 0],
      ["tech", 3, 0],
    ]);
  });

  it("resolves both field and computed plaques, not just whichever kind survives if the other path breaks", () => {
    const counts = { field: 0, computed: 0 };
    for (const world of resolved) {
      for (const plaque of world.plaques) counts[plaque.kind] += 1;
    }
    expect(counts).toEqual({ field: 12, computed: 7 });
  });
});

describe("the honesty rule", () => {
  it("renders every field plaque verbatim from the content layer", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (plaque.kind !== "field") continue;
        expect(
          AUTHORED.has(plaque.text),
          `${world.id}: "${plaque.text}" is not a string the content layer can produce`,
        ).toBe(true);
      }
    }
  });

  it("renders every computed plaque from a named computation, not from prose", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (plaque.kind !== "computed") continue;
        expect(
          COMPUTED.has(plaque.text),
          `${world.id}: "${plaque.text}" is not what its computation returns`,
        ).toBe(true);
      }
    }
  });

  it("gives every plaque a source naming where it came from", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(plaque.source.trim()).not.toBe("");
      }
    }
  });

  it("labels every decoration as carrying no fact", () => {
    for (const world of resolved) {
      for (const decoration of world.decorations) {
        expect(decoration.label).toContain(DECORATION_LABEL);
      }
    }
  });

  it("never lets a world's own prose become a plaque", () => {
    // `where` and `disclosure` are the one place worlds.ts authors prose, and
    // it is prose *about the drawing* ("country centroid, because no city is
    // authored"), never a fact about him. A plaque that quoted one would be
    // the site inventing a claim about its subject, which is the exact failure
    // the whole schema exists to prevent.
    const panelProse = new Set(
      resolved.flatMap((world) => [world.where, world.disclosure ?? ""]).filter(Boolean),
    );
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(panelProse.has(plaque.text)).toBe(false);
      }
    }
  });

  it("never surfaces a [NEEDS INPUT] marker", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        expect(plaque.text).not.toContain("[NEEDS INPUT");
        expect(plaque.attribution ?? "").not.toContain("[NEEDS INPUT");
      }
    }
  });

  it("never renders the string 'undefined'", () => {
    const everything = JSON.stringify(resolved);
    expect(everything).not.toContain("undefined");
  });
});

describe("references that resolve to nothing are dropped, not rendered", () => {
  it("drops a plaque whose record id does not exist", () => {
    const dropped = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "cap", ref: { of: "careerEntry", id: "no-such-entry", field: "role" } },
          ...worlds[0].plaques,
        ],
      },
    ]);
    expect(dropped[0].plaques).toHaveLength(worlds[0].plaques.length);
  });

  it("drops a plaque whose list index is past the end", () => {
    const dropped = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "chalk", ref: { of: "careerEntryLine", id: "usc-ta", field: "impact", index: 99 } },
        ],
      },
    ]);
    expect(dropped[0].plaques).toHaveLength(0);
  });

  it("drops a plaque whose field is simply not authored", () => {
    // `careerEntries.graduation` authors no `learned` — it is `undefined`, the
    // same branch a `[NEEDS INPUT: …]` marker takes after `resolved()` unwraps
    // it. No field in `src/content/portfolio.ts` currently holds a marker, so
    // this is the reachable half of that behaviour; the invariant for the other
    // half is asserted over every real plaque above.
    const absent = resolveWorlds([
      {
        ...worlds[0],
        plaques: [
          { glyph: "book", ref: { of: "careerEntry", id: "graduation", field: "learned" } },
        ],
      },
    ]);
    expect(absent[0].plaques).toHaveLength(0);
  });

  it("drops a plaque whose companion id does not exist", () => {
    const animals = worlds.find((world) => world.id === "animals");
    if (!animals) throw new Error("the Animals world left the content layer");
    const dropped = resolveWorlds([
      { ...animals, plaques: [{ glyph: "cat", ref: { of: "companion", id: "not-a-cat" } }] },
    ]);
    expect(dropped[0].plaques).toHaveLength(0);
  });
});

describe("crossingKm", () => {
  it("computes the crossing from the two pins rather than carrying a number", () => {
    expect(crossingKm()).toBeGreaterThan(12_000);
    expect(crossingKm()).toBeLessThan(15_000);
  });
});
