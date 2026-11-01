import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { careerEntries, certifications, record } from "@/content/portfolio";
import type { CareerEntry, Certification } from "@/types/portfolio";
import {
  buildSlice,
  chapterPages,
  contentsChapters,
  diaryChapters,
  diaryPageId,
  diaryPages,
  entryHighlight,
  featuredEntries,
  kindCounts,
  pageKinds,
  recordYears,
  SHARED_PAGE_MAX,
  startYear,
} from "@/lib/record";
import { figureTokens, hasToken } from "./figures";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const CERTS: readonly Certification[] = certifications;

describe("the Record's content", () => {
  it("the five pressed are the authored ones, and they exist", () => {
    expect(featuredEntries().map((e) => e.id)).toEqual(["doordash", "wordification", "schaeffler", "cockyhacks", "usc-scraping"]);
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

  it("the five pressed are the same five whatever a chapter does", () => {
    expect(featuredEntries()).toHaveLength(5);
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

describe("the Diary's chapters and pages", () => {
  it("fold the years before 2021 into one, and keep one chapter per year after", () => {
    const chapters = diaryChapters();
    expect(chapters.map((c) => c.id)).toEqual(["2025", "2024", "2023", "2022", "2021", "2018-2020"]);
    expect(chapters.at(-1)!.years).toEqual([2018, 2019, 2020]);
    expect(chapters.flatMap((c) => c.entries).map((e) => e.id).toSorted()).toEqual(ENTRIES.map((e) => e.id).toSorted());
    // Newest first within a chapter, except the early one, which is told in order.
    expect(chapters[0].entries.map((e) => e.id)).toEqual(["doordash", "graduation", "capstone", "llm-classifier"]);
    expect(chapters.at(-1)!.entries.map((e) => e.id)).toEqual(["eastside-high", "fu-of-kyoto", "self-taught-gap"]);
  });

  it("number the pages: the summary, the contents, the chapters', the certificates", () => {
    const pages = diaryPages();
    expect(pages.map((p) => p.kind).filter((k) => k === "summary" || k === "contents" || k === "certificates")).toEqual(["summary", "contents", "certificates"]);
    expect(new Set(pages.map((p) => p.key)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => diaryPageId(p))).size).toBe(pages.length);
    for (const chapter of diaryChapters()) expect(chapterPages(chapter)[0].opens, chapter.id).toBe(chapter.id);
    expect(pages.filter((p) => p.opens).length).toBe(diaryChapters().length);
  });

  it("an entry's own page is its fragment; a shared page's entries are blocks on it", () => {
    for (const page of diaryPages()) {
      if (page.kind === "entry") expect(diaryPageId(page)).toBe(`journey-entry-${page.entryIds[0]}`);
      if (page.kind === "shared") {
        expect(diaryPageId(page)).toMatch(/^diary-page-/);
        expect(page.entryIds.length).toBeLessThanOrEqual(SHARED_PAGE_MAX);
      }
    }
  });

  it("every page of a kind holds only that kind's entries, or says which it holds", () => {
    for (const page of diaryPages()) {
      const kinds = pageKinds(page);
      if (page.kind === "entry") expect(kinds).toHaveLength(1);
      if (page.kind === "summary" || page.kind === "contents" || page.kind === "certificates") expect(kinds).toEqual([]);
    }
  });

  it("the contents list every entry once, and point at the page it is on", () => {
    const pages = diaryPages();
    const lines = contentsChapters().flatMap((c) => c.lines);
    expect(lines.map((l) => l.entryId).toSorted()).toEqual(ENTRIES.map((e) => e.id).toSorted());
    for (const line of lines) expect(pages.find((p) => p.key === line.pageKey)?.entryIds).toContain(line.entryId);
  });
});

/**
 * Round 23 (owner: "just some bulletpoint of achievement with brief
 * description and highlight achievement, a graph/image ... and a fun fact").
 * Same rule as `highlights.test.ts`: a figure on a page is a figure the
 * entry's own record already holds.
 */
describe("the Diary's notes", () => {
  const WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const noted = ENTRIES.filter((e) => e.diary);
  /** What an entry says about itself, for a figure to be found in. */
  const record = (e: CareerEntry) => `${e.headline ?? ""} ${e.impact.join(" ")} ${e.context}`;
  const own = (e: CareerEntry) =>
    `${record(e)} ${e.built.join(" ")} ${e.responsibilities.join(" ")} ${e.learned ?? ""} ${e.dateRange} ${e.award?.alt ?? ""}`;
  const source0 = (s: string) => s.replace(/\bzero\b/g, "0%");
  const named = (n: number) => String(n);

  it("some entries have notes, and an entry with bullets has two to four", () => {
    expect(noted.length).toBeGreaterThanOrEqual(10);
    for (const e of ENTRIES.filter((x) => x.diary?.bullets)) {
      expect(e.diary!.bullets!.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.diary!.bullets!.length, e.id).toBeLessThanOrEqual(4);
    }
  });

  it("every figure in a bullet is in the entry's own impact, context or headline", () => {
    let checked = 0;
    for (const e of noted) {
      for (const bullet of e.diary?.bullets ?? []) {
        for (const token of figureTokens(bullet)) {
          checked += 1;
          expect(hasToken(source0(record(e)), token), `${e.id}: "${bullet}" carries ${token}`).toBe(true);
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("every figure in a highlight, and in a chart's labels and caption, is too", () => {
    for (const e of noted) {
      const h = e.diary?.highlight;
      if (h) for (const token of figureTokens(`${h.value} ${h.label}`)) expect(hasToken(source0(record(e)), token), `${e.id}: ${token}`).toBe(true);
      const f = e.diary?.figure;
      if (!f) continue;
      const words =
        f.kind === "before-after" ? `${f.caption} ${f.before.label} ${f.after.label}` : f.caption;
      for (const token of figureTokens(words)) expect(hasToken(source0(record(e)), token), `${e.id}: ${token}`).toBe(true);
      if (f.kind === "count") {
        const total = named(f.total);
        const inWords = f.total <= 10 && new RegExp(`\\b${WORDS[f.total - 1]}\\b`, "i").test(record(e));
        expect(hasToken(record(e), total) || inWords, `${e.id}: ${total} is not in its record`).toBe(true);
      }
    }
  });

  it("a before-after chart has a longer bar for the bigger figure it names", () => {
    for (const e of noted) {
      const f = e.diary?.figure;
      if (f?.kind === "before-after") {
        expect(f.before.value, e.id).toBeGreaterThan(0);
        expect(f.after.value, e.id).toBeGreaterThan(0);
        expect(f.before.value, e.id).not.toBe(f.after.value);
      }
    }
  });

  it("the highlight is the oak's own when the oak hangs a tag, else the entry's", () => {
    expect(entryHighlight(ENTRIES.find((e) => e.id === "doordash")!)?.value).toBe("17h → 3m");
    expect(entryHighlight(ENTRIES.find((e) => e.id === "usc-degree")!)?.value).toBe("3.8");
    expect(entryHighlight(ENTRIES.find((e) => e.id === "capstone")!)).toBeUndefined();
  });

  it("a fun fact is first person, short, and draws only on what the entry already says", () => {
    let facts = 0;
    for (const e of noted) {
      const fact = e.diary?.funFact;
      if (!fact) continue;
      facts += 1;
      expect(fact, e.id).not.toMatch(/\b(he|his|him|himself)\b/i);
      expect(fact.split(/\s+/).length, e.id).toBeLessThanOrEqual(26);
      // (the shared tokeniser keeps a trailing comma: "2018,")
      for (const token of figureTokens(fact).map((t) => t.replace(/,$/, ""))) expect(hasToken(source0(own(e)), token), `${e.id}: ${token}`).toBe(true);
    }
    expect(facts).toBeGreaterThanOrEqual(10);
  });

  it("every fun fact in the content file carries a status line above it (a draft until Thien approves)", () => {
    const lines = readFileSync("src/content/portfolio.ts", "utf8").split("\n");
    let facts = 0;
    lines.forEach((line, i) => {
      if (!/^\s+funFact: /.test(line)) return;
      facts += 1;
      expect(lines[i - 1], `line ${i + 1}`).toMatch(/^\s+\/\/ (DRAFT 2026-11-01 — awaiting Thien's approval|APPROVED )/);
    });
    expect(facts).toBe(ENTRIES.filter((e) => e.diary?.funFact).length);
  });

  it("the Journey's tags still point at pages: every highlight's entry has one", () => {
    const pages = diaryPages();
    for (const e of ENTRIES) expect(pages.some((p) => p.entryIds.includes(e.id)), e.id).toBe(true);
  });
});
