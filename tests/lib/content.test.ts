import { afterEach, describe, expect, it, vi } from "vitest";
import { formatIsoDate, isEntirelyNeedsInput, stripNeedsInput } from "@/lib/content";
import { careerEntries, projects, profile, origin } from "@/content/portfolio";
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
    const dd = projects.find((project) => project.id === "dd-scraper-platform");
    const usc = projects.find((project) => project.id === "usc-research-collection");
    if (!dd || !usc) throw new Error("a case study this test audits no longer exists");
    const prose = (project: typeof dd) => JSON.stringify(project);

    expect(dd.tagline).toContain("17 hours to 3 minutes");
    expect(prose(dd)).not.toMatch(/18\+|99% runtime|2\.3×|failures eliminated/);
    expect(prose(usc)).not.toMatch(/2 million|Two million|2,000,000/);
    expect(usc.title).toContain("Three million");
    expect(usc.proof.join("\n")).toContain("3M+ Amazon and Kroger");

    for (const metric of [...(dd.metrics ?? []), ...(usc.metrics ?? [])]) {
      expect(metric.source, metric.label).toContain("September 2026 revision");
    }
  });
});

describe("the projects round 18 recovers from Portfolio-v2", () => {
  it("adds all four", () => {
    for (const id of ["chess-minmax", "conscea", "degreeworks-rebuild", "toy-storefront"]) {
      expect(projects.find((project) => project.id === id), id).toBeDefined();
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

  it("never links an executable", () => {
    // Portfolio-v2 shipped chess.exe as a download. A portfolio does not
    // hand a visitor a binary.
    for (const project of projects) {
      for (const href of [project.demo?.href, project.source?.href]) {
        expect(href ?? "").not.toMatch(/\.exe($|\?)/);
      }
    }
  });
});
