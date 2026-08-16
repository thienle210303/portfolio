import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders an <a> when href is passed", () => {
    render(<Button href="/resume.pdf">Download resume</Button>);
    expect(screen.getByRole("link", { name: "Download resume" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a <button> when href is omitted", () => {
    render(<Button>Send message</Button>);
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("defaults the button's type to 'button' so it never submits an enclosing form by accident", () => {
    render(<Button>Send message</Button>);
    expect(screen.getByRole("button", { name: "Send message" })).toHaveAttribute("type", "button");
  });

  it("honours an explicit type='submit'", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("does not add target/rel to an internal (site-relative) href", () => {
    render(<Button href="/resume.pdf">Download resume</Button>);
    const link = screen.getByRole("link", { name: "Download resume" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
    expect(link).toHaveAttribute("href", "/resume.pdf");
  });

  it("does not add target/rel to an in-page anchor href", () => {
    render(<Button href="#contact">Jump to contact</Button>);
    const link = screen.getByRole("link", { name: "Jump to contact" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("gives an https:// href target=_blank, rel=noopener noreferrer, and a new-tab notice for screen readers", () => {
    render(<Button href="https://example.com/case-study">Visit</Button>);

    // The intended contract: the visible label and the visually hidden
    // "(opens in a new tab)" suffix must read as two separate words in the
    // computed accessible name, not run together as one. ExternalLink
    // enforces this with a sibling text-node space (not whitespace written
    // inside VisuallyHidden, which accessible-name computation would trim
    // away before concatenation).
    const link = screen.getByRole("link", { name: "Visit (opens in a new tab)" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("href", "https://example.com/case-study");
  });

  it("treats a plain http:// href as external too, not just https://", () => {
    render(<Button href="http://example.com">Visit</Button>);
    const link = screen.getByRole("link", { name: "Visit(opens in a new tab)" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("the new-tab notice is real text content, not colour/icon-only signalling", () => {
    render(<Button href="https://example.com">Visit</Button>);
    expect(screen.getByText("(opens in a new tab)")).toBeInTheDocument();
  });

  it("forwards a custom className alongside the built-in classes, on the button path", () => {
    render(<Button className="custom-marker">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveClass("custom-marker");
  });

  it("forwards a custom className alongside the built-in classes, on the link path", () => {
    render(
      <Button href="/resume.pdf" className="custom-marker">
        Download
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Download" })).toHaveClass("custom-marker");
  });

  it("meets the 44px minimum tap-target height for both size variants (SPEC section 2)", () => {
    const { rerender } = render(<Button size="md">Medium</Button>);
    expect(screen.getByRole("button", { name: "Medium" })).toHaveClass("min-h-11");

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: "Small" })).toHaveClass("min-h-11");
  });

  it("meets the 44px minimum tap-target height on the link path too", () => {
    render(
      <Button href="/resume.pdf" size="sm">
        Download
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Download" })).toHaveClass("min-h-11");
  });
});
