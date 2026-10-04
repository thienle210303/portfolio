import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatIsoDate, isEntirelyNeedsInput, stripNeedsInput, withCaseStudyReferral } from "@/lib/content";
import { careerEntries, codeTabs, contactIntents, projects, profile, origin, navItems, skillCategories } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";

describe("formatIsoDate", () => {
  it("formats a valid ISO date as 'D Month YYYY'", () => {
    expect(formatIsoDate("2026-08-16")).toBe("16 August 2026");
  });

  it("formats single-digit-looking days/months correctly (zero-padded input, unpadded output)", () => {
    expect(formatIsoDate("2026-01-05")).toBe("5 January 2026");
  });

  it("formats December correctly (last index in the month table)", () => {
    expect(formatIsoDate("2025-12-25")).toBe("25 December 2025");
  });

  describe("malformed input is returned unchanged, never throws", () => {
    const malformedInputs = [
      "",
      "not-a-date",
      "2026/08/16",
      "16-08-2026",
      "2026-8-16",
      "2026-08-1",
      "2026-08-16T00:00:00Z",
      "2026-08-16 ",
      " 2026-08-16",
      "20260816",
      "2026-00-16", // month 00 -> MONTHS[-1] is undefined
      "2026-13-16", // month 13 -> MONTHS[12] is undefined (array has 12 entries)
      "abcd-ef-gh",
    ];

    for (const input of malformedInputs) {
      it(`returns ${JSON.stringify(input)} unchanged`, () => {
        expect(() => formatIsoDate(input)).not.toThrow();
        expect(formatIsoDate(input)).toBe(input);
      });
    }
  });

  describe("calendar validation: the day is checked against the real length of its month", () => {
    // A plausible-looking wrong date (e.g. "0 August 2026") is worse than
    // echoing the raw ISO string, because it reads as correct and slips past
    // review. The day is checked against the actual month length -- including
    // the Feb 29 leap-year boundary -- not just the two-digit string shape.

    it("rejects day 00 (below the valid range) -- returns the input unchanged", () => {
      expect(formatIsoDate("2026-08-00")).toBe("2026-08-00");
    });

    it("rejects a day past the end of a 28-day February in a non-leap year", () => {
      expect(formatIsoDate("2026-02-30")).toBe("2026-02-30");
    });

    it("rejects Feb 29 in a non-leap year", () => {
      expect(formatIsoDate("2026-02-29")).toBe("2026-02-29"); // 2026 is not a leap year
    });

    it("accepts Feb 29 in a leap year", () => {
      expect(formatIsoDate("2024-02-29")).toBe("29 February 2024"); // 2024 is a leap year
    });

    it("accepts Feb 28 in a non-leap year (the real boundary, not merely 'close to 29')", () => {
      expect(formatIsoDate("2026-02-28")).toBe("28 February 2026");
    });

    it("rejects day 31 in a 30-day month", () => {
      expect(formatIsoDate("2026-04-31")).toBe("2026-04-31"); // April has 30 days
    });

    it("accepts the exact last valid day of a 30-day month", () => {
      expect(formatIsoDate("2026-04-30")).toBe("30 April 2026");
    });

    it("accepts the exact last valid day of a 31-day month", () => {
      expect(formatIsoDate("2026-01-31")).toBe("31 January 2026");
    });

    it("never throws on any day-zero or day-overflow input", () => {
      const dayValidationCases = [
        "2026-08-00",
        "2026-02-30",
        "2026-02-29",
        "2026-04-31",
        "2026-08-99",
      ];
      for (const input of dayValidationCases) {
        expect(() => formatIsoDate(input)).not.toThrow();
      }
    });
  });

  describe("determinism / locale- and timezone-independence", () => {
    // This is the test that matters most: formatIsoDate exists specifically
    // so date rendering never depends on the host's clock, timezone, or
    // locale (SPEC section 4 -- a `new Date()` in a component render is a
    // hydration bug). A common, realistic way this guarantee breaks is
    // swapping in `new Date(iso).toLocaleDateString(...)`, which is exactly
    // what both checks below are built to catch.
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
      vi.restoreAllMocks();
    });

    it("produces the identical string across widely different host timezones", () => {
      const timezones = [
        "UTC",
        "America/Los_Angeles", // UTC-7/8: a `new Date(iso)` + local getters bug shifts this a day earlier
        "Pacific/Kiritimati", // UTC+14: the most extreme positive offset that exists
        "Etc/GMT+12", // UTC-12: the most extreme negative offset that exists
        "Asia/Kolkata", // a non-whole-hour offset (UTC+5:30)
      ];

      const results = new Set<string>();
      for (const tz of timezones) {
        process.env.TZ = tz;
        results.add(formatIsoDate("2026-08-16"));
      }

      expect(results.size).toBe(1);
      expect([...results][0]).toBe("16 August 2026");
    });

    it("never calls a locale-sensitive Date/Intl formatting API", () => {
      // Proves independence directly rather than by sampling timezones: if
      // formatIsoDate touched either of these, the mock below makes the
      // call throw, and the assertion fails loudly instead of silently
      // depending on the runtime's default locale.
      const toLocaleDateStringSpy = vi
        .spyOn(Date.prototype, "toLocaleDateString")
        .mockImplementation(() => {
          throw new Error("formatIsoDate must not call Date.prototype.toLocaleDateString");
        });
      const intlSpy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
        throw new Error("formatIsoDate must not call Intl.DateTimeFormat");
      });

      expect(formatIsoDate("2026-08-16")).toBe("16 August 2026");

      expect(toLocaleDateStringSpy).not.toHaveBeenCalled();
      expect(intlSpy).not.toHaveBeenCalled();
    });

    it("is deterministic across repeated calls with the same input", () => {
      const results = new Set(Array.from({ length: 10 }, () => formatIsoDate("2026-08-16")));
      expect(results.size).toBe(1);
    });
  });
});

describe("stripNeedsInput", () => {
  it("removes a marker embedded mid-sentence and tidies the leftover spacing/punctuation", () => {
    const withMarker =
      "Delivered the project on time [NEEDS INPUT: exact date], ahead of schedule.";
    expect(stripNeedsInput(withMarker)).toBe("Delivered the project on time, ahead of schedule.");
  });

  it("collapses the double space left behind when a marker sat between two spaces", () => {
    const withMarker = "Worked at [NEEDS INPUT: company] in London.";
    expect(stripNeedsInput(withMarker)).toBe("Worked at in London.");
  });

  it("removes a whole-string marker down to an empty string", () => {
    expect(stripNeedsInput("[NEEDS INPUT: entire bio]")).toBe("");
  });

  it("removes a whole-string marker padded with whitespace down to an empty string", () => {
    expect(stripNeedsInput("   [NEEDS INPUT: entire bio]   ")).toBe("");
  });

  it("leaves ordinary prose with no marker completely untouched", () => {
    const prose = "This is a normal sentence with no markers, just punctuation!";
    expect(stripNeedsInput(prose)).toBe(prose);
  });

  it("removes multiple markers in the same string", () => {
    const withMarkers = "Built at [NEEDS INPUT: company] as a [NEEDS INPUT: role].";
    expect(stripNeedsInput(withMarkers)).toBe("Built at as a.");
  });

  it("never throws, including on strings with no closing bracket", () => {
    expect(() => stripNeedsInput("[NEEDS INPUT: unterminated")).not.toThrow();
  });
});

describe("isEntirelyNeedsInput", () => {
  it("is true for a bare marker", () => {
    expect(isEntirelyNeedsInput("[NEEDS INPUT: bio]")).toBe(true);
  });

  it("is true for a bare marker surrounded only by whitespace", () => {
    expect(isEntirelyNeedsInput("   [NEEDS INPUT: bio]   ")).toBe(true);
  });

  it("is false for prose that merely contains a marker", () => {
    expect(isEntirelyNeedsInput("Hello [NEEDS INPUT: name], welcome!")).toBe(false);
  });

  it("is false for ordinary prose with no marker at all", () => {
    expect(isEntirelyNeedsInput("Just prose.")).toBe(false);
  });

  it("is true for a plain empty string, even though it never contained a marker", () => {
    // isEntirelyNeedsInput is implemented as `stripNeedsInput(text).length
    // === 0`, so it actually answers "is there nothing left to show for this
    // field" rather than "did this field literally contain a marker" -- an
    // already-empty string satisfies that too. Documented here (rather than
    // asserted as a defect) because it matches the function's real purpose:
    // callers use this to decide whether to render the field at all, and an
    // empty string should not render either way.
    expect(isEntirelyNeedsInput("")).toBe(true);
  });
});

describe("the profile's own metadata row", () => {
  it("names a location and an availability, both resolved", () => {
    // Both were deliberately `undefined` through round 17, which made the
    // hero render no metadata row at all. Round 18 fills them, so the row
    // appears — and `resolved()` must give real strings, not markers.
    expect(resolved(profile.location)).toBe("Taylors, South Carolina");
    expect(resolved(profile.availability)).toBe(
      "Open to remote, and to relocation when it's worth it."
    );
  });

  it("names the same place the crossing lands in", () => {
    // One place, one spelling. If these ever disagree the site is carrying
    // two names for one town.
    expect(resolved(profile.location)).toBe(origin.to);
  });
});

describe("the content layer matches the September 2026 résumé", () => {
  const doordash = careerEntries.find((entry) => entry.id === "doordash")!;

  it("carries the figures the résumé carries, not rounded summaries of them", () => {
    const impact = doordash.impact.join("\n");
    // "99% runtime reduction" is true and useless: it hides that the real
    // number is seventeen hours to three minutes.
    expect(impact).toContain("17 hours to 3 minutes");
    expect(impact).toContain("654");
    expect(impact).toContain("1,529");
    expect(impact).toContain("$2.8M");
    expect(impact).toContain("40+");
  });

  it("knows the eight technologies it did not know", () => {
    for (const tech of [
      "Kotlin", "Scrapy", "Snowflake", "Databricks", "Zyte API", "gRPC", "Docker",
    ]) {
      expect(doordash.technologies, tech).toContain(tech);
    }
  });

  it("names the sites the research actually collected from", () => {
    const scraping = careerEntries.find((entry) => entry.id === "usc-scraping")!;
    const impact = scraping.impact.join("\n");
    expect(impact).toContain("3M+");
    expect(impact).toContain("Amazon");
    expect(impact).toContain("Kroger");
  });

  it("credits both halves of the speech pipeline", () => {
    const wordification = careerEntries.find((entry) => entry.id === "wordification")!;
    const text = [...wordification.built, ...wordification.impact].join("\n");
    expect(text).toContain("Google Cloud");
    expect(text).toContain("ElevenLabs");
  });

  it("does not let the case studies argue with the career entries", () => {
    // The two case studies once kept the pre-September figures after the
    // entries moved on, so the page said "99%" in one place and "17 hours to
    // 3 minutes" in another. The Technology globe quotes the tagline verbatim,
    // which is where a stale one would be most visible.
    //
    // So this is an agreement test, read off both sides rather than a list of
    // figures typed here: every figure a case study states in its tagline, its
    // proof lines or its metrics has to be a figure its own career entry's
    // `impact` states too. Change "1,529" in either place and the two stop
    // agreeing, which is the whole point. Each pair is looked up by
    // `careerEntryId`, so the test follows the link the page itself follows.
    for (const id of ["dd-scraper-platform", "usc-research-collection"]) {
      const study = projects.find((project) => project.id === id);
      if (!study) throw new Error(`${id}: a case study this test audits no longer exists`);
      const entry = careerEntries.find((candidate) => candidate.id === study.careerEntryId);
      if (!entry) throw new Error(`${id}: its career entry ${study.careerEntryId} no longer exists`);

      const claimed = figures([
        study.tagline,
        ...study.proof,
        ...(study.metrics ?? []).flatMap((metric) => [metric.before, metric.after]),
      ]);
      const backed = new Set(figures(entry.impact));
      expect(claimed.length, `${id} states no figures, so this proves nothing`).toBeGreaterThan(0);
      for (const figure of claimed) {
        expect(backed.has(figure), `${id} says ${figure}; ${entry.id}'s impact does not`).toBe(true);
      }

      // Provenance, which is a different claim from agreement: every metric
      // names the résumé revision the entry was brought up to.
      for (const metric of study.metrics ?? []) {
        expect(metric.source, `${id}: ${metric.label}`).toContain("September 2026 revision");
      }
    }
  });
});

/**
 * The figures a run of prose states, normalised so the same quantity written
 * two ways is one figure: "3M+" and "3,000,000+" are both `3000000+`, "$2.8M"
 * is `$2800000`, "3.9%" stays `3.9%`. The `$`, `%` and `+` are kept — "30"
 * and "30+" are different claims. Number *words* are read too, except "one",
 * which is nearly always idiom ("one-off", "one run") rather than a figure;
 * "zero" (the failure rate's after-value) and "eight" (the eight-stage
 * process) are figures here and must agree like any other.
 */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function figures(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const text of texts) {
    for (const match of text.matchAll(/(\$?)(\d+(?:,\d{3})*(?:\.\d+)?)(M\b)?(%?)(\+?)/g)) {
      const [, dollar, digits, million, percent, plus] = match;
      const value = Number(digits.replace(/,/g, "")) * (million ? 1_000_000 : 1);
      out.push(`${dollar}${Math.round(value * 1000) / 1000}${percent}${plus}`);
    }
    for (const match of text.toLowerCase().matchAll(/\b([a-z]+)\b/g)) {
      if (match[1] in NUMBER_WORDS) out.push(String(NUMBER_WORDS[match[1]]));
    }
  }
  return out;
}

describe("the projects round 18 recovers from Portfolio-v2", () => {
  it("adds all four", () => {
    for (const id of ["chess-minmax", "conscea", "degreeworks-rebuild", "toy-storefront"]) {
      expect(projects.find((project) => project.id === id), id).toBeDefined();
    }
  });

  it("keeps all four off the featured list", () => {
    // They are supporting evidence, not the headline work.
    for (const id of ["chess-minmax", "conscea", "degreeworks-rebuild", "toy-storefront"]) {
      expect(projects.find((project) => project.id === id)?.featured, id).toBe(false);
    }
  });

  it("attaches every project to a career entry that exists", () => {
    // A project pointing at a missing entry renders as an orphan: the tree
    // has no branch to hang it off, and nothing fails.
    for (const project of projects) {
      expect(
        careerEntries.some((entry) => entry.id === project.careerEntryId),
        `${project.id} -> ${project.careerEntryId}`
      ).toBe(true);
    }
  });

  it("never links an executable or an installer", () => {
    // Portfolio-v2 shipped chess.exe as a download. A portfolio does not
    // hand a visitor a binary. Case-insensitive, and the extension may be
    // followed by a query string or a fragment.
    const binary = /\.(exe|msi|dmg|pkg|apk|bat|cmd|scr|jar|dll|bin|zip|7z|rar|deb|rpm|appimage)(?:[?#]|$)/i;
    expect("https://example.test/a/chess.EXE#download").toMatch(binary);
    expect("https://github.com/thienle210303/Chess").not.toMatch(binary);
    for (const project of projects) {
      for (const href of [project.demo?.href, project.source?.href]) {
        expect(href ?? "").not.toMatch(binary);
      }
    }
  });
});

describe("the invented layer is gone", () => {
  it("no longer exports the copy nothing sourced", async () => {
    const content = await import("@/content/portfolio");
    for (const name of ["philosophyIntro", "principles", "problemSolvingLoop"]) {
      expect(name in content, `${name} still exported`).toBe(false);
    }
  });

  it("opens on the crossing, not on an abstraction", () => {
    // The old intro opened with "difficult, undefined problems". The reader
    // this site wants to keep has been given no reason to care yet.
    // Guarded against `origin`, not against a second literal: the opening is
    // prose, so it stays a sentence, but the places and the date it names
    // belong to `origin` and must not drift from it.
    expect(profile.about[0]).toContain(origin.from);
    expect(profile.about[0]).toContain(origin.to);
    expect(profile.about[0]).toContain(origin.arrived);
  });

  it("keeps the motto, because he likes it", () => {
    // Autogenerated, and he asked to keep it. It stays as a motto he
    // adopted, which is a different kind of claim from a fact.
    expect(profile.philosophy).toBe("Unsolved is not the same as unsolvable.");
  });
});

describe("the page is four sections", () => {
  it("lists exactly About, Worlds, Journey and Contact", () => {
    expect(navItems.map((item) => item.sectionId)).toEqual([
      "about", "worlds", "tree", "contact",
    ]);
  });

  it("keeps skillCategories, which /resume still renders", () => {
    // Deleting the Skills *section* is not deleting the skills. The résumé
    // route reads this, and so does the answer corpus.
    expect(skillCategories.length).toBeGreaterThan(0);
  });
});

describe("the hero's code artifact", () => {
  it("no longer carries the fabricated personality literals", () => {
    const code = codeTabs.map((tab) => tab.code).join("\n");
    expect(code).not.toContain("mindset");
    expect(code).not.toContain("always learning");
    expect(code).not.toContain("Unsolved is not the same as unsolvable");
  });

  it("names where every excerpt came from", () => {
    for (const tab of codeTabs) {
      expect(tab.source.trim(), tab.id).not.toBe("");
    }
  });

  it("keeps every excerpt short enough for the hero's one screen", () => {
    for (const tab of codeTabs) {
      expect(tab.code.split("\n").length, tab.id).toBeLessThanOrEqual(14);
    }
  });

  it("has three excerpts, so the loops here cannot pass over nothing", () => {
    expect(codeTabs.length).toBe(3);
  });

  it("every excerpt is a byte-identical slice of the repo file it names", () => {
    // `filename` is a repo-relative path and the only provenance this test
    // trusts. A Windows checkout may carry CRLF line endings; a JS template
    // literal always yields LF, so the file's line endings are normalised and
    // nothing else is.
    for (const tab of codeTabs) {
      const file = readFileSync(resolve(process.cwd(), tab.filename), "utf8").replace(/\r\n/g, "\n");
      expect(file.includes(tab.code), `${tab.filename} (${tab.id}) is not a verbatim slice of that file`).toBe(true);
    }
  });

  it("the slice check can fail: an edited excerpt is not found", () => {
    const tab = codeTabs[0];
    const file = readFileSync(resolve(process.cwd(), tab.filename), "utf8").replace(/\r\n/g, "\n");
    expect(file.includes(tab.code)).toBe(true);
    expect(file.includes(tab.code.replace(/\w+/, "zzzz"))).toBe(false);
  });
});

describe("contact drafts", () => {
  it("gives every intent a message that can be sent unedited", () => {
    expect(contactIntents.length).toBeGreaterThan(0);
    for (const intent of contactIntents) {
      // A draft, not an opening: the old starter stopped mid-sentence and
      // left the visitor holding a blank textarea.
      expect(intent.messageDraft, intent.id).toMatch(/\n\n/);
      expect(intent.messageDraft.trimEnd(), intent.id).toMatch(/\n\nBest,$/);
      expect(intent.messageDraft.length, intent.id).toBeGreaterThan(120);
    }
  });

  it("never claims a feeling the sender has not expressed", () => {
    for (const intent of contactIntents) {
      const text = intent.messageDraft.toLowerCase();
      expect(text, intent.id).not.toContain("impressed");
      expect(text, intent.id).not.toContain("love your");
    }
  });

  it("types no number into a draft", () => {
    // Drafts speak for the sender. A digit would be a figure typed by hand
    // instead of read from the content layer.
    for (const intent of contactIntents) {
      expect(intent.messageDraft, intent.id).not.toMatch(/\d/);
    }
  });

  it("stays short enough for the mailto: fallback, with its footer", () => {
    // Same shape buildMailtoHref in ContactForm produces: subject, then the
    // message followed by the name/email/company lines. The footer here is a
    // generous stand-in for those lines, not a copy of them.
    const footer =
      "\n\n—\nName: " + "n".repeat(80) + "\nEmail: " + "e".repeat(120) + "\nCompany: " + "c".repeat(80);
    for (const intent of contactIntents) {
      const referred = withCaseStudyReferral(intent.messageDraft, projects[0].title);
      const href = `mailto:${profile.email}?subject=${encodeURIComponent(
        `${intent.subject} — ${projects[0].title}`
      )}&body=${encodeURIComponent(referred + footer)}`;
      expect(href.length, intent.id).toBeLessThan(2000);
    }
  });
});

describe("withCaseStudyReferral", () => {
  const draft = "Hi Thien,\n\nSomething to say.\n\nBest,";

  it("returns the draft untouched when no project was being read", () => {
    expect(withCaseStudyReferral(draft, null)).toBe(draft);
  });

  it("puts the referral in its own paragraph before the sign-off", () => {
    expect(withCaseStudyReferral(draft, "Some Project")).toBe(
      'Hi Thien,\n\nSomething to say.\n\nSpecifically, I wanted to mention your case study, "Some Project."\n\nBest,'
    );
  });

  it("appends the referral when a draft has no sign-off to sit before", () => {
    expect(withCaseStudyReferral("Hi.\n\nText", "P")).toBe(
      'Hi.\n\nText\n\nSpecifically, I wanted to mention your case study, "P."'
    );
  });
});
