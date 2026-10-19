import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FieldTag from "@/sections/Hero/FieldTag";
import { QR_URL } from "@/sections/Hero/LinkedInQr";
import { buildFieldTag } from "@/lib/hero";
import { profile } from "@/content/portfolio";

describe("FieldTag", () => {
  it("rows read from content", () => {
    const { container } = render(<FieldTag />);
    const pairs = [...container.querySelectorAll("dl > div")].map((d) => [
      d.querySelector("dt")!.textContent,
      d.querySelector("dd")!.textContent,
    ]);
    expect(pairs).toEqual(buildFieldTag().rows.map((r) => [r.label, r.value]));
    expect(screen.getByText("Still growing")).toBeTruthy();
  });

  it("stamps the motto", () => {
    render(<FieldTag />);
    expect(screen.getByText(profile.motto).className).toContain("uppercase");
  });

  it("the QR is a named link to my LinkedIn", () => {
    render(<FieldTag />);
    const a = screen.getByRole("link", { name: /^My LinkedIn/ });
    expect(a.getAttribute("href")).toBe(QR_URL);
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("adds no heading", () => {
    const { container } = render(<FieldTag />);
    expect(container.querySelector("h1,h2,h3,h4,h5,h6")).toBeNull();
  });

  it("uses the mark once", () => {
    const { container } = render(<FieldTag />);
    const marked = [...container.querySelectorAll("*")].filter((e) => e.className?.toString().includes("--mark"));
    expect(marked).toHaveLength(1);
  });
});
