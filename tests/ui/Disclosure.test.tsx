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

    // The intended contract: the visible summary and the visually hidden
    // expand/collapse label must read as separate words in the computed
    // accessible name, not run together as one. Disclosure enforces this
    // with a sibling text-node space before VisuallyHidden (not whitespace
    // written inside it, which accessible-name computation would trim away
    // before concatenation).
    expect(
      screen.getByRole("button", { name: "Read the case study Read more" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Read the case study Read more" }));

    expect(
      screen.getByRole("button", { name: "Read the case study Show less" }),
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
      screen.getByRole("button", { name: "Case study Expand case study" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Case study Expand case study" }));

    expect(
      screen.getByRole("button", { name: "Case study Collapse case study" }),
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

    it("is excluded from the accessibility tree while collapsed, but stays in the DOM for print (SPEC section 2)", () => {
      const { container } = render(
        <Disclosure id="d6" summary="More detail">
          <p>Secret detail text</p>
          <button type="button">Inner action</button>
        </Disclosure>,
      );

      // Collapsed by default (defaultOpen defaults to false).
      //
      // This is deliberately NOT `queryByText(...).not.toBeInTheDocument()`.
      // Two independent reasons:
      //  1. `getByText`/`queryByText` have no hidden-state filtering at all
      //     (confirmed by reading dist/queries/text.js: no `hidden` option,
      //     no call to `isInaccessible`/`isSubtreeInaccessible` anywhere in
      //     that file -- only dist/queries/role.js consults those, via its
      //     `hidden` option). A `queryByText(...).not.toBeInTheDocument()`
      //     assertion here would not be exercising visibility at all.
      //  2. The content is *supposed* to remain in the DOM while collapsed
      //     -- that is the whole reason this component uses a CSS
      //     visibility flip instead of unmounting: `data-print-expand` on
      //     the region lets the print stylesheet force it open regardless
      //     of on-screen state. Asserting it is absent from the document
      //     would assert against that intended, correct design.
      const paragraph = screen.getByText("Secret detail text");

      // What must actually be true: not visible, not reachable via an
      // accessible role. First, confirm the stylesheet installed by this
      // describe block is actually being resolved by jsdom for this exact
      // nested structure (region > visibility-wrapper > pt-2 div > child) --
      // asserted directly, not just inferred from `toBeVisible()` passing.
      expect(getComputedStyle(paragraph).visibility).toBe("hidden");

      // jest-dom's `toBeVisible()` explicitly checks computed `visibility`
      // (among other things), so this is the correct matcher for "not
      // visible" -- unlike `queryByText`, it exercises the real mechanism.
      expect(paragraph).not.toBeVisible();

      // Accessibility-tree exclusion specifically, via the query that is
      // actually hidden-state-aware: `getByRole` -> `isInaccessible`, which
      // checks computed `visibility` (role-helpers.js line ~67: "since
      // visibility is inherited we can exit early"). `hidden: false` is the
      // default; spelled out for clarity.
      expect(
        screen.queryByRole("button", { name: "Inner action", hidden: false }),
      ).not.toBeInTheDocument();

      // Proving that exclusion is a visibility filter and not that the
      // button failed to render at all, via a plain DOM query rather than
      // re-querying by role+name with `hidden: true`: per the AccName spec,
      // a hidden element's own *computed name* also resolves to "" (not
      // just its role-list membership), so `hidden: true` alone does not
      // make it findable again by `name` -- that is a second, independent
      // testing-library/AccName subtlety, not a re-run of the same check.
      const innerButton = container.querySelector("button:not([aria-expanded])");
      expect(innerButton).not.toBeNull();
      expect(innerButton).toHaveTextContent("Inner action");
      expect(innerButton).not.toBeVisible();

      // And the trigger itself is never hidden, collapsed or not.
      expect(screen.getByRole("button", { name: /More detail/i })).toBeInTheDocument();
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
