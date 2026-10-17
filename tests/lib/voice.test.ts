import { describe, expect, it } from "vitest";
import { careerEntries, projects } from "@/content/portfolio";
import { buildDrawnTree, DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import { buildDocuments } from "@/lib/answer-corpus";
import type { CareerEntry } from "@/types/portfolio";
import { figures } from "./figures";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const DRAWN_IDS = buildDrawnTree().map((branch) => branch.id);
const drawn = ENTRIES.filter((e) => DRAWN_IDS.includes(e.id));

describe("Journey headlines", () => {
  it("covers every drawn entry exactly once", () => {
    expect(DRAWN_IDS.length).toBeGreaterThan(0);
    expect(DRAWN_IDS.length).toBe(ENTRIES.length - DEMOTED_ENTRY_IDS.length);
    const demoted = ENTRIES.filter((e) => (DEMOTED_ENTRY_IDS as readonly string[]).includes(e.id));
    expect(drawn.length + demoted.length).toBe(ENTRIES.length);
  });

  it("every drawn entry has a headline of at most 12 words", () => {
    for (const e of drawn) {
      const h = e.headline?.trim();
      expect(h, e.id).toBeTruthy();
      expect(h!.split(/\s+/).length, e.id).toBeLessThanOrEqual(12);
    }
  });

  it("a headline never introduces a figure", () => {
    let withFigure = 0;
    for (const e of drawn) {
      const own = figures([...e.impact, e.context ?? "", ...e.built].join(" "));
      const mine = figures(e.headline ?? "");
      if (mine.length) withFigure++;
      for (const n of mine) expect(own, `${e.id}: ${n}`).toContain(n);
    }
    expect(withFigure).toBeGreaterThanOrEqual(6);
  });

  it("headlines are not indexed", () => {
    const headlines = drawn.map((e) => e.headline!.trim());
    expect(headlines.length).toBe(11);
    const texts = buildDocuments().map((d) => d.text);
    for (const h of headlines) {
      expect(texts.some((t) => t.includes(h)), h).toBe(false);
    }
  });
});

export const THIRD_PERSON = /\b(he|his|him|himself)\b/i;

function walk(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out);
}

describe("first person", () => {
  it("no career entry or case study speaks of me in the third person", () => {
    const strings: [string, string][] = [];
    for (const e of careerEntries) walk(e, `careerEntries.${e.id}`, strings);
    for (const p of projects) walk(p, `projects.${p.id}`, strings);
    expect(strings.length).toBeGreaterThan(100);
    const offenders = strings
      .filter(([, text]) => THIRD_PERSON.test(text))
      .map(([path, text]) => `${path}: ${text}`);
    expect(offenders).toEqual([]);
  });

});
