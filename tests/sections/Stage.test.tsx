import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Stage from "@/sections/CareerTree/Stage";
import { ACTS } from "@/sections/CareerTree/acts";
import { ACT_IDS, actAnchorId } from "@/lib/anchors";

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
 * The stage's other half is a stylesheet, so these tests read the stylesheet.
 * Nothing is rendered here — every claim is about `globals.css` itself.
 */
describe("the stylesheet the stage drives", () => {
  /** Index of the `}` closing the block whose `{` is at `open`. */
  function closingBrace(css: string, open: number): number {
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}") {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    throw new Error("unbalanced braces in globals.css");
  }

  /** The declarations of the block whose selector list starts at `at`. */
  function declarationsAt(css: string, at: number): string {
    const open = css.indexOf("{", at);
    return css.slice(open + 1, closingBrace(css, open));
  }

  /** One selector list split into its selectors, at top level, so the commas
   *  inside `:is(...)` stay where they belong. */
  function selectors(selectorList: string): readonly string[] {
    const out: string[] = [];
    let depth = 0;
    let current = "";
    for (const character of selectorList) {
      if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      if (character === "," && depth === 0) {
        out.push(current);
        current = "";
      } else current += character;
    }
    out.push(current);
    return out;
  }

  it("hides every later act's branches at every act before it", () => {
    // CSS cannot compare `data-through` with `data-branch-act`, so `globals.css`
    // spells out one selector per value of `data-through` that has a later act
    // to hide, each naming every act it hides. If the act list grows and the
    // rules do not, the new act's branches would be visible from the first
    // frame and nothing else would notice.
    //
    // The *pairing* is what is asserted, not the two axes separately: checking
    // only that every `data-through` value and every `data-branch-act` value
    // appears somewhere would still pass with `[data-branch-act="4"]` deleted
    // from the `data-through="1"` selector — both substrings survive in other
    // selectors — while an act-4 branch stayed visible at through=1.
    expect(
      ACT_IDS.length,
      "a one-act stage has no act with a later one to hide, so the loop below would assert nothing",
    ).toBeGreaterThan(1);

    const css = readFileSync("src/app/globals.css", "utf8");

    // The rules only mean anything inside the pin's own media query: that query
    // is what decides there is a pin at all, and a hide rule outside it would
    // blank branches under reduced motion and on narrow screens, where the
    // stage is simply the finished tree.
    const query =
      "@media screen and (min-width: 80rem) and (prefers-reduced-motion: no-preference)";
    const queryAt = css.indexOf(query);
    expect(queryAt, `globals.css has no ${query}`).toBeGreaterThan(-1);
    const queryEnd = closingBrace(css, css.indexOf("{", queryAt));

    const hideAt = css.indexOf('[data-stage][data-stage-live][data-through="0"]');
    expect(hideAt, 'no hide rule keyed off data-through="0"').toBeGreaterThan(-1);
    expect(
      hideAt > queryAt && hideAt < queryEnd,
      "the hide rules are outside the pin's media query",
    ).toBe(true);

    const selectorList = selectors(css.slice(hideAt, css.indexOf("{", hideAt)));
    expect(declarationsAt(css, hideAt), "the hide rule does not hide anything").toContain(
      "opacity: 0",
    );

    for (let through = 0; through < ACT_IDS.length - 1; through += 1) {
      const selector = selectorList.find((candidate) =>
        candidate.includes(`[data-through="${through}"]`),
      );
      expect(selector, `no hide selector for data-through="${through}"`).toBeDefined();
      for (let later = through + 1; later < ACT_IDS.length; later += 1) {
        expect(
          selector,
          `data-through="${through}" does not hide data-branch-act="${later}"`,
        ).toContain(`[data-branch-act="${later}"]`);
      }
    }
  });

  it("keeps the origin-story button off the pin until the acts have played out", () => {
    // Decision A of round 18's second plan: "Watch how it grew" belongs to the
    // finished tree, not to the journey through it. `Stage` says when that is
    // (`data-at-end`); the stylesheet is what acts on it, so the stylesheet is
    // what this reads.
    const css = readFileSync("src/app/globals.css", "utf8");
    const at = css.indexOf("[data-stage][data-stage-live]:not([data-at-end]) [data-origin-watch]");
    expect(at, "nothing keeps the origin-story button off the pinned stage").toBeGreaterThan(-1);
    // `visibility: hidden`, not `opacity: 0`: a transparent button is still in
    // the tab order, and inside a clipped frame a keyboard reader could not
    // scroll to the focus ring they just landed on. (Not `display: none`
    // either — see the rule's own comment: the button carries a Tailwind
    // `inline-flex`, and utilities outrank this layer.)
    expect(declarationsAt(css, at)).toContain("visibility: hidden");
  });

  it("no longer claims to fade root furniture the page does not render", () => {
    // The player's chrome-fade used to target `[data-tree-root]` and the
    // plinth's `[data-cat-nap] > p`, neither of which has had a mounter since
    // round 18. A selector for absent furniture is a claim the page is not
    // making.
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).not.toContain("[data-origin-running] [data-tree-root]");
    expect(css).not.toContain("[data-origin-running] [data-cat-nap] > p");
  });
});
