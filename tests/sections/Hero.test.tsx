import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Hero from "@/sections/Hero/Hero";
import { profile } from "@/content/portfolio";
import { currentEntry } from "@/lib/terminal";
import { ABOUT_LEGACY_SECTION_IDS } from "@/sections/Hero/anchors";

/**
 * Round 20 Phase 3 (spec §3), Hero A: eyebrow (role · employer), headline, one
 * paragraph, two actions, beside the terminal. No margin rail.
 */

function renderHero(bookingUrl: string | null = null) {
  const { container } = render(<Hero bookingUrl={bookingUrl} />);
  const identity = container.querySelector<HTMLElement>("[data-hero-identity]");
  if (!identity) throw new Error("Hero rendered no identity column");
  return { container, identity };
}

describe("Hero", () => {
  it("carries the retired #worlds anchor", () => {
    const { container } = renderHero();
    const anchor = container.querySelector("#about #worlds");
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute("aria-hidden", "true");
    expect(anchor?.className).toMatch(/scroll-mt-20/);
    expect(ABOUT_LEGACY_SECTION_IDS).toEqual(["worlds"]);
  });

  it("names the current role and employer in the eyebrow", () => {
    const { identity } = renderHero();
    const current = currentEntry();
    expect(identity.querySelector(".eyebrow")).toHaveTextContent(`${current.role} · ${current.organization}`);
  });

  it("renders the headline and the positioning line as its one paragraph", () => {
    const { identity } = renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(profile.headline);
    const body = identity.querySelectorAll("p:not(.eyebrow)");
    expect(body).toHaveLength(1);
    expect(body[0]).toHaveTextContent(profile.positioning);
  });

  it("no longer renders the About paragraphs", () => {
    renderHero();
    for (const paragraph of profile.about) expect(screen.queryByText(paragraph)).toBeNull();
  });

  it("still prints the focus line, which the chat cites #about for", () => {
    // answer-corpus.ts cites #about for `profile.focus`; the terminal prints it.
    renderHero();
    expect(screen.getByText(profile.focus, { exact: false })).toBeInTheDocument();
  });

  it("has no margin rail", () => {
    const { container } = renderHero();
    expect(container.querySelector(".rail, .rail-layout")).toBeNull();
  });

  it("has exactly one h1 and no h2 of its own", () => {
    // Every other section's h2 comes from SectionHeading, so a stray one here
    // breaks the document-wide heading order check in e2e.
    renderHero();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("offers two actions: See my work (the primary) and a quiet Book a call", () => {
    const { identity } = renderHero();
    const links = identity.querySelectorAll("a");
    expect(links).toHaveLength(2);
    const work = screen.getByRole("link", { name: "See my work" });
    expect(work).toHaveAttribute("href", "#tree");
    expect(work.className).toMatch(/(^|\s)bg-\[color:var\(--control\)\]/);
    const book = screen.getByRole("link", { name: "Book a call" });
    expect(book).toHaveAttribute("href", "#contact");
    expect(book.className).toMatch(/(^|\s)border-transparent(\s|$)/);
  });

  it("fills only See my work with the control colour", () => {
    const { container } = renderHero();
    const filled = [...container.querySelectorAll<HTMLElement>("[class]")].filter((element) =>
      /(^|\s)bg-\[color:var\(--control\)\](\s|$)|(^|\s)bg-control(\s|$)/.test(element.className),
    );
    expect(filled.map((element) => element.textContent)).toEqual(["See my work"]);
  });

  it("opens a configured booking URL in a new tab", () => {
    const url = "https://cal.com/thienle/20min";
    renderHero(url);
    const book = screen.getByRole("link", { name: /^Book a call/ });
    expect(book).toHaveAttribute("href", url);
    expect(book).toHaveAttribute("target", "_blank");
    expect(book).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps the cats' perch", () => {
    const { container } = renderHero();
    const perch = container.querySelector("[data-cat-perch]");
    expect(perch).not.toBeNull();
    expect(perch).toHaveTextContent("Scroll");
  });

  it("keeps the load choreography's hooks", () => {
    const { container } = renderHero();
    for (const step of ["eyebrow", "h1", "intro", "meta-actions", "code", "scroll"]) {
      expect(container.querySelector(`[data-hero-step="${step}"]`), step).not.toBeNull();
    }
    expect(container.querySelector('[data-hero-step="hairline"]')).toBeNull();
  });

  it("keeps About to three paragraphs", () => {
    // The chat corpus still indexes `profile.about`, though nothing renders it.
    expect(profile.about).toHaveLength(3);
  });
});
