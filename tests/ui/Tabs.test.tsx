import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, type TabItem } from "@/components/ui/Tabs";

const TAB_ITEMS: readonly TabItem[] = [
  { id: "one", label: "One", panel: <p>Panel one content</p> },
  { id: "two", label: "Two", panel: <p>Panel two content</p> },
  { id: "three", label: "Three", panel: <p>Panel three content</p> },
];

function renderTabs() {
  return render(<Tabs label="Example tabs" tabs={TAB_ITEMS} idPrefix="ex" />);
}

describe("Tabs", () => {
  it("wires the ARIA tablist/tab/tabpanel relationship correctly", () => {
    renderTabs();

    const tablist = screen.getByRole("tablist", { name: "Example tabs" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    const activeTab = tabs[0] as HTMLElement;
    expect(activeTab).toHaveAttribute("aria-selected", "true");

    const panel = screen.getByRole("tabpanel");
    expect(activeTab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", activeTab.id);
    expect(panel).toHaveAttribute("tabindex", "0");
  });

  it("renders only the active panel -- the other panels are not in the document at all", () => {
    renderTabs();

    expect(screen.getByText("Panel one content")).toBeInTheDocument();
    expect(screen.queryByText("Panel two content")).not.toBeInTheDocument();
    expect(screen.queryByText("Panel three content")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("clicking a tab selects it and swaps the rendered panel", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Two" }));

    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Panel two content")).toBeInTheDocument();
    expect(screen.queryByText("Panel one content")).not.toBeInTheDocument();
  });

  it("uses a roving tabIndex: only the selected tab is a natural Tab stop", async () => {
    const user = userEvent.setup();
    renderTabs();

    const [tabOne, tabTwo, tabThree] = screen.getAllByRole("tab");
    expect(tabOne).toHaveAttribute("tabindex", "0");
    expect(tabTwo).toHaveAttribute("tabindex", "-1");
    expect(tabThree).toHaveAttribute("tabindex", "-1");

    await user.click(tabTwo as HTMLElement);

    expect(tabOne).toHaveAttribute("tabindex", "-1");
    expect(tabTwo).toHaveAttribute("tabindex", "0");
    expect(tabThree).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight moves focus and selection to the next tab, wrapping from last to first", async () => {
    const user = userEvent.setup();
    renderTabs();

    screen.getByRole("tab", { name: "One" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowLeft moves focus and selection to the previous tab, wrapping from first to last", async () => {
    const user = userEvent.setup();
    renderTabs();

    screen.getByRole("tab", { name: "One" }).focus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");
  });

  it("Home selects the first tab and End selects the last, from a tab in the middle", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Two" }));

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the active-tab indicator's layout-affecting class present in both states (no layout shift on switch)", async () => {
    const user = userEvent.setup();
    renderTabs();

    const tabOne = screen.getByRole("tab", { name: "One" });
    const tabTwo = screen.getByRole("tab", { name: "Two" });

    // The selection indicator is a persistent 2px bottom border on every tab
    // button; only its colour token changes with `aria-selected`, and
    // `border-b-2` (the class governing the border's width, i.e. its
    // contribution to layout) is unconditional in the component's class
    // list. That is what guarantees switching tabs never shifts layout --
    // verified here by asserting the class survives a selection change on
    // both the tab that lost selection and the tab that gained it.
    expect(tabOne).toHaveClass("border-b-2");
    expect(tabTwo).toHaveClass("border-b-2");

    await user.click(tabTwo);

    expect(tabOne).toHaveClass("border-b-2");
    expect(tabTwo).toHaveClass("border-b-2");
  });

  it("renders nothing for an empty tabs array rather than throwing", () => {
    const { container } = render(<Tabs label="Empty" tabs={[]} idPrefix="empty" />);
    expect(container).toBeEmptyDOMElement();
  });
});
