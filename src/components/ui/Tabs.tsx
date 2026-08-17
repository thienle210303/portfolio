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
}

/**
 * Accessible ARIA tabs (SPEC §2): `role="tablist"`, roving `tabIndex`,
 * Arrow/Home/End keys, and only the active panel ever rendered. Selection
 * is never colour-only — the active tab gets a persistent 2px bottom
 * border whose colour changes (rather than appearing/disappearing, so
 * switching tabs never shifts layout) plus a text-colour shift, on top of
 * `aria-selected` itself.
 */
export function Tabs({ label, tabs, idPrefix }: TabsProps) {
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
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-x-8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectByIndex(index, false)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "min-h-11 shrink-0 whitespace-nowrap border-b-2 px-1 py-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] transition-colors duration-200",
                selected
                  ? "border-[color:var(--fg)] text-[color:var(--fg)]"
                  : "border-[color:var(--rule-color)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-${activeTab.id}`}
        aria-labelledby={`${idPrefix}-tab-${activeTab.id}`}
        tabIndex={0}
        className="pt-6"
      >
        {activeTab.panel}
      </div>
    </div>
  );
}

export default Tabs;
