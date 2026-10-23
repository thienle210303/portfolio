"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FilterOption {
  readonly id: "all" | "work" | "learning" | "milestone";
  readonly label: string;
  readonly count: number;
}

/**
 * The Record's one client island: All / Work / Study / Milestones over the
 * year list (`children`, server rendered). A filter only sets `data-filter`
 * on the list; `globals.css` hides the other kinds' rows and any year left
 * empty. Buttons with `aria-pressed`, and the count of what shows is said in a
 * polite live region.
 *
 * Without JavaScript the buttons are hidden (`html:not([data-motion])`, the
 * flag the page's first script stamps) and every row shows.
 *
 * Two small jobs ride along, because this is the module already on the page:
 *  - a link to a year or a row the filter is hiding (a ring, a pressed card, a
 *    tag on the Journey) clears the filter before the browser follows it, so
 *    the jump always lands;
 *  - browsers without invoker commands (`commandfor`, see `ImageDialog.tsx`)
 *    get the same `showModal()` / `close()` from one click listener.
 */
export function RecordFilters({
  options,
  label,
  children,
}: {
  readonly options: readonly FilterOption[];
  readonly label: string;
  readonly children: ReactNode;
}) {
  const [filter, setFilter] = useState<FilterOption["id"]>("all");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      // `getAttribute`, not `.hash`: the rings are SVG links, which have none.
      const href = target?.closest("a[href^='#']")?.getAttribute("href");
      if (href) {
        let id = href.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          // A malformed escape names nothing.
        }
        const el = document.getElementById(id);
        const list = listRef.current;
        if (el && list?.contains(el) && el.getClientRects().length === 0) {
          // Set on the element first, synchronously, so the browser's own
          // scroll to the fragment (right after this handler) finds it shown.
          list.dataset.filter = "all";
          setFilter("all");
        }
      }
      const invoker = target?.closest<HTMLButtonElement>("button[commandfor]");
      if (invoker && !("commandForElement" in HTMLButtonElement.prototype)) {
        const dialog = document.getElementById(invoker.getAttribute("commandfor") ?? "");
        if (dialog instanceof HTMLDialogElement) {
          if (invoker.getAttribute("command") === "show-modal") dialog.showModal();
          else dialog.close();
        }
      }
    };
    // Capture, so the filter clears before the browser scrolls to the link.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const shown = options.find((o) => o.id === filter)?.count ?? 0;

  return (
    <>
      <div
        role="group"
        aria-label={label}
        className="mt-4 flex flex-wrap gap-2 [html:not([data-motion])_&]:hidden"
      >
        {options.map((option) => {
          const pressed = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setFilter(option.id)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 border px-3 font-mono text-[length:var(--step--1)] transition-colors duration-(--dur-quick)",
                pressed
                  ? "border-fg bg-fg text-fg-inverse"
                  : "border-rule text-fg-muted hover:border-fg-muted hover:text-fg",
              )}
            >
              {option.label}
              <span className={pressed ? "" : "text-fg-muted"}>{option.count}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {filter === "all" ? "" : `Showing ${shown} ${shown === 1 ? "entry" : "entries"}`}
      </p>
      <div ref={listRef} data-record-list="" data-filter={filter}>
        {children}
      </div>
    </>
  );
}
