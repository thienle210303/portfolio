import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import NhiSwing from "@/sections/CareerTree/NhiSwing";
import HangingTags from "@/sections/CareerTree/HangingTags";
import MiniNhi, { NHI_MOODS, nhiMood } from "@/components/companion/MiniNhi";
import { journey } from "@/content/portfolio";

const copy = journey.swing;
const mood = () => document.querySelector("[data-swing] svg[data-nhi]")?.getAttribute("data-nhi");
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

  it("beside mini-Thien, a beat's mood is its own and holds for that beat", () => {
    expect(nhiMood("A visitor! Pet me? Pet me!")).toBe(nhiMood("A visitor! Pet me? Pet me!"));
    const seen = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(nhiMood));
    expect(seen.size).toBeGreaterThan(2);
    for (const m of seen) expect(NHI_MOODS).toContain(m);
  });
});

describe("Bé Nhi's swing", () => {
  beforeEach(() => motion(false));
  afterEach(() => {
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
    const animate = vi.fn();
    Element.prototype.animate = animate as unknown as Element["animate"];
    render(<NhiSwing copy={copy} />);
    fireEvent.click(screen.getByRole("button"));
    expect(animate).toHaveBeenCalledTimes(1);
    motion(true);
    fireEvent.click(screen.getByRole("button"));
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("grins while the oak grows and hugs it when it ends", () => {
    render(<NhiSwing copy={copy} />);
    act(() => void document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" })));
    expect(mood()).toBe("grin");
    act(() => void document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" })));
    expect(mood()).toBe("hug");
  });

  it("falls asleep when night comes and grins at the morning", async () => {
    render(<NhiSwing copy={copy} />);
    await act(async () => {
      document.documentElement.dataset.theme = "night";
      await Promise.resolve();
    });
    expect(mood()).toBe("sleepy");
    await act(async () => {
      document.documentElement.dataset.theme = "day";
      await Promise.resolve();
    });
    expect(mood()).toBe("grin");
  });
});
