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

  it("gives the region an accessible name equal to the filename", () => {
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

  it("wraps long lines instead of scrolling sideways (whitespace-pre-wrap + wrap-anywhere on the region)", () => {
    render(<CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />);
    const region = screen.getByRole("region", { name: "example.ts" });
    expect(region).toHaveClass("whitespace-pre-wrap");
    // `wrap-anywhere` is a project-defined utility (globals.css), not a
    // built-in Tailwind class — it's the belt-and-braces part that lets a
    // single unbreakable token break mid-token rather than widen the panel.
    expect(region).toHaveClass("wrap-anywhere");
  });

  it("carries no horizontal-scroll affordance now that lines wrap (no .code-scroll scrim, no overflow-x-auto, no scroll-only tab stop)", () => {
    render(<CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />);
    const region = screen.getByRole("region", { name: "example.ts" });
    expect(region).not.toHaveClass("code-scroll");
    expect(region).not.toHaveClass("overflow-x-auto");
    // There is nothing left to scroll inside the region, so it no longer
    // needs its own tab stop — the page's ordinary scroll/tab order carries
    // it now, the same as any other static content.
    expect(region).not.toHaveAttribute("tabindex");
  });

  it("preserves the round-trip guarantee for a single long unbreakable token, the case wrapping exists to handle", () => {
    const longToken = "a".repeat(200);
    const codeWithLongToken = `const ${longToken} = 1;`;
    const { container } = render(
      <CodeBlock code={codeWithLongToken} filename="long.ts" summary="Long token summary" />,
    );
    const codeEl = container.querySelector("code");
    expect(codeEl?.textContent).toBe(codeWithLongToken);
  });

  describe("compact (round 12, WP-K: the hero code artifact's tightened frame)", () => {
    it("defaults to the ordinary, non-compact padding and type size", () => {
      const { container } = render(
        <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" />,
      );
      const region = screen.getByRole("region", { name: "example.ts" });
      expect(region).toHaveClass("p-4");
      expect(region).not.toHaveClass("p-3");

      const codeEl = container.querySelector("code");
      expect(codeEl).toHaveClass("text-[length:var(--step--1)]");
      expect(codeEl).not.toHaveClass("text-[length:var(--step--2)]");
    });

    it("steps padding and type down a notch when compact, without touching the code content", () => {
      const { container } = render(
        <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" compact />,
      );

      const region = screen.getByRole("region", { name: "example.ts" });
      expect(region).toHaveClass("p-3");
      expect(region).not.toHaveClass("p-4");

      const codeEl = container.querySelector("code");
      expect(codeEl).toHaveClass("text-[length:var(--step--2)]");
      expect(codeEl?.textContent).toBe(SAMPLE_CODE);

      const figcaption = container.querySelector("figcaption");
      expect(figcaption).toHaveClass("px-3", "py-2");
    });

    it("keeps the accessible name, describedby wiring and token markup identical when compact", () => {
      render(
        <CodeBlock code={SAMPLE_CODE} filename="example.ts" summary="Example summary" compact />,
      );
      expect(screen.getByRole("region", { name: "example.ts" })).toBeInTheDocument();
      expect(screen.getByText("Example summary")).toBeInTheDocument();
      expect(document.querySelectorAll('[data-token="keyword"]').length).toBeGreaterThan(0);
    });
  });
});
