"use client";

import { Compass } from "lucide-react";
import { LAUNCHER_ATTRIBUTE } from "./guideFocus";
import { setOpen } from "./guideStore";
import { useGuideDismissed, useGuideOpen } from "./useGuideState";

/**
 * The guide's launcher below `lg`, sitting in the site header.
 *
 * Under 64rem there is no gutter to hold a creature and no sensible way for
 * one to walk around a phone screen without becoming exactly the nuisance this
 * whole feature is designed not to be. So at those widths the guide drops its
 * body and keeps its usefulness: an ordinary icon button, in the header, that
 * opens the same panel.
 *
 * A compass rather than a fox — at 18px in a row of chrome, a silhouetted
 * animal reads as a smudge, and pretending otherwise would be decoration for
 * its own sake.
 */
export function GuideLauncherCompact() {
  const dismissed = useGuideDismissed();
  const open = useGuideOpen();

  if (dismissed) return null;

  return (
    <button
      type="button"
      // `lg:hidden` is the counterpart to the lane's `min-width: 64rem` in
      // globals.css. The two must agree, or both launchers render at once.
      className="inline-flex h-11 w-11 items-center justify-center text-muted transition-colors duration-150 hover:text-paper lg:hidden"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      {...{ [LAUNCHER_ATTRIBUTE]: "" }}
    >
      <Compass aria-hidden="true" focusable="false" size={18} />
      <span className="sr-only">Site guide — search this page</span>
    </button>
  );
}

export default GuideLauncherCompact;
