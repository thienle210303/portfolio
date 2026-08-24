import { describe, expect, it } from "vitest";
import {
  buildCareerTree,
  buildKnowledgeTree,
  careerYearSpan,
  techSlug,
  totalTechnologies,
} from "@/lib/knowledge-tree";
import { careerEntries, projects, resumeLenses } from "@/content/portfolio";
import type { CareerEntry } from "@/types/portfolio";

// Widened for the same reason knowledge-tree.ts widens it — see the note there.
const ENTRIES: readonly CareerEntry[] = careerEntries;

/**
 * The tree's contract is that every edge it draws was authored by a human in
 * the content layer. These tests exist to keep it that way: the temptation to
 * "improve coverage" by fuzzy-matching skill names against technology strings
 * would invent relationships nobody stated, and this file is what fails when
 * someone tries.
 *
 * Round 12 inverts the model `buildCareerTree` draws from — see the file
 * banner in `src/lib/knowledge-tree.ts` — so this file is rewritten to it: a
 * branch is now one career entry (in chronological order, oldest first), and
 * a leaf is one authored technology or impact line off that entry. The
 * anti-inference assertions carry over unchanged in *kind*, just retargeted:
 * a leaf must still exist only where its own entry authored it, and nothing
 * here may still join skill names against technology strings.
 *
 * `buildKnowledgeTree` — the pre-round-12 shape, kept only for
 * `HeroAbout.tsx` — gets its own smaller describe block further down: the
 * anti-inference guarantee has to hold for it too, since it is still built
 * from the same authored `entry.lenses` edge, but it is no longer what the
 * tree itself renders from, so it does not need the same depth of coverage.
 */
describe("buildCareerTree", () => {
  const tree = buildCareerTree();

  it("draws exactly one branch per career entry, no more, no fewer", () => {
    expect(tree.map((branch) => branch.id).sort()).toEqual(
      ENTRIES.map((entry) => entry.id).sort(),
    );
  });

  it("orders branches chronologically, oldest first — up the trunk, oldest lowest", () => {
    const keys = tree.map(
      (branch) => ENTRIES.find((entry) => entry.id === branch.id)?.sortKey ?? "",
    );
    expect([...keys].sort()).toEqual(keys);
  });

  it("draws only the technology leaves the branch's own entry lists", () => {
    for (const branch of tree) {
      const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
      expect(entry, `branch ${branch.id} has no career entry`).toBeDefined();
      for (const leaf of branch.leaves.filter((l) => l.kind === "technology")) {
        expect(
          entry?.technologies.includes(leaf.text),
          `"${leaf.text}" is drawn as a technology leaf under ${branch.id} but that entry does not list it`,
        ).toBe(true);
      }
    }
  });

  it("draws only the impact leaves the branch's own entry lists", () => {
    for (const branch of tree) {
      const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
      for (const leaf of branch.leaves.filter((l) => l.kind === "impact")) {
        expect(
          entry?.impact.includes(leaf.text),
          `"${leaf.text}" is drawn as an impact leaf under ${branch.id} but that entry does not list it`,
        ).toBe(true);
      }
    }
  });

  it("draws every technology and every impact line the entry actually authored", () => {
    // The other half of the two tests above: not just "nothing extra", but
    // "nothing missing" — a leaf must exist for every authored fact, or the
    // tree would be quietly dropping content it has no reason to drop.
    for (const branch of tree) {
      const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
      expect(entry).toBeDefined();
      const drawnTech = new Set(
        branch.leaves.filter((l) => l.kind === "technology").map((l) => l.text),
      );
      const drawnImpact = new Set(
        branch.leaves.filter((l) => l.kind === "impact").map((l) => l.text),
      );
      expect(drawnTech).toEqual(new Set(entry?.technologies));
      expect(drawnImpact).toEqual(new Set(entry?.impact));
    }
  });

  it("never joins a skill name to a technology string — a technology used nowhere draws no leaf", () => {
    // The anti-inference guarantee, made concrete: every technology text that
    // appears anywhere on the tree traces back to at least one entry that
    // actually lists it. There is no fuzzy-matched leaf floating free of the
    // content layer.
    const drawnTechnologies = new Set(
      tree.flatMap((branch) =>
        branch.leaves.filter((l) => l.kind === "technology").map((l) => l.text),
      ),
    );
    for (const name of drawnTechnologies) {
      const homes = ENTRIES.filter((entry) => entry.technologies.includes(name)).length;
      expect(homes, `"${name}" is drawn but no entry lists it`).toBeGreaterThan(0);
    }
  });

  it("impact leaves carry no alsoUsedIn — they are one entry's own prose, not a fact to count matches of", () => {
    for (const branch of tree) {
      for (const leaf of branch.leaves.filter((l) => l.kind === "impact")) {
        expect(leaf.alsoUsedIn).toBeUndefined();
      }
    }
  });

  it("counts a technology's other homes without counting its own", () => {
    for (const branch of tree) {
      for (const leaf of branch.leaves.filter((l) => l.kind === "technology")) {
        const homes = ENTRIES.filter((entry) => entry.technologies.includes(leaf.text)).length;
        expect(leaf.alsoUsedIn).toBe(homes - 1);
        expect(leaf.alsoUsedIn).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("de-duplicates leaves within a branch", () => {
    for (const branch of tree) {
      const keys = branch.leaves.map((leaf) => `${leaf.kind}|${leaf.text}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("attaches case studies to the entry they were built in, completely and correctly", () => {
    for (const branch of tree) {
      const expected = projects.filter((project) => project.careerEntryId === branch.id);

      // Same set, not just "some real titles": a branch must carry every
      // case study built in that role, and no others.
      expect(branch.caseStudies.map((cs) => cs.id).sort()).toEqual(
        expected.map((project) => project.id).sort(),
      );

      for (const caseStudy of branch.caseStudies) {
        const project = expected.find((p) => p.id === caseStudy.id);
        expect(project, `case study id "${caseStudy.id}" resolves to a real project`).toBeDefined();
        expect(caseStudy.title).toBe(project?.title);
      }
    }
  });

  it("reports each branch's startYear honestly against its dateRange", () => {
    for (const branch of tree) {
      const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
      expect(entry).toBeDefined();
      // startYear is read off sortKey, not scraped from dateRange prose —
      // but the two must still agree: sortKey is YYYY-MM[-x] and dateRange
      // always names that same year somewhere in its opening date ("October
      // 2025 — Present", "2024 — 2025", "May 2025").
      expect(branch.startYear).toBe(Number(entry?.sortKey.slice(0, 4)));
      expect(branch.dateRange.includes(String(branch.startYear))).toBe(true);
    }
  });

  it("reports a technology total that matches the content layer", () => {
    const expected = new Set(ENTRIES.flatMap((entry) => entry.technologies)).size;
    expect(totalTechnologies()).toBe(expected);
  });

  it("is worth rendering at all", () => {
    // Guards against a refactor that quietly empties it.
    expect(tree.length).toBeGreaterThanOrEqual(3);
    expect(tree.some((branch) => branch.leaves.length >= 3)).toBe(true);
    expect(totalTechnologies()).toBeGreaterThan(10);
  });
});

describe("careerYearSpan", () => {
  it("spans every career entry's years, inclusively — round 12: every entry is now a branch", () => {
    const years = ENTRIES.map((entry) => Number(entry.sortKey.slice(0, 4)));
    const expectedFirst = Math.min(...years);
    const expectedLast = Math.max(...years);

    const span = careerYearSpan();
    expect(span.firstYear).toBe(expectedFirst);
    expect(span.lastYear).toBe(expectedLast);
    // Inclusive: the first year itself counts as one year, not zero.
    expect(span.years).toBe(expectedLast - expectedFirst + 1);
    expect(span.years).toBeGreaterThan(0);
  });
});

describe("techSlug", () => {
  it("is lower-case, alphanumeric-and-hyphen only, with no leading or trailing hyphen", () => {
    const names = new Set(ENTRIES.flatMap((entry) => entry.technologies));
    for (const name of names) {
      const slug = techSlug(name);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("is unique across every technology actually listed in the content layer", () => {
    const names = [...new Set(ENTRIES.flatMap((entry) => entry.technologies))];
    const slugs = names.map(techSlug);
    expect(new Set(slugs).size).toBe(names.length);
  });

  it("is stable for the same input", () => {
    expect(techSlug("JavaScript/React")).toBe(techSlug("JavaScript/React"));
  });
});

/**
 * `buildKnowledgeTree` — the pre-round-12, lens-grouped shape. Nothing in
 * `src/sections/CareerTree` reads this any more (see `buildCareerTree`
 * above); it survives only because `src/sections/Hero/HeroAbout.tsx` (a
 * different work package this round) still calls it for its "Where it shows
 * up" list. The anti-inference guarantee still has to hold for it — it is
 * still built from the authored `entry.lenses` edge, and a fuzzy join here
 * would be exactly the mistake the rest of this file refuses — so it keeps a
 * light version of the same coverage the old, pre-inversion suite held in
 * full, rather than none at all.
 */
describe("buildKnowledgeTree (legacy — HeroAbout.tsx only)", () => {
  const roots = buildKnowledgeTree();

  it("draws only branches the content layer actually tags with that lens", () => {
    for (const root of roots) {
      for (const branch of root.branches) {
        const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
        expect(entry, `branch ${branch.id} has no career entry`).toBeDefined();
        expect(
          entry?.lenses.includes(root.id),
          `${branch.id} appears under "${root.id}" but is not tagged with it`,
        ).toBe(true);
      }
    }
  });

  it("never renders an empty root", () => {
    for (const root of roots) {
      expect(root.branches.length, `"${root.label}" has no branches`).toBeGreaterThan(0);
    }
  });

  it("covers every lens that has anything tagged to it", () => {
    const tagged = resumeLenses.filter((lens) =>
      ENTRIES.some((entry) => entry.lenses.includes(lens.id)),
    );
    expect(roots.map((root) => root.id).sort()).toEqual(tagged.map((lens) => lens.id).sort());
  });

  it("is worth HeroAbout rendering at all", () => {
    expect(roots.length).toBeGreaterThan(0);
    expect(roots.every((root) => root.branches.length > 0)).toBe(true);
  });
});
