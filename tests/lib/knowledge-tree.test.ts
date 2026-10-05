import { describe, expect, it } from "vitest";
import {
  buildCareerTree,
  careerYearSpan,
  totalTechnologies,
} from "@/lib/knowledge-tree";
import { careerEntries, projects } from "@/content/portfolio";
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

const ROUND_18_ENTRIES = [
  "eastside-high",
  "fu-of-kyoto",
  "self-taught-gap",
  "usc-cheme",
  "cs-switch",
  "usc-honors-ta",
] as const;

describe("the entries round 18 adds", () => {
  it("adds all six", () => {
    for (const id of ROUND_18_ENTRIES) {
      expect(careerEntries.find((entry) => entry.id === id), id).toBeDefined();
    }
  });

  it("gives every one of them something authored to say", () => {
    // Finding 03 of the audit: nine of the fourteen existing entries have
    // empty `built`, empty `impact` and no `learned`, and exist only to be
    // counted. Adding a seventh of those would re-create the problem this
    // round is removing.
    for (const id of ROUND_18_ENTRIES) {
      const entry = careerEntries.find((candidate) => candidate.id === id);
      expect(entry, `${id} is missing`).toBeDefined();
      const authored =
        (entry?.impact.length ?? 0) + (entry?.built.length ?? 0) + (entry?.learned ? 1 : 0);
      expect(authored, `${id} has nothing authored on it`).toBeGreaterThan(0);
    }
  });

  it("starts the record in 2018, not 2021", () => {
    // The section is called Journey. Until this task it began at the degree.
    expect(careerYearSpan().firstYear).toBe(2018);
  });

  it("corrects the scraping start to August 2022", () => {
    // Portfolio-v2 is the source: "Undergraduate Research Assistant, from
    // August 2022". The site understated it by a year.
    const scraping = careerEntries.find((entry) => entry.id === "usc-scraping");
    expect(scraping?.sortKey).toBe("2022-08");
    expect(scraping?.dateRange).toBe("August 2022 — May 2025");
  });
});

describe("concurrency", () => {
  it("marks each branch with what it overlapped", () => {
    const tree = buildCareerTree();
    const schaeffler = tree.find((branch) => branch.id === "schaeffler");
    expect(schaeffler).toBeDefined();
    // The 2024 overlap this relation exists to say: the co-op, the second
    // role and the research ran at the same time.
    expect(schaeffler?.concurrentWith).toContain("wordification");
    expect(schaeffler?.concurrentWith).toContain("usc-scraping");
    // And never itself.
    expect(schaeffler?.concurrentWith).not.toContain("schaeffler");
  });

  it("marks an overlap that is easy to miss — he was at the restaurant all through high school", () => {
    const tree = buildCareerTree();
    const highSchool = tree.find((branch) => branch.id === "eastside-high");
    expect(highSchool).toBeDefined();
    expect(highSchool?.concurrentWith).toContain("fu-of-kyoto");
  });

  it("keeps milestones out of the overlap relation, in both directions", () => {
    const milestoneIds = new Set(
      ENTRIES.filter((entry) => entry.type === "milestone").map((entry) => entry.id),
    );
    for (const branch of buildCareerTree()) {
      if (milestoneIds.has(branch.id)) expect(branch.concurrentWith).toEqual([]);
      for (const other of branch.concurrentWith) {
        expect(milestoneIds.has(other), `${branch.id} lists milestone ${other}`).toBe(false);
      }
    }
  });

  it("is symmetric: if A overlapped B then B overlapped A", () => {
    const tree = buildCareerTree();
    for (const branch of tree) {
      for (const other of branch.concurrentWith) {
        const back = tree.find((candidate) => candidate.id === other);
        expect(back?.concurrentWith, `${other} does not list ${branch.id}`).toContain(branch.id);
      }
    }
  });

  it("does not make a role that ended before another began overlap it", () => {
    // Schaeffler ended August 2024; DoorDash began October 2025.
    const tree = buildCareerTree();
    const doordash = tree.find((branch) => branch.id === "doordash");
    const schaeffler = tree.find((branch) => branch.id === "schaeffler");
    expect(doordash?.concurrentWith).not.toContain("schaeffler");
    expect(schaeffler?.concurrentWith).not.toContain("doordash");
  });

  it("lets an entry with no end overlap everything that began after it", () => {
    // He did not stop teaching himself things ("It carried on — I still do
    // some of it"), so the self-taught entry is open-ended and runs alongside
    // everything since 2019, DoorDash included. That is the true reading,
    // not a spurious one.
    const tree = buildCareerTree();
    const selfTaught = tree.find((branch) => branch.id === "self-taught-gap");
    expect(selfTaught).toBeDefined();
    expect(selfTaught?.concurrentWith).toContain("doordash");
    expect(selfTaught?.concurrentWith).toContain("schaeffler");
  });
});

describe("endSortKey", () => {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // `endSortKey` restates the end of `dateRange` in machine-readable form. It
  // is the one deliberate duplication in the content layer, so this is what
  // stops the two drifting apart. An entry that lacks one is treated as still
  // running — a silent failure on a role that actually ended.
  const spans = ENTRIES.filter((entry) => entry.type !== "milestone");

  it("is absent exactly where the dateRange says the role is still running", () => {
    for (const entry of spans) {
      const running = /—\s*Present$/.test(entry.dateRange);
      expect(entry.endSortKey === undefined, `${entry.id}: ${entry.dateRange}`).toBe(running);
    }
  });

  it("is a YYYY-MM key that never precedes the start", () => {
    for (const entry of spans) {
      if (entry.endSortKey === undefined) continue;
      expect(entry.endSortKey, entry.id).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(entry.endSortKey >= entry.sortKey.slice(0, 7), `${entry.id} ends before it starts`).toBe(true);
    }
  });

  it("agrees with the end of dateRange wherever dateRange states one", () => {
    for (const entry of spans) {
      if (entry.endSortKey === undefined) continue;
      const end = entry.dateRange.split("—").pop()?.trim() ?? "";
      const year = /(\d{4})$/.exec(end)?.[1];
      expect(year, `${entry.id}: no end year in "${entry.dateRange}"`).toBeDefined();
      expect(entry.endSortKey.slice(0, 4), entry.id).toBe(year);
      const month = MONTHS.findIndex((name) => end.startsWith(name));
      // "August 2024" names a month and must match it. A bare "2021" does not,
      // so only the year is checked there.
      if (month >= 0) {
        expect(entry.endSortKey.slice(5), entry.id).toBe(String(month + 1).padStart(2, "0"));
      }
    }
  });
});
