import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import HangingTags, { TAG_SPOTS } from "@/sections/CareerTree/HangingTags";
import { journeySpots } from "../../scripts/draw-scenery.mjs";

const links = () => [...document.querySelectorAll<HTMLAnchorElement>("[data-hanging-tags] > ul a")];

describe("HangingTags", () => {
  it("hangs five tags in board order, each a link to its row", () => {
    render(<HangingTags />);
    const list = document.querySelector("[data-hanging-tags] > ul") as HTMLElement;
    expect(list).toHaveAttribute("aria-label", "What I measured");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((li) => li.querySelector("a")!.getAttribute("href"))).toEqual([
      "#journey-entry-doordash",
      "#journey-entry-wordification",
      "#journey-entry-schaeffler",
      "#journey-entry-usc-scraping",
      "#journey-entry-usc-ta",
    ]);
  });

  it("DoorDash is one ticket with a 2026 stub that reads on in its case study", () => {
    render(<HangingTags />);
    const ticket = document.querySelector("[data-hanging-tags] > ul > li") as HTMLElement;
    const text = ticket.textContent ?? "";
    let at = 0;
    for (const part of [
      "DoorDash",
      "17h",
      "3m",
      "2025",
      "3.9%",
      "0% error",
      "Reverse engineering scraper",
      "2",
      "25",
      "2026",
      "onboarded merchants/month",
      "An agent-driven workflow that adapts to every merchant",
    ]) {
      const next = text.indexOf(part, at);
      expect(next, part).toBeGreaterThanOrEqual(at);
      at = next + part.length;
    }
    // Once on the paper; the stub's link names it for a screen reader only.
    const visible = [...ticket.querySelectorAll("*")].filter(
      (el) => el.children.length === 0 && !el.closest(".sr-only") && el.textContent === "DoorDash",
    );
    expect(visible).toHaveLength(1);
    expect(ticket.querySelectorAll("[data-perforation]")).toHaveLength(1);
    expect(ticket.querySelector("[data-perforation]")).toHaveAttribute("aria-hidden", "true");
    const hrefs = [...ticket.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["#journey-entry-doordash", "#work-dd-feasibility-agent"]);
  });

  it('a screen reader hears "to", not an arrow', () => {
    render(<HangingTags />);
    const root = document.querySelector("[data-hanging-tags]") as HTMLElement;
    const arrows = [...root.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent?.includes("→"));
    expect(arrows.length).toBeGreaterThan(0);
    for (const el of arrows) {
      expect(el.closest('[aria-hidden="true"]'), el.textContent ?? "").not.toBeNull();
      expect(el.nextElementSibling?.className).toContain("sr-only");
      expect(el.nextElementSibling?.textContent).toBe(" to ");
    }
  });

  it("the paper is never the focusable", () => {
    render(<HangingTags />);
    for (const el of document.querySelectorAll(".tag-cut, [data-stub]")) {
      expect(el.tagName).not.toBe("A");
      expect(el.tagName).not.toBe("BUTTON");
      expect(el.hasAttribute("tabindex")).toBe(false);
    }
    expect(links().length).toBe(6);
  });

  it("no fixed heights, no nowrap below 1280", () => {
    render(<HangingTags />);
    const root = document.querySelector("[data-hanging-tags] > ul") as HTMLElement;
    for (const el of [root, ...root.querySelectorAll("*")]) {
      if (el.hasAttribute("data-whole-word")) continue; // a hyphenated word, never wider than the tag
      const cls = typeof el.className === "string" ? el.className : "";
      expect(cls, cls).not.toMatch(/(^|\s)h-\[|(^|\s)whitespace-nowrap/);
    }
  });

  it("the spots are the generator's", () => {
    const spots = journeySpots();
    expect(TAG_SPOTS).toHaveLength(spots.length);
    TAG_SPOTS.forEach((spot, i) => {
      expect(spot.top).toBe(spots[i].top);
      expect(spot.string).toBeCloseTo(spots[i].top + 18 - spots[i].ly, 5);
      expect(spot.left).toBe(spots[i].x - spot.width / 2);
    });
  });

  it("gives each tag its spot in board units, never pixels, and places nothing itself", () => {
    render(<HangingTags />);
    const spots = journeySpots();
    const items = [...document.querySelectorAll<HTMLElement>("[data-hanging-tags] > ul > li")];
    items.forEach((li, i) => {
      const value = (name: string) => li.style.getPropertyValue(name);
      expect(value("--x")).toBe(String(TAG_SPOTS[i].left));
      expect(value("--y")).toBe(String(TAG_SPOTS[i].top));
      expect(value("--w")).toBe(String(TAG_SPOTS[i].width));
      // The string's share that grows with the board: the limb down to the
      // tag's top. The 18px on down to the hole is the paper's own.
      expect(Number(value("--drop"))).toBeCloseTo(spots[i].top - spots[i].ly, 1);
      expect(value("--tilt")).toBe(`${TAG_SPOTS[i].tilt}deg`);
      // globals.css lays the tags out per band; a utility here would beat it.
      expect(li.className).toBe("");
    });
    for (const el of [document.querySelector("[data-hanging-tags]")!, document.querySelector("[data-hanging-tags] > ul")!]) {
      expect(el.className).toBe("");
    }
  });

  it("the branch is decoration", () => {
    render(<HangingTags />);
    const art = document.querySelectorAll("[data-hanging-tags] [data-scenery]");
    expect(art.length).toBeGreaterThan(0);
    for (const el of art) expect(el.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
