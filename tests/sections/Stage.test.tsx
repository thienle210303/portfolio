import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Stage from "@/sections/CareerTree/Stage";
import { ACTS } from "@/sections/CareerTree/acts";
import { ACT_IDS, actAnchorId } from "@/lib/anchors";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries } from "@/content/portfolio";
import { DrawnTree } from "@/sections/CareerTree/DrawnTree";
import { buildDrawnTree } from "@/lib/knowledge-tree";

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
  vi.restoreAllMocks();
  FakeObserver.instances = [];
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

/**
 * jsdom lays nothing out, so every rect is zero. This stands in for a real
 * page: the acts are 600px tall and stacked, the viewport is jsdom's own
 * height, and `scrollIntoView` on an act "scrolls" by making that act the one
 * whose box holds the viewport's vertical centre — instantly, the way the
 * scrubber's own `scrollIntoView({ block: "center" })` is instant (the page
 * has no `scroll-behavior: smooth`). Returns a setter for tests that need to
 * put a given act under the centre without going through the scrubber.
 */
function layOutActs(): { scrollTo: (index: number) => void } {
  let atCentre = 0;
  const actIndex = (element: Element) =>
    ACTS.findIndex((candidate) => candidate.anchorId === element.id);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const index = actIndex(this);
    if (index < 0) return new DOMRect(0, 0, 0, 0);
    const top = window.innerHeight / 2 - 300 + (index - atCentre) * 600;
    return new DOMRect(0, top, 300, 600);
  });
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = function (this: Element) {
    const index = actIndex(this);
    if (index >= 0) atCentre = index;
  };
  return {
    scrollTo: (index: number) => {
      atCentre = index;
    },
  };
}

/** A hand-cranked `requestAnimationFrame`: `frame()` runs whatever is queued,
 *  which is the only way a jsdom test can say "the next frame has painted". */
function crankFrames(): { frame: () => void } {
  let queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return {
    frame: () => {
      const due = queue;
      queue = [];
      for (const callback of due) callback(performance.now());
    },
  };
}

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
    const page = layOutActs();
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
    page.scrollTo(5);
    act(() => observer.cross(target));

    expect(screen.getByRole("slider", { name: /year/i })).toHaveValue("5");
    expect(target).toHaveAttribute("aria-current", "step");
  });

  it("does not let a stale crossing report undo a scrub", () => {
    // The race the final review caught in a browser: ArrowRight pressed fast
    // on the year scrubber. Each press scrolls its act to the centre at once,
    // but the observer's report for an *earlier* press was computed before
    // that scroll and is delivered after it — so the act went to 3 and then
    // back to 1, and one trial left the page on act 4 with the drawing on act
    // 2. The report is a doorbell, not a source of truth: whatever it says,
    // the act under the viewport's centre right now is the current one.
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    layOutActs();
    renderStage();
    const observer = FakeObserver.instances[0];
    const scrubber = screen.getByRole("slider", { name: /year/i });

    for (const value of ["1", "2", "3"]) fireEvent.change(scrubber, { target: { value } });
    expect(scrubber).toHaveValue("3");

    const stale = document.getElementById(ACTS[1].anchorId);
    if (!stale) throw new Error("act 1 is not in the document");
    act(() => observer.cross(stale));

    expect(scrubber, "a report computed before the scrub moved the act backwards").toHaveValue("3");
    expect(document.getElementById(ACTS[3].anchorId)).toHaveAttribute("aria-current", "step");
    expect(document.querySelector("[data-stage]")).toHaveAttribute("data-through", "3");
  });

  it("leaves the act alone when nothing is under the viewport's centre", () => {
    // Above or below the stage altogether: no act holds the centre, and the
    // act the reader last had stays current rather than snapping to another.
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const page = layOutActs();
    renderStage();
    const observer = FakeObserver.instances[0];
    const scrubber = screen.getByRole("slider", { name: /year/i });
    fireEvent.change(scrubber, { target: { value: "2" } });
    page.scrollTo(-10);
    const reported = document.getElementById(ACTS[0].anchorId);
    if (!reported) throw new Error("act 0 is not in the document");
    act(() => observer.cross(reported));
    expect(scrubber).toHaveValue("2");
  });
});

/**
 * Ruling 84. When the stage goes live after hydration every unreached branch
 * goes from the finished tree's opacity 1 to 0, and with the fade's transition
 * already in force that ran for 500ms on the first live frame — axe measured a
 * branch mid-fade at ~1.05:1, and a deep link to `#tree` at >=1280px showed the
 * finished tree and then watched it un-grow. The stage now says when its first
 * act has been applied and painted (`data-stage-settled`), and the stylesheet
 * transitions nothing before that.
 */
describe("the first live frame does not animate", () => {
  it("marks the stage settled only after the first report has been applied and painted", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const frames = crankFrames();
    const page = layOutActs();
    const { container } = renderStage();
    const root = container.querySelector("[data-stage]");
    expect(root).toHaveAttribute("data-stage-live");
    expect(root, "settled before the observer has said which act is current").not.toHaveAttribute(
      "data-stage-settled",
    );
    act(() => frames.frame());
    expect(root, "settled before the observer has said which act is current").not.toHaveAttribute(
      "data-stage-settled",
    );

    const target = document.getElementById(ACTS[2].anchorId);
    if (!target) throw new Error("act 2 is not in the document");
    page.scrollTo(2);
    act(() => FakeObserver.instances[0].cross(target));
    expect(root).toHaveAttribute("data-through", "2");
    // The act it landed on has to reach the screen without a transition: one
    // frame paints it, the one after may turn transitions on.
    act(() => frames.frame());
    expect(root, "settled in the same frame the first act was painted").not.toHaveAttribute(
      "data-stage-settled",
    );
    act(() => frames.frame());
    expect(root).toHaveAttribute("data-stage-settled");
  });

  it("is never settled without an observer, where there is no pin to animate", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const frames = crankFrames();
    const { container } = renderStage();
    act(() => frames.frame());
    act(() => frames.frame());
    const root = container.querySelector("[data-stage]");
    expect(root).not.toHaveAttribute("data-stage-live");
    expect(root).not.toHaveAttribute("data-stage-settled");
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

  it("runs no stage transition until the stage has settled", () => {
    // Ruling 84 — see "the first live frame does not animate" above. Every
    // rule in the pin's media query that declares a transition must require
    // `[data-stage-settled]`, or the switch from the static finished tree to
    // the live stage plays as an animation.
    const css = readFileSync("src/app/globals.css", "utf8");
    const query =
      "@media screen and (min-width: 80rem) and (prefers-reduced-motion: no-preference)";
    const queryAt = css.indexOf(query);
    expect(queryAt, `globals.css has no ${query}`).toBeGreaterThan(-1);
    const open = css.indexOf("{", queryAt);
    const body = css.slice(open + 1, closingBrace(css, open));

    const transitioning: string[] = [];
    const rule = /([^{}]+)\{([^{}]*)\}/g;
    for (let match = rule.exec(body); match; match = rule.exec(body)) {
      const selectorList = match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!/\btransition\s*:/.test(match[2])) continue;
      for (const selector of selectors(selectorList)) transitioning.push(selector.trim());
    }
    expect(transitioning.length, "found no transitions in the pin's media query to check").toBeGreaterThan(0);
    for (const selector of transitioning) {
      expect(selector, `${selector} transitions before the stage has settled`).toContain(
        "[data-stage-settled]",
      );
    }
  });

  it("names the branch panel the same way in DrawnTree, the stylesheet and the axe audit", () => {
    // `data-tree-panel` is a contract with three parties: DrawnTree stamps it,
    // globals.css hides a pending branch's panel through it while the origin
    // story runs, and e2e/axe.spec.ts polls it for that fade to finish before
    // auditing. Renaming it in one place breaks the other two silently — the
    // CSS rule would match nothing and the axe poll would fail for a reason
    // that has nothing to do with accessibility.
    const drawn = buildDrawnTree();
    const { container } = render(<DrawnTree tree={drawn} />);
    const stamped = new Set<string>();
    for (const element of container.querySelectorAll("*")) {
      for (const name of element.getAttributeNames()) {
        if (name.startsWith("data-tree-panel")) stamped.add(name);
      }
    }
    expect([...stamped], "DrawnTree stamps no data-tree-panel* attribute").toEqual(["data-tree-panel"]);
    expect(
      container.querySelectorAll("[data-tree-panel]").length,
      "a drawn branch has no panel",
    ).toBe(drawn.length);

    const css = readFileSync("src/app/globals.css", "utf8");
    const axe = readFileSync("e2e/axe.spec.ts", "utf8");
    expect(css).toContain("[data-tree-panel]");
    expect(axe).toContain("[data-tree-panel]");
    // And neither selects a variant of the name that DrawnTree does not stamp.
    for (const source of [css, axe]) {
      for (const name of source.match(/data-tree-panel[\w-]*/g) ?? []) {
        expect(stamped.has(name), `${name} is selected but never stamped`).toBe(true);
      }
    }
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

/**
 * The per-entry compatibility fragments.
 *
 * `journey-entry-<id>` was the deleted timeline `<li>`'s id. The stage is what
 * renders them now — one zero-size span per entry, inside the act that draws
 * that entry — so the claim is asserted here, against `Stage` itself.
 *
 * The *section*-level retired ids (`#work`, `#skills`, `#workshop`, `#journey`)
 * are `CareerTree`'s, not the stage's, and are asserted in
 * `tests/sections/CareerTree.test.tsx` beside the component that renders them.
 * Neither claim is provable without JavaScript from jsdom; that is what
 * `e2e/legacy-anchors.spec.ts` is for.
 */
describe("legacy anchors", () => {
  it("keeps every per-entry fragment resolvable", () => {
    renderStage();
    // Not vacuous: an empty content layer would make the loop below assert
    // nothing at all and still pass.
    expect(
      careerEntries.length,
      "no career entries, so the loop below would prove nothing",
    ).toBeGreaterThan(0);
    for (const entry of careerEntries) {
      // A real zero-size element, not a client-side hash rewrite: a bookmark
      // has to land with JavaScript disabled, the same way `#journey` already
      // does.
      const target = document.getElementById(journeyEntryAnchorId(entry.id));
      expect(target, entry.id).not.toBeNull();
      // Inside the act that draws the entry, not loose at the top of the
      // stage — landing on the act is the whole point of a per-entry fragment.
      const act = ACTS.find((candidate) => candidate.entryIds.includes(entry.id));
      if (!act) throw new Error(`no act draws ${entry.id}`);
      expect(document.getElementById(act.anchorId), entry.id).toContainElement(target);
    }
  });

  it("carries no content and steals no tab stop", () => {
    renderStage();
    const anchors = careerEntries.map((entry) => {
      const element = document.getElementById(journeyEntryAnchorId(entry.id));
      if (!element) throw new Error(`no element for ${entry.id}`);
      return element;
    });
    expect(anchors.length, "nothing to check").toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(anchor).toHaveAttribute("aria-hidden", "true");
      expect(anchor.textContent, anchor.id).toBe("");
      expect(anchor).not.toHaveAttribute("tabindex");
      // `sr-only` keeps it out of the visual layout; `scroll-mt-*` is what
      // makes the landing clear the sticky header.
      expect(anchor.className, anchor.id).toContain("sr-only");
      expect(anchor.className, anchor.id).toMatch(/\bscroll-mt-/);
    }
  });

  it("writes each fragment id exactly once", () => {
    renderStage();
    for (const entry of careerEntries) {
      const id = journeyEntryAnchorId(entry.id);
      // `getElementById` returns the first match and would hide a duplicate.
      expect(document.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
    }
  });
});
