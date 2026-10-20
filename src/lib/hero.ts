/**
 * The hero's chapters and field tag, as data. Facts are read from the content
 * layer; the only authored words are `hero` in `src/content/portfolio.ts`.
 */
import { careerEntries, companions, hero, origin, profile, socialLinks } from "@/content/portfolio";

export type ChapterId = "origin" | "eastside-high" | "usc-degree" | "doordash";

export interface Chapter {
  readonly id: ChapterId;
  readonly year: string;
  readonly place: string;
  readonly line: string;
  /** The career entry "Read this part" opens; null means the Journey itself. */
  readonly entryId: string | null;
  readonly drawing: "tag-rice" | "tag-pine" | "tag-palmetto" | "tag-laptop";
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** First comma segment; three or more words collapse to the initials of the capitalised ones. */
export function shortPlace(name: string): string {
  const first = name.split(",")[0].trim();
  const words = first.split(/\s+/);
  if (words.length < 3) return first;
  return words.filter((w) => /^\p{Lu}/u.test(w)).map((w) => w[0]).join("");
}

function entry(id: string) {
  const found = careerEntries.find((e) => e.id === id);
  if (!found) throw new Error(`hero: missing career entry "${id}"`);
  return found;
}

function headline(e: ReturnType<typeof entry>) {
  if (!e.headline) throw new Error(`hero: career entry "${e.id}" has no headline`);
  return e.headline;
}

export function buildChapters(): readonly Chapter[] {
  const eastside = entry("eastside-high");
  const usc = entry("usc-degree");
  const doordash = entry("doordash");
  const [year, month] = origin.arrivedOn.split("-");
  return [
    {
      id: "origin",
      year: origin.born.slice(0, 4),
      place: shortPlace(origin.from),
      line: hero.chapterLines.origin,
      entryId: null,
      drawing: "tag-rice",
    },
    {
      id: "eastside-high",
      year: `${MONTH_ABBR[Number(month) - 1]} ${year}`,
      place: shortPlace(origin.to),
      line: headline(eastside),
      entryId: eastside.id,
      drawing: "tag-pine",
    },
    {
      id: "usc-degree",
      year: usc.sortKey.slice(0, 4),
      place: shortPlace(usc.organization),
      line: hero.chapterLines["usc-degree"],
      entryId: usc.id,
      drawing: "tag-palmetto",
    },
    {
      id: "doordash",
      year: doordash.sortKey.slice(0, 4),
      place: shortPlace(doordash.organization),
      line: hero.chapterLines.doordash,
      entryId: doordash.id,
      drawing: "tag-laptop",
    },
  ];
}

export interface FieldTagRow {
  readonly label: string;
  readonly value: string;
  readonly star?: true;
  /** "sans" when the value has Vietnamese diacritics, which Courier Prime lacks. */
  readonly face?: "sans";
}

export function buildFieldTag(): {
  readonly number: string;
  readonly aside: string;
  readonly rows: readonly FieldTagRow[];
  readonly status: string;
  readonly motto: string;
  readonly linkedin: string;
  readonly linkLabel: string;
} {
  const t = hero.fieldTag;
  const names = companions.map((c) => c.name);
  const cats = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
  const linkedin = socialLinks.find((l) => l.id === "linkedin");
  if (!linkedin) throw new Error("hero: no LinkedIn social link");
  return {
    number: t.number,
    aside: t.aside,
    rows: [
      { label: "Name", value: profile.name },
      { label: "Native to", value: origin.from, star: true, face: "sans" },
      { label: "Transplanted", value: origin.to },
      { label: "Habitat", value: t.habitat },
      { label: "Formerly", value: t.formerly },
      { label: "Companions", value: `${t.companionsLead}, ${cats}` },
    ],
    status: t.status,
    motto: profile.motto,
    linkedin: linkedin.href,
    linkLabel: t.linkLabel,
  };
}
