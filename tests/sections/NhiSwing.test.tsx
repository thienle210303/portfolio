import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import NhiSwing from "@/sections/CareerTree/NhiSwing";
import HangingTags from "@/sections/CareerTree/HangingTags";
import MiniNhi, { HUH_TILT, NHI_MOODS, nhiMood } from "@/components/companion/MiniNhi";
import { journey } from "@/content/portfolio";

const copy = journey.swing;
const mood = () => document.querySelector("[data-swing] svg[data-nhi]")?.getAttribute("data-nhi");
const bubble = () => document.querySelector("[data-says]")!;
const caption = () => [...document.querySelectorAll("[data-swing] p")].find((p) => p.textContent?.startsWith(copy.name));

/** A controllable `matchMedia`: reduced motion on or off. */
function motion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }) as MediaQueryList,
  );
}

describe("Bé Nhi's drawing", () => {
  it("draws every mood as its own face", () => {
    const faces = NHI_MOODS.map((m) => {
      const { container, unmount } = render(<MiniNhi mood={m} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("data-nhi", m);
      expect(svg).toHaveAttribute("aria-hidden", "true");
      const html = svg.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(faces).size).toBe(NHI_MOODS.length);
  });

  it("every mood has her line and a caption in the content", () => {
    for (const m of NHI_MOODS) {
      expect(copy.moods[m].says.length, m).toBeGreaterThan(0);
      expect(copy.moods[m].is.length, m).toBeGreaterThan(0);
    }
  });

  it("her act is 'Hả?', and she is surprised", () => {
    expect(copy.moods.huh).toEqual({ says: "Hả?", is: "surprised" });
  });

  describe("the act's pose", () => {
    const pieces = (container: HTMLElement) => ({
      heads: [...container.querySelectorAll<SVGGElement>("[data-nhi-head]")],
      face: container.querySelector<SVGGElement>("[data-nhi-face]"),
      burst: container.querySelectorAll("[data-nhi-burst]"),
    });

    it.each(["stand", "sit"] as const)("tilts her whole head about her neck, %s", (pose) => {
      const { container } = render(<MiniNhi mood="huh" pose={pose} />);
      const { heads } = pieces(container);
      // Hair and face (knockout and ink), the face's features, and the star clip.
      expect(heads.length).toBeGreaterThanOrEqual(4);
      for (const head of heads) {
        expect(head.style.transform).toBe(`rotate(${HUH_TILT}deg)`);
        expect(head.style.transformOrigin).toBe("14px 20.4px");
      }
      expect(HUH_TILT).toBeLessThanOrEqual(-12);
      expect(HUH_TILT).toBeGreaterThanOrEqual(-15);
      // The star clip rides with the head: it is inside one of the groups.
      expect(heads.some((head) => head.querySelector('path[d^="M 20.64 2.17"]'))).toBe(true);
    });

    it("turns her features three-quarters (a slide of one to one and a half units)", () => {
      const { container } = render(<MiniNhi mood="huh" />);
      const { face } = pieces(container);
      const slide = Number(/translate\((-?[\d.]+)/.exec(face?.getAttribute("transform") ?? "")?.[1]);
      expect(Math.abs(slide)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(slide)).toBeLessThanOrEqual(1.5);
    });

    it("throws two startle strokes and keeps the question mark", () => {
      const { container } = render(<MiniNhi mood="huh" />);
      const { burst } = pieces(container);
      expect(burst).toHaveLength(1);
      // Two strokes, each drawn on a knockout and then in ink.
      expect(burst[0].querySelectorAll("path")).toHaveLength(4);
      expect(container.innerHTML).toContain("M 24.4 -1.4 Q 24.4 -3.6");
    });

    it("every other mood keeps her head level, and has no strokes", () => {
      for (const m of NHI_MOODS.filter((x) => x !== "huh")) {
        const { container, unmount } = render(<MiniNhi mood={m} />);
        const { heads, face, burst } = pieces(container);
        expect(heads.length, m).toBeGreaterThan(0);
        for (const head of heads) expect(head.getAttribute("style"), m).toBeNull();
        expect(face?.hasAttribute("transform"), m).toBe(false);
        expect(burst, m).toHaveLength(0);
        unmount();
      }
    });

    it("lets go of the rope to cup her ear (the same arm, standing or sitting)", () => {
      const sitting = render(<MiniNhi mood="huh" pose="sit" />);
      const sit = sitting.container.innerHTML;
      sitting.unmount();
      const level = render(<MiniNhi mood="pout" pose="sit" />).container.innerHTML;
      // Her right hand is on the rope in every other mood...
      expect(level).toContain("M 19 22 C 21.6 21.6, 24.4 20.8, 26.2 19.4");
      // ...and in the act it is up at her ear.
      expect(sit).not.toContain("M 19 22 C 21.6 21.6, 24.4 20.8, 26.2 19.4");
      expect(sit).toContain("M 19.2 22 C 21.8 22.2, 23.8 20.2, 24 16.2");
      const standing = render(<MiniNhi mood="huh" pose="stand" />).container.innerHTML;
      expect(standing).toContain("M 19.2 22 C 21.8 22.2, 23.8 20.2, 24 16.2");
    });

    it("replays the snap when she startles again: a new beat is a new head", () => {
      const { container, rerender } = render(<MiniNhi mood="huh" beat={1} />);
      const first = pieces(container).heads[0];
      rerender(<MiniNhi mood="huh" beat={1} />);
      expect(pieces(container).heads[0]).toBe(first);
      rerender(<MiniNhi mood="huh" beat={2} />);
      expect(pieces(container).heads[0]).not.toBe(first);
    });
  });

  it("beside mini-Thien, a beat's mood is its own and holds for that beat", () => {
    expect(nhiMood("A visitor! Pet me? Pet me!")).toBe(nhiMood("A visitor! Pet me? Pet me!"));
    const seen = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map((words) => nhiMood(words)));
    expect(seen.size).toBeGreaterThan(2);
    for (const m of seen) expect(NHI_MOODS).toContain(m);
  });

  it("beside the cats, a question from them is her 'Hả?'", () => {
    expect(nhiMood("Click me. I translate meows.", "question")).toBe("huh");
    expect(nhiMood("Pick a tag. Peek inside!", "question")).toBe("huh");
    // Any other icon leaves the choice to the beat's words.
    expect(nhiMood("Click me. I translate meows.", "paw")).toBe(nhiMood("Click me. I translate meows."));
    expect(nhiMood("Click me. I translate meows.", null)).toBe(nhiMood("Click me. I translate meows."));
  });
});

describe("Bé Nhi's swing", () => {
  beforeEach(() => motion(false));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(Element.prototype, "animate");
    delete document.documentElement.dataset.theme;
  });

  it("hangs under the oak's tags, a named button", () => {
    render(<HangingTags />);
    const swing = document.querySelector("[data-hanging-tags] [data-swing]");
    expect(swing).not.toBeNull();
    // Not one of the tags: it is outside their list.
    expect(swing?.closest("ul")).toBeNull();
    expect(screen.getByRole("button", { name: `${copy.name}, ${copy.action}` })).toBeInTheDocument();
  });

  it("rests pouting, captioned with how she is", () => {
    render(<NhiSwing copy={copy} />);
    expect(mood()).toBe("pout");
    expect(caption()?.textContent).toBe(`${copy.name}, ${copy.moods.pout.is}`);
  });

  it("a press changes her mood, says her line, and is announced", () => {
    vi.useFakeTimers();
    render(<NhiSwing copy={copy} />);
    const button = screen.getByRole("button");
    const says = document.querySelector("[data-says]")!;
    expect(says.className).toContain("opacity-0");
    for (let i = 0; i < 6; i++) {
      const before = mood();
      fireEvent.click(button);
      const after = mood()!;
      expect(after, `press ${i}`).not.toBe(before);
      expect(says.textContent).toBe(copy.moods[after as keyof typeof copy.moods].says);
      expect(says.className).toContain("opacity-100");
      expect(document.querySelector("[aria-live]")?.textContent).toContain(copy.moods[after as keyof typeof copy.moods].is);
    }
    act(() => vi.advanceTimersByTime(3000));
    expect(says.className).toContain("opacity-0");
    // Focus stays where the press left it.
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
  });

  it("pushes the swing, except under reduced motion", () => {
    // Pouting, a press with this draw is a grin: a push, not the act.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const animate = vi.fn();
    Element.prototype.animate = animate as unknown as Element["animate"];
    render(<NhiSwing copy={copy} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mood()).toBe("grin");
    expect(animate).toHaveBeenCalledTimes(1);
    motion(true);
    fireEvent.click(screen.getByRole("button"));
    expect(animate).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("grins while the oak grows and hugs it when it ends", () => {
    render(<NhiSwing copy={copy} />);
    act(() => void document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" })));
    expect(mood()).toBe("grin");
    act(() => void document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" })));
    expect(mood()).toBe("hug");
  });

  /** Turn the theme the way the header's switch does, and let the observer run. */
  const turn = (theme: "day" | "night") =>
    act(async () => {
      document.documentElement.dataset.theme = theme;
      await Promise.resolve();
    });

  describe("her act, \"Hả?\"", () => {
    it("the light turning startles her, and then it is evening, or morning", async () => {
      vi.useFakeTimers();
      render(<NhiSwing copy={copy} />);
      await turn("night");
      expect(mood()).toBe("huh");
      expect(bubble().textContent).toBe("Hả?");
      expect(bubble().className).toContain("opacity-100");
      expect(caption()?.textContent).toBe(`${copy.name}, surprised`);
      act(() => void vi.advanceTimersByTime(1400));
      expect(mood()).toBe("huh");
      act(() => void vi.advanceTimersByTime(200));
      expect(mood()).toBe("sleepy");
      expect(bubble().textContent).toBe(copy.moods.sleepy.says);

      await turn("day");
      expect(mood()).toBe("huh");
      act(() => void vi.advanceTimersByTime(1600));
      expect(mood()).toBe("grin");
    });

    it("a press that wakes her from sleepy is always her 'Hả?', and is announced", async () => {
      vi.useFakeTimers();
      render(<NhiSwing copy={copy} />);
      await turn("night");
      act(() => void vi.advanceTimersByTime(2000));
      expect(mood()).toBe("sleepy");
      fireEvent.click(screen.getByRole("button"));
      expect(mood()).toBe("huh");
      expect(document.querySelector("[aria-live]")?.textContent).toBe(`Hả? ${copy.name} is surprised.`);
      // It does not settle by itself: a press made it, so she stays surprised.
      act(() => void vi.advanceTimersByTime(5000));
      expect(mood()).toBe("huh");
    });

    it("a press from any other mood is never forced into it", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      render(<NhiSwing copy={copy} />);
      // The last of the other four: hug (pouting rests first).
      fireEvent.click(screen.getByRole("button"));
      expect(mood()).toBe("hug");
      vi.restoreAllMocks();
    });

    describe("the thunderclap in Watch it grow", () => {
      const beat = (weather: string) =>
        act(() => void document.dispatchEvent(new CustomEvent("origin-story-beat", { detail: { weather } })));
      const show = (detail: string) => act(() => void document.dispatchEvent(new CustomEvent("origin-story", { detail })));

      beforeEach(() => {
        vi.useFakeTimers();
        const tree = document.createElement("section");
        tree.id = "tree";
        tree.style.setProperty("--beat-ms", "1000ms");
        document.body.append(tree);
      });
      afterEach(() => document.getElementById("tree")?.remove());

      it("startles her at the bolt, then she grins again", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        beat("sun");
        act(() => void vi.advanceTimersByTime(2000));
        expect(mood()).toBe("grin");
        beat("thunderstorm");
        // The bolt strikes 47% into a beat of 1000ms.
        act(() => void vi.advanceTimersByTime(460));
        expect(mood()).toBe("grin");
        act(() => void vi.advanceTimersByTime(20));
        expect(mood()).toBe("huh");
        expect(bubble().textContent).toBe("Hả?");
        // She holds it a hair longer than a beat (1100ms of 1000ms).
        act(() => void vi.advanceTimersByTime(1000));
        expect(mood()).toBe("huh");
        act(() => void vi.advanceTimersByTime(100));
        expect(mood()).toBe("grin");
      });

      it("only the first clap of a run startles her; a hurricane after a thunderstorm does", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        beat("thunderstorm");
        act(() => void vi.advanceTimersByTime(480 + 1600));
        expect(mood()).toBe("grin");
        beat("thunderstorm");
        act(() => void vi.advanceTimersByTime(480));
        expect(mood()).toBe("grin");
        beat("hurricane");
        act(() => void vi.advanceTimersByTime(480));
        expect(mood()).toBe("huh");
      });

      it("a storm that changes its mind is one long 'Hả?', not a flicker of grins", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        const seen: string[] = [];
        const note = () => void (seen.at(-1) !== mood() && seen.push(mood()!));
        beat("thunderstorm");
        for (let i = 0; i < 1000; i += 10) {
          act(() => void vi.advanceTimersByTime(10));
          note();
        }
        // The next beat (1000ms on) is a hurricane, whose clap lands 470ms into it.
        beat("hurricane");
        for (let i = 0; i < 2000; i += 10) {
          act(() => void vi.advanceTimersByTime(10));
          note();
        }
        expect(seen).toEqual(["grin", "huh", "grin"]);
      });

      it("rain, a flood and snow do not startle her", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        for (const weather of ["plane", "rain", "snow", "flood", "ufo"]) {
          beat(weather);
          act(() => void vi.advanceTimersByTime(1000));
          expect(mood(), weather).toBe("grin");
        }
      });

      it("the show ending takes over: she hugs it, and the late 'grin' never comes", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        beat("thunderstorm");
        act(() => void vi.advanceTimersByTime(500));
        expect(mood()).toBe("huh");
        show("end");
        expect(mood()).toBe("hug");
        act(() => void vi.advanceTimersByTime(3000));
        expect(mood()).toBe("hug");
      });

      it("a clap still waiting when the show is skipped never lands", () => {
        render(<NhiSwing copy={copy} />);
        show("start");
        beat("hurricane");
        show("end");
        act(() => void vi.advanceTimersByTime(3000));
        expect(mood()).toBe("hug");
      });
    });

    describe("the beat itself", () => {
      const animate = vi.fn();
      beforeEach(() => {
        animate.mockClear();
        Element.prototype.animate = animate as unknown as Element["animate"];
      });

      it("checks the swing short, cutting off any sway, and pops the bubble", async () => {
        render(<NhiSwing copy={copy} />);
        const stop = vi.fn();
        const ride = document.querySelector("[data-ride]") as HTMLElement;
        ride.getAnimations = (() => [{ cancel: stop }]) as unknown as Element["getAnimations"];
        await turn("night");
        expect(stop).toHaveBeenCalledTimes(1);
        // The check on the swing, the pop on the bubble.
        const targets = animate.mock.contexts as Element[];
        expect(targets).toContain(ride);
        expect(targets).toContain(bubble());
        const [check] = animate.mock.calls[animate.mock.contexts.indexOf(ride)];
        expect(check.at(-1)).toEqual({ transform: "rotate(0deg)" });
        expect(check.some((f: { transform: string }) => /^rotate\(-/.test(f.transform))).toBe(true);
      });

      it("plays it every time she startles, even while she is already surprised", async () => {
        render(<NhiSwing copy={copy} />);
        await turn("night");
        const once = animate.mock.calls.length;
        expect(once).toBe(2);
        await turn("day");
        expect(animate.mock.calls.length).toBe(once * 2);
      });

      it("under reduced motion she shows the end pose and says her line, and nothing moves", async () => {
        motion(true);
        render(<NhiSwing copy={copy} />);
        await turn("night");
        expect(mood()).toBe("huh");
        expect(bubble().textContent).toBe("Hả?");
        expect(animate).not.toHaveBeenCalled();
        const head = document.querySelector<SVGGElement>("[data-swing] [data-nhi-head]")!;
        expect(head.style.transform).toBe(`rotate(${HUH_TILT}deg)`);
      });
    });
  });
});
