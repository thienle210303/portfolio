import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import NowNursery, { NURSERY_BOX, NURSERY_STICKS } from "@/sections/CareerTree/NowNursery";
import FieldTag from "@/sections/Hero/FieldTag";
import { now } from "@/content/portfolio";
import { answer } from "@/lib/answers";
import { NOW_ID, nowAsOfLabel, nowFieldTagLink } from "@/lib/now";
import { NURSERY } from "../../scripts/draw-scenery.mjs";

describe("The nursery (round 27)", () => {
  it("stands a marker by each seedling, oldest nearest the trunk", () => {
    render(<NowNursery />);
    const root = document.getElementById(NOW_ID)!;
    expect(root).toHaveAttribute("data-nursery");
    const list = within(root).getByRole("list", { name: now.label });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("[data-marker-name]")!.textContent!.replace(/\u00AD/g, ""))).toEqual(now.items.map((i) => i.name));
    items.forEach((li, i) => {
      expect(li.querySelector("[data-date]")).toHaveTextContent(now.items[i]!.status);
      expect(li).toHaveTextContent(now.items[i]!.line);
    });
  });

  it("is brief: a few words a marker, no caption, no date, no figure", () => {
    render(<NowNursery />);
    for (const item of now.items) {
      expect(item.line.split(/\s+/).length, item.line).toBeLessThanOrEqual(3);
      expect(item.line).not.toMatch(/[.!?]$/);
      expect(`${item.name} ${item.line}`).not.toMatch(/\d+\s*(%|→|M\+)/);
    }
    expect(document.getElementById(NOW_ID)!.textContent).not.toMatch(/20\d\d|new growth/i);
  });

  it("opens an item's own site in a new tab, named for the item", () => {
    render(<NowNursery />);
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-nursery] a")];
    const linked = now.items.filter((i) => i.link);
    expect(links).toHaveLength(linked.length);
    links.forEach((a, k) => {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.textContent).toContain(linked[k]!.name);
    });
  });

  it("places each marker on the drawing's own stick", () => {
    expect(NURSERY_BOX).toEqual(NURSERY.box);
    expect(NURSERY_STICKS.map(({ x, stick }) => ({ x, stick }))).toEqual(NURSERY.plants.map(({ x, stick }) => ({ x, stick })));
    expect(NURSERY_STICKS).toHaveLength(now.items.length);
    // Each seedling smaller than the one before; each marker above its own.
    NURSERY.plants.forEach((p, i) => {
      if (i > 0) expect(p.h).toBeLessThan(NURSERY.plants[i - 1]!.h);
      expect(p.stick).toBeLessThan(NURSERY.crate.top - p.h);
    });
  });

  it("dates itself for the chat, and counts its seedlings for the field tag", () => {
    expect(nowAsOfLabel("2026-11")).toBe("Nov 2026");
    expect(() => nowAsOfLabel("Nov 2026")).toThrow();
    expect(nowFieldTagLink()).toBe(`${now.items.length} seedlings`);
    render(<FieldTag />);
    expect(document.querySelector(`a[href="#${NOW_ID}"]`)).toHaveTextContent(nowFieldTagLink());
  });

  it("the chat answers what I am doing now, citing the Journey", () => {
    const texts = now.items.map((item) => `${item.name}, ${item.status}: ${item.line}`);
    for (const question of ["What are you doing lately?", "Tell me about TradeCorp"]) {
      const [top] = answer(question);
      expect(top?.sectionId, question).toBe("tree");
      expect(texts, question).toContain(top?.text);
    }
  });
});
