import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChapterTags from "@/sections/Hero/ChapterTags";
import { buildChapters } from "@/lib/hero";
import { hero } from "@/content/portfolio";

const HREFS = ["#tree", "#journey-entry-eastside-high", "#journey-entry-usc-degree", "#journey-entry-doordash"];
const NAMES = [/2003\s+Kiên Giang/, /Dec 2018\s+Taylors/, /2021\s+USC/, /2025\s+DoorDash/];

function setup() {
  const chapters = buildChapters().map((c, i) => ({ ...c, href: HREFS[i] }));
  const view = render(<ChapterTags chapters={chapters} />);
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
    expect(within(back).getByText(hero.chapterLines.origin)).toBeInTheDocument();
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
        const heights = (el.getAttribute("class") ?? "").split(/\s+/).filter((c) => /(^|:)h-\[/.test(c));
        expect(heights.filter((c) => c !== "h-[88px]")).toEqual([]);
      }
    }
  });

  it("the drawing is decoration", () => {
    const { tag } = setup();
    for (let i = 0; i < 4; i++) {
      expect(tag(i).front.querySelector("[data-scenery]")).toHaveAttribute("aria-hidden", "true");
    }
  });
});
