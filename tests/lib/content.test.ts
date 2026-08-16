import { afterEach, describe, expect, it, vi } from "vitest";
import { formatIsoDate, isEntirelyNeedsInput, stripNeedsInput } from "@/lib/content";

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

  it("does not calendar-validate the day: an out-of-range day is formatted, not rejected", () => {
    // Documents actual, current behaviour precisely (this is not the "never
    // throws" contract being violated -- it isn't -- it is a narrower
    // validation than "unchanged if malformed" might suggest). The shape
    // regex only requires two digit characters for the day, and
    // `Number.isNaN` can never be true for a string that already matched
    // `\d{2}`, so a day of "00" formats using the literal number rather than
    // being treated as out-of-shape. Content is trusted/authored, so this is
    // low risk in practice, but it means this function is not a full
    // calendar validator -- only a shape-and-month-range one.
    expect(formatIsoDate("2026-08-00")).toBe("0 August 2026");
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
