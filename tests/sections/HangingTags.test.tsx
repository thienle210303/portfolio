import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import HangingTags, { TAG_LOOKS, TAG_SPOTS } from "@/sections/CareerTree/HangingTags";
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
      // Round 27: the year is a date stamp beside the name.
      "DoorDash",
      "2025",
      "17h",
      "3m",
      "3.9%",
      "0% error",
      "Scraper, rebuilt",
      "2",
      "25",
      "2026",
      "onboarded merchants/month",
      "Agent workflow",
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
      expect(spot.width).toBe(spots[i].width);
      expect(spot.left).toBe(spots[i].x - spot.width / 2);
      // Round 27: one string or two, each from the limb above its own eyelet.
      expect(spot.eyes.map((e) => e.at)).toEqual(spots[i].eyes.map((e) => e.e));
      spot.eyes.forEach((eye, k) => expect(eye.drop).toBeCloseTo(spots[i].top - spots[i].eyes[k].ly, 1));
    });
  });

  it("mixes one string and two, and no two tags look alike", () => {
    const counts = TAG_SPOTS.map((s) => s.eyes.length);
    expect(counts).toContain(1);
    expect(counts).toContain(2);
    expect(new Set(TAG_SPOTS.map((s) => s.width)).size).toBe(TAG_SPOTS.length);
    expect(new Set(TAG_SPOTS.map((s) => s.tilt)).size).toBe(TAG_SPOTS.length);
    expect(new Set(TAG_LOOKS.map((l) => l.kraft)).size).toBe(TAG_LOOKS.length);
    expect(new Set(TAG_LOOKS.map((l) => l.year)).size).toBeGreaterThanOrEqual(3);
    // Every string is a string: it leaves the limb above the tag.
    for (const s of TAG_SPOTS) for (const e of s.eyes) expect(e.drop).toBeGreaterThan(0);
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
      // Each string's share that grows with the board: the limb down to the
      // tag's top. The 18px on down to the eyelet is the paper's own.
      expect(Number(value("--d1"))).toBeCloseTo(spots[i].top - spots[i].eyes[0].ly, 1);
      expect(li.dataset.strings).toBe(String(spots[i].eyes.length));
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
