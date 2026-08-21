import { describe, expect, it } from "vitest";
import {
  fieldNote,
  NOTE_MAX_CHARS,
  NOTE_ODDS,
  nextNoteAt,
  NOTE_FIRST_DELAY_MS,
  NOTE_GAP_MS,
  NOTE_GAP_SPREAD_MS,
} from "@/components/companion/companion-notes";
import type { CompanionFacts } from "@/lib/companion-facts";

/** A fixture with distinctive, easy-to-spot-in-a-string numbers, so a test
 *  that finds "7" and "13" in a note knows exactly which fields it came from
 *  rather than coincidentally matching a shared value. */
const FACTS: CompanionFacts = {
  about: { role: "Staff Engineer", organization: "Acme" },
  philosophy: { principles: 7 },
  work: { caseStudies: 5, sourcedMetrics: 13 },
  journey: { entries: 21, work: 9, learning: 8, milestones: 4 },
  skills: { categories: 6, distinctSkills: 33 },
  tree: { branches: 4, leaves: 25, technologies: 33 },
  lab: { experiments: 11, verified: 6 },
  contact: { email: "hi@example.com" },
};

const SECTIONS_WITH_A_LINE = ["about", "philosophy", "work", "journey", "skills", "tree", "lab"];

describe("fieldNote", () => {
  it("says nothing for a null section", () => {
    expect(fieldNote(null, FACTS, 0)).toBeNull();
  });

  it("says nothing for a section it has no line for", () => {
    expect(fieldNote("contact", FACTS, 0)).toBeNull();
    expect(fieldNote("nonexistent", FACTS, 0)).toBeNull();
  });

  it("respects the odds — a roll at or above NOTE_ODDS says nothing", () => {
    expect(fieldNote("work", FACTS, NOTE_ODDS)).toBeNull();
    expect(fieldNote("work", FACTS, 0.999)).toBeNull();
  });

  it("is deterministic: the same section, facts and roll always produce the same line", () => {
    for (const section of SECTIONS_WITH_A_LINE) {
      const a = fieldNote(section, FACTS, 0);
      const b = fieldNote(section, FACTS, 0);
      expect(a).toBe(b);
    }
  });

  it("never exceeds the character budget", () => {
    for (const section of SECTIONS_WITH_A_LINE) {
      const line = fieldNote(section, FACTS, 0);
      expect(line).not.toBeNull();
      expect(line!.length).toBeLessThanOrEqual(NOTE_MAX_CHARS);
    }
  });

  it("quotes numbers from CompanionFacts, never a hardcoded figure", () => {
    expect(fieldNote("work", FACTS, 0)).toContain(String(FACTS.work.caseStudies));
    expect(fieldNote("work", FACTS, 0)).toContain(String(FACTS.work.sourcedMetrics));
    expect(fieldNote("skills", FACTS, 0)).toContain(String(FACTS.skills.categories));
    expect(fieldNote("skills", FACTS, 0)).toContain(String(FACTS.skills.distinctSkills));
    expect(fieldNote("tree", FACTS, 0)).toContain(String(FACTS.tree.branches));
    expect(fieldNote("tree", FACTS, 0)).toContain(String(FACTS.tree.leaves));
    expect(fieldNote("lab", FACTS, 0)).toContain(String(FACTS.lab.experiments));
    expect(fieldNote("lab", FACTS, 0)).toContain(String(FACTS.lab.verified));
    expect(fieldNote("journey", FACTS, 0)).toContain(String(FACTS.journey.entries));
  });

  it("changes when the facts change, for a fixed section and roll", () => {
    const other: CompanionFacts = {
      ...FACTS,
      work: { caseStudies: 99, sourcedMetrics: 2 },
    };
    expect(fieldNote("work", FACTS, 0)).not.toBe(fieldNote("work", other, 0));
  });
});

describe("nextNoteAt", () => {
  it("the first note of a visit arrives after NOTE_FIRST_DELAY_MS", () => {
    expect(nextNoteAt(1000, true)).toBe(1000 + NOTE_FIRST_DELAY_MS);
  });

  it("later notes arrive within [NOTE_GAP_MS, NOTE_GAP_MS + NOTE_GAP_SPREAD_MS]", () => {
    for (let i = 0; i < 20; i += 1) {
      const at = nextNoteAt(1000, false);
      expect(at).toBeGreaterThanOrEqual(1000 + NOTE_GAP_MS);
      expect(at).toBeLessThanOrEqual(1000 + NOTE_GAP_MS + NOTE_GAP_SPREAD_MS);
    }
  });
});
