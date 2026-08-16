"use client";

import { setDismissed } from "./guideStore";
import { useGuideDismissed } from "./useGuideState";

/**
 * The only way back after the guide has been dismissed.
 *
 * It lives in the footer and renders *nothing at all* unless the guide is
 * actually dismissed. That asymmetry is the point: dismissing is one click and
 * permanent, and the offer to undo it never nags — it waits at the bottom of
 * the page for someone who goes looking.
 *
 * `id="guide-revive"` is the focus target `SiteGuide.dismissForever` reaches
 * for, so a keyboard visitor who dismisses the guide lands here rather than at
 * <body>, with the undo already announced.
 */
export function GuideRevive() {
  const dismissed = useGuideDismissed();
  if (!dismissed) return null;

  return (
    <button
      id="guide-revive"
      type="button"
      onClick={() => setDismissed(false)}
      className="inline-flex min-h-11 items-center text-[length:var(--step--1)] text-silver transition-colors duration-150 hover:text-paper"
    >
      Bring back the site guide
    </button>
  );
}

export default GuideRevive;
