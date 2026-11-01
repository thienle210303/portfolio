import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Record from "@/sections/Record/Record";
import {
  caseStudyAnchorId,
  journeyEntryAnchorId,
  RECORD_ALIAS_IDS,
  RECORD_LEGACY_SECTION_IDS,
  RECORD_WORK_ENTRY_ID,
} from "@/sections/CareerTree/anchors";
import { careerEntries, certifications, projects, record } from "@/content/portfolio";
import { buildDocuments } from "@/lib/answer-corpus";
import { careerIndexable, education, projectsIndexable } from "@/lib/answer-sources";
import { buildSlice, diaryChapters, diaryPages, entryTitle, featuredEntries, kindCounts } from "@/lib/record";
import type { CareerEntry } from "@/types/portfolio";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const PAGES = diaryPages();

describe("the Diary section", () => {
  it("is labelled by its first page's heading, which says its name and the board's words", () => {
    render(<Record />);
    const section = document.getElementById("record")!;
    expect(section.getAttribute("aria-labelledby")).toBe("record-heading");
    const heading = document.getElementById("record-heading")!;
    expect(heading.tagName).toBe("H2");
    expect(heading.textContent).toContain(record.name);
    expect(heading.textContent).toContain(record.pressed.heading);
    expect(section.textContent).toContain(record.pressed.lead);
    expect(section.textContent).toContain(record.contents.heading);
    expect(section.textContent).toContain(record.certificates);
    expect(section.textContent).toContain("A tree slice: 2018 at the heart, 2025 at the bark.");
  });

  it("is a focusable, named region holding one slot per page", () => {
    render(<Record />);
    const book = screen.getByRole("region", { name: record.bookLabel });
    expect(book).toHaveAttribute("tabindex", "0");
    expect(book.querySelectorAll(":scope > .diary-slot")).toHaveLength(PAGES.length + (PAGES.length % 2));
    // Every page is an article with a name, apart from the contents the island draws (also one).
    const articles = book.querySelectorAll("article");
    expect(articles).toHaveLength(PAGES.length);
    for (const article of articles) expect(article.getAttribute("aria-labelledby"), article.id).toBeTruthy();
  });

  it("keeps #diary beside #record, and #work on DoorDash's page, each once and zero-size", () => {
    render(<Record />);
    for (const id of RECORD_ALIAS_IDS) {
      const alias = document.getElementById(id);
      expect(document.getElementById("record"), id).toContainElement(alias);
      expect(alias).toHaveAttribute("aria-hidden", "true");
      expect(alias?.className).toMatch(/\bscroll-mt-20\b/);
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
    }
    for (const id of RECORD_LEGACY_SECTION_IDS) {
      const target = document.getElementById(id);
      expect(document.getElementById(journeyEntryAnchorId(RECORD_WORK_ENTRY_ID)), id).toContainElement(target);
      expect(target).toHaveAttribute("aria-hidden", "true");
      expect(target?.className).toMatch(/\bh-0\b/);
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
    }
  });

  it("never writes an id into the document twice", () => {
    render(<Record />);
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("renders no case study: only a zero-size anchor per project, on its entry's page", () => {
    render(<Record />);
    expect(document.querySelectorAll("#record [id^='case-study-']")).toHaveLength(0);
    for (const project of projects) {
      const anchor = document.getElementById(caseStudyAnchorId(project.id));
      expect(anchor, project.id).not.toBeNull();
      expect(anchor).toHaveAttribute("aria-hidden", "true");
      expect(anchor?.textContent).toBe("");
      expect(anchor?.closest("[data-tree-branch]")?.getAttribute("data-tree-branch"), project.id).toBe(project.careerEntryId);
    }
    for (const retired of ["Problem", "Approach", "Lesson", "What I learned"]) {
      expect(screen.queryByRole("heading", { name: new RegExp(`^${retired}$`) })).toBeNull();
    }
  });

  it("the pages are paper, so the night paper scope applies", () => {
    render(<Record />);
    for (const slot of document.querySelectorAll(".diary-slot")) expect(slot.className).toContain("bg-surface");
    for (const page of document.querySelectorAll(".diary-page")) expect(page.className).toContain("bg-surface");
    expect(document.querySelector(".diary-book")?.className).toContain("bg-surface");
  });

  it("the morning by day and the evening at night, and the lotus, are decoration", () => {
    render(<Record />);
    const section = document.getElementById("record")!;
    expect(section.querySelector(".day-only")?.textContent).toBe(record.vignette.morning);
    expect(section.querySelector(".night-only")?.textContent).toBe(record.vignette.evening);
    for (const el of section.querySelectorAll("[data-scenery], .day-only, .night-only")) {
      if (el.closest(".diary-page")?.id === "diary-summary" || el.closest("article[id^='journey-entry-']") || el.closest("#diary-certificates")) {
        expect(el.closest('[aria-hidden="true"]'), el.className).not.toBeNull();
      }
    }
  });
});

describe("the pages", () => {
  it("are the summary, the contents, each chapter's, and the certificates, in that order", () => {
    expect(PAGES[0].kind).toBe("summary");
    expect(PAGES[1].kind).toBe("contents");
    expect(PAGES.at(-1)!.kind).toBe("certificates");
    expect(PAGES.slice(2, -1).every((p) => p.kind === "entry" || p.kind === "shared")).toBe(true);
  });

  it("hold every entry exactly once, as the page or a block on it", () => {
    render(<Record />);
    expect(PAGES.flatMap((p) => p.entryIds).toSorted()).toEqual(ENTRIES.map((e) => e.id).toSorted());
    for (const entry of ENTRIES) {
      const id = journeyEntryAnchorId(entry.id);
      expect(document.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
      const el = document.getElementById(id)!;
      expect(document.getElementById("record"), id).toContainElement(el);
      expect(el.getAttribute("data-tree-branch"), id).toBe(entry.id);
      expect(el.getAttribute("data-kind"), id).toBe(entry.type);
      expect(el.className, id).toMatch(/\bscroll-mt-20\b/);
    }
  });

  it("give an entry with bullets a page of its own, and put the rest together, three at most", () => {
    for (const page of PAGES) {
      if (page.kind === "entry") expect(ENTRIES.find((e) => e.id === page.entryIds[0])?.diary?.bullets?.length).toBeGreaterThan(0);
      if (page.kind === "shared") {
        expect(page.entryIds.length).toBeLessThanOrEqual(3);
        for (const id of page.entryIds) expect(ENTRIES.find((e) => e.id === id)?.diary?.bullets).toBeUndefined();
      }
    }
  });

  it("an entry's page says kind and dates, role, organisation, bullets, figure and fun fact", () => {
    render(<Record />);
    for (const entry of ENTRIES.filter((e) => e.diary?.bullets)) {
      const page = document.getElementById(journeyEntryAnchorId(entry.id))!;
      expect(page.tagName).toBe("ARTICLE");
      expect(within(page).getByRole("heading", { level: 3 }).textContent).toBe(entryTitle(entry));
      expect(page.textContent).toContain(entry.organization);
      expect(page.textContent).toContain(entry.dateRange);
      for (const bullet of entry.diary!.bullets!) expect(page.textContent, entry.id).toContain(bullet);
      if (entry.diary?.figure) expect(page.querySelector("figure"), entry.id).not.toBeNull();
      if (entry.diary?.funFact) expect(within(page).getByLabelText(record.funFactLabel).textContent).toContain(entry.diary.funFact);
      if (entry.award) expect(page.querySelector(`button[commandfor="award-${entry.id}"]`), entry.id).not.toBeNull();
      if (entry.link) expect(page.querySelector(`a[href="${entry.link.href}"]`), entry.id).not.toBeNull();
      if (entry.recording) expect(within(page).getByRole("button", { name: `Play the screen recording of ${entry.role}` })).toBeTruthy();
    }
  });

  it("the oak's highlight is the page's one accent figure", () => {
    render(<Record />);
    const page = document.getElementById("journey-entry-doordash")!;
    expect(page.textContent).toContain("17h → 3m");
    expect(page.querySelector(".text-accent")?.textContent).toBe("17h → 3m");
  });
});

describe("the early chapter", () => {
  it("is one chapter, 2018 – 2020, with a ring per year and a fragment per year", () => {
    const early = diaryChapters().at(-1)!;
    expect(early.label).toBe("2018 – 2020");
    expect(early.years).toEqual([2018, 2019, 2020]);
    expect(diaryChapters().map((c) => c.label)).toEqual(["2025", "2024", "2023", "2022", "2021", "2018 – 2020"]);
    expect(buildSlice().rings.map((r) => r.year)).toEqual([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    render(<Record />);
    for (const year of early.years) expect(document.getElementById(`record-${year}`), String(year)).not.toBeNull();
  });

  it("tells school and the kitchen together, then what I taught myself", () => {
    const early = PAGES.filter((p) => p.entryIds.some((id) => ["eastside-high", "fu-of-kyoto", "self-taught-gap"].includes(id)));
    expect(early.map((p) => p.entryIds)).toEqual([["eastside-high", "fu-of-kyoto"], ["self-taught-gap"]]);
  });

  it("names what I taught myself", () => {
    const entry = ENTRIES.find((e) => e.id === "self-taught-gap")!;
    const said = `${entry.context} ${entry.diary?.bullets?.join(" ")}`.toLowerCase();
    for (const word of ["plants", "aquarium", "stock", "invest", "finance"]) expect(said, word).toContain(word);
  });
});

describe("the contents", () => {
  it("lists every entry once, newest chapter first, each a link to its page with its page number", () => {
    render(<Record />);
    const contents = document.getElementById("diary-contents")!;
    const links = [...contents.querySelectorAll<HTMLAnchorElement>("a")];
    const entryLinks = links.filter((a) => a.getAttribute("href")!.startsWith("#journey-entry-"));
    expect(entryLinks.map((a) => a.getAttribute("href")).toSorted()).toEqual(ENTRIES.map((e) => `#${journeyEntryAnchorId(e.id)}`).toSorted());
    for (const a of entryLinks) {
      const entry = ENTRIES.find((e) => `#${journeyEntryAnchorId(e.id)}` === a.getAttribute("href"))!;
      const page = PAGES.findIndex((p) => p.entryIds.includes(entry.id)) + 1;
      expect(a.textContent).toContain(entryTitle(entry));
      expect(a.textContent?.trim().endsWith(`page ${page}`), entry.id).toBe(true);
      expect(document.getElementById(a.getAttribute("href")!.slice(1))).not.toBeNull();
    }
    const last = links.at(-1)!;
    expect(last.textContent).toContain(record.certificates);
    expect(last.getAttribute("href")).toBe("#diary-certificates");
    expect(last.textContent?.trim().endsWith(`page ${PAGES.length}`)).toBe(true);
  });
});

describe("the summary page", () => {
  it("has one ring per year, each a named link to its chapter", () => {
    render(<Record />);
    const rings = [...document.querySelectorAll<SVGAElement>("a.record-ring")];
    const years = buildSlice().rings;
    expect(rings).toHaveLength(years.length);
    for (const ring of years) {
      const link = rings.find((a) => a.getAttribute("href") === `#record-${ring.year}`);
      expect(link, String(ring.year)).toBeDefined();
      expect(link!.getAttribute("aria-label")).toMatch(new RegExp(`^${ring.year}: `));
      expect(document.getElementById(`record-${ring.year}`), String(ring.year)).not.toBeNull();
    }
  });

  it("presses the five featured entries, each a link to its page", () => {
    render(<Record />);
    const list = screen.getByRole("list", { name: "Pressed: my best ones" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(featuredEntries().map((e) => `#${journeyEntryAnchorId(e.id)}`));
    featuredEntries().forEach((e, i) => expect(links[i].textContent).toContain(entryTitle(e)));
  });

  it("explains the dots in words", () => {
    render(<Record />);
    expect(screen.getByRole("list", { name: "What the dots mean" }).textContent).toBe("WorkStudyMilestone");
  });
});

describe("the index tabs", () => {
  it("offer All, Work, Study and Milestones with counts from content, and re-bind the book", () => {
    render(<Record />);
    const group = screen.getByRole("group", { name: record.tabsLabel });
    const tabs = within(group).getAllByRole("button");
    const c = kindCounts();
    expect(tabs.map((b) => b.textContent)).toEqual([`All${c.all}`, `Work${c.work}`, `Study${c.learning}`, `Milestones${c.milestone}`]);
    expect(tabs.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    const track = screen.getByRole("region", { name: record.bookLabel });
    const visible = () => track.querySelectorAll(":scope > .diary-slot:not([data-hidden]):not(.diary-slot-blank)");
    expect(visible()).toHaveLength(PAGES.length);

    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-pressed", "true");
    expect(track).toHaveAttribute("data-filter", "work");
    const workPages = PAGES.filter((p) => p.entryIds.length === 0 || p.entryIds.some((id) => ENTRIES.find((e) => e.id === id)?.type === "work"));
    expect(visible()).toHaveLength(workPages.length);
    // The page numbers are counted again, in the folios and the contents.
    expect([...visible()].map((s) => s.querySelector(".diary-folio")?.textContent)).toEqual(workPages.map((_, i) => String(i + 1)));
    const lines = document.getElementById("diary-contents")!.querySelectorAll("a[href^='#journey-entry-']");
    expect(lines).toHaveLength(c.work);
    // The hidden pages are still in the document, for a fragment to find.
    expect(document.getElementById("journey-entry-deans-list")).not.toBeNull();
    expect(screen.getByText(`Work: ${c.work} entries, ${workPages.length} pages.`)).toBeInTheDocument();
  });

  it("a link to a page a tab has hidden clears the tab first", () => {
    render(<Record />);
    fireEvent.click(screen.getByRole("button", { name: /^Work/ }));
    expect(screen.getByRole("region", { name: record.bookLabel })).toHaveAttribute("data-filter", "work");
    const card = document.querySelector<HTMLAnchorElement>('a[href="#journey-entry-cockyhacks"]')!;
    fireEvent.click(card);
    expect(screen.getByRole("region", { name: record.bookLabel })).toHaveAttribute("data-filter", "all");
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("the stylesheet hides other kinds' entries on a shared page, and a spread snaps on each left page", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const kind of ["work", "learning", "milestone"]) {
      expect(css).toContain(`.diary-track[data-filter="${kind}"] .diary-entry:not([data-kind="${kind}"])`);
    }
    expect(css).toContain('.diary-slot[data-side="left"]');
    expect(css).toContain("scroll-snap-type: x mandatory");
  });
});

describe("the page controls", () => {
  it("are real buttons with labels, and the page counter is polite live text", () => {
    render(<Record />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
    const where = document.querySelector("[data-diary-page]")!;
    expect(where.getAttribute("aria-live")).toBe("polite");
    expect(where.textContent).toBe(`p. 1 of ${PAGES.length}`);
  });
});

describe("the certificates", () => {
  it("are a stamp each for every certificate with an image, each drawn for what it was, and AT&T has none", () => {
    render(<Record />);
    const stamped = certifications.filter((c) => "stamp" in c);
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[commandfor^='certificate-'][command='show-modal']")];
    expect(buttons).toHaveLength(stamped.length);
    expect(document.getElementById("record")!.textContent).not.toContain("AT&T");
    expect(stamped.map((c) => c.stamp!.drawing)).toEqual(["bank", "card", "code", "cart"]);
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      const dialog = document.getElementById(button.getAttribute("commandfor")!);
      expect(dialog?.tagName).toBe("DIALOG");
      expect(dialog?.querySelector("button[command='close']")).not.toBeNull();
    }
    stamped.forEach((c, i) => {
      expect(buttons[i].querySelector(`[data-scenery="stamp-${c.stamp!.drawing}"]`), c.id).not.toBeNull();
    });
  });

  it("load nothing until pressed: no image is in the page until a dialog opens", () => {
    render(<Record />);
    expect(document.querySelectorAll("#record img")).toHaveLength(0);
    const dialogs = document.querySelectorAll("#record dialog");
    expect(dialogs).toHaveLength(certifications.filter((c) => "stamp" in c).length + ENTRIES.filter((e) => e.award).length);
    for (const dialog of dialogs) expect(dialog).not.toHaveAttribute("open");
  });
});

/**
 * The guarantee `Document.sectionId` in `src/lib/answer-corpus.ts` makes: the
 * named section renders the subject the sentence belongs to. The career
 * entries and the degree are cited on the Diary; the case studies are not
 * rendered any more (round 23), so a project's subject is the entry it was
 * built in, whose page is where its citation lands. Both halves are needed:
 * every subject `#record` is cited for is in `#record`, and every document
 * citing `#record` belongs to one of them.
 */
describe("the subjects #record is cited for", () => {
  function recordText(): string {
    const section = document.getElementById("record");
    if (!(section instanceof HTMLElement)) throw new Error("no #record section");
    return (section.textContent ?? "").replace(/\s+/g, " ");
  }
  const entryOf = (project: { readonly id: string }) =>
    ENTRIES.find((e) => e.id === projects.find((p) => p.id === project.id)?.careerEntryId);
  function subjectNeedles(): readonly { readonly subject: string; readonly needle: string }[] {
    return [
      ...careerIndexable.flatMap((entry) => [
        { subject: entry.id, needle: entry.role.replace(" — ", ", ") },
        { subject: entry.id, needle: entry.organization },
      ]),
      ...projectsIndexable.flatMap((project) => {
        const entry = entryOf(project);
        return entry ? [{ subject: project.id, needle: entryTitle(entry) }] : [];
      }),
      ...education.map((school) => ({ subject: school.id, needle: school.institution })),
    ];
  }

  it("renders nothing in the third person", () => {
    render(<Record />);
    expect(recordText().length).toBeGreaterThan(1000);
    expect(recordText().match(/\b(he|his|him|himself)\b/gi) ?? []).toEqual([]);
  });

  it("renders every subject it is cited for, and every project is built in an entry it renders", () => {
    render(<Record />);
    const text = recordText();
    for (const project of projectsIndexable) expect(entryOf(project), project.id).toBeDefined();
    const needles = subjectNeedles();
    expect(needles.length).toBeGreaterThan(0);
    const missing = needles.filter(({ needle }) => !text.includes(needle.replace(/\s+/g, " "))).map(({ subject, needle }) => `${subject}: ${needle}`);
    expect(missing).toEqual([]);
  });

  it("cites #record only for subjects it renders, and #tree for nothing", () => {
    const docs = buildDocuments();
    expect(docs.filter((doc) => doc.sectionId === "tree")).toEqual([]);
    const needles = careerIndexable
      .flatMap((e) => [e.role, e.organization])
      .concat(projectsIndexable.map((p) => p.title), education.map((s) => s.institution));
    const cited = docs.filter((doc) => doc.sectionId === "record");
    expect(cited.length).toBeGreaterThan(0);
    const unaccounted = cited.filter((doc) => !needles.some((n) => doc.label.includes(n))).map((d) => d.text.slice(0, 60));
    expect(unaccounted).toEqual([]);
    for (const doc of cited) expect(doc.sectionLabel).toBe(record.name);
  });

  it("does not index the diary block", () => {
    const texts = buildDocuments().map((d) => d.text);
    for (const entry of ENTRIES) {
      const diary = entry.diary;
      if (!diary) continue;
      // A line the entry already says elsewhere (a fun fact drawn from its
      // `learned`) is in the corpus because of that field, not the diary.
      const said = [entry.context, entry.learned ?? "", ...entry.impact, ...entry.built, ...entry.responsibilities].join(" ");
      for (const line of [diary.funFact, diary.blurb].filter((x): x is string => Boolean(x))) {
        if (said.includes(line)) continue;
        expect(texts.some((t) => t.includes(line)), `${entry.id}: ${line}`).toBe(false);
      }
    }
  });
});
