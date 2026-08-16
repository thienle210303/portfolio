import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeBlock } from "@/components/ui/CodeBlock";

const SAMPLE_CODE = `const greeting = "hello";
// a comment
return greeting;`;

describe("CodeBlock", () => {
  it("renders a <pre> containing a <code> element", () => {
    const { container } = render(
      <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />,
    );

    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.querySelector("code")).not.toBeNull();
  });

  it("gives the scrollable region an accessible name equal to the filename", () => {
    render(<CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />);
    expect(screen.getByRole("region", { name: "example.ts" })).toBeInTheDocument();
  });

  it("shows the filename as visible text too, not only as the accessible name", () => {
    render(<CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />);
    expect(screen.getByText("example.ts")).toBeVisible();
  });

  it("wires the visually hidden summary to the region via aria-describedby", () => {
    render(
      <CodeBlock
        code={SAMPLE_CODE}
        filename="example.ts"
        summary="A helpful summary for screen readers"
      />,
    );

    const region = screen.getByRole("region", { name: "example.ts" });
    const describedById = region.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();

    const describedByEl = document.getElementById(describedById as string);
    expect(describedByEl).not.toBeNull();
    expect(describedByEl).toHaveTextContent("A helpful summary for screen readers");
    // And the same element is reachable the ordinary way too.
    expect(screen.getByText("A helpful summary for screen readers")).toBe(describedByEl);
  });

  it("recovers the exact input code from the rendered text (round-trip guarantee)", () => {
    const { container } = render(
      <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />,
    );
    const codeEl = container.querySelector("code");
    expect(codeEl?.textContent).toBe(SAMPLE_CODE);
  });

  it("recovers exact code containing tricky mixed indentation and blank lines", () => {
    const trickyCode = "  const x = {\n    a: 1,\n\tb: 2,\n\n  };\n";
    const { container } = render(
      <CodeBlock code={trickyCode} filename="tricky.ts" summary="Tricky summary" />,
    );
    const codeEl = container.querySelector("code");
    expect(codeEl?.textContent).toBe(trickyCode);
  });

  it("marks tokens with data-token so meaning survives colour removal (keyword/string/comment distinguishable)", () => {
    const { container } = render(
      <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />,
    );

    const keywordTokens = container.querySelectorAll('[data-token="keyword"]');
    const stringTokens = container.querySelectorAll('[data-token="string"]');
    const commentTokens = container.querySelectorAll('[data-token="comment"]');

    expect(keywordTokens.length).toBeGreaterThan(0);
    expect(stringTokens.length).toBeGreaterThan(0);
    expect(commentTokens.length).toBeGreaterThan(0);

    const keywordValues = Array.from(keywordTokens).map((el) => el.textContent);
    expect(keywordValues).toContain("const");
    expect(keywordValues).toContain("return");

    const stringValues = Array.from(stringTokens).map((el) => el.textContent);
    expect(stringValues).toContain('"hello"');
  });

  it("handles an empty code string without throwing, and still renders the surrounding structure", () => {
    const { container } = render(<CodeBlock code="" filename="empty.ts" summary="Nothing here" />);
    const codeEl = container.querySelector("code");
    expect(codeEl?.textContent).toBe("");
    expect(screen.getByRole("region", { name: "empty.ts" })).toBeInTheDocument();
  });

  it("is keyboard-focusable so keyboard users can scroll it (tabIndex=0 on the scrollable region)", () => {
    render(<CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />);
    expect(screen.getByRole("region", { name: "example.ts" })).toHaveAttribute("tabindex", "0");
  });
});
