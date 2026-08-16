"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import GuideCreature from "./GuideCreature";
import GuidePanel from "./GuidePanel";
import { focusVisibleLauncher, LAUNCHER_ATTRIBUTE } from "./guideFocus";
import { setDismissed, setOpen } from "./guideStore";
import { useGuideDismissed, useGuideOpen } from "./useGuideState";
import { usePrefersReducedMotion, useCreatureMotion, useLaneTone } from "./useCreatureMotion";
import type { GuideIndex } from "@/lib/guide/types";

/**
 * The site guide: two cats in the left margin — a blue one leading, a tabby
 * following — that double as a reading-position indicator and a
 * search-and-navigate launcher.
 *
 * ## The rules it is built to keep
 *
 *  1. **It never speaks first.** No greeting, no auto-tour, no timer that
 *     opens anything. `open` is ephemeral store state, so it cannot even be
 *     open on arrival.
 *  2. **It never covers content.** The lane sits in the gutter, which is
 *     padding. Only the panel — which the visitor opened — overlays anything.
 *  3. **It costs nothing until used.** The index is fetched on first open; the
 *     embedding model only if explicitly enabled. Initial page weight is
 *     unchanged by this component's existence beyond its own small bundle.
 *  4. **One dismissal is permanent**, with revival only from the footer.
 *  5. **Every movement answers something the visitor just did** — scrolling
 *     moves it, the pointer turns its head, and nothing else animates.
 *
 * ## Position as information
 *
 * Their height in the lane tracks progress through the document, so they are a
 * scroll indicator that happens to be a pair of animals. That is what earns
 * them a permanent place on the page: they report something rather than
 * decorating.
 *
 * ## Below `lg`
 *
 * The lane is `display: none` under 64rem (see globals.css) — cats roaming a
 * 320px screen are pure annoyance, and there is no gutter to put them in.
 * `GuideLauncherCompact` in the site header covers those widths instead,
 * driving this same panel through the shared store.
 */
export function SiteGuide() {
  const dismissed = useGuideDismissed();
  const open = useGuideOpen();

  const [index, setIndex] = useState<GuideIndex | null>(null);
  const [indexError, setIndexError] = useState(false);

  const laneRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Reports `true` for the hydration render regardless of the real setting,
  // so the cats' first painted state is always the still one.
  const motionAllowed = !usePrefersReducedMotion();

  useLaneTone(laneRef);
  useCreatureMotion(laneRef, { enabled: motionAllowed });

  /* --- Index loading ---------------------------------------------------- */

  // Fetched on first open, never on mount. A visitor who never touches the
  // guide never requests it, which is what keeps this off the critical path.
  useEffect(() => {
    if (!open || index || indexError) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch("/guide-index.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Guide index responded ${response.status}`);
        return response.json() as Promise<GuideIndex>;
      })
      .then((loaded) => {
        if (!cancelled) setIndex(loaded);
      })
      .catch(() => {
        // An aborted fetch is a normal unmount, not a failure worth reporting.
        if (!cancelled) setIndexError(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, index, indexError]);

  /* --- Open / close ----------------------------------------------------- */

  const close = useCallback((options?: { readonly restoreFocus?: boolean }) => {
    setOpen(false);
    // The panel traps focus, so by default closing must hand it back or a
    // keyboard visitor is dropped at the top of the document. Which launcher to
    // return to depends on viewport width, so it is resolved from the DOM
    // rather than tracked in state.
    //
    // The exception is a close caused by navigation: `gotoSection` has already
    // focused the destination section, and restoring here would pull focus
    // straight back out of it.
    if (options?.restoreFocus !== false) focusVisibleLauncher();
  }, []);

  const dismissForever = useCallback(() => {
    setDismissed(true);
    // No launcher survives this — they all unmount — so focus would fall to
    // <body>. The footer revive control is the only thing that can bring the
    // guide back, which makes it the honest destination. Deferred a frame so
    // it exists in the DOM by the time we reach for it.
    requestAnimationFrame(() => {
      document.getElementById("guide-revive")?.focus();
    });
  }, []);

  if (dismissed) return null;

  return (
    <>
      <div ref={laneRef} className="guide-lane no-print">
        <button
          type="button"
          className="guide-launcher"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen(!open)}
          {...{ [LAUNCHER_ATTRIBUTE]: "" }}
        >
          <GuideCreature />
          <span className="sr-only">Site guide — search this page</span>
        </button>
      </div>

      {open ? (
        <GuidePanel
          index={index}
          indexError={indexError}
          onClose={close}
          onDismissForever={dismissForever}
          panelId={panelId}
        />
      ) : null}
    </>
  );
}

export default SiteGuide;
