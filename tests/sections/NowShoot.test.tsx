import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import NowShoot, { NOW_SPOTS, NOW_TAG_W } from "@/sections/CareerTree/NowShoot";
import FieldTag from "@/sections/Hero/FieldTag";
import { now } from "@/content/portfolio";
import { answer } from "@/lib/answers";
import { NOW_ID, nowAsOfLabel, nowFieldTagLink, nowHeading } from "@/lib/now";
import { SHOOT, shootSpots } from "../../scripts/draw-scenery.mjs";

describe("New growth (round 26)", () => {
  it("hangs one tag per item, from the trunk out, under its caption", () => {
    render(<NowShoot />);
    const root = document.getElementById(NOW_ID)!;
    expect(root).toHaveAttribute("data-now");
    expect(within(root).getByRole("heading", { level: 3 })).toHaveTextContent(nowHeading());
    const list = within(root).getByRole("list", { name: now.label });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("[data-now-title] span")!.textContent)).toEqual(
      now.items.map((item) => item.name),
    );
    items.forEach((li, i) => {
      const item = now.items[i]!;
      expect(li).toHaveTextContent(item.status);
      expect(li).toHaveTextContent(item.line);
    });
  });

  it("puts no figure on a tag: nothing there is measured yet, and the caption says so", () => {
    render(<NowShoot />);
    expect(document.getElementById(NOW_ID)).toHaveTextContent(now.note);
    for (const item of now.items) expect(`${item.name} ${item.line}`).not.toMatch(/\d+\s*(%|→|x\b|M\+)/);
  });

  it("opens an item's own site in a new tab, with a 44px target", () => {
    render(<NowShoot />);
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-now] a")];
    expect(links.map((a) => a.href)).toEqual(now.items.flatMap((item) => (item.link ? [new URL(item.link.href).href] : [])));
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("data-now-link");
    }
  });

  it("the spots are the generator's, and the shoot grows from a limb's tip", () => {
    expect(SHOOT.root).toEqual(SHOOT.limbTip);
    const spots = shootSpots();
    expect(NOW_SPOTS).toHaveLength(spots.length);
    expect(NOW_SPOTS).toHaveLength(now.items.length);
    NOW_SPOTS.forEach((spot, i) => {
      expect(spot.x).toBe(spots[i].x);
      expect(spot.top).toBe(spots[i].top);
      expect(spot.drop).toBeCloseTo(spots[i].top - spots[i].ly, 5);
    });
    // Neighbours never overlap, and every tag hangs inside the shoot's sky.
    for (let i = 1; i < NOW_SPOTS.length; i++) expect(NOW_SPOTS[i]!.x - NOW_SPOTS[i - 1]!.x).toBeGreaterThan(NOW_TAG_W);
    for (const spot of NOW_SPOTS) expect(spot.top).toBeGreaterThan(SHOOT.box[1]);
  });

  it("places nothing itself: each item carries its spot in board units", () => {
    render(<NowShoot />);
    const items = [...document.querySelectorAll<HTMLElement>("[data-now] li")];
    items.forEach((li, i) => {
      const spot = NOW_SPOTS[i]!;
      expect(li.style.getPropertyValue("--x")).toBe(String(spot.x - NOW_TAG_W / 2));
      expect(li.style.getPropertyValue("--y")).toBe(String(spot.top));
      expect(li.className).toBe("");
    });
  });

  it("dates itself from the content, and counts its shoots for the field tag", () => {
    expect(nowAsOfLabel("2026-11")).toBe("Nov 2026");
    expect(() => nowAsOfLabel("Nov 2026")).toThrow();
    expect(nowFieldTagLink()).toBe(`${now.items.length} new shoots`);
  });

  it("the field tag's status leads to it", () => {
    render(<FieldTag />);
    const link = document.querySelector<HTMLAnchorElement>(`a[href="#${NOW_ID}"]`)!;
    expect(link).toHaveTextContent(nowFieldTagLink());
  });

  it("the chat answers what I am doing now, citing the Journey", () => {
    // ("now" itself is a stop word in the engine, so ask it another way.)
    const texts = now.items.map((item) => `${item.name}, ${item.status}: ${item.line}`);
    for (const question of ["What are you doing lately?", "What are you building these days?", "Tell me about TradeCorp"]) {
      const [top] = answer(question);
      expect(top?.sectionId, question).toBe("tree");
      expect(texts, question).toContain(top?.text);
    }
  });
});
