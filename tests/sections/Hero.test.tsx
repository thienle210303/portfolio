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
