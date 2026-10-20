import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, within } from "@testing-library/react";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { buildDrawnTree, DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import KnowledgeTreeList from "@/sections/CareerTree/KnowledgeTreeList";
import { DrawnTree } from "@/sections/CareerTree/DrawnTree";
import { caseStudyAnchorId, journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries, projects } from "@/content/portfolio";
import { buildDocuments } from "@/lib/answer-corpus";
import { careerIndexable, education, projectsIndexable } from "@/lib/answer-sources";
import type { CareerEntry } from "@/types/portfolio";

/**
 * The section as a whole, rendered once. Anything that is true of "the Journey"
 * and not of a single component lives here: that no case study went missing
 * when nine entries stopped being branches, and that rendering the same case
 * study in two presentations did not put an id in the document twice.
 */
describe("the Journey section", () => {
  /**
   * Every retired section id, not just `#journey`. `#work`, `#skills` and
   * `#workshop` were nav targets of sections rounds 16 and 18 deleted; they are
   * in bookmarks and possibly in a shared resume PDF, and this section is where
   * the content they named went. Real zero-size elements rather than a
   * client-side hash rewrite, so the landing works with JavaScript disabled —
   * which only `e2e/legacy-anchors.spec.ts` can actually prove. The per-entry
   * `journey-entry-<id>` fragments are asserted below, under "per-entry
   * fragments".
   */
  const LEGACY = ["journey", "work", "skills", "workshop"];

  it("keeps every retired section id resolvable", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    for (const id of LEGACY) {
      const target = document.getElementById(id);
      expect(target, id).not.toBeNull();
      // Inside the section, so the landing is the Journey rather than wherever
      // in the document the element happened to be written.
      expect(section, id).toContainElement(target);
      expect(target, id).toHaveAttribute("aria-hidden", "true");
      expect(target?.textContent, id).toBe("");
      expect(target?.className, id).toContain("sr-only");
      expect(target?.className, id).toMatch(/\bscroll-mt-/);
    }
  });

  it("writes each retired section id exactly once", () => {
    render(<CareerTree />);
    for (const id of LEGACY) {
      // `getElementById` returns the first match, so a duplicate would be
      // invisible to the test above.
      expect(document.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
    }
  });

  it("renders every case study somewhere, whether or not its entry is a branch", () => {
    render(<CareerTree />);
    for (const project of projects) {
      expect(document.getElementById(caseStudyAnchorId(project.id)), project.id).not.toBeNull();
    }
  });

  it("puts the projects of demoted entries after the timeline, not inside a row", () => {
    render(<CareerTree />);
    const homeless = projects.filter((project) =>
      (DEMOTED_ENTRY_IDS as readonly string[]).includes(project.careerEntryId),
    );
    // Not vacuous: the degree and the capstone really do own projects.
    expect(homeless.length).toBeGreaterThan(0);
    const extras = document.querySelector("[data-unbranched-case-studies]");
    if (!(extras instanceof HTMLElement)) throw new Error("no unbranched case studies rendered");
    for (const project of homeless) {
      expect(extras.querySelector(`#${caseStudyAnchorId(project.id)}`), project.id).not.toBeNull();
    }
  });

  it("never writes an id into the document twice", () => {
    // The drawing and the timeline present the same branches; only the
    // timeline holds their case studies and fragments. A second copy of either
    // would put every `id`, `aria-controls` and `aria-labelledby` here twice,
    // pointing at whichever came first.
    render(<CareerTree />);
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) {
      seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    }
    const duplicated = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
    expect(duplicated).toEqual([]);
  });

  it("says in the rail how many entries became credentials", () => {
    render(<CareerTree />);
    expect(document.body.textContent).toContain(
      `${careerEntries.length - DEMOTED_ENTRY_IDS.length} drawn · ${DEMOTED_ENTRY_IDS.length} as credentials`,
    );
  });
});

/** What the Journey draws, and in what order. */
describe("what the Journey draws", () => {
  it("leaves the nine demoted entries off the drawing, and keeps the rest", () => {
    render(<CareerTree />);
    for (const id of DEMOTED_ENTRY_IDS) {
      expect(document.querySelector(`[data-tree-branch="${id}"]`), id).toBeNull();
    }
    const drawn = careerEntries.filter(
      (entry) => !(DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id),
    );
    expect(drawn.length).toBe(careerEntries.length - DEMOTED_ENTRY_IDS.length);
    for (const entry of drawn) {
      expect(document.querySelector(`[data-tree-branch="${entry.id}"]`), entry.id).not.toBeNull();
    }
  });

  it("stacks highlights, drawing, timeline, credentials and the unbranched case studies, in that order", () => {
    render(<CareerTree />);
    const blocks = [
      document.querySelector('[aria-label="Highlights"]'),
      document.querySelector("[data-origin-host]"),
      document.querySelector("[data-timeline]"),
      document.querySelector("[data-credentials-strip]"),
      document.querySelector("[data-unbranched-case-studies]"),
    ];
    blocks.forEach((block, index) => expect(block, `block ${index}`).not.toBeNull());
    for (let index = 1; index < blocks.length; index += 1) {
      const before = blocks[index - 1] as Element;
      const after = blocks[index] as Element;
      expect(
        before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
        `block ${index - 1} is not before block ${index}`,
      ).toBeTruthy();
    }
    expect(document.querySelectorAll("[data-credentials-strip]")).toHaveLength(1);
  });

  it("renders no pinned stage and no act", () => {
    render(<CareerTree />);
    for (const selector of ["[data-stage]", "[data-act]", "[data-branch-act]", '[id^="act-"]']) {
      expect(document.querySelectorAll(selector), selector).toHaveLength(0);
    }
  });

  it("names all nine demoted entries on the strip, read from the content layer", () => {
    render(<CareerTree />);
    const strip = document.querySelector("[data-credentials-strip]");
    if (!(strip instanceof HTMLElement)) throw new Error("no credentials strip rendered");
    const items = within(strip).getAllByRole("listitem");
    expect(items).toHaveLength(DEMOTED_ENTRY_IDS.length);
    for (const id of DEMOTED_ENTRY_IDS) {
      const entry = careerEntries.find((candidate) => candidate.id === id);
      if (!entry) throw new Error(`demoted id ${id} is not a career entry`);
      expect(strip.textContent, id).toContain(entry.role);
    }
  });

  it("keeps the repository links the demoted entries carry", () => {
    render(<CareerTree />);
    const strip = document.querySelector("[data-credentials-strip]");
    if (!(strip instanceof HTMLElement)) throw new Error("no credentials strip rendered");
    const entries: readonly CareerEntry[] = careerEntries;
    const linked = entries.flatMap((entry) =>
      (DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id) && entry.link
        ? [{ entry, link: entry.link }]
        : [],
    );
    // Not vacuous: the two hackathon entries each point at a real repository.
    expect(linked.length).toBeGreaterThan(0);
    for (const { entry, link } of linked) {
      // A predicate rather than a `RegExp` built from content: a role holding a
      // regex metacharacter would throw a `SyntaxError` here instead of failing
      // with something a reader could act on. The role is part of the name, not
      // all of it — `ExternalLink` appends its own "(opens in a new tab)".
      const anchor = within(strip).getByRole("link", {
        name: (name: string) => name.includes(entry.role),
      });
      expect(anchor, entry.id).toHaveAttribute("href", link.href);
      // The authored `label` too: `careerEntry.link` is read in this one file
      // and `/resume` does not read it at all, so if the strip drops the label
      // that string exists nowhere on the site.
      expect(strip.textContent, entry.id).toContain(link.label);
    }
    // A line, not a re-expansion: still one list item per entry.
    expect(within(strip).getAllByRole("listitem")).toHaveLength(DEMOTED_ENTRY_IDS.length);
  });

  it("never draws the degree beside the roles inside it", () => {
    // `usc-degree` contains every 2021-2025 role rather than running alongside
    // them (see `concurrentWith` in src/lib/knowledge-tree.ts), and it is
    // demoted, so it is not a drawn branch for anything to be concurrent with.
    render(<CareerTree />);
    expect(document.querySelector('[data-tree-branch="usc-degree"]')).toBeNull();
    const overlapping = document.querySelectorAll("[data-tree-branch][data-concurrent-with]");
    // Not vacuous: the two jobs of 2024 genuinely overlap and must be marked.
    expect(overlapping.length).toBeGreaterThan(0);
    for (const branch of overlapping) {
      const ids = (branch.getAttribute("data-concurrent-with") ?? "").split(" ");
      expect(ids).not.toContain("usc-degree");
      for (const id of ids) {
        expect(document.querySelector(`[data-tree-branch="${id}"]`), id).not.toBeNull();
      }
    }
    expect(
      document
        .querySelector('[data-tree-branch="schaeffler"]')
        ?.getAttribute("data-concurrent-with")
        ?.split(" "),
    ).toContain("wordification");
  });
});

/**
 * The origin-story player, now grown in the tree box (`TreeBox.tsx`).
 *
 * `WatchOrigin` is the always-loaded half — a mount point that `import()`s the
 * ~1,400-line player when the box first plays or "See how it grows" is
 * pressed. These tests are about where it is mounted and what it is mounted
 * *inside*, because that is the part a refactor breaks silently: the player
 * positions itself `absolute inset-0` against `[data-origin-host]` and walks
 * up to the same element with `closest()` to find the growable groups it
 * conducts, so the overlay and the drawing have to share one box.
 */
describe("the way back into the origin story", () => {
  it("offers \"See how it grows\" in the section header, before the box", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    const button = within(section).getByRole("button", { name: "See how it grows" });
    const box = section.querySelector("[data-tree-box]");
    if (!(box instanceof HTMLElement)) throw new Error("no [data-tree-box]");
    expect(box).not.toContainElement(button);
    expect(button.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the one box the player overlays and conducts around the drawing", () => {
    render(<CareerTree />);
    const host = document.querySelector("[data-tree-box] > [data-origin-host]");
    if (!(host instanceof HTMLElement)) {
      throw new Error("no [data-origin-host] around the drawing");
    }
    // The host is the drawing's own box, not the section's: the player's ground
    // slice is pinned to its bottom edge, which has to be the tree's own ground
    // line (`e2e/origin.spec.ts`, "ground anchoring").
    expect(
      host.querySelectorAll("[data-tree-panel]").length,
      "the host does not contain the drawing",
    ).toBeGreaterThan(0);
    // And the groups the conductor releases are reachable from it.
    expect(
      host.querySelectorAll("[data-origin-year]").length,
      "nothing inside the host carries data-origin-year, so no beat could release anything",
    ).toBeGreaterThan(0);
  });

  it("keeps the player itself out of the render", () => {
    render(<CareerTree />);
    // The chunk is fetched on the first play. Nothing of the player may be in
    // the document before that, or it is not a lazy boundary any more.
    expect(document.querySelectorAll("[data-origin-stage]")).toHaveLength(0);
  });

  it("does not bring the roots back with it", () => {
    // Decision A, requirement 4: the player came back, the root furniture did
    // not. `RootLabels`, `RootSystem`, `TreeFigure` and the plinth were never
    // mounted by the stage and were deleted in round 18's Task 14; these three
    // attributes were theirs alone, so this fails if any of them returns.
    render(<CareerTree />);
    expect(document.querySelectorAll("[data-tree-root]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-cat-nap]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-tree-figure]")).toHaveLength(0);
  });
});

/**
 * The guarantee `Document.sectionId` in `src/lib/answer-corpus.ts` actually
 * makes, enforced.
 *
 * That contract does **not** promise a cited sentence is printed in the section
 * it names — for 38 of the 54 career and education documents it is not, which is
 * measured and recorded there. What it does promise is weaker and checkable: the
 * named section renders **the subject** the sentence belongs to. Nothing checked
 * that, which is how the previous, stronger wording drifted 38 times without a
 * single test going red; a 39th drift — a new document type, another section
 * deleted, a component quietly stopping rendering a role — would have been just
 * as invisible.
 *
 * This file is where it is cheapest to check, because it already renders the
 * section. Two halves, and both are needed: that every subject `#tree` is cited
 * for is in `#tree`, and that every document citing `#tree` belongs to one of
 * those subjects. Half one alone would pass while a new document type cited the
 * section for something nobody renders; half two alone would pass while the
 * section stopped rendering all of them.
 */
describe("the subjects #tree is cited for", () => {
  /** The rendered Journey's text, whitespace-normalised: `textContent` runs
   *  adjacent elements together, so a subject split across a heading and a
   *  sibling span still reads as one string. */
  function journeyText(): string {
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    return (section.textContent ?? "").replace(/\s+/g, " ");
  }

  it("renders nothing on the Journey in the third person", () => {
    render(<CareerTree />);
    expect(journeyText().length).toBeGreaterThan(1000);
    expect(journeyText().match(/\b(he|his|him|himself)\b/gi) ?? []).toEqual([]);
  });

  /** Every string the corpus's `#tree` documents name a subject by, and which
   *  of them `#tree` is expected to render. Built from the same sources
   *  `buildDocuments` reads, so it cannot drift from the corpus. */
  function subjectNeedles(): readonly { readonly subject: string; readonly needle: string }[] {
    return [
      ...careerIndexable.flatMap((entry) => [
        { subject: entry.id, needle: entry.role },
        { subject: entry.id, needle: entry.organization },
      ]),
      ...projectsIndexable.map((project) => ({ subject: project.id, needle: project.title })),
      ...education.map((school) => ({ subject: school.id, needle: school.institution })),
    ];
  }

  it("renders every subject it is cited for", () => {
    render(<CareerTree />);
    const text = journeyText();
    const needles = subjectNeedles();
    // Not vacuous: an empty content layer would make the loop assert nothing.
    expect(
      needles.length,
      "the corpus names no subjects, so the loop below would prove nothing",
    ).toBeGreaterThan(0);
    const missing = needles
      .filter(({ needle }) => !text.includes(needle.replace(/\s+/g, " ")))
      .map(({ subject, needle }) => `${subject}: ${needle}`);
    expect(
      missing,
      "the Journey is cited as the place to see these subjects and does not render them",
    ).toEqual([]);
  });

  it("cites #tree only for subjects it renders", () => {
    const needles = subjectNeedles().map(({ needle }) => needle);
    const cited = buildDocuments().filter((doc) => doc.sectionId === "tree");
    expect(cited.length, "no document cites #tree, so the loop below is empty").toBeGreaterThan(0);
    // A document names its subject in its `label` — the role and organisation for
    // a career entry, the title for a project, the institution for a school — so
    // a `#tree` citation for something outside the verified set shows up here.
    const unaccounted = cited
      .filter((doc) => !needles.some((needle) => doc.label.includes(needle)))
      .map((doc) => doc.text.slice(0, 60));
    expect(
      unaccounted,
      "a document cites #tree for a subject the test above never verified is rendered there",
    ).toEqual([]);
  });
});

/**
 * What the drawing says about each branch: the role (a link to its timeline
 * row), the year, and the headline at rest — and nothing the row holds.
 * Scoped to the drawing (`[data-origin-host]`), because the timeline renders
 * the same branches in its own markup.
 */
describe("the drawing's branch cards", () => {
  function drawing(): HTMLElement {
    render(<CareerTree />);
    const host = document.querySelector("[data-origin-host]");
    if (!(host instanceof HTMLElement)) throw new Error("no [data-origin-host] around the drawing");
    return host;
  }
  const drawnEntries = () =>
    careerEntries.filter((entry) => !(DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id));

  it("shows each drawn branch's headline at rest, and links its role to the row", () => {
    const host = drawing();
    let seen = 0;
    for (const entry of drawnEntries()) {
      const branch = host.querySelector(`[data-tree-branch="${entry.id}"]`);
      const link = branch?.querySelector("[data-tree-panel] a");
      expect(link?.getAttribute("href"), entry.id).toBe(`#${journeyEntryAnchorId(entry.id)}`);
      expect(link?.textContent, entry.id).toContain(entry.role);
      if (!entry.headline) continue;
      expect(branch?.querySelector("[data-tree-headline]")?.textContent, entry.id).toBe(entry.headline);
      seen += 1;
    }
    expect(seen, "every drawn branch authors a headline").toBe(11);
  });

  it("holds no control but the link, and none of what the row holds", () => {
    const host = drawing();
    expect(host.querySelectorAll("[data-tree-panel] button")).toHaveLength(0);
    expect(host.querySelectorAll("[data-tree-panel] [id]")).toHaveLength(0);
    expect(host.querySelectorAll("article")).toHaveLength(0);
    expect(host.textContent).not.toContain("What it changed");
  });

  it("draws no impact line as a leaf", () => {
    const host = drawing();
    const impact = new Set(drawnEntries().flatMap((entry) => entry.impact));
    const leaves = [...host.querySelectorAll('[data-origin-tier="leaf"]')].map((el) =>
      el.textContent?.trim(),
    );
    expect(leaves.length).toBeGreaterThan(0);
    for (const text of leaves) expect(impact.has(text ?? ""), text).toBe(false);
  });

  it("names the branch panel the same way in DrawnTree, the stylesheet and the axe audit", () => {
    // `data-tree-panel` is a contract with three parties: DrawnTree stamps it,
    // globals.css hides a pending branch's panel through it while the origin
    // story runs, and e2e/axe.spec.ts polls it for that fade to finish before
    // auditing. Renaming it in one place breaks the other two silently.
    const drawn = buildDrawnTree();
    const { container } = render(<DrawnTree tree={drawn} />);
    const stamped = new Set<string>();
    for (const element of container.querySelectorAll("*")) {
      for (const name of element.getAttributeNames()) {
        if (name.startsWith("data-tree-panel")) stamped.add(name);
      }
    }
    expect([...stamped], "DrawnTree stamps no data-tree-panel* attribute").toEqual(["data-tree-panel"]);
    expect(container.querySelectorAll("[data-tree-panel]").length, "a drawn branch has no panel").toBe(
      drawn.length,
    );
    const css = readFileSync("src/app/globals.css", "utf8");
    const axe = readFileSync("e2e/axe.spec.ts", "utf8");
    expect(css).toContain("[data-tree-panel]");
    expect(axe).toContain("[data-tree-panel]");
    for (const source of [css, axe]) {
      for (const name of source.match(/data-tree-panel[\w-]*/g) ?? []) {
        expect(stamped.has(name), `${name} is selected but never stamped`).toBe(true);
      }
    }
  });

  it("no longer claims to fade root furniture the page does not render", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain("[data-origin-running] [data-tree-root]");
    expect(css).not.toContain("[data-origin-running] [data-cat-nap] > p");
  });
});

/* -------------------------------------------------------------------------- */
/* Per-entry fragments                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `journey-entry-<id>` was the deleted timeline `<li>`'s id, then a zero-size
 * span in the stage's acts; round 20 puts it back on content. A drawn entry's
 * fragment is its timeline row; a demoted entry's is its credentials line.
 * Neither landing is provable from jsdom; `e2e/legacy-anchors.spec.ts` is.
 */
describe("per-entry fragments", () => {
  it("gives every career entry exactly one element, inside the section", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    expect(careerEntries.length, "no career entries, so nothing was checked").toBeGreaterThan(0);
    for (const entry of careerEntries) {
      const id = journeyEntryAnchorId(entry.id);
      expect(document.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
      expect(section, id).toContainElement(document.getElementById(id));
      expect(document.getElementById(id)?.className, id).toMatch(/\bscroll-mt-20\b/);
    }
  });

  it("puts a drawn entry's fragment on its timeline row and a demoted one's on its credentials line", () => {
    render(<CareerTree />);
    const timeline = document.querySelector<HTMLElement>("[data-timeline]");
    const strip = document.querySelector<HTMLElement>("[data-credentials-strip]");
    for (const entry of careerEntries) {
      const element = document.getElementById(journeyEntryAnchorId(entry.id));
      if ((DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id)) {
        expect(strip, entry.id).toContainElement(element);
        expect(element?.textContent, entry.id).toContain(entry.role);
      } else {
        expect(timeline, entry.id).toContainElement(element);
        expect(element?.getAttribute("data-tree-branch"), entry.id).toBe(entry.id);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The timeline                                                               */
/* -------------------------------------------------------------------------- */

describe("the timeline's rows", () => {
  const entries = careerEntries.filter(
    (entry) => !(DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id),
  );
  function rows(): HTMLElement[] {
    const { container } = render(<KnowledgeTreeList tree={buildDrawnTree()} />);
    return [...container.querySelectorAll<HTMLElement>("[data-tree-branch]")];
  }
  const trigger = (row: HTMLElement) => row.querySelector<HTMLButtonElement>("button[aria-expanded]");
  const openIds = (list: readonly HTMLElement[]) =>
    list
      .filter((row) => trigger(row)?.getAttribute("aria-expanded") === "true")
      .map((row) => row.dataset.treeBranch);

  // `replaceState` rather than assigning `location.hash`: an assignment also
  // queues a real `hashchange`, which would land a second time.
  const setHash = (hash: string) => window.history.replaceState(null, "", hash || "/");

  afterEach(() => {
    setHash("");
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows year, role · organisation and headline without opening, and nothing open", () => {
    const list = rows();
    expect(list).toHaveLength(11);
    expect(openIds(list)).toEqual([]);
    for (const row of list) {
      const entry = entries.find((candidate) => candidate.id === row.dataset.treeBranch);
      if (!entry) throw new Error(`no entry for ${row.dataset.treeBranch}`);
      const btn = trigger(row);
      expect(btn?.textContent, entry.id).toContain(entry.role);
      expect(btn?.textContent, entry.id).toContain(entry.sortKey.slice(0, 4));
      const headline = row.querySelector("[data-tree-headline]");
      expect(headline?.textContent, entry.id).toBe(entry.headline);
      expect(btn?.contains(headline ?? null), entry.id).toBe(false);
    }
  });

  it("keeps impact, chips, dates, siblings and case studies inside the disclosure", () => {
    let impactTotal = 0;
    let chipLists = 0;
    let siblingLines = 0;
    let studies = 0;
    for (const row of rows()) {
      const entry = entries.find((candidate) => candidate.id === row.dataset.treeBranch)!;
      const panel = row.querySelector(`#tree-list-branch-${entry.id}-panel`);
      if (!panel) throw new Error(`no panel for ${entry.id}`);
      const lines = [...row.querySelectorAll('ul[aria-labelledby$="-changed"] > li')];
      expect(
        lines.map((li) => li.textContent),
        entry.id,
      ).toEqual([...entry.impact]);
      for (const li of lines) expect(panel.contains(li), entry.id).toBe(true);
      impactTotal += lines.length;
      const chips = row.querySelector('[aria-label^="Technologies used"]');
      if (entry.technologies.length === 0) {
        expect(chips, entry.id).toBeNull();
      } else {
        expect(panel.contains(chips), entry.id).toBe(true);
        expect(
          [...(chips?.querySelectorAll(":scope > li > span:first-child") ?? [])].map(
            (li) => li.textContent,
          ),
          entry.id,
        ).toEqual([...entry.technologies]);
        chipLists += 1;
      }
      const dates = [...panel.querySelectorAll("p.eyebrow")].find((el) =>
        el.textContent?.endsWith(` · ${entry.dateRange}`),
      );
      expect(dates, entry.id).toBeDefined();
      for (const el of row.querySelectorAll("p")) {
        if (el.textContent?.startsWith("Ran alongside")) {
          expect(panel.contains(el), entry.id).toBe(true);
          siblingLines += 1;
        }
      }
      for (const study of row.querySelectorAll("article")) {
        expect(panel.contains(study), entry.id).toBe(true);
        // The main scope: the timeline owns `work-<projectId>` now.
        expect(study.id, entry.id).toMatch(/^work-[a-z0-9-]+$/);
        expect(study.id.endsWith("-list"), entry.id).toBe(false);
        studies += 1;
      }
    }
    expect(impactTotal).toBe(17);
    expect(chipLists).toBeGreaterThan(0);
    expect(siblingLines, "rows with a Ran alongside line").toBe(10);
    expect(studies, "case studies rendered in the list").toBe(4);
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

  /** jsdom has no scrollIntoView, and a hand-cranked frame says "painted". */
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
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled.mock.contexts[0]).toBe(document.getElementById("work-dd-scraper-platform"));

    await act(async () => {
      setHash(`#${journeyEntryAnchorId("usc-ta")}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(openIds(list)).toEqual(["usc-ta"]);
    act(frame);
    expect(scrolled).toHaveBeenCalledTimes(2);
    expect(scrolled.mock.contexts[1]).toBe(document.getElementById(journeyEntryAnchorId("usc-ta")));
  });

  it("reopens a closed row when a link to the fragment already in the URL is followed again", async () => {
    const { frame } = watchLandings();
    setHash(`#${journeyEntryAnchorId("usc-ta")}`);
    const list = rows();
    await act(async () => {});
    expect(openIds(list)).toEqual(["usc-ta"]);
    fireEvent.click(trigger(list.find((row) => row.dataset.treeBranch === "usc-ta")!)!);
    expect(openIds(list)).toEqual([]);

    const link = document.createElement("a");
    link.setAttribute("href", `#${journeyEntryAnchorId("usc-ta")}`);
    document.body.append(link);
    fireEvent.click(link);
    act(frame);
    expect(openIds(list)).toEqual(["usc-ta"]);
    link.remove();
  });

  it("opens the row but leaves the scroll alone after a reload", async () => {
    const { scrolled, frame } = watchLandings();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "reload" } as unknown as PerformanceEntry,
    ]);
    setHash("#work-dd-scraper-platform");
    const list = rows();
    await act(async () => {});
    act(frame);
    expect(openIds(list)).toEqual(["doordash"]);
    expect(scrolled).not.toHaveBeenCalled();
  });

  it("hands the no-script :target opening to React once mounted", async () => {
    const { container } = render(<KnowledgeTreeList tree={buildDrawnTree()} />);
    await act(async () => {});
    expect(container.querySelector("[data-timeline]")).toHaveAttribute("data-live", "");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(
      "[data-timeline]:not([data-live]) [data-tree-branch]:is(:target, :has(:target))",
    );
  });

  it("renders no empty chips list", () => {
    const bare = buildDrawnTree().map((branch) => ({ ...branch, leaves: [] }));
    const { container } = render(<KnowledgeTreeList tree={bare} />);
    expect(container.querySelectorAll("[data-tree-branch]")).toHaveLength(11);
    expect(container.querySelector('[aria-label^="Technologies used"]')).toBeNull();
  });
});
