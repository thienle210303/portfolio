import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { careerEntries, certifications, record } from "@/content/portfolio";
import type { CareerEntry, Certification } from "@/types/portfolio";
import { buildSlice, featuredEntries, kindCounts, recordYears, startYear } from "@/lib/record";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const CERTS: readonly Certification[] = certifications;

describe("the Record's content", () => {
  it("the five pressed are the authored ones, and they exist", () => {
    expect(featuredEntries().map((e) => e.id)).toEqual(["doordash", "graduation", "cockyhacks", "magellan", "code-to-give"]);
  });

  it("every stamp has a date and a committed image under 200 KB", () => {
    const stamped = CERTS.filter((c) => c.stamp);
    expect(stamped.map((c) => c.id)).toEqual(["jpmorgan", "visa", "hkust-software-engineering", "walmart"]);
    for (const c of stamped) {
      expect(c.date, c.id).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(statSync(`public${c.stamp!.image.src}`).size, c.id).toBeLessThanOrEqual(200 * 1024);
    }
    for (const e of ENTRIES.filter((x) => x.award)) {
      expect(statSync(`public${e.award!.src}`).size, e.id).toBeLessThanOrEqual(200 * 1024);
    }
  });

  it("AT&T gets nothing new: no stamp, no date, no image", () => {
    const att = CERTS.find((c) => c.issuer === "AT&T");
    expect(att).toEqual({ id: "att", name: "Technology Academy", issuer: "AT&T", date: undefined });
  });

  it("the copy is first person and has no figure of its own", () => {
    const words = JSON.stringify(record);
    expect(words).not.toMatch(/\b(he|his|him|himself)\b/i);
    expect(words.replace(/\{first\}|\{last\}/g, "")).not.toMatch(/\d/);
  });
});

describe("the years", () => {
  it("run newest first from the last start to the first, each entry once", () => {
    const years = recordYears();
    expect(years[0].year).toBe(Math.max(...ENTRIES.map(startYear)));
    expect(years.at(-1)!.year).toBe(Math.min(...ENTRIES.map(startYear)));
    expect(years.flatMap((y) => y.entries).length).toBe(ENTRIES.length);
    for (const y of years) for (const e of y.entries) expect(startYear(e)).toBe(y.year);
  });

  it("2020 is empty", () => {
    expect(recordYears().find((y) => y.year === 2020)?.entries).toEqual([]);
  });

  it("counts are computed and add up", () => {
    const c = kindCounts();
    expect(c.all).toBe(ENTRIES.length);
    expect(c.work + c.learning + c.milestone).toBe(c.all);
  });
});

describe("the slice", () => {
  const slice = buildSlice();

  it("has one ring per year, heart first, widths from the year's count", () => {
    expect(slice.rings.map((r) => r.year)).toEqual(recordYears().map((y) => y.year).toReversed());
    for (const ring of slice.rings) expect(ring.outer - ring.inner).toBeCloseTo(4.5 + 3.6 * ring.count, 5);
    const thinnest = slice.rings.reduce((a, b) => (b.outer - b.inner < a.outer - a.inner ? b : a));
    expect(thinnest.year).toBe(2020);
  });

  it("has one dot per entry, on its own year's ring", () => {
    expect(slice.dots.map((d) => d.entryId).toSorted()).toEqual(ENTRIES.map((e) => e.id).toSorted());
    for (const dot of slice.dots) {
      const entry = ENTRIES.find((e) => e.id === dot.entryId)!;
      const ring = slice.rings.find((r) => r.year === startYear(entry))!;
      const dist = Math.hypot(dot.x - 255, dot.y - 440);
      expect(dist).toBeGreaterThan(ring.inner - 1);
      expect(dist).toBeLessThan(ring.outer + 1);
      expect(dot.kind).toBe(entry.type);
    }
  });

  it("ties each pressed card to its dot", () => {
    expect(slice.strings.map((s) => s.entryId)).toEqual(featuredEntries().map((e) => e.id));
    for (const s of slice.strings) {
      const dot = slice.dots.find((d) => d.entryId === s.entryId)!;
      expect(dot.featured).toBe(true);
      expect(s.d.startsWith(`M${dot.x} ${dot.y}C`)).toBe(true);
    }
  });

  it("is the same every time", () => {
    expect(buildSlice()).toEqual(slice);
  });
});
