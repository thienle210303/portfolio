/**
 * The Record's numbers and shapes, all computed from `careerEntries`: the
 * years (grouped by start year, newest first), the filter counts, and the
 * tree-ring slice on the left page (one ring per year, its width from the
 * number of entries that started that year, one dot per entry).
 *
 * The slice is the approved board's arithmetic (NatRecordFinal in
 * `design/round-21-outdoors/v1/source/gen-nature.mjs`): same seed, same
 * wobble, same ring width (4.5 + 3.6 per entry), same card slots and strings.
 * It lives here rather than in `scripts/draw-scenery.mjs` because it is data,
 * not a drawing: a new entry re-cuts the slice without anyone re-drawing it.
 * Coordinates are the board's (a 1440×900 frame).
 */
import { careerEntries } from "@/content/portfolio";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";

const ENTRIES: readonly CareerEntry[] = careerEntries;

export const startYear = (entry: CareerEntry): number => Number(entry.sortKey.slice(0, 4));

/** Newest first by `sortKey`; ties keep content order. */
const newestFirst = (a: CareerEntry, b: CareerEntry) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0);

export interface RecordYear {
  readonly year: number;
  /** Newest first. Empty for a year in which nothing started. */
  readonly entries: readonly CareerEntry[];
}

/** Every year from the first start to the last, newest first, including the
 *  ones in which nothing started (2020). */
export function recordYears(entries: readonly CareerEntry[] = ENTRIES): readonly RecordYear[] {
  const years = entries.map(startYear);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const out: RecordYear[] = [];
  for (let year = last; year >= first; year -= 1) {
    out.push({ year, entries: entries.filter((e) => startYear(e) === year).toSorted(newestFirst) });
  }
  return out;
}

export const KINDS = ["work", "learning", "milestone"] as const satisfies readonly CareerEntryType[];

/** What a reader calls each type; the filters and the legend say these. */
export const KIND_WORD: Record<CareerEntryType, string> = {
  work: "Work",
  learning: "Study",
  milestone: "Milestone",
};

export function kindCounts(entries: readonly CareerEntry[] = ENTRIES): Record<CareerEntryType | "all", number> {
  return {
    all: entries.length,
    work: entries.filter((e) => e.type === "work").length,
    learning: entries.filter((e) => e.type === "learning").length,
    milestone: entries.filter((e) => e.type === "milestone").length,
  };
}

/** The five pressed on the left page: authored `featured`, newest year first,
 *  content order within a year (the board's). */
export function featuredEntries(entries: readonly CareerEntry[] = ENTRIES): readonly CareerEntry[] {
  return entries.filter((e) => e.featured).toSorted((a, b) => startYear(b) - startYear(a));
}

/* -------------------------------------------------------------------------- */
/* The slice                                                                   */
/* -------------------------------------------------------------------------- */

const f = (n: number) => Math.round(n * 10) / 10;
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The slice's centre and the frame the left page's cards are placed in. */
export const SLICE_CENTRE = { x: 255, y: 440 } as const;
/** Board coordinates of the region under the left page's heading. */
export const PAGE_FRAME = { x: 70, y: 190, width: 650, height: 590 } as const;
export const CARD_WIDTH = 196;

/** Where each pressed card is taped, in board coordinates: two down the right
 *  of the slice, three across the bottom, each a little askew (the board's). */
export const CARD_SLOTS = [
  { x: 432, y: 214, rot: -3, at: "left" },
  { x: 470, y: 392, rot: 2.5, at: "left" },
  { x: 104, y: 604, rot: -2, at: "top" },
  { x: 312, y: 628, rot: 1.5, at: "top" },
  { x: 512, y: 596, rot: -1, at: "top" },
] as const;

export interface Ring {
  readonly year: number;
  readonly count: number;
  readonly inner: number;
  readonly outer: number;
  readonly d: string;
}

export interface Dot {
  readonly entryId: string;
  readonly kind: CareerEntryType;
  readonly x: number;
  readonly y: number;
  readonly featured: boolean;
}

export interface Slice {
  /** Oldest (the heart) first. */
  readonly rings: readonly Ring[];
  readonly dots: readonly Dot[];
  /** One per featured entry, in `featuredEntries()` order. */
  readonly strings: readonly { readonly entryId: string; readonly d: string }[];
  /** The bark's outer radius. */
  readonly radius: number;
}

export function buildSlice(entries: readonly CareerEntry[] = ENTRIES): Slice {
  const { x: cx, y: cy } = SLICE_CENTRE;
  const r = rng(5);
  const years = recordYears(entries).toReversed();
  const featured = featuredEntries(entries);
  const rings: Ring[] = [];
  const dots: Dot[] = [];
  const mids = new Map<string, number>();
  let radius = 7;

  years.forEach(({ year, entries: items }, yi) => {
    const w = 4.5 + 3.6 * items.length;
    const inner = radius;
    const outer = radius + w;
    const ph = [r() * 6.28, r() * 6.28];
    let d = "";
    for (let a = 0; a <= 360; a += 3) {
      const th = (a * Math.PI) / 180;
      const rr = outer * (1 + 0.025 * Math.sin(3 * th + ph[0]) + 0.015 * Math.sin(7 * th + ph[1]));
      d += (a ? "L" : "M") + f(cx + rr * Math.cos(th)) + " " + f(cy + rr * Math.sin(th));
    }
    rings.push({ year, count: items.length, inner, outer, d: `${d}Z` });
    const mid = (inner + outer) / 2;
    items.forEach((entry, i) => {
      if (entry.featured) {
        mids.set(entry.id, mid);
        return;
      }
      const a = ((110 + (i * 300) / items.length + yi * 23) * Math.PI) / 180;
      dots.push({ entryId: entry.id, kind: entry.type, x: f(cx + mid * Math.cos(a)), y: f(cy + mid * Math.sin(a)), featured: false });
    });
    radius = outer;
  });

  const strings = featured.slice(0, CARD_SLOTS.length).map((entry, i) => {
    const sl = CARD_SLOTS[i];
    const ax = sl.at === "left" ? sl.x : sl.x + CARD_WIDTH / 2;
    const ay = sl.at === "left" ? sl.y + 46 : sl.y;
    const mid = mids.get(entry.id) ?? 0;
    const ang = Math.atan2(ay - cy, ax - cx);
    const dx = cx + mid * Math.cos(ang);
    const dy = cy + mid * Math.sin(ang);
    dots.push({ entryId: entry.id, kind: entry.type, x: f(dx), y: f(dy), featured: true });
    const c1 = sl.at === "left" ? `${f(ax - 70)} ${f(ay)}` : `${f(ax)} ${f(ay - 60)}`;
    return {
      entryId: entry.id,
      d: `M${f(dx)} ${f(dy)}C${f(dx + (ax - dx) * 0.35)} ${f(dy + (ay - dy) * 0.1)} ${c1} ${f(ax)} ${f(ay)}`,
    };
  });

  return { rings, dots, strings, radius };
}

/** Anchor id of a year on the right page; the rings link here. */
export function recordYearId(year: number): string {
  return `record-${year}`;
}
