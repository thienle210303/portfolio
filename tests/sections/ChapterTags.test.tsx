import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChapterTags from "@/sections/Hero/ChapterTags";
import { buildChapters } from "@/lib/hero";
import { hero, now } from "@/content/portfolio";
import { NOW_ID } from "@/lib/now";

const HREFS = ["#tree", "#journey-entry-eastside-high", "#journey-entry-usc-degree", "#journey-entry-doordash"];
const NAMES = [/^2003\s+Kiên Giang/, /^Dec 2018\s+Taylors/, /^2021\s+USC/, /^2025 – now\s+What I'm doing now/];

function setup() {
  // `hang` and `hung` are the tag's place on the line, which Hero.tsx works out.
  const chapters = buildChapters().map((c, i) => ({ ...c, href: HREFS[i], hang: { "--y-phone": `${60 + i}px` } }));
  const view = render(<ChapterTags chapters={chapters} hung="hung" />);
  const items = Array.from(view.container.querySelectorAll<HTMLElement>("li"));
  const tag = (i: number) => {
    const li = items[i];
    const front = screen.getByRole("button", { name: NAMES[i] });
    const back = li.querySelector<HTMLElement>(`#${front.getAttribute("aria-controls")}`)!;
    return { li, front, back, flip: li.querySelector<HTMLElement>("[data-flip]")! };
  };
  return { ...view, items, tag };
}

describe("ChapterTags", () => {
  it("renders four closed tags in order", () => {
    const { items, tag } = setup();
    expect(items).toHaveLength(4);
    items.forEach((li, i) => {
      const { front, back } = tag(i);
      expect(li).toContainElement(front);
      expect(front).toHaveAttribute("aria-expanded", "false");
      expect(back).toHaveAttribute("inert");
    });
  });

  it("a press turns one tag over", async () => {
    const user = userEvent.setup();
    const { tag } = setup();
    const { front, back, flip } = tag(0);
    await user.click(front);
    expect(front).toHaveAttribute("aria-expanded", "true");
    expect(front).toHaveAttribute("inert");
    expect(back).not.toHaveAttribute("inert");
    expect(within(back).getByRole("button", { name: `${hero.chapterLines.origin} (turn the tag back)` })).toBeInTheDocument();
    expect(within(back).getByRole("link", { name: "Read this part" })).toHaveAttribute("href", "#tree");
    expect(flip).toHaveClass("rotate-y-180");
  });

  it("one tag open at a time", async () => {
    const user = userEvent.setup();
    const { tag } = setup();
    await user.click(tag(0).front);
    await user.click(tag(2).front);
    expect(tag(0).front).toHaveAttribute("aria-expanded", "false");
    expect(tag(0).back).toHaveAttribute("inert");
    expect(tag(2).front).toHaveAttribute("aria-expanded", "true");
    expect(tag(2).back).not.toHaveAttribute("inert");
  });

  it("opening another tag moves focus to its line and closes the first", async () => {
    const user = userEvent.setup();
    const { tag } = setup();
    await user.click(tag(0).front);
    await user.click(tag(3).front);
    expect(tag(0).front).toHaveAttribute("aria-expanded", "false");
    expect(within(tag(3).back).getByRole("button")).toHaveFocus();
  });

  it("focus follows the turn", async () => {
    const user = userEvent.setup();
    const { tag } = setup();
    const { front, back } = tag(1);
    const line = () => within(back).getByRole("button");

    front.focus();
    await user.keyboard("{Enter}");
    expect(line()).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(front).toHaveFocus();
    expect(front).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");
    expect(line()).toHaveFocus();
    await user.click(line());
    expect(front).toHaveAttribute("aria-expanded", "false");
    expect(front).toHaveFocus();
  });

  it("the back face grows to fit its line", () => {
    const { items } = setup();
    for (const li of items) {
      for (const el of li.querySelectorAll<HTMLElement>("*")) {
        expect(el.style.height).toBe("");
        // Only a drawing has a fixed height (round 28: each object sizes its
        // own drawing); nothing that holds words does.
        const heights = (el.getAttribute("class") ?? "").split(/\s+/).filter((c) => /(^|:)h-\[/.test(c));
        if (!el.hasAttribute("data-scenery")) expect(heights).toEqual([]);
      }
    }
  });

  it("hangs each chapter as its own object, two of them clothespinned", () => {
    const { items } = setup();
    expect(items.map((li) => li.querySelector("[data-chapter-paper]")!.getAttribute("data-chapter-paper"))).toEqual([
      "packet",
      "stub",
      "card",
      "receipt",
    ]);
    expect(items.map((li) => li.dataset.hang)).toEqual(["pin", "string", "pin", "string"]);
    items.forEach((li) => {
      const pinned = li.dataset.hang === "pin";
      expect(Boolean(li.querySelector(':scope > [data-scenery="clothespin"]'))).toBe(pinned);
      expect(Boolean(li.querySelector("[data-chapter-eyelet]"))).toBe(!pinned);
    });
  });

  it("the drawing is decoration (the receipt has none: its list is its height)", () => {
    const { tag } = setup();
    expect(tag(3).front.querySelector("[data-scenery]")).toBeNull();
    for (let i = 0; i < 3; i++) {
      expect(tag(i).front.querySelector("[data-scenery]")).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("every front reads year, place, then a few words (round 30)", () => {
    const { tag } = setup();
    for (const [i, few] of [hero.chapterFronts.origin, hero.chapterFronts["eastside-high"], hero.chapterFronts["usc-degree"]].entries()) {
      expect(tag(i).front.textContent).toMatch(new RegExp(`${few}$`));
    }
  });

  it("the receipt is what I am doing now: #now, the list as line items, its links on the back", async () => {
    const user = userEvent.setup();
    const { tag } = setup();
    const { li, front, back } = tag(3);
    expect(li).toHaveAttribute("id", NOW_ID);
    const rows = Array.from(front.querySelectorAll("[data-receipt-item]"));
    expect(rows.map((r) => r.textContent!.replace(/\s+/g, " ").trim())).toEqual(now.items.map((i) => `${i.name} ${i.status}`));
    expect(front.querySelector("a")).toBeNull();
    await user.click(front);
    const links = within(back).getAllByRole("link").filter((a) => a.getAttribute("target") === "_blank");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(now.items.flatMap((i) => (i.link ? [i.link.href] : [])));
  });
});
