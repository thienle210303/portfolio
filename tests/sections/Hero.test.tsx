import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Hero from "@/sections/Hero/Hero";
import { hero, profile } from "@/content/portfolio";
import { ABOUT_LEGACY_SECTION_IDS } from "@/sections/Hero/anchors";

/**
 * Round 21 Phase 3: the clothesline hero. My headline, one paragraph and two
 * actions; four chapter tags on a line; my field tag; the scenery behind.
 */

const CONTROL_FILL = /(^|\s)bg-\[color:var\(--control\)\](\s|$)|(^|\s)bg-control(\s|$)/;

function renderHero(bookingUrl: string | null = null) {
  const { container } = render(<Hero bookingUrl={bookingUrl} />);
  const about = container.querySelector<HTMLElement>("#about");
  if (!about) throw new Error("Hero rendered no #about");
  return { container, about };
}

describe("Hero", () => {
  it("carries the retired #worlds anchor", () => {
    const { about } = renderHero();
    const anchor = about.querySelector("#worlds");
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute("aria-hidden", "true");
    expect(anchor?.className).toMatch(/scroll-mt-20/);
    expect(ABOUT_LEGACY_SECTION_IDS).toContain("worlds");
    // First thing inside the section's content box, ahead of the scenery.
    expect(about.querySelector(":scope > .shell > :first-child")).toBe(anchor);
  });

  it("renders the headline and my one paragraph", () => {
    const { about } = renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Just a curious kid, and this is my youth.");
    expect(profile.headline).toBe("Just a curious kid, and this is my youth.");
    const intro = about.querySelector('[data-hero-step="intro"]');
    expect(intro?.textContent).toBe(`${profile.positioning} ${hero.invitation}`);
  });

  it("offers the two actions", () => {
    renderHero();
    const start = screen.getByRole("link", { name: "See what I've built" });
    expect(start).toHaveAttribute("href", "#tree");
    expect(start.className).toMatch(CONTROL_FILL);
    // No booking link: the quiet action names the postcard it lands on, not a call.
    expect(screen.getByRole("link", { name: "Send me a postcard" })).toHaveAttribute("href", "#contact");
    expect(screen.queryByText(/Book a call/)).toBeNull();
  });

  it("opens a configured booking URL in a new tab", () => {
    const url = "https://cal.com/thienle/20min";
    renderHero(url);
    const book = screen.getByRole("link", { name: /^Book a call with me/ });
    expect(book).toHaveAttribute("href", url);
    expect(book).toHaveAttribute("target", "_blank");
  });

  it("fills only See what I've built with the control colour", () => {
    const { container } = renderHero();
    const filled = [...container.querySelectorAll<HTMLElement>("[class]")].filter((element) =>
      CONTROL_FILL.test(element.className),
    );
    expect(filled.map((element) => element.textContent)).toEqual(["See what I've built"]);
  });

  it("hangs four chapter tags and my field tag", () => {
    renderHero();
    expect(screen.getAllByRole("button").filter((b) => b.hasAttribute("aria-expanded"))).toHaveLength(4);
    const reads = [...document.querySelectorAll("a")].filter((a) => a.textContent === "Read this part");
    expect(reads.map((a) => a.getAttribute("href"))).toEqual([
      "#tree",
      "#journey-entry-eastside-high",
      "#journey-entry-usc-degree",
      "#journey-entry-doordash",
    ]);
    expect(screen.getByRole("link", { name: /^My LinkedIn/ })).toBeInTheDocument();
  });

  it("has exactly one h1 and no other heading", () => {
    renderHero();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("has no margin rail", () => {
    const { container } = renderHero();
    expect(container.querySelector(".rail, .rail-layout")).toBeNull();
  });

  it("no longer renders the About paragraphs", () => {
    renderHero();
    for (const paragraph of profile.about) expect(screen.queryByText(paragraph)).toBeNull();
  });

  it("the scenery is decoration", () => {
    const { container } = renderHero();
    const pieces = [...container.querySelectorAll("[data-scenery]")];
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) {
      // Tag drawings live inside the chapter buttons; they are aria-hidden themselves.
      expect(piece.closest('[aria-hidden="true"]'), piece.getAttribute("data-scenery") ?? "").not.toBeNull();
    }
    const scene = container.querySelector('[data-scenery="hero"]');
    expect(scene).toHaveAttribute("aria-hidden", "true");
    expect(scene?.querySelector("button, a, [tabindex]")).toBeNull();
  });

  it("Moon lies in her võng", () => {
    const { container } = renderHero();
    const moon = container.querySelectorAll("[data-moon-off-duty]");
    expect(moon).toHaveLength(1);
    expect(moon[0]).toHaveTextContent("Moon, off duty");
    // The cats visit the drawing, which the theme swaps by `--art-offduty`.
    const art = moon[0].querySelectorAll("[data-moon-art]");
    expect(art).toHaveLength(1);
    expect((art[0] as HTMLElement).style.getPropertyValue("--art")).toBe("var(--art-offduty)");
  });

  it("the buffalo ploughs by day and sleeps at night; the stool's meal follows the theme", () => {
    const { container } = renderHero();
    expect(container.querySelector('[data-scenery="buffalo-plow"]')).toHaveClass("day-only");
    expect(container.querySelector('[data-scenery="buffalo-sleep"]')).toHaveClass("night-only");
    const vignette = container.querySelector<HTMLElement>('[data-scenery="vignette"]');
    expect(vignette?.style.getPropertyValue("--art")).toBe("var(--art-vignette)");
  });

  it("the paddy: water under her, rice over her by day, and her at night over both", () => {
    const { container } = renderHero();
    const order = [...container.querySelectorAll('[data-scenery="hero"] > [data-scenery]')].map((e) => e.getAttribute("data-scenery"));
    const at = (name: string) => order.indexOf(name);
    for (const water of ["paddy-water", "paddy-phone-water"]) expect(at(water)).toBeLessThan(at("buffalo-plow"));
    for (const rice of ["paddy", "paddy-phone"]) {
      expect(at(rice)).toBeGreaterThan(at("buffalo-plow"));
      expect(at(rice)).toBeLessThan(at("buffalo-sleep"));
    }
    // The mud turning behind the plough is there only while she ploughs.
    expect(container.querySelector('[data-scenery="paddy-wake"]')).toHaveClass("day-only");
    expect(at("paddy-wake")).toBeLessThan(at("buffalo-plow"));
  });

  it("shows the morning by day and the evening at night", () => {
    const { about } = renderHero();
    // The buffalo's two drawings are `.day-only` / `.night-only` too; the captions are the ones with words.
    const day = [...about.querySelectorAll(".day-only")].filter((e) => e.textContent);
    const night = [...about.querySelectorAll(".night-only")].filter((e) => e.textContent);
    expect(day).toHaveLength(1);
    expect(night).toHaveLength(1);
    expect(day[0]).toHaveTextContent(hero.vignette.morning);
    expect(night[0]).toHaveTextContent(hero.vignette.evening);
  });

  it("keeps the cats' perch on the actions row", () => {
    const { container } = renderHero();
    const perch = container.querySelectorAll("[data-cat-perch]");
    expect(perch).toHaveLength(1);
    expect(perch[0]).toHaveAttribute("data-hero-step", "meta-actions");
  });

  it("keeps the load choreography's hooks", () => {
    const { container } = renderHero();
    for (const step of ["h1", "intro", "meta-actions", "line", "field-tag"]) {
      expect(container.querySelector(`[data-hero-step="${step}"]`), step).not.toBeNull();
    }
    for (const step of ["eyebrow", "code", "scroll"]) {
      expect(container.querySelector(`[data-hero-step="${step}"]`), step).toBeNull();
    }
  });

  it("reads in one order at every width: my words, the hint, 2003 to 2025, my field tag", () => {
    // Round 25: one grid, one set of tags; each band only lays them out.
    const { about } = renderHero();
    const yard = about.querySelector(".hero-yard")!;
    const read = [...yard.children]
      .filter((el) => el.getAttribute("aria-hidden") !== "true")
      .map((el) => el.getAttribute("data-yard") ?? el.getAttribute("data-hero-step"));
    expect(read).toEqual(["words", "hint", "line", "field"]);
    expect(yard.querySelector('[data-yard="hint"]')).toHaveTextContent(hero.hint);
    const tags = [...yard.querySelectorAll('[data-hero-step="line"] > li')];
    expect(tags).toHaveLength(4);
    expect(tags.map((li) => li.querySelector("button")?.textContent?.match(/Kiên Giang|Taylors|USC|DoorDash/)?.[0])).toEqual([
      "Kiên Giang",
      "Taylors",
      "USC",
      "DoorDash",
    ]);
    expect(yard.querySelector('[data-yard="field"] [data-hero-step="field-tag"]')).not.toBeNull();
  });

  it("gives every hung thing its place on the line from the line's one description", () => {
    const { about } = renderHero();
    const hung = [...about.querySelectorAll<HTMLElement>('.hero-yard li, .hero-yard [data-yard="field"]')];
    expect(hung).toHaveLength(5);
    for (const el of hung) {
      for (const name of ["--y-phone", "--string-phone", "--y-tablet", "--string-tablet"]) {
        expect(el.style.getPropertyValue(name), name).toMatch(/^\d+(\.\d)?px$/);
      }
    }
  });

  it("the yard: three passes for a phone, two for a tablet, between poles with a tuft at each foot", () => {
    const { about } = renderHero();
    const yard = about.querySelector<HTMLElement>('[data-scenery="yard"]')!;
    expect(yard).toHaveAttribute("aria-hidden", "true");
    expect(yard.querySelector("button, a, [tabindex]")).toBeNull();
    expect(yard.querySelectorAll("svg[data-yard-pass]")).toHaveLength(5);
    for (const svg of yard.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
    expect([...yard.querySelectorAll("[data-yard-pole]")].map((el) => el.getAttribute("data-yard-pole"))).toEqual(["left", "right", "pine"]);
    expect(yard.querySelectorAll("[data-yard-tuft]")).toHaveLength(3);
    expect(yard.querySelectorAll('[data-scenery="bamboo-stem"]')).toHaveLength(2);
    // The hat hangs here below 1024 and on the scenery's bamboo from there.
    expect(about.querySelectorAll('[data-scenery="non-la"]')).toHaveLength(2);
  });

  it("the terminal is gone", () => {
    const { container } = renderHero();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(container.querySelector("[data-typing]")).toBeNull();
    expect(container.textContent).not.toMatch(/whoami/);
  });

  it("keeps About to three paragraphs", () => {
    // The chat corpus still indexes `profile.about`, though nothing renders it.
    expect(profile.about).toHaveLength(3);
  });
});
