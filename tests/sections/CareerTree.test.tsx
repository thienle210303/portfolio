import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { ACTS } from "@/sections/CareerTree/acts";
import { buildDrawnTree, DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import KnowledgeTreeList from "@/sections/CareerTree/KnowledgeTreeList";
import { ACT_IDS, actAnchorId, actForEntry } from "@/lib/anchors";
import { caseStudyAnchorId } from "@/sections/CareerTree/anchors";
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
   * `journey-entry-<id>` fragments are `Stage`'s and are asserted in
   * `tests/sections/Stage.test.tsx`.
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

  it("puts the projects of demoted entries under the stage, not inside a branch", () => {
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
    // The drawing and the list each hold the branches' case studies, and only
    // one of them is ever displayed; without a scope on the second copy every
    // `id`, `aria-controls` and `aria-labelledby` here would exist twice and
    // point at whichever came first.
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

/**
 * What the Journey *draws* is decided here, not in `Stage`: the drawing, the
 * list and the credentials strip are built by this component and handed to the
 * stage as slots. These tests lived in `Stage.test.tsx` through round 18's
 * first pass and rendered `<CareerTree />` from there, which named the wrong
 * subject; they are the same tests, filed under the component they render.
 */
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

  it("puts the credentials strip in exactly one act, the one that says it shows it", () => {
    render(<CareerTree />);
    const strips = document.querySelectorAll("[data-credentials-strip]");
    expect(strips).toHaveLength(1);
    const owner = ACTS.find((candidate) => candidate.showsCredentials);
    if (!owner) throw new Error("no act shows the credentials strip");
    // The same claim `src/lib/anchors.ts` makes in its ENTRY_ACTS comment:
    // `deans-list` is filed in `two-jobs` because that is where the strip is.
    expect(owner.id).toBe("two-jobs");
    expect(document.getElementById(actAnchorId(owner.id))).toContainElement(
      strips[0] as HTMLElement,
    );
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

  it("marks every branch with the act it is drawn in, and keeps all of them in the document", () => {
    render(<CareerTree />);
    // The drawing's branches carry `data-branch-act`; the list shown below
    // 1024px is the other presentation of the same branches and does not.
    const branches = document.querySelectorAll("[data-tree-branch][data-branch-act]");
    expect(branches).toHaveLength(careerEntries.length - DEMOTED_ENTRY_IDS.length);
    for (const branch of branches) {
      const id = branch.getAttribute("data-tree-branch") ?? "";
      expect(Number(branch.getAttribute("data-branch-act")), id).toBe(
        ACT_IDS.indexOf(actForEntry(id) ?? "crossing"),
      );
    }
    // Scrubbing to the end changes no branch's presence, only the stage's
    // `data-through`; nothing is ever removed to make it "not yet".
    fireEvent.change(screen.getByRole("slider", { name: /year/i }), {
      target: { value: String(ACTS.length - 1) },
    });
    expect(document.querySelectorAll("[data-tree-branch][data-branch-act]")).toHaveLength(
      branches.length,
    );
  });
});

/**
 * The origin-story player, re-homed by round 18's second plan (Decision A).
 *
 * `WatchOrigin` is the always-loaded half — a small button that `import()`s the
 * ~1,400-line player on press. These tests are about where it is mounted and
 * what it is mounted *inside*, because that is the part a refactor breaks
 * silently: the player positions itself `absolute inset-0` against
 * `[data-origin-host]` and walks up to the same element with `closest()` to
 * find the growable groups it conducts, so the button, the overlay and the
 * drawing all have to share one box.
 */
describe("the way back into the origin story", () => {
  it("offers \"Watch how it grew\" inside the section", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    // The same locator `e2e/axe.spec.ts` and `e2e/companion.spec.ts` use.
    expect(within(section).getByRole("button", { name: "Watch how it grew" })).toBeInTheDocument();
  });

  it("mounts the button inside the one box the player overlays and conducts", () => {
    render(<CareerTree />);
    const host = document.querySelector("[data-origin-host]");
    if (!(host instanceof HTMLElement)) {
      throw new Error("no [data-origin-host] around the drawing");
    }
    expect(host).toContainElement(within(host).getByRole("button", { name: "Watch how it grew" }));
    // The host is the drawing's own box, not the stage's: the player's ground
    // slice is pinned to its bottom edge, which has to be the tree's own ground
    // line (`e2e/origin.spec.ts`, "ground anchoring").
    expect(
      host.querySelectorAll("[data-tree-branch][data-branch-act]").length,
      "the host does not contain the drawing",
    ).toBeGreaterThan(0);
    // And the groups the conductor releases are reachable from it.
    expect(
      host.querySelectorAll("[data-origin-year]").length,
      "nothing inside the host carries data-origin-year, so no beat could release anything",
    ).toBeGreaterThan(0);
  });

  it("keeps the player itself out of the render: one button, no stage", () => {
    render(<CareerTree />);
    // The chunk is fetched on press. Nothing of the player may be in the
    // document before that, or it is not a lazy boundary any more.
    expect(document.querySelectorAll("[data-origin-stage]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-origin-watch]")).toHaveLength(1);
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
    // Only the active act's title is in the DOM at rest, so check them all.
    const titles = Object.values(ACTS).map((act) => act.title);
    expect(titles.filter((t) => /\b(he|his|him|himself)\b/i.test(t))).toEqual([]);
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
 * What the drawing says about each branch: the headline at rest, outside the
 * trigger, and the impact lines behind the click. Scoped to the desktop
 * drawing (`[data-origin-host]`), because the mobile list renders the same
 * content in its own markup.
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

  it("shows each drawn branch's headline at rest, outside its trigger", () => {
    const host = drawing();
    let seen = 0;
    for (const entry of drawnEntries()) {
      if (!entry.headline) continue;
      const branch = host.querySelector(`[data-tree-branch="${entry.id}"]`);
      const headline = branch?.querySelector("[data-tree-headline]");
      expect(headline?.textContent, entry.id).toBe(entry.headline);
      const trigger = host.querySelector(`#tree-branch-${entry.id}-trigger`);
      expect(trigger?.contains(headline ?? null), entry.id).toBe(false);
      expect(trigger?.textContent, entry.id).not.toContain(entry.headline);
      seen += 1;
    }
    expect(seen, "every drawn branch authors a headline").toBe(11);
  });

  it("puts every impact line, verbatim and in order, in its own branch's panel", () => {
    const host = drawing();
    let total = 0;
    for (const entry of drawnEntries()) {
      const panel = host.querySelector(`#tree-branch-${entry.id}-panel`);
      const lines = [...(panel?.querySelectorAll('ul[aria-labelledby$="-changed"] > li') ?? [])].map((li) => li.textContent);
      expect(lines, entry.id).toEqual([...entry.impact]);
      total += lines.length;
    }
    expect(total).toBe(16);
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

  it("says nothing about change on a branch that authored none", () => {
    const host = drawing();
    const bare = drawnEntries().filter((entry) => entry.impact.length === 0);
    expect(bare).toHaveLength(5);
    for (const entry of bare) {
      const panel = host.querySelector(`#tree-branch-${entry.id}-panel`);
      expect(panel?.textContent, entry.id).not.toContain("What it changed");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The mobile list                                                            */
/* -------------------------------------------------------------------------- */

describe("the mobile list's rows", () => {
  const entries = careerEntries.filter(
    (entry) => !(DEMOTED_ENTRY_IDS as readonly string[]).includes(entry.id),
  );
  function rows(): HTMLElement[] {
    const { container } = render(<KnowledgeTreeList tree={buildDrawnTree()} />);
    return [...container.querySelectorAll<HTMLElement>("[data-tree-branch]")];
  }
  const trigger = (row: HTMLElement) => row.querySelector("button[aria-expanded]");

  it("shows title, headline and chips without opening", () => {
    const list = rows();
    expect(list).toHaveLength(11);
    for (const row of list) {
      const entry = entries.find((candidate) => candidate.id === row.dataset.treeBranch);
      if (!entry) throw new Error(`no entry for ${row.dataset.treeBranch}`);
      const btn = trigger(row);
      expect(btn?.textContent, entry.id).toContain(entry.role);
      const headline = row.querySelector("[data-tree-headline]");
      expect(headline?.textContent, entry.id).toBe(entry.headline);
      expect(btn?.contains(headline ?? null), entry.id).toBe(false);
      const chips = row.querySelector('[aria-label^="Technologies used"]');
      if (entry.technologies.length === 0) {
        expect(chips, entry.id).toBeNull();
        continue;
      }
      expect(chips, entry.id).not.toBeNull();
      expect(
        [...(chips?.querySelectorAll(":scope > li > span:first-child") ?? [])].map(
          (li) => li.textContent,
        ),
        entry.id,
      ).toEqual([...entry.technologies]);
      expect(btn?.contains(chips ?? null), entry.id).toBe(false);
      expect(
        row.querySelector(`#tree-list-branch-${entry.id}-panel`)?.contains(chips ?? null),
        entry.id,
      ).toBe(false);
    }
  });

  it("keeps impact, dates, siblings and case studies inside the disclosure", () => {
    let impactTotal = 0;
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
      // The kind · dates eyebrow, not the bare range: a one-year range ("2022")
      // is also the year in the trigger.
      const dates = [...panel.querySelectorAll("p.eyebrow")].find((el) =>
        el.textContent?.endsWith(` · ${entry.dateRange}`),
      );
      expect(dates, entry.id).toBeDefined();
      const trigger = row.querySelector("button[aria-expanded]");
      const preview = row.querySelector("[data-tree-headline]")?.parentElement;
      expect(trigger?.textContent, entry.id).not.toContain(dates?.textContent ?? "");
      expect(preview?.textContent ?? "", entry.id).not.toContain(dates?.textContent ?? "");
      for (const el of row.querySelectorAll("p")) {
        if (el.textContent?.startsWith("Ran alongside")) {
          expect(panel.contains(el), entry.id).toBe(true);
          siblingLines += 1;
        }
      }
      for (const study of row.querySelectorAll("article")) {
        expect(panel.contains(study), entry.id).toBe(true);
        studies += 1;
      }
    }
    expect(impactTotal).toBe(16);
    expect(siblingLines, "rows with a Ran alongside line").toBe(10);
    expect(studies, "case studies rendered in the list").toBe(4);
  });

  it("renders no empty chips list", () => {
    const bare = buildDrawnTree().map((branch) => ({ ...branch, leaves: [] }));
    const { container } = render(<KnowledgeTreeList tree={bare} />);
    expect(container.querySelectorAll("[data-tree-branch]")).toHaveLength(11);
    expect(container.querySelector('[aria-label^="Technologies used"]')).toBeNull();
  });
});
