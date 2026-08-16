import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Disclosure } from "@/components/ui/Disclosure";

/**
 * Disclosure's collapsed-content accessibility guarantee (SPEC section 2:
 * "Content must be in the DOM only when expanded, or properly hidden") is
 * implemented with `visibility: hidden` / `visibility: visible`, applied via
 * Tailwind's `invisible` / `visible` utility classes (see the doc comment on
 * `src/components/ui/Disclosure.tsx`) rather than removing the subtree from
 * the DOM. jsdom does not load the project's compiled Tailwind stylesheet,
 * so without help, `getComputedStyle` on those elements would just report
 * the browser default ("visible") regardless of which class is present --
 * NOT because the component is wrong, but because no CSS rule defining
 * `.invisible`/`.visible` exists in the test document at all.
 *
 * Verified directly (throwaway probe, not part of this file): jsdom's
 * `getComputedStyle` DOES correctly resolve a class selector once a matching
 * rule is actually present in a `<style>` element in the document. So this
 * suite injects only the two rules the mechanism actually depends on --
 * Tailwind's literal, unthemed, version-stable output for `.visible` /
 * `.invisible` (`visibility: visible|hidden`), nothing project-specific --
 * which makes the real guarantee verifiable here instead of untestable.
 * jsdom has no animation engine, so it resolves this synchronously/instantly
 * rather than after the component's 200ms `transition-delay`; that delay is
 * a real-browser transition-timing detail out of reach of a jsdom unit test
 * (an e2e concern), but the *target* state each class change lands on -- the
 * actual accessibility guarantee -- is exactly what this verifies.
 */
function installVisibilityUtilityStylesheet(): () => void {
  const styleEl = document.createElement("style");
  styleEl.textContent = ".visible { visibility: visible; } .invisible { visibility: hidden; }";
  document.head.appendChild(styleEl);
  return () => styleEl.remove();
}

describe("Disclosure", () => {
  it("starts collapsed (aria-expanded=false) by default and toggles to true on click", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure id="d1" summary="More detail">
        <p>Body copy</p>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: /More detail/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("honours defaultOpen=true by starting expanded", () => {
    render(
      <Disclosure id="d2" summary="More detail" defaultOpen>
        <p>Body copy</p>
      </Disclosure>,
    );

    expect(screen.getByRole("button", { name: /More detail/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("changes the trigger's accessible name between the expand and collapse labels", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure id="d3" summary="Read the case study">
        <p>Body copy</p>
      </Disclosure>,
    );

    // Verified directly against the real computed accname (dom-accessibility-api
    // does not insert a space between these two adjacent inline nodes since
    // there is no whitespace text node between them in the markup): the
    // trigger's accessible name is "Read the case studyRead more", not
    // "...study Read more". Asserted here exactly as computed, not as guessed.
    expect(
      screen.getByRole("button", { name: "Read the case studyRead more" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Read the case studyRead more" }));

    expect(
      screen.getByRole("button", { name: "Read the case studyShow less" }),
    ).toBeInTheDocument();
  });

  it("uses custom expandLabel/collapseLabel text in the trigger's accessible name when supplied", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure
        id="d3b"
        summary="Case study"
        expandLabel="Expand case study"
        collapseLabel="Collapse case study"
      >
        <p>Body copy</p>
      </Disclosure>,
    );

    expect(
      screen.getByRole("button", { name: "Case studyExpand case study" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Case studyExpand case study" }));

    expect(
      screen.getByRole("button", { name: "Case studyCollapse case study" }),
    ).toBeInTheDocument();
  });

  it("marks the region with data-print-expand so the print stylesheet can force it open", () => {
    render(
      <Disclosure id="d4" summary="More detail">
        <p>Body copy</p>
      </Disclosure>,
    );

    const region = screen.getByRole("region", { hidden: true });
    expect(region).toHaveAttribute("data-print-expand");
  });

  it("wires the region to the trigger via aria-controls / element id", () => {
    render(
      <Disclosure id="d5" summary="More detail">
        <p>Body copy</p>
      </Disclosure>,
    );

    const trigger = screen.getByRole("button", { name: /More detail/i });
    const region = screen.getByRole("region", { hidden: true });
    expect(trigger).toHaveAttribute("aria-controls", region.id);
  });

  describe("collapsed-content visibility (real `visible`/`invisible` utilities installed, see top of file)", () => {
    let uninstall: () => void;

    beforeAll(() => {
      uninstall = installVisibilityUtilityStylesheet();
    });

    afterAll(() => {
      uninstall();
    });

    it("is excluded from the accessibility tree while collapsed (SPEC section 2)", () => {
      render(
        <Disclosure id="d6" summary="More detail">
          <p>Secret detail text</p>
        </Disclosure>,
      );

      // Collapsed by default (defaultOpen defaults to false). Note this is
      // deliberately NOT `queryByText(...).not.toBeInTheDocument()`: reading
      // testing-library's own source (dist/queries/text.js) shows
      // `getByText`/`queryByText` have no hidden-state filtering at all --
      // only `getByRole` consults `isInaccessible` (dist/role-helpers.js),
      // which checks `display`, the `hidden` attribute, `aria-hidden`, AND
      // computed `visibility`. `toBeVisible()` (jest-dom) is the matcher
      // that actually inspects visibility/display/hidden, so it is the
      // correct tool for this assertion.
      const paragraph = screen.getByText("Secret detail text");
      expect(paragraph).not.toBeVisible();

      // And via the role-aware, hidden-state-filtering query directly, from
      // the opposite direction: with `hidden: false` (the default), the
      // trigger is still discoverable (it's never hidden)...
      expect(screen.getByRole("button", { name: /More detail/i })).toBeInTheDocument();
      // ...but nothing with an accessible role inside the collapsed region
      // is -- there is no accessible "paragraph"/generic content role
      // reachable there while collapsed (getByRole is accessibility-tree
      // aware, unlike getByText).
      expect(screen.queryByRole("region", { hidden: false })).not.toBeInTheDocument();
    });

    it("is exposed to the accessibility tree once expanded", async () => {
      const user = userEvent.setup();
      render(
        <Disclosure id="d7" summary="More detail">
          <p>Secret detail text</p>
        </Disclosure>,
      );

      await user.click(screen.getByRole("button", { name: /More detail/i }));

      expect(screen.getByText("Secret detail text")).toBeVisible();
    });

    it("is not reachable by Tab while collapsed, and is reachable once expanded", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Disclosure id="d8" summary="More detail">
            <a href="/case-study">Read the full case study</a>
          </Disclosure>
          <button type="button">After</button>
        </>,
      );

      await user.tab();
      expect(screen.getByRole("button", { name: /More detail/i })).toHaveFocus();

      // Collapsed: the link inside must be skipped entirely.
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();

      await user.tab({ shift: true });
      await user.click(screen.getByRole("button", { name: /More detail/i }));

      // Expanded: the link is now a legitimate stop in the tab order.
      await user.tab();
      expect(screen.getByRole("link", { name: /Read the full case study/i })).toHaveFocus();
    });
  });
});
