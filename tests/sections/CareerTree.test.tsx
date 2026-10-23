import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { buildDrawnTree, DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import { DrawnTree } from "@/sections/CareerTree/DrawnTree";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries, journey } from "@/content/portfolio";

/**
 * The section as a whole, rendered once. Anything that is true of "the Journey"
 * and not of a single component lives here: that no case study went missing
 * when nine entries stopped being branches, and that rendering the same case
 * study in two presentations did not put an id in the document twice.
 */
describe("the Journey section", () => {
  /**
   * The retired section ids the Journey answers: `#journey`, and `#skills` and
   * `#workshop`, nav targets of sections rounds 16 and 18 deleted; they are in
   * bookmarks and possibly in a shared resume PDF. (`#work` went to the Record
   * with the case studies: `tests/sections/Record.test.tsx`.) Real zero-size elements rather than a
   * client-side hash rewrite, so the landing works with JavaScript disabled —
   * which only `e2e/legacy-anchors.spec.ts` can actually prove. The per-entry
   * `journey-entry-<id>` fragments are asserted below, under "per-entry
   * fragments".
   */
  const LEGACY = ["journey", "skills", "workshop"];

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

  it("holds no timeline, credentials line or case study: those are the Record's", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree")!;
    for (const selector of ["[data-timeline]", "[data-credentials-strip]", "[data-unbranched-case-studies]", "article", "#work"]) {
      expect(section.querySelector(selector), selector).toBeNull();
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

  it("has no rail and no eyebrow", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree")!;
    expect(section.querySelector(".rail")).toBeNull();
    expect(section.querySelector(".eyebrow-lead")).toBeNull();
  });

  it("opens with the heading and my line", () => {
    render(<CareerTree />);
    expect(document.querySelector("h2#tree-heading")?.textContent).toBe(journey.heading);
    const lead = [...document.querySelectorAll("#tree .font-serif.italic")].find((el) => el.textContent === journey.lead);
    expect(lead).toBeDefined();
  });

  it("the lead is true", () => {
    // "Every job I've had is a branch, and the tools I used there are its leaves."
    const drawn = buildDrawnTree();
    for (const entry of careerEntries.filter((e) => e.type === "work")) {
      const branch = drawn.find((b) => b.id === entry.id);
      expect(branch, entry.id).toBeDefined();
    }
    for (const branch of drawn) {
      const own = careerEntries.find((e) => e.id === branch.id)!.technologies as readonly string[];
      for (const leaf of branch.leaves) expect(own, `${branch.id}: ${leaf.text}`).toContain(leaf.text);
    }
  });

  it("the scenery is decoration", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree")!;
    const art = section.querySelectorAll("[data-scenery]");
    expect(art.length).toBeGreaterThan(0);
    for (const el of art) expect(el.closest('[aria-hidden="true"]'), el.getAttribute("data-scenery") ?? "").not.toBeNull();
    const stage = section.querySelector('[data-scenery="journey"]')!;
    expect(stage.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
  });

  it("the morning by day and the evening at night", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree")!;
    const day = [...section.querySelectorAll(".day-only")];
    const night = [...section.querySelectorAll(".night-only")];
    expect(day.map((el) => el.textContent)).toEqual([journey.vignette.morning]);
    expect(night.map((el) => el.textContent)).toEqual([journey.vignette.evening]);
  });

  it("the oak holds one lantern per layout", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree")!;
    const lanterns = [...section.querySelectorAll<HTMLElement>("span")].filter(
      (el) => el.style.getPropertyValue("--art") === "var(--art-lantern)",
    );
    expect(lanterns).toHaveLength(2);
    expect(lanterns.filter((el) => el.closest('[data-scenery="journey"]'))).toHaveLength(1);
    expect(lanterns.filter((el) => el.closest("[data-crown]"))).toHaveLength(1);
    for (const el of lanterns) expect(el.closest('[aria-hidden="true"]')).not.toBeNull();
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

  it("stacks the tags, Watch it grow and the drawing, in that order", () => {
    render(<CareerTree />);
    const blocks = [
      document.querySelector("[data-hanging-tags]"),
      screen.getByRole("button", { name: journey.watch }),
      document.querySelector("[data-origin-host]"),
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
  });

  it("renders no pinned stage and no act", () => {
    render(<CareerTree />);
    for (const selector of ["[data-stage]", "[data-act]", "[data-branch-act]", '[id^="act-"]']) {
      expect(document.querySelectorAll(selector), selector).toHaveLength(0);
    }
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
 * ~1,400-line player when the box first plays or "Watch it grow" is
 * pressed. These tests are about where it is mounted and what it is mounted
 * *inside*, because that is the part a refactor breaks silently: the player
 * positions itself `absolute inset-0` against `[data-origin-host]` and walks
 * up to the same element with `closest()` to find the growable groups it
 * conducts, so the overlay and the drawing have to share one box.
 */
describe("the way back into the origin story", () => {
  it("offers \"Watch it grow\" before the box, as the primary control", () => {
    render(<CareerTree />);
    const section = document.getElementById("tree");
    if (!(section instanceof HTMLElement)) throw new Error("no #tree section");
    const button = within(section).getByRole("button", { name: "Watch it grow" });
    expect(
      [/(^|\s)bg-control(\s|$)/, /(^|\s)bg-\[color:var\(--control\)\](\s|$)/].some((fill) => fill.test(button.className)),
    ).toBe(true);
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
