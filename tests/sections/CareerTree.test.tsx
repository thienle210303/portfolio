import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { buildTickets } from "@/lib/highlights";
import { growBeats } from "@/lib/origin-story";
import { BEAT_MS, HOLD_MS } from "@/sections/CareerTree/GrowOak";
import { journey, origin } from "@/content/portfolio";

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
    // "Planted in 2018 and still growing. Each tag holds a number I measured."
    expect(journey.lead).toContain(String(origin.arrivedYear));
    for (const ticket of buildTickets()) {
      for (const half of ticket.halves) expect(half.value, ticket.entryId).toMatch(/\d/);
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

/** One tree (round 22): the oak, and nothing drawn beside it. */
describe("what the Journey draws", () => {
  it("draws no second tree: no tree box, no drawn branches, no player host", () => {
    render(<CareerTree />);
    for (const selector of ["[data-tree-box]", "[data-tree-branch]", "[data-origin-host]", "[data-tree-panel]"]) {
      expect(document.querySelectorAll(selector), selector).toHaveLength(0);
    }
  });

  it("stacks the heading, Watch it grow, the crown and the tags, in that order", () => {
    render(<CareerTree />);
    const blocks = [
      document.querySelector("h2#tree-heading"),
      screen.getByRole("button", { name: journey.watch }),
      document.querySelector("[data-crown]"),
      document.querySelector("[data-hanging-tags]"),
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

  it("does not bring the roots back", () => {
    // `RootLabels`, `RootSystem`, `TreeFigure` and the plinth were deleted in
    // round 18; these three attributes were theirs alone.
    render(<CareerTree />);
    expect(document.querySelectorAll("[data-tree-root]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-cat-nap]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-tree-figure]")).toHaveLength(0);
  });
});

/**
 * "Watch it grow" (`GrowOak.tsx`): the oak grows, the tags drop in on their
 * years, the caption reads each beat, and the cats hear the same contract
 * they always have. Driven on fake timers, the show's own clock.
 */
describe("Watch it grow", () => {
  const beats = growBeats();
  const total = beats.length * BEAT_MS + HOLD_MS;
  let reduce = false;
  let events: string[] = [];
  const onStory = (event: Event) => events.push(String((event as CustomEvent).detail));

  beforeEach(() => {
    vi.useFakeTimers();
    reduce = false;
    events = [];
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: reduce && query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );
    Element.prototype.scrollIntoView = vi.fn();
    document.addEventListener("origin-story", onStory);
  });

  afterEach(() => {
    document.removeEventListener("origin-story", onStory);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const press = () => fireEvent.click(screen.getByRole("button", { name: /Watch it grow|Skip/ }));
  const section = () => document.getElementById("tree")!;
  const caption = () => document.querySelector("[data-grow-caption]")!;

  it("is the section's one primary control, with a polite caption that is empty at rest", () => {
    render(<CareerTree />);
    const button = within(section()).getByRole("button", { name: journey.watch });
    expect(
      [/(^|\s)bg-control(\s|$)/, /(^|\s)bg-\[color:var\(--control\)\](\s|$)/].some((fill) => fill.test(button.className)),
    ).toBe(true);
    expect(caption()).toHaveAttribute("aria-live", "polite");
    expect(caption().textContent).toBe("");
  });

  it("gives every tag the year it drops in on, its ticket's first", () => {
    render(<CareerTree />);
    const tags = [...section().querySelectorAll("[data-hanging-tags] li")];
    expect(tags.map((tag) => tag.getAttribute("data-year"))).toEqual(buildTickets().map((t) => t.halves[0].year));
  });

  it("grows the oak beat by beat, drops each tag on its year, and hands the page back", () => {
    render(<CareerTree />);
    press();
    expect(section()).toHaveAttribute("data-growing");
    expect(screen.getByRole("button", { name: journey.skip })).toBeInTheDocument();
    expect(events).toEqual(["start"]);

    const tags = [...section().querySelectorAll<HTMLElement>("[data-hanging-tags] li")];
    beats.slice(0, -1).forEach((beat, i) => {
      act(() => vi.advanceTimersByTime(i === 0 ? 0 : BEAT_MS));
      expect(caption().textContent).toBe(beat.caption);
      for (const tag of tags) {
        const due = Number(tag.dataset.year) <= (beat.year ?? -Infinity);
        if (due) expect(tag, `${tag.dataset.year} at ${beat.caption}`).toHaveAttribute("data-grown");
      }
    });
    act(() => vi.advanceTimersByTime(BEAT_MS));
    for (const tag of tags) expect(tag).toHaveAttribute("data-grown");

    act(() => vi.advanceTimersByTime(total));
    expect(section()).not.toHaveAttribute("data-growing");
    expect(section().querySelectorAll("[data-grown]")).toHaveLength(0);
    expect(caption().textContent).toBe("");
    expect(screen.getByRole("button", { name: journey.watch })).toBeInTheDocument();
    expect(events).toEqual(["start", "end"]);
  });

  it("tells the cats each beat with its kind, year and storm", () => {
    const told: unknown[] = [];
    const onBeat = (event: Event) => told.push((event as CustomEvent).detail);
    document.addEventListener("origin-story-beat", onBeat);
    render(<CareerTree />);
    press();
    act(() => vi.advanceTimersByTime(total));
    document.removeEventListener("origin-story-beat", onBeat);
    expect(told).toEqual(beats.map(({ kind, year, storm, weather }) => ({ kind, year, storm, weather })));
  });

  it("stamps each beat's weather on the section, shows the lịch's year, and takes it all off at the end", () => {
    render(<CareerTree />);
    press();
    beats.forEach((beat, i) => {
      act(() => vi.advanceTimersByTime(i === 0 ? 0 : BEAT_MS));
      expect(section(), beat.caption).toHaveAttribute("data-weather", beat.weather);
    });
    expect(section().style.getPropertyValue("--beat-ms")).toBe(`${BEAT_MS}ms`);
    const lich = section().querySelector("[data-lich]")!;
    expect(lich).toHaveAttribute("aria-hidden", "true");
    expect(lich.textContent).toContain(String(beats.findLast((b) => b.year !== null)!.year));
    act(() => vi.advanceTimersByTime(total));
    expect(section()).not.toHaveAttribute("data-weather");
    expect(section().style.getPropertyValue("--beat-ms")).toBe("");
    expect(section().querySelector("[data-lich]")).toBeNull();
  });

  it("clears the weather and the lịch on Skip too", () => {
    render(<CareerTree />);
    press();
    act(() => vi.advanceTimersByTime(BEAT_MS * 3));
    expect(section()).toHaveAttribute("data-weather");
    press();
    expect(section()).not.toHaveAttribute("data-weather");
    expect(section().querySelector("[data-lich]")).toBeNull();
  });

  it("keeps the weather out of the accessibility tree: the layer and the lịch are aria-hidden", () => {
    render(<CareerTree />);
    expect(section().querySelector("[data-weather-layer]")).toHaveAttribute("aria-hidden", "true");
    expect(section().querySelectorAll("[data-ufo]").length).toBeGreaterThan(0);
    for (const ufo of section().querySelectorAll("[data-ufo]")) expect(ufo).toHaveAttribute("aria-hidden", "true");
  });

  it("ends at once on Skip or Escape, and tells the cats once", () => {
    render(<CareerTree />);
    press();
    act(() => vi.advanceTimersByTime(BEAT_MS * 2));
    press();
    expect(section()).not.toHaveAttribute("data-growing");
    expect(events).toEqual(["start", "end"]);

    press();
    act(() => vi.advanceTimersByTime(BEAT_MS));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(section()).not.toHaveAttribute("data-growing");
    act(() => vi.advanceTimersByTime(total));
    expect(events).toEqual(["start", "end", "start", "end"]);
  });

  it("starts nothing under reduced motion: the grown oak is the end state", () => {
    reduce = true;
    render(<CareerTree />);
    press();
    expect(section()).not.toHaveAttribute("data-growing");
    expect(events).toEqual([]);
  });
});
