import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import Record from "@/sections/Record/Record";
import RecordYears from "@/sections/Record/RecordYears";
import { caseStudyAnchorId, journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries, certifications, projects, record } from "@/content/portfolio";
import { buildDocuments } from "@/lib/answer-corpus";
import { careerIndexable, education, projectsIndexable } from "@/lib/answer-sources";
import { buildSlice, entryTitle, featuredEntries, kindCounts, recordYears } from "@/lib/record";
import type { CareerEntry } from "@/types/portfolio";

const ENTRIES: readonly CareerEntry[] = careerEntries;

describe("the Record section", () => {
  it("is labelled by its left page's heading, and says the board's words", () => {
    render(<Record />);
    const section = document.getElementById("record")!;
    expect(section.getAttribute("aria-labelledby")).toBe("record-heading");
    expect(document.getElementById("record-heading")?.textContent).toBe(record.pressed.heading);
    expect(section.textContent).toContain(record.pressed.lead);
    expect(section.textContent).toContain(record.byYear.heading);
    expect(section.textContent).toContain(record.certificates);
    expect(section.textContent).toContain("A tree slice: 2018 at the heart, 2025 at the bark.");
  });

  it("keeps #work, the case studies' retired id, resolvable here", () => {
    render(<Record />);
    const target = document.getElementById("work");
    expect(document.getElementById("record")).toContainElement(target);
    expect(target).toHaveAttribute("aria-hidden", "true");
    expect(target?.className).toMatch(/\bscroll-mt-20\b/);
    expect(document.querySelectorAll('[id="work"]')).toHaveLength(1);
  });

  it("never writes an id into the document twice", () => {
    render(<Record />);
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("renders every case study, inside its entry's row", () => {
    render(<Record />);
    for (const project of projects) {
      const article = document.getElementById(caseStudyAnchorId(project.id));
      expect(article?.closest("[data-tree-branch]")?.getAttribute("data-tree-branch"), project.id).toBe(
        project.careerEntryId,
      );
    }
  });

  it("the pages are paper, so the night paper scope applies", () => {
    render(<Record />);
    const pages = document.querySelectorAll(".record-page");
    expect(pages).toHaveLength(2);
    for (const page of pages) expect(page.className).toContain("bg-surface");
  });

  it("the morning by day and the evening at night, and the lotus, are decoration", () => {
    render(<Record />);
    const section = document.getElementById("record")!;
    expect(section.querySelector(".day-only")?.textContent).toBe(record.vignette.morning);
    expect(section.querySelector(".night-only")?.textContent).toBe(record.vignette.evening);
    for (const el of section.querySelectorAll("[data-scenery], .day-only, .night-only")) {
      expect(el.closest('[aria-hidden="true"]'), el.className).not.toBeNull();
    }
  });
});

describe("the left page", () => {
  it("has one ring per year, each a named link to its year", () => {
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

  it("presses the five featured entries, each a link to its row", () => {
    render(<Record />);
    const list = screen.getByRole("list", { name: "Pressed: my best ones" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      featuredEntries().map((e) => `#${journeyEntryAnchorId(e.id)}`),
    );
    featuredEntries().forEach((e, i) => expect(links[i].textContent).toContain(entryTitle(e)));
  });

  it("explains the dots in words", () => {
    render(<Record />);
    const legend = screen.getByRole("list", { name: "What the dots mean" });
    expect(legend.textContent).toBe("WorkStudyMilestone");
  });
});

describe("the right page", () => {
  it("lists every entry once, by start year, newest first, featured in bold", () => {
    const { container } = render(<RecordYears />);
    const years = [...container.querySelectorAll<HTMLElement>("[data-record-year]")].map((el) => Number(el.dataset.recordYear));
    expect(years).toEqual(recordYears().map((y) => y.year));
    const rows = [...container.querySelectorAll<HTMLElement>("[data-tree-branch]")];
    expect(rows.map((r) => r.dataset.treeBranch).toSorted()).toEqual(ENTRIES.map((e) => e.id).toSorted());
    for (const row of rows) {
      const entry = ENTRIES.find((e) => e.id === row.dataset.treeBranch)!;
      expect(row.closest("[data-record-year]")?.getAttribute("data-record-year")).toBe(entry.sortKey.slice(0, 4));
      expect(row.dataset.kind).toBe(entry.type);
      const bold = row.querySelector("button .font-semibold");
      expect(Boolean(bold), entry.id).toBe(Boolean(entry.featured));
    }
    expect(container.textContent).toContain(record.byYear.empty);
  });

  it("offers All, Work, Study and Milestones with counts from content", () => {
    render(<Record />);
    const group = screen.getByRole("group", { name: "Show entries of one kind" });
    const buttons = within(group).getAllByRole("button");
    const c = kindCounts();
    expect(buttons.map((b) => b.textContent)).toEqual([`All${c.all}`, `Work${c.work}`, `Study${c.learning}`, `Milestones${c.milestone}`]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector("[data-record-list]")).toHaveAttribute("data-filter", "work");
  });

  it("the stylesheet hides other kinds and emptied years under a filter", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const kind of ["work", "learning", "milestone"]) {
      expect(css).toContain(`[data-record-list][data-filter="${kind}"] [data-kind]:not([data-kind="${kind}"])`);
      expect(css).toContain(`[data-record-list][data-filter="${kind}"] [data-record-year]:not(:has([data-kind="${kind}"]))`);
    }
  });
});

describe("the certificates", () => {
  it("are a stamp each for every certificate with an image, and AT&T has none", () => {
    render(<Record />);
    const stamped = certifications.filter((c) => "stamp" in c);
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[commandfor^='certificate-'][command='show-modal']")];
    expect(buttons).toHaveLength(stamped.length);
    expect(document.getElementById("record")!.textContent).not.toContain("AT&T");
    for (const button of buttons) {
      expect(button.getAttribute("command")).toBe("show-modal");
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      const dialog = document.getElementById(button.getAttribute("commandfor")!);
      expect(dialog?.tagName).toBe("DIALOG");
      expect(dialog?.querySelector("button[command='close']")).not.toBeNull();
    }
  });

  it("load nothing until pressed: each image is lazy and inside its closed dialog", () => {
    render(<Record />);
    const images = [...document.querySelectorAll<HTMLImageElement>("#record img")];
    expect(images.length).toBe(certifications.filter((c) => "stamp" in c).length + ENTRIES.filter((e) => e.award).length);
    for (const img of images) {
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.closest("dialog")).not.toBeNull();
      expect(img.closest("dialog")).not.toHaveAttribute("open");
      expect(img.getAttribute("alt")?.length).toBeGreaterThan(20);
      expect(img.getAttribute("srcset") ?? img.getAttribute("srcSet")).toContain("/_next/image");
    }
  });
});

/**
 * The guarantee `Document.sectionId` in `src/lib/answer-corpus.ts` makes: the
 * named section renders the subject the sentence belongs to. The career
 * entries, case studies and the degree are cited on the Record since round 21
 * phase 5. Both halves are needed: every subject `#record` is cited for is in
 * `#record`, and every document citing `#record` belongs to one of them.
 */
describe("the subjects #record is cited for", () => {
  function recordText(): string {
    const section = document.getElementById("record");
    if (!(section instanceof HTMLElement)) throw new Error("no #record section");
    return (section.textContent ?? "").replace(/\s+/g, " ");
  }
  function subjectNeedles(): readonly { readonly subject: string; readonly needle: string }[] {
    return [
      ...careerIndexable.flatMap((entry) => [
        { subject: entry.id, needle: entry.role.replace(" — ", ", ") },
        { subject: entry.id, needle: entry.organization },
      ]),
      ...projectsIndexable.map((project) => ({ subject: project.id, needle: project.title })),
      ...education.map((school) => ({ subject: school.id, needle: school.institution })),
    ];
  }

  it("renders nothing in the third person", () => {
    render(<Record />);
    expect(recordText().length).toBeGreaterThan(1000);
    expect(recordText().match(/\b(he|his|him|himself)\b/gi) ?? []).toEqual([]);
  });

  it("renders every subject it is cited for", () => {
    render(<Record />);
    const text = recordText();
    const needles = subjectNeedles();
    expect(needles.length).toBeGreaterThan(0);
    const missing = needles
      .filter(({ needle }) => !text.includes(needle.replace(/\s+/g, " ")))
      .map(({ subject, needle }) => `${subject}: ${needle}`);
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
  });
});

describe("per-entry fragments", () => {
  it("gives every career entry exactly one element, a row on the Record", () => {
    render(<Record />);
    const section = document.getElementById("record")!;
    for (const entry of ENTRIES) {
      const id = journeyEntryAnchorId(entry.id);
      expect(document.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
      const el = document.getElementById(id);
      expect(section, id).toContainElement(el);
      expect(el?.getAttribute("data-tree-branch"), id).toBe(entry.id);
      expect(el?.className, id).toMatch(/\bscroll-mt-20\b/);
    }
  });
});

describe("the rows", () => {
  function rows(): HTMLElement[] {
    const { container } = render(<RecordYears />);
    return [...container.querySelectorAll<HTMLElement>("[data-tree-branch]")];
  }
  const trigger = (row: HTMLElement) => row.querySelector<HTMLButtonElement>("button[aria-expanded]");
  const openIds = (list: readonly HTMLElement[]) =>
    list.filter((row) => trigger(row)?.getAttribute("aria-expanded") === "true").map((row) => row.dataset.treeBranch);
  const setHash = (hash: string) => window.history.replaceState(null, "", hash || "/");

  afterEach(() => {
    setHash("");
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the kind in words, the title and organisation, and nothing open", () => {
    const list = rows();
    expect(list).toHaveLength(ENTRIES.length);
    expect(openIds(list)).toEqual([]);
    for (const row of list) {
      const entry = ENTRIES.find((e) => e.id === row.dataset.treeBranch)!;
      const name = trigger(row)?.textContent ?? "";
      expect(name, entry.id).toContain(entryTitle(entry));
      expect(name, entry.id).toContain(entry.organization);
      expect(name, entry.id).toMatch(/^(Work|Study|Milestone): /);
    }
  });

  it("keeps impact (or context), chips, dates, links, recordings, awards and case studies inside the row", () => {
    let studies = 0;
    for (const row of rows()) {
      const entry = ENTRIES.find((e) => e.id === row.dataset.treeBranch)!;
      const panel = row.querySelector(`#record-row-${entry.id}-panel`)!;
      const text = panel.textContent ?? "";
      for (const line of entry.impact.length > 0 ? entry.impact : [entry.context]) expect(text, entry.id).toContain(line);
      expect(text, entry.id).toContain(entry.dateRange);
      for (const t of entry.technologies) expect(text, entry.id).toContain(t);
      if (entry.link) expect(panel.querySelector(`a[href="${entry.link.href}"]`), entry.id).not.toBeNull();
      if (entry.recording) expect(within(panel as HTMLElement).getByRole("button", { name: `Play the screen recording of ${entry.role}` })).toBeTruthy();
      if (entry.award) expect(panel.querySelector(`button[commandfor="award-${entry.id}"]`), entry.id).not.toBeNull();
      for (const study of row.querySelectorAll("article")) {
        expect(panel.contains(study)).toBe(true);
        studies += 1;
      }
    }
    expect(studies).toBe(projects.length);
  });

  it("opens one row at a time", () => {
    const list = rows();
    const [first, second] = list.map((row) => trigger(row)!);
    fireEvent.click(first);
    expect(openIds(list)).toEqual([list[0].dataset.treeBranch]);
    fireEvent.click(second);
    expect(openIds(list)).toEqual([list[1].dataset.treeBranch]);
    fireEvent.click(second);
    expect(openIds(list)).toEqual([]);
  });

  function watchLandings() {
    const scrolled = vi.fn();
    (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = scrolled;
    let queue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => queue.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const frame = () => {
      const due = queue;
      queue = [];
      for (const callback of due) callback(0);
    };
    return { scrolled, frame };
  }

  it("opens the row a fragment names, or the row around the element it names, and lands on it", async () => {
    const { scrolled, frame } = watchLandings();
    setHash("#work-dd-scraper-platform");
    const list = rows();
    await act(async () => {});
    expect(openIds(list)).toEqual(["doordash"]);
    act(frame);
    expect(scrolled.mock.contexts[0]).toBe(document.getElementById("work-dd-scraper-platform"));

    await act(async () => {
      setHash(`#${journeyEntryAnchorId("magellan")}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(openIds(list)).toEqual(["magellan"]);
  });

  it("hands the no-script :target opening to React once mounted", async () => {
    const { container } = render(<RecordYears />);
    await act(async () => {});
    expect(container.querySelector("[data-timeline]")).toHaveAttribute("data-live", "");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("[data-timeline]:not([data-live]) [data-tree-branch]:is(:target, :has(:target))");
  });
});
