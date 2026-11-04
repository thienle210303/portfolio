"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly panel: ReactNode;
}

interface TabsProps {
  readonly label: string;
  readonly tabs: readonly TabItem[];
  readonly idPrefix: string;
  /** Uppercase, tracked labels — the default. `false` sets them as typed, for
   *  labels that are commands (the retired hero terminal's `whoami` was the
   *  one caller). */
  readonly caps?: boolean;
  /**
   * `line` (the default): mono labels over a 2px rule. `index` (round 24, the
   * chat's Prose / Code): small paper tabs standing on the panel's top edge,
   * the selected one the panel's own paper, joined to it; the others the
   * ground's tint behind. The tab is 28px to the eye on a 44px target.
   */
  readonly variant?: "line" | "index";
  /** Index variant only: a label in the same row as the tabs, before them
   *  (outside the tablist, so it is not read as a tab). */
  readonly lead?: ReactNode;
}

/**
 * Accessible ARIA tabs (SPEC §2): `role="tablist"`, roving `tabIndex`,
 * Arrow/Home/End keys, and only the active panel ever rendered. Selection
 * is never colour-only — the active tab gets a persistent 2px bottom
 * border whose colour changes (rather than appearing/disappearing, so
 * switching tabs never shifts layout) plus a text-colour shift, on top of
 * `aria-selected` itself. In the index variant the selected tab loses its
 * foot and joins the panel's edge, and its label is set bold.
 */
export function Tabs({ label, tabs, idPrefix, caps = true, variant = "line", lead }: TabsProps) {
  const [activeId, setActiveId] = useState<string>(() => tabs[0]?.id ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = tabs.findIndex((tab) => tab.id === activeId);
  const activeTab = tabs[activeIndex] ?? tabs[0];

  function selectByIndex(index: number, focus: boolean) {
    const target = tabs[index];
    if (!target) return;
    setActiveId(target.id);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectByIndex((index + 1) % tabs.length, true);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectByIndex((index - 1 + tabs.length) % tabs.length, true);
        break;
      case "Home":
        event.preventDefault();
        selectByIndex(0, true);
        break;
      case "End":
        event.preventDefault();
        selectByIndex(tabs.length - 1, true);
        break;
      default:
        break;
    }
  }

  if (!activeTab) return null;

  const isIndex = variant === "index";

  const tablist = (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        isIndex ? "-mb-px shrink-0 gap-x-1 pt-1" : "gap-x-8",
      )}
    >
      {tabs.map((tab, tabIndex) => {
        const selected = tab.id === activeTab.id;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tabIndex] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectByIndex(tabIndex, false)}
            onKeyDown={(event) => handleKeyDown(event, tabIndex)}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap font-mono text-[length:var(--step--1)] transition-colors duration-200",
              caps && "uppercase tracking-(--tracking-caps)",
              isIndex
                ? "group inline-flex items-end"
                : cn(
                    "border-b-2 px-1 py-2",
                    selected
                      ? "border-[color:var(--fg)] text-[color:var(--fg)]"
                      : "border-[color:var(--rule-color)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
                  ),
            )}
          >
            {isIndex ? (
              <span
                className={cn(
                  "rounded-t-[3px] border border-rule px-3 pt-1.5 pb-1 leading-none",
                  selected
                    ? "border-b-surface bg-surface font-bold text-fg"
                    : "bg-ground text-fg-muted group-hover:text-fg",
                )}
              >
                {tab.label}
              </span>
            ) : (
              tab.label
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      {/*
        Scrolls sideways rather than wrapping. Wrapping turned three tabs into
        three stacked full-width rows the moment the panel got narrow, which
        reads as a broken list rather than as a tab strip — and it moved the
        panel down the page every time the widest tab was selected.
        `scrollbar-width: none` hides the bar itself; the tabs stay reachable
        by keyboard through the existing roving tabIndex, which also scrolls
        the focused tab into view for free.
      */}
      {isIndex ? (
        <div className="flex items-end justify-between gap-x-3 border-b border-rule">
          <div className="min-w-0 pb-1.5">{lead}</div>
          {tablist}
        </div>
      ) : (
        tablist
      )}
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-${activeTab.id}`}
        aria-labelledby={`${idPrefix}-tab-${activeTab.id}`}
        tabIndex={0}
        className={isIndex ? "pt-4" : "pt-6"}
      >
        {activeTab.panel}
      </div>
    </div>
  );
}

export default Tabs;
