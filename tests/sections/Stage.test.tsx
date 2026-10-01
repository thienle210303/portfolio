import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import Stage from "@/sections/CareerTree/Stage";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { ACTS } from "@/sections/CareerTree/acts";
import { DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import { ACT_IDS, actAnchorId, actForEntry } from "@/lib/anchors";
import { careerEntries } from "@/content/portfolio";
import type { CareerEntry } from "@/types/portfolio";

/**
 * jsdom ships no IntersectionObserver, and Stage has to survive that (an old
 * browser is the same situation). This fake records every observer the stage
 * makes, so a test can both count them and hand one a crossing.
 */
class FakeObserver {
  static instances: FakeObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.add(target);
  }
  unobserve(target: Element) {
    this.observed.delete(target);
  }
  disconnect() {
    this.observed.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  /** Report `target` as the act crossing the middle of the viewport. */
  cross(target: Element) {
    this.callback(
      [{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.instances = [];
});

/**
 * The stage on its own, with stand-ins for the slots. The real drawing, list
 * and credentials strip are server-rendered and handed in by `CareerTree`; the
 * stage's own behaviour — acts, scrubber, release, the observer — does not
 * depend on what they contain, which is exactly why they are slots.
 */
function renderStage() {
  return render(
    <Stage
      acts={ACTS}
      drawing={<div data-testid="drawing" />}
      list={<div data-testid="list" />}
      credentials={<div data-credentials-strip="" />}
    />,
  );
}

describe("the pinned stage", () => {
  it("renders every act as a real anchor target", () => {
    renderStage();
    for (const act of ACTS) {
      // Real elements with real ids, so an inbound link lands with
      // JavaScript disabled. Not a client-side hash rewrite. Looked up through
      // `actAnchorId`, the function the globe's plaque links are built with —
      // this is the "rendered" half of the declared/rendered pair that
      // `tests/lib/worlds.test.ts` documents.
      expect(act.anchorId).toBe(actAnchorId(act.id));
      expect(document.getElementById(actAnchorId(act.id)), act.id).not.toBeNull();
    }
  });

  it("exposes the scrubber as a labelled range input", () => {
    renderStage();
    const scrubber = screen.getByRole("slider", { name: /year/i });
    expect(scrubber).toHaveAttribute("min", "0");
    expect(scrubber).toHaveAttribute("max", String(ACTS.length - 1));
  });

  it("offers a way out of the pin", () => {
    renderStage();
    expect(screen.getByRole("button", { name: /whole tree/i })).toBeInTheDocument();
  });

  it("renders every act's content without scripting, not just the active one", () => {
    // The pin is an enhancement. With no JavaScript and with reduced motion,
    // all seven acts must be readable — so they are all in the DOM and the
    // stage hides them visually, never conditionally renders them.
    renderStage();
    for (const act of ACTS) {
      expect(screen.getByText(act.title), act.title).toBeInTheDocument();
    }
  });

  it("never hides an act from the accessibility tree or the tab order", () => {
    const { container } = renderStage();
    for (const act of ACTS) {
      const section = document.getElementById(actAnchorId(act.id));
      expect(section, act.id).not.toBeNull();
      expect(section).not.toHaveAttribute("hidden");
      expect(section).not.toHaveAttribute("inert");
      expect(section).not.toHaveAttribute("aria-hidden");
      expect(section?.querySelector("[tabindex='-1']")).toBeNull();
    }
    expect(container.querySelector("[inert]")).toBeNull();
  });

  it("renders the drawing, the list and the extras it is handed, each once", () => {
    render(
      <Stage acts={ACTS} drawing={<p>drawing</p>} list={<p>list</p>} credentials={<p>strip</p>}>
        <p>after the acts</p>
      </Stage>,
    );
    for (const text of ["drawing", "list", "after the acts"]) {
      expect(screen.getAllByText(text), text).toHaveLength(1);
    }
    // The strip goes in the one act that says it shows it, and only there.
    expect(screen.getAllByText("strip")).toHaveLength(1);
    const owner = ACTS.find((candidate) => candidate.showsCredentials);
    if (!owner) throw new Error("no act shows the credentials strip");
    expect(document.getElementById(owner.anchorId)).toContainElement(screen.getByText("strip"));
  });
});

describe("how the stage follows the reader", () => {
  it("starts at the first act and reports it", () => {
    renderStage();
    expect(screen.getByRole("slider", { name: /year/i })).toHaveValue(String(0));
    expect(document.getElementById(actAnchorId(ACT_IDS[0]))).toHaveAttribute("aria-current", "step");
  });

  it("scrubbing moves the active act, and only one is current", () => {
    renderStage();
    const scrubber = screen.getByRole("slider", { name: /year/i });
    fireEvent.change(scrubber, { target: { value: "4" } });
    expect(scrubber).toHaveValue("4");
    const current = ACTS.filter(
      (candidate) =>
        document.getElementById(actAnchorId(candidate.id))?.getAttribute("aria-current") === "step",
    );
    expect(current.map((candidate) => candidate.id)).toEqual([ACTS[4].id]);
    expect(scrubber).toHaveAttribute("aria-valuetext", expect.stringContaining(ACTS[4].title));
  });

  it("publishes the current act as data-through, which is all the stylesheet reads", () => {
    const { container } = renderStage();
    const root = container.querySelector("[data-stage]");
    expect(root).toHaveAttribute("data-through", "0");
    fireEvent.change(screen.getByRole("slider", { name: /year/i }), { target: { value: "3" } });
    expect(root).toHaveAttribute("data-through", "3");
  });

  it("scrubbing steals no focus: the slider keeps it", () => {
    renderStage();
    const scrubber = screen.getByRole("slider", { name: /year/i });
    scrubber.focus();
    fireEvent.change(scrubber, { target: { value: "3" } });
    expect(document.activeElement).toBe(scrubber);
  });

  it("releases the pin and shows the finished tree on request", () => {
    const { container } = renderStage();
    const root = container.querySelector("[data-stage]");
    expect(root).not.toHaveAttribute("data-released");
    fireEvent.click(screen.getByRole("button", { name: /whole tree/i }));
    expect(root).toHaveAttribute("data-released");
  });

  it("works with no IntersectionObserver at all", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    expect(() => renderStage()).not.toThrow();
  });

  it("follows the act crossing the viewport through a single observer, with no scroll listener", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const scroll = vi.spyOn(window, "addEventListener");
    renderStage();

    // One observer watching all seven acts: "never a scroll listener" is the
    // reason, and "one" is what keeps it cheap on a mid-range phone.
    expect(FakeObserver.instances).toHaveLength(1);
    const observer = FakeObserver.instances[0];
    expect(observer.observed.size).toBe(ACTS.length);
    expect(scroll.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);

    const target = document.getElementById(actAnchorId(ACT_IDS[5]));
    if (!target) throw new Error("act 5 is not in the document");
    act(() => observer.cross(target));

    expect(screen.getByRole("slider", { name: /year/i })).toHaveValue("5");
    expect(target).toHaveAttribute("aria-current", "step");
    scroll.mockRestore();
  });
});

/**
 * The whole section, because what the Journey *draws* is decided by
 * `CareerTree` — the drawing, the list and the strip are built there and
 * handed to the stage.
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
      const anchor = within(strip).getByRole("link", { name: new RegExp(entry.role, "i") });
      expect(anchor, entry.id).toHaveAttribute("href", link.href);
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

  it("has a stylesheet rule for every act that can hide a branch", () => {
    // CSS cannot compare `data-through` with `data-branch-act`, so `globals.css`
    // spells out one rule per value of `data-through` that has a later act to
    // hide. If the act list grows and the rules do not, the new act's branches
    // would be visible from the first frame, and nothing else would notice.
    const css = readFileSync("src/app/globals.css", "utf8");
    for (let through = 0; through < ACT_IDS.length - 1; through += 1) {
      expect(css, `no rule for data-through="${through}"`).toContain(`[data-through="${through}"]`);
    }
    for (let act = 1; act < ACT_IDS.length; act += 1) {
      expect(css, `no rule that hides data-branch-act="${act}"`).toContain(
        `[data-branch-act="${act}"]`,
      );
    }
  });
});
