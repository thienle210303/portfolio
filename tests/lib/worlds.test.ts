import { describe, expect, it } from "vitest";
import {
  careerEntries,
  companions,
  aiTools,
  navItems,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds } from "@/content/worlds";
import { DECORATION_LABEL, coLocatedWorldIds, crossingKm, resolveWorlds } from "@/lib/worlds";
import { buildCareerTree, stillGrowingCaption, totalLeaves, totalTechnologies } from "@/lib/knowledge-tree";
import { ACT_IDS, actAnchorId } from "@/lib/anchors";
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
    // it is prose *about the drawing* ("the arrival pin, the first place he
    // lived here"), never a fact about him. A plaque that quoted one would be
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

  it("says whose cats they are", () => {
    // The site implied they were his. They are his girlfriend's, and a
    // portfolio that gets a fact about two cats wrong has no standing to
    // claim every plaque quotes a real field.
    for (const cat of companions) {
      expect(cat.belongsTo).toBe("my girlfriend");
    }
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

describe("co-located markers", () => {
  /** The shape `coLocatedWorldIds` actually reads — an id and a point, nothing
   *  else, which is why it takes a `Pick` rather than a whole `ResolvedWorld`. */
  const at = (id: string, lat: number | null, lon = 0) => ({
    id,
    point: lat === null ? null : { lat, lon },
  });

  it("flags nothing when every world has the map to itself", () => {
    expect([...coLocatedWorldIds([at("a", 1), at("b", 2), at("c", 3)])]).toEqual([]);
  });

  it("flags the second of two worlds on one point, and not the first", () => {
    // The first claim keeps the point. Which one that is comes from
    // `src/content/worlds.ts`'s order, so this asymmetry is the whole contract.
    expect([...coLocatedWorldIds([at("first", 10, 20), at("second", 10, 20)])]).toEqual(["second"]);
  });

  it("flags every later world when three share a point", () => {
    const ids = coLocatedWorldIds([at("a", 5, 5), at("b", 5, 5), at("c", 5, 5)]);
    expect([...ids]).toEqual(["b", "c"]);
  });

  it("is order-dependent, so reversing the list moves the flag", () => {
    expect([...coLocatedWorldIds([at("x", 1, 1), at("y", 1, 1)])]).toEqual(["y"]);
    expect([...coLocatedWorldIds([at("y", 1, 1), at("x", 1, 1)])]).toEqual(["x"]);
  });

  it("ignores the worlds that are not on the map at all", () => {
    // `plinth` and `orbit` resolve to `null`, and any number of them share
    // that. Treating null as a claimable point would flag the second one and
    // send the satellite sideways for no reason.
    expect([...coLocatedWorldIds([at("plinth", null), at("orbit", null), at("real", 3, 3)])]).toEqual(
      [],
    );
  });

  it("does not pair two distinct places that merely sit close together", () => {
    // Guards the choice of exact comparison over projected proximity. A tenth
    // of a degree apart is a few kilometres — near the limb those two project
    // within a pixel of each other, and displacing one of them there would be
    // a marker drawn away from a point it is the only claimant of.
    expect([...coLocatedWorldIds([at("a", 39.83, -98.58), at("b", 39.93, -98.58)])]).toEqual([]);
  });

  it("flags Plants and only Plants in the real content", () => {
    // The regression this whole rule exists for: `usa` and `plants` both anchor
    // `origin-to`, so the globe drew two markers at one x/y — the sprout hid
    // the star, "UNITED STATES" and "PLANTS" composited on one baseline, and
    // because the canvas scans its hit list backwards and stops at the first
    // match, `usa` could not be opened from the globe at all.
    //
    // If this fails because the set is now empty, the content layer has given
    // Plants its own anchor and the displacement in `GlobeCanvas.tsx` is dead
    // code. If it fails with an extra id, a new world has landed on an occupied
    // pin and wants checking by eye at that pin in both themes.
    expect([...coLocatedWorldIds(resolved)]).toEqual(["plants"]);
  });

  it("leaves every on-globe world a point of its own once the flagged ones step aside", () => {
    // States the outcome rather than the mechanism: after the flagged ids are
    // removed, no two worlds left on the ball share coordinates. That is the
    // property the drawing depends on, and it holds for any content whose
    // co-locations the rule has caught.
    const flagged = coLocatedWorldIds(resolved);
    const keys = resolved
      .filter((world) => world.point && !flagged.has(world.id))
      .map((world) => `${world.point?.lat},${world.point?.lon}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("agrees with the anchors the content layer authored", () => {
    // Independent of the resolver: read the two anchors straight from the
    // content and assert they are the same `origin-to`. This is the *cause*,
    // where the test above is the symptom.
    const anchorOf = (id: string) => worlds.find((world) => world.id === id)?.anchor.at;
    expect(anchorOf("usa")).toBe("origin-to");
    expect(anchorOf("plants")).toBe("origin-to");
  });
});

describe("plaque links", () => {
  /**
   * Every id the content layer DECLARES as a link target — the seven acts,
   * plus the section ids.
   *
   * Read the name precisely: these are *declared*, not *rendered*. This test
   * is deliberately one link in a two-link chain, and on its own it proves
   * only that a plaque's target is a declared id rather than a hand-typed
   * string that drifted. The other link — that every declared act id is an id
   * something actually puts in the DOM — is asserted by
   * `tests/ui/Stage.test.tsx` (added by the stage task), which renders the
   * stage and requires `document.getElementById(actAnchorId(act.id))` to be
   * non-null for all seven acts.
   *
   * The section ids are only declared too: nothing here proves `#work` or
   * `#skills` exist in the DOM, and `navItems` is itself due to shrink in a
   * later task.
   *
   * Both halves are needed and neither is sufficient. This one cannot catch a
   * declared act that nothing renders, because `ACT_IDS` is also where the
   * link is built from; that one cannot catch a plaque pointing at a string
   * outside `ACT_IDS` altogether.
   */
  const DECLARED_IDS = new Set<string>([
    ...ACT_IDS.map(actAnchorId),
    ...navItems.map((item) => item.sectionId),
  ]);

  it("points every link at a declared id, never a hand-typed string", () => {
    // A plaque linking to a dead anchor is the quietest possible failure:
    // the visitor clicks, nothing happens, and no test, type or build
    // complains. Round 18 deletes the section every project link pointed at,
    // which is exactly when this needs to be loud.
    let linked = 0;
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (!plaque.link) continue;
        linked += 1;
        expect(plaque.link.startsWith("#"), `${world.id}: ${plaque.link}`).toBe(true);
        expect(DECLARED_IDS, `${world.id}: ${plaque.link}`).toContain(
          plaque.link.slice(1)
        );
      }
    }
    // Without this the loop above passes having asserted nothing if every
    // link is silently dropped. Not a count: the plaque set grows with content.
    expect(linked, "no plaque carries a link; the loop above checked nothing").toBeGreaterThan(0);
  });

  it("gives every project plaque a link", () => {
    // `resolveWorlds` omits the link when a project has no act, which would
    // turn "links into nothing" into "links nowhere" — invisible to the test
    // above. A project plaque is one whose source names `projects.<id>`.
    const projectPlaques = resolved.flatMap((world) =>
      world.plaques
        .filter((plaque) => plaque.source.startsWith("projects."))
        .map((plaque) => ({ worldId: world.id, plaque }))
    );
    expect(projectPlaques.length, "no project plaque to check").toBeGreaterThan(0);
    for (const { worldId, plaque } of projectPlaques) {
      expect(plaque.link, `${worldId}: ${plaque.source} has no link`).toBeTruthy();
    }
  });
});
