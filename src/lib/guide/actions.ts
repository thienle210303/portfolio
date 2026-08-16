"use client";

/**
 * Executes a `GuideAction`.
 *
 * The safety argument for the whole guide lives in this file: every branch
 * below drives a control the visitor could already operate by hand. `goto`
 * does what clicking a nav link does; `copy-email` does what the existing
 * `CopyButton` does; `print-resume` does what the résumé section's Print
 * control does. Nothing here can reach a capability that is not already on
 * the page, which is why matching a query to an action can never produce a
 * surprising outcome.
 *
 * Adding a branch is therefore a deliberate decision to expose an existing
 * affordance by name — never a way to give the guide a new power.
 */

import { profile, resumeLenses } from "@/content/portfolio";
import { setLens, type LensValue } from "@/sections/ResumeExplorer/lensStore";
import type { GuideAction } from "./types";

/** Narrows an index-supplied id to a lens the section actually offers. The
 *  index is generated from the same content, so a mismatch means a bug rather
 *  than bad input — but it must not become a silent no-op. */
function isLensValue(id: string): id is LensValue {
  return id === "all" || resumeLenses.some((lens) => lens.id === id);
}

/** Result of an action, for the panel's status announcement and focus policy. */
export interface ActionOutcome {
  /** Announced politely. Empty string means "say nothing". */
  readonly message: string;
  /** True when the panel should close — the action moved the reader or is done. */
  readonly close: boolean;
  /**
   * True when this action has already put focus somewhere deliberate, so
   * closing the panel must **not** restore focus to the launcher.
   *
   * Only `goto` sets this, and getting it wrong is not cosmetic: the panel
   * restores focus on close so an Escape does not strand a keyboard visitor at
   * the top of the document. Applying that same restore after a navigation
   * yanks focus straight back out of the section the visitor asked to be taken
   * to — they end up scrolled to the right place with their focus in the wrong
   * one, which is the exact failure the skip link exists to prevent. `SiteNav`
   * carries the same warning for the same reason.
   */
  readonly keepFocus: boolean;
}

/** An action that finished without moving focus or needing to say anything. */
const SILENT_CLOSE: ActionOutcome = { message: "", close: true, keepFocus: false };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scrolls to a section and moves keyboard focus there.
 *
 * Mirrors the desktop branch of `SiteNav`'s own link handling on purpose,
 * including the `tabindex="-1"` step. That step is load-bearing rather than
 * defensive: fragment navigation only scrolls, it cannot focus a
 * non-interactive element, so without it a keyboard visitor is scrolled to a
 * new section while their focus stays behind in the guide — the same bug the
 * skip link exists to avoid. `preventScroll` keeps the focus call from
 * fighting the smooth scroll below it.
 *
 * Unlike `SiteNav`, this can scroll immediately rather than deferring to a
 * cleanup: the guide's panel never locks background scroll, so `body` is always
 * in normal flow when this runs. (`SiteNav`'s mobile menu does lock it, but it
 * traps focus while open, so the two panels can never be open at once.)
 */
function gotoSection(sectionId: string): ActionOutcome {
  const target = document.getElementById(sectionId);
  if (!target) {
    return { message: `Could not find the ${sectionId} section.`, close: false, keepFocus: false };
  }

  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  window.history.pushState(null, "", `#${sectionId}`);
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });

  // `keepFocus` because the focus call above is the whole point of this
  // action, not a side effect of it.
  return { message: "", close: true, keepFocus: true };
}

/**
 * Applies a résumé lens, then navigates to the résumé.
 *
 * This is the clearest example of the rule at the top of this file: it does not
 * filter anything itself. It sets the same store the section's own `FilterGroup`
 * chips set, so the chips visibly move, the section's `aria-live` region
 * announces the new count, and "Reset" undoes it — all machinery that already
 * existed. The guide supplied a name for it, nothing more.
 */
function applyResumeLens(lensId: string): ActionOutcome {
  if (!isLensValue(lensId)) {
    return { message: `No résumé lens called ${lensId}.`, close: false, keepFocus: false };
  }
  setLens(lensId);
  // Navigating second, so the reader lands on an already-filtered section
  // rather than watching it rearrange underneath them.
  return gotoSection("resume");
}

async function copyEmail(): Promise<ActionOutcome> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;

  // Same posture as `CopyButton`: feature-check and catch, so a failure is
  // never reported as a success. A visitor told "copied" when nothing was
  // copied is worse off than one told to select it by hand.
  if (!clipboard || typeof clipboard.writeText !== "function") {
    return {
      message: `Copy is unavailable — the address is ${profile.email}`,
      close: false,
      keepFocus: false,
    };
  }

  try {
    await clipboard.writeText(profile.email);
    // Stays open so the confirmation is readable where the visitor is looking.
    return {
      message: `Copied ${profile.email} to your clipboard.`,
      close: false,
      keepFocus: false,
    };
  } catch {
    return {
      message: `Copy failed — the address is ${profile.email}`,
      close: false,
      keepFocus: false,
    };
  }
}

/**
 * Sends the résumé to the printer.
 *
 * The print stylesheet in `globals.css` already narrows the output to the
 * résumé section alone, so this needs no DOM preparation — it opens the
 * dialog and the stylesheet does the scoping. The guide itself carries
 * `no-print`, so it never appears on the page.
 */
function printResume(): ActionOutcome {
  window.print();
  // Closes, but focus has not moved, so the panel restores it to the launcher.
  return SILENT_CLOSE;
}

function downloadResume(): ActionOutcome {
  // `noopener` on a programmatic open for the same reason it is on the
  // markup links: the new tab gets no handle back to this one.
  const opened = window.open(profile.resumePdf, "_blank", "noopener,noreferrer");
  if (!opened) {
    return {
      message: "The résumé did not open — your browser may have blocked the new tab.",
      close: false,
      keepFocus: false,
    };
  }
  return SILENT_CLOSE;
}

export async function runGuideAction(action: GuideAction): Promise<ActionOutcome> {
  switch (action.kind) {
    case "goto":
      return gotoSection(action.sectionId);
    case "resume-lens":
      return applyResumeLens(action.lensId);
    case "copy-email":
      return copyEmail();
    case "print-resume":
      return printResume();
    case "download-resume":
      return downloadResume();
    default: {
      // Exhaustiveness guard: adding a variant to `GuideAction` without
      // handling it here becomes a compile error rather than a silent no-op.
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
