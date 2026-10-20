import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SectionHeading } from "@/components/ui/SectionHeading";

describe("SectionHeading", () => {
  it("a chapter heading uses the chapter step", () => {
    const { container } = render(<SectionHeading id="h" size="chapter">Title</SectionHeading>);
    expect(container.querySelector("h2")!.className).toContain("--step-chapter");
  });

  it("the default is unchanged", () => {
    const { container } = render(<SectionHeading id="h">Title</SectionHeading>);
    const cls = container.querySelector("h2")!.className;
    expect(cls).toContain("--step-3");
    expect(cls).not.toContain("--step-chapter");
  });
});
