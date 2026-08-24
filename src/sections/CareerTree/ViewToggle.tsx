"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { DESKTOP_VIEW_QUERY, forceCareerTreeView, setCareerTreeTogglePressed } from "./view-state";

interface ViewToggleProps {
  readonly className?: string;
}

const BUTTON_CLASS =
  "min-h-11 border border-rule px-4 font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-fg-muted transition-colors duration-200 hover:text-fg active:translate-y-px aria-pressed:border-fg aria-pressed:text-fg";

/**
 * "Tree / List" — real, keyboard-reachable `aria-pressed` buttons (SPEC §2),
 * not a `role="radiogroup"` like `FilterGroup`: this is a two-state on/off
 * switch for which *face* of the section is on screen, not a choice among
 * several equal options.
 *
 * Renders no default state of its own — both buttons start `aria-pressed=
 * "false"` in the server-rendered HTML, which is honest about what the
 * server can know: the correct default (`tree` at >=1024px, `list` below it)
 * is a viewport fact no server render has. The effect below corrects
 * `aria-pressed` (never the panels' visibility — that is already right from
 * pure CSS, see `view-state.ts`) the instant it mounts, and keeps tracking
 * the breakpoint across a resize *until* a visitor presses one of these
 * buttons, at which point their explicit choice wins and stays won —
 * `hasChosen` never resets.
 */
export function ViewToggle({ className }: ViewToggleProps) {
  const hasChosenRef = useRef(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_VIEW_QUERY);

    function syncToViewport() {
      if (hasChosenRef.current) return;
      setCareerTreeTogglePressed(desktopQuery.matches ? "tree" : "list");
    }

    syncToViewport();
    desktopQuery.addEventListener("change", syncToViewport);
    return () => desktopQuery.removeEventListener("change", syncToViewport);
  }, []);

  return (
    <div
      role="group"
      aria-label="Career tree presentation"
      className={cn("inline-flex", className)}
    >
      <button
        type="button"
        data-tree-view-toggle="tree"
        aria-pressed="false"
        onClick={() => {
          hasChosenRef.current = true;
          forceCareerTreeView("tree");
        }}
        className={cn(BUTTON_CLASS, "border-r-0")}
      >
        Tree
      </button>
      <button
        type="button"
        data-tree-view-toggle="list"
        aria-pressed="false"
        onClick={() => {
          hasChosenRef.current = true;
          forceCareerTreeView("list");
        }}
        className={BUTTON_CLASS}
      >
        List
      </button>
    </div>
  );
}

export default ViewToggle;
