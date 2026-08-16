import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterGroup, type FilterOption } from "@/components/ui/FilterGroup";

const OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All", count: 12 },
  { id: "web", label: "Web", count: 7 },
  { id: "cli", label: "CLI", count: 3 },
  { id: "data", label: "Data", count: 2 },
];

/**
 * FilterGroup is a controlled component (`value` + `onChange` are owned by
 * the caller), so exercising its real interactive behaviour needs a small
 * stateful harness rather than a bare render -- this is test-only code, not
 * a change to the component.
 */
function ControlledFilterGroup({ options = OPTIONS }: { options?: readonly FilterOption[] }) {
  const [value, setValue] = useState(options[0]?.id ?? "");
  return (
    <FilterGroup
      label="Filter by category"
      options={options}
      value={value}
      onChange={setValue}
      idPrefix="filter"
    />
  );
}

describe("FilterGroup", () => {
  it("renders a radiogroup with one radio per option and correct aria-checked", () => {
    render(<ControlledFilterGroup />);

    const group = screen.getByRole("radiogroup", { name: "Filter by category" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(4);

    expect(screen.getByRole("radio", { name: /All/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Web/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /CLI/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveAttribute("aria-checked", "false");
  });

  it("renders every option's count as visible text, so selection is never colour-only", () => {
    render(<ControlledFilterGroup />);

    for (const option of OPTIONS) {
      const radio = screen.getByRole("radio", { name: new RegExp(option.label) });
      expect(within(radio).getByText(String(option.count))).toBeInTheDocument();
    }
  });

  it("clicking an option selects it and deselects the previous one", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterGroup />);

    await user.click(screen.getByRole("radio", { name: /Web/ }));

    expect(screen.getByRole("radio", { name: /Web/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /All/ })).toHaveAttribute("aria-checked", "false");
  });

  it("uses a roving tabIndex: only the checked option is a natural Tab stop", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterGroup />);

    const [all, web] = screen.getAllByRole("radio");
    expect(all).toHaveAttribute("tabindex", "0");
    expect(web).toHaveAttribute("tabindex", "-1");

    await user.click(web as HTMLElement);

    expect(all).toHaveAttribute("tabindex", "-1");
    expect(web).toHaveAttribute("tabindex", "0");
  });

  it("ArrowRight/ArrowDown move to the next option and wrap from the last to the first", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterGroup />);

    screen.getByRole("radio", { name: /All/ }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Web/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /Web/ })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /CLI/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /CLI/ })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveFocus();

    await user.keyboard("{ArrowRight}"); // wraps past the last option
    expect(screen.getByRole("radio", { name: /All/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /All/ })).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowLeft/ArrowUp move to the previous option and wrap from the first to the last", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterGroup />);

    screen.getByRole("radio", { name: /All/ }).focus();

    await user.keyboard("{ArrowLeft}"); // wraps backward past the first option
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /CLI/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /CLI/ })).toHaveAttribute("aria-checked", "true");
  });

  it("Home jumps to the first option and End jumps to the last, from the middle", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterGroup />);

    await user.click(screen.getByRole("radio", { name: /Web/ }));

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /Data/ })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: /All/ })).toHaveFocus();
    expect(screen.getByRole("radio", { name: /All/ })).toHaveAttribute("aria-checked", "true");
  });
});
