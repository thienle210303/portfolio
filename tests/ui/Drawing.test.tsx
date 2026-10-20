import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ART_DRAWINGS, Drawing, INK_DRAWINGS } from "@/components/scenery/Drawing";

describe("Drawing", () => {
  it("renders an aria-hidden ink mask", () => {
    const { container } = render(<Drawing name="tag-rice" className="text-fg" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveAttribute("data-scenery", "tag-rice");
    expect(el.className).toContain("scene-ink");
    expect(el.className).toContain("text-fg");
    expect(el.style.getPropertyValue("--art")).toBe("url(/scenery/tag-rice.svg)");
  });

  it("non-la is art, not ink", () => {
    const { container } = render(<Drawing name="non-la" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("scene-art");
    expect(el.className).not.toContain("scene-ink");
  });

  it("every ink drawing has a committed file", () => {
    for (const n of INK_DRAWINGS) expect(existsSync(`public/scenery/${n}.svg`), n).toBe(true);
  });

  it("oak-leaves is an ink mask", () => {
    expect(INK_DRAWINGS).toContain("oak-leaves");
    const { container } = render(<Drawing name="oak-leaves" className="text-accent" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("scene-ink");
  });
});

describe("Drawing — Contact's art", () => {
  it("paints Contact's coloured pieces as art, and every one has a committed file", () => {
    for (const n of ART_DRAWINGS) {
      expect(existsSync(`public/scenery/${n}.svg`), n).toBe(true);
      const { container } = render(<Drawing name={n} />);
      expect((container.firstElementChild as HTMLElement).className, n).toContain("scene-art");
    }
    expect(ART_DRAWINGS).toContain("lanterns-night");
  });
});
