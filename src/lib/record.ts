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
import { careerEntries, highlights } from "@/content/portfolio";
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
/** Board coordinates of the region under the left page's heading, inside
 *  its margins (the board's text starts at x 112 on a page from x 70). */
export const PAGE_FRAME = { x: 100, y: 190, width: 612, height: 590 } as const;
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

/** An entry's line on the Record: its role, with the em dash the content uses
 *  between an award and its project read as a comma ("Best Design, MentorHub"). */
export function entryTitle(entry: CareerEntry): string {
  return entry.role.replace(" — ", ", ");
}

/* -------------------------------------------------------------------------- */
/* The Diary's pages (round 23)                                                */
/* -------------------------------------------------------------------------- */

/** Years before this fold into one chapter: 2018, 2019 and 2020 are a school,
 *  a kitchen and a lot of learning that overlapped, not three separate years. */
export const CHAPTER_FROM_YEAR = 2021;
/** Shared pages hold at most this many entries. */
export const SHARED_PAGE_MAX = 3;

export interface DiaryChapter {
  /** `2025` … `2021`, or `2018-2020`. */
  readonly id: string;
  /** What the contents say: `2025`, or `2018 – 2020`. */
  readonly label: string;
  /** The years it holds; each is still a ring on the slice and a fragment. */
  readonly years: readonly number[];
  /** In the order the book tells them. */
  readonly entries: readonly CareerEntry[];
}

/** Newest chapter first. Entries within a chapter newest first, except the
 *  early one, which reads as a story: school, then the kitchen, then what I
 *  taught myself. */
export function diaryChapters(entries: readonly CareerEntry[] = ENTRIES): readonly DiaryChapter[] {
  const years = recordYears(entries);
  const chapters: DiaryChapter[] = [];
  const early = years.filter((y) => y.year < CHAPTER_FROM_YEAR);
  for (const y of years.filter((y) => y.year >= CHAPTER_FROM_YEAR)) {
    chapters.push({ id: String(y.year), label: String(y.year), years: [y.year], entries: y.entries });
  }
  if (early.length > 0) {
    const first = early.at(-1)!.year;
    const last = early[0].year;
    chapters.push({
      id: `${first}-${last}`,
      label: `${first} – ${last}`,
      years: early.map((y) => y.year).toReversed(),
      entries: early.flatMap((y) => y.entries).toReversed(),
    });
  }
  return chapters;
}

export type DiaryPageKind = "summary" | "contents" | "entry" | "shared" | "certificates";

export interface DiaryPage {
  /** Unique; the id of the page's `<article>` is derived from it. */
  readonly key: string;
  readonly kind: DiaryPageKind;
  /** The entries on it, in order. Empty for the three fixed pages. */
  readonly entryIds: readonly string[];
  /** The chapter it opens, when it is a chapter's first page. */
  readonly opens?: string;
}

/** An entry has a page to itself when it has bullets to put on one. */
export function hasOwnPage(entry: CareerEntry): boolean {
  return (entry.diary?.bullets?.length ?? 0) > 0;
}

/** The pages inside one chapter. Entries with little to say share pages, up to
 *  `SHARED_PAGE_MAX` each, in the order they come: after the chapter's own
 *  pages, except the early chapter, which tells its story in order and puts
 *  them where its first small entry falls. */
export function chapterPages(chapter: DiaryChapter): readonly DiaryPage[] {
  const own: DiaryPage[] = [];
  const groups: CareerEntry[][] = [];
  const order: { readonly kind: "own" | "shared"; readonly index: number }[] = [];
  for (const entry of chapter.entries) {
    if (hasOwnPage(entry)) {
      order.push({ kind: "own", index: own.length });
      own.push({ key: `entry-${entry.id}`, kind: "entry", entryIds: [entry.id] });
    } else {
      let group = groups.at(-1);
      if (!group || group.length >= SHARED_PAGE_MAX) {
        group = [];
        groups.push(group);
        order.push({ kind: "shared", index: groups.length - 1 });
      }
      group.push(entry);
    }
  }
  const shared: DiaryPage[] = groups.map((group) => ({
    key: `shared-${group[0].id}`,
    kind: "shared",
    entryIds: group.map((e) => e.id),
  }));
  const pages =
    chapter.years.length > 1
      ? order.map((o) => (o.kind === "own" ? own[o.index] : shared[o.index]))
      : [...own, ...shared];
  return pages.map((page, i) => (i === 0 ? { ...page, opens: chapter.id } : page));
}

/** Every page of the book, in order: the summary, the contents, each chapter's
 *  pages (newest chapter first), and the certificates. */
export function diaryPages(entries: readonly CareerEntry[] = ENTRIES): readonly DiaryPage[] {
  return [
    { key: "summary", kind: "summary", entryIds: [] },
    { key: "contents", kind: "contents", entryIds: [] },
    ...diaryChapters(entries).flatMap(chapterPages),
    { key: "certificates", kind: "certificates", entryIds: [] },
  ];
}

/** The page an entry is on. */
export function pageOfEntry(entryId: string, pages: readonly DiaryPage[] = diaryPages()): DiaryPage | undefined {
  return pages.find((p) => p.entryIds.includes(entryId));
}

/** The DOM id of a page's `<article>`. An entry with a page to itself gives
 *  its own fragment (`journey-entry-<id>`), so a link to it lands on the page;
 *  a shared page gets one of its own and each entry a block inside it. */
export function diaryPageId(page: DiaryPage): string {
  if (page.kind === "entry") return `journey-entry-${page.entryIds[0]}`;
  return `diary-page-${page.key}`;
}

/** Which kinds of entry a page holds; the fixed pages hold none and always
 *  show. */
export function pageKinds(page: DiaryPage, entries: readonly CareerEntry[] = ENTRIES): readonly CareerEntryType[] {
  const kinds = new Set<CareerEntryType>();
  for (const id of page.entryIds) {
    const entry = entries.find((e) => e.id === id);
    if (entry) kinds.add(entry.type);
  }
  return [...kinds];
}

/** The figure a page puts in the accent colour: the oak's own highlight for
 *  the entry when it hangs one, else the entry's `diary.highlight`. */
export function entryHighlight(
  entry: CareerEntry,
): { readonly value: string; readonly label: string; readonly measure?: string } | undefined {
  const tag = highlights.find((h) => h.entryId === entry.id);
  if (tag) {
    return { value: tag.value, label: tag.label, ...("measure" in tag ? { measure: tag.measure } : {}) };
  }
  return entry.diary?.highlight;
}

/** The sentence or two under an entry's title. */
export function entryBlurb(entry: CareerEntry): string {
  return entry.diary?.blurb ?? entry.context;
}

/** The contents' lines, chapter by chapter, with the page each is on. */
export interface ContentsChapter {
  readonly id: string;
  readonly label: string;
  readonly lines: readonly {
    readonly entryId: string;
    readonly title: string;
    readonly organization: string;
    readonly type: CareerEntryType;
    readonly pageKey: string;
  }[];
}

export function contentsChapters(entries: readonly CareerEntry[] = ENTRIES): readonly ContentsChapter[] {
  const pages = diaryPages(entries);
  return diaryChapters(entries).map((chapter) => ({
    id: chapter.id,
    label: chapter.label,
    lines: chapterPages(chapter).flatMap((page) =>
      page.entryIds.map((id) => {
        const entry = entries.find((e) => e.id === id)!;
        return {
          entryId: id,
          title: entryTitle(entry),
          organization: entry.organization,
          type: entry.type,
          pageKey: pageOfEntry(id, pages)!.key,
        };
      }),
    ),
  }));
}
