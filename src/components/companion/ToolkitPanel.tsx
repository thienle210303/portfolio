"use client";

import { useState, type Ref } from "react";
import { cn } from "@/lib/cn";
import type { SceneKind } from "./companion-play";

/**
 * The panel the lead cat carries.
 *
 * It used to be a shortcut menu — jump to a section, copy the email address,
 * open GitHub. Every one of those already existed twice over in the header, the
 * hero and the contact section, which was defensible while the rule was "the
 * companion is never the only route to anything" but made the panel a third
 * rendering of the site's own navigation. The owner's round-7 note retires it:
 * the cats' menu should be about the cats.
 *
 * So it is a play menu. The four items ask for one of the scenes the companion
 * already knows how to act out, and the fifth sends the pair to bed.
 *
 * ## What "on demand" is allowed to skip, and what it is not
 *
 * Exactly one thing: the idle timer. A scene normally waits minutes and then
 * only opens if the visitor happens to be doing nothing — which is the right
 * default for something nobody asked for, and completely wrong for something
 * somebody just clicked. Everything else the scene engine does is untouched,
 * and deliberately so: the clear-spot probe still runs (so a play still cannot
 * happen on top of a paragraph), the scene still ends the moment the pointer
 * moves, and there is still no play at all on touch or under reduced motion
 * because there is no roaming loop there to run one.
 *
 * That last exclusion is why `canPlay` exists rather than a disabled button. A
 * control that is present but refuses is a control a keyboard visitor has to
 * discover the hard way; one sentence saying the cats are sitting this one out
 * is honest and costs nothing.
 *
 * ## Why the refusal is spoken
 *
 * `openPlay` declines whenever there is nowhere safe near the cats — a real and
 * fairly common outcome on a narrow window full of prose. Silence there is
 * indistinguishable from a broken button, so the panel says so, in a
 * `role="status"` region that a screen reader announces politely and everyone
 * else simply reads.
 *
 * Split out from `Companion` because it has nothing to do with the animation —
 * no position, no frame, no timing. It is ordinary markup with ordinary
 * handlers, and keeping it here leaves the orchestrator to the one hard thing
 * it actually does.
 */

export const PANEL_ID = "companion-actions";
const STATUS_ID = "companion-actions-status";

/** What asking for a scene can come back as. */
export type PlayRequest = "playing" | "no-room";

/**
 * The menu, and it is deliberately not every scene in `companion-play`.
 *
 * The gift — he carries the yarn ball over and drops it at her feet — is left
 * to the idle rotation on purpose: it is the one scene that is about the cats
 * noticing each other rather than about a thing the visitor threw, and putting
 * a button on it would make the only unprompted moment in the repertoire
 * prompted too.
 */
const SCENES: readonly { readonly kind: SceneKind; readonly label: string }[] = [
  { kind: "yarn", label: "Toss the yarn" },
  { kind: "moth", label: "Release a moth" },
  { kind: "bowl", label: "Dinner time" },
  { kind: "chase", label: "Start a chase" },
];

/** What the panel says when a scene has nowhere to happen. Names the thing that
 *  was asked for, because "no room" on its own reads as a fault rather than as
 *  an answer. */
const NO_ROOM: Record<SceneKind, string> = {
  yarn: "No room to roll a ball of yarn just here.",
  moth: "No room for a moth just here.",
  bowl: "No room to put a bowl down just here.",
  chase: "No room for a run-up just here.",
  gift: "No room just here.",
};

interface ToolkitPanelProps {
  /** False on touch and under reduced motion, where there is no roaming loop
   *  and therefore no scene to run. */
  readonly canPlay: boolean;
  readonly onPlay: (kind: SceneKind) => PlayRequest;
  readonly onSendToBed: () => void;
  readonly panelRef?: Ref<HTMLDivElement>;
}

const ITEM_CLASS =
  "flex min-h-11 items-center justify-between gap-3 px-3 text-left text-[length:var(--step--1)] text-fg hover:text-accent";
const LABEL_CLASS =
  "px-3 pb-2 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle";

export function ToolkitPanel({ canPlay, onPlay, onSendToBed, panelRef }: ToolkitPanelProps) {
  /** The last refusal, or null. Cleared on the next attempt so the panel never
   *  shows an answer to a question the visitor has since asked again. */
  const [refused, setRefused] = useState<SceneKind | null>(null);

  function play(kind: SceneKind) {
    setRefused(null);
    // A successful request closes the panel from the parent — the cats are
    // called home while it is open, so a scene cannot start until it is shut —
    // which is why there is nothing to say here on the way through.
    if (onPlay(kind) === "no-room") setRefused(kind);
  }

  return (
    // Deliberately not `role="menu"`. That role promises a menu widget —
    // arrow-key navigation between items, Home/End, typeahead — and this is a
    // small panel of ordinary buttons that Tab already handles correctly.
    // Claiming the role without implementing the keyboard contract is worse for
    // a screen-reader user than claiming nothing, so the panel is a plain
    // labelled group and the cat points at it with aria-controls.
    <div
      ref={panelRef}
      id={PANEL_ID}
      aria-label="Quick actions"
      className={cn(
        // Anchored to the corner rather than to the cat: the cat moves every
        // frame, and a panel that tracked it would be a moving target to click.
        // It clears the cats' own resting height so the two never overlap —
        // they return to this corner whenever the panel opens.
        "pointer-events-auto absolute bottom-[4.75rem] right-6 w-[min(19rem,calc(100vw-3rem))]",
        "border border-rule bg-surface p-1 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
      )}
    >
      <p className={LABEL_CLASS}>Play with the cats</p>

      {canPlay ? (
        <div className="flex flex-col">
          {SCENES.map((scene) => (
            <button
              key={scene.kind}
              type="button"
              onClick={() => play(scene.kind)}
              // Points at the status line rather than duplicating the message
              // into the button: the refusal is one fact, and a screen reader
              // that hears it twice hears a bug.
              aria-describedby={refused === scene.kind ? STATUS_ID : undefined}
              className={ITEM_CLASS}
            >
              {scene.label}
              {refused === scene.kind ? (
                <span
                  aria-hidden="true"
                  className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-fg-subtle"
                >
                  No room
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 pb-1 text-[length:var(--step--1)] text-fg-muted">
          The cats play where there is a pointer to chase and motion is welcome. They are sitting
          this one out.
        </p>
      )}

      {/* Present from the first render rather than mounted with the message: a
          live region a screen reader has never seen before is a live region it
          may not announce. Empty it takes up no space at all. */}
      <p
        id={STATUS_ID}
        role="status"
        className="px-3 text-[length:var(--step--1)] leading-snug text-fg-muted empty:hidden"
      >
        {refused ? `${NO_ROOM[refused]} Try again once there is a clear patch of page.` : ""}
      </p>

      {/* Set apart, because it is the one action that is not play: it ends the
          companion for this visit and every visit after it until the visitor
          says otherwise. It is also the only exit now — "turn the cats off" is
          gone, being the same thing said twice with no way back — which is
          exactly why the place it sends them is visible and carries its own
          Wake control. */}
      <div className="mt-2 flex flex-col border-t border-rule">
        <button
          type="button"
          onClick={onSendToBed}
          className="flex min-h-11 items-center px-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle hover:text-fg"
        >
          Send the cats to bed
        </button>
      </div>
    </div>
  );
}

export default ToolkitPanel;
