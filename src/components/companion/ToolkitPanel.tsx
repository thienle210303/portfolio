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
 * already knows how to act out; below the rule, one item decides what the pair
 * are doing with themselves the rest of the time — following the cursor, or off
 * about their own business — and the last sends them to bed.
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

/** What asking for the guided tour can come back as. `refused` covers both
 *  reasons `requestTour` (Companion.tsx) can decline — no roaming loop, or
 *  the tour's first stop has no element on this page (`/resume`) — because
 *  the panel has one line for "not here" regardless of which one it was. */
export type TourRequest = "started" | "refused";

/**
 * The menu, and it is deliberately not every scene in `companion-play`.
 *
 * The gift — he carries the yarn ball over and drops it at her feet — is left
 * to the idle rotation on purpose: it is the one scene that is about the cats
 * noticing each other rather than about a thing the visitor threw, and putting
 * a button on it would make the only unprompted moment in the repertoire
 * prompted too.
 */
const SCENES = [
  { kind: "yarn", label: "Toss the yarn" },
  { kind: "moth", label: "Release a moth" },
  { kind: "bowl", label: "Dinner time" },
  { kind: "chase", label: "Start a chase" },
] as const satisfies readonly { readonly kind: SceneKind; readonly label: string }[];

/**
 * The four that can be asked for, which is narrower than `SceneKind` and has to
 * stay that way.
 *
 * Round 9 added three scenes anchored to the page — hiding behind a panel,
 * scratching at a section rule, hunting a heading — and none of them is a menu
 * item. They are about somewhere the visitor happens to be, so they belong to
 * the rotation that watches for that; a button that fired one would mean
 * "happen here, now", which is the one thing an anchored scene cannot promise.
 * Typing the refusals off this list rather than off `SceneKind` is what stops
 * the panel quietly acquiring an answer for a question it never asks.
 */
type MenuScene = (typeof SCENES)[number]["kind"];

/** What the panel says when a scene has nowhere to happen. Names the thing that
 *  was asked for, because "no room" on its own reads as a fault rather than as
 *  an answer. */
const NO_ROOM: Record<MenuScene, string> = {
  yarn: "No room to roll a ball of yarn just here.",
  moth: "No room for a moth just here.",
  bowl: "No room to put a bowl down just here.",
  chase: "No room for a run-up just here.",
};

/** What the panel says when the tour declines. Covers both reasons — see
 *  `TourRequest` — with one sentence, because the visitor does not need to
 *  know which; either way there is nowhere to walk them right now. */
const TOUR_REFUSED = "There's nowhere to start the tour from on this page.";

interface ToolkitPanelProps {
  /** False on touch and under reduced motion, where there is no roaming loop
   *  and therefore no scene to run. */
  readonly canPlay: boolean;
  /** The pair are off the cursor and about their own business. */
  readonly wandering: boolean;
  readonly onPlay: (kind: SceneKind) => PlayRequest;
  /** Same gate as `canPlay` — there is no tour without a roaming loop either —
   *  and it is a separate prop rather than `canPlay` reused because the button
   *  is still shown and still labelled when the tour itself declines; only the
   *  refusal differs. */
  readonly onTour: () => TourRequest;
  readonly onWander: () => void;
  readonly onSendToBed: () => void;
  readonly panelRef?: Ref<HTMLDivElement>;
}

const ITEM_CLASS =
  "flex min-h-11 items-center justify-between gap-3 px-3 text-left text-[length:var(--step--1)] text-fg hover:text-accent";
const LABEL_CLASS =
  "px-3 pb-2 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle";

export function ToolkitPanel({
  canPlay,
  wandering,
  onPlay,
  onTour,
  onWander,
  onSendToBed,
  panelRef,
}: ToolkitPanelProps) {
  /** The last refusal, or null. Cleared on the next attempt so the panel never
   *  shows an answer to a question the visitor has since asked again. "tour"
   *  joins the four scene kinds here rather than getting a state of its own,
   *  because it is the same fact told about a different request: the status
   *  line below can only ever be showing one refusal at a time. */
  const [refused, setRefused] = useState<MenuScene | "tour" | null>(null);

  function play(kind: MenuScene) {
    setRefused(null);
    // A successful request closes the panel from the parent — the cats are
    // called home while it is open, so a scene cannot start until it is shut —
    // which is why there is nothing to say here on the way through.
    if (onPlay(kind) === "no-room") setRefused(kind);
  }

  function tour() {
    setRefused(null);
    if (onTour() === "refused") setRefused("tour");
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
          {/* First, and set apart from the four scenes below by what it does
              rather than by any visual rule: the tour is the one item here
              that narrates instead of playing, and putting it first is what
              the owner's round-11 note asks for — "guided tour from the
              toolkit panel" reads as the panel's headline offer, not a fifth
              scene at the bottom of the list. */}
          <button
            type="button"
            onClick={tour}
            aria-describedby={refused === "tour" ? STATUS_ID : undefined}
            className={ITEM_CLASS}
          >
            Show me around
            {refused === "tour" ? (
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-fg-subtle"
              >
                No room
              </span>
            ) : null}
          </button>
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
          The cats play — and give tours — where there is a pointer to chase and motion is
          welcome. They are sitting this one out.
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
        {refused
          ? `${refused === "tour" ? TOUR_REFUSED : NO_ROOM[refused]} Try again once there is a clear patch of page.`
          : ""}
      </p>

      {/* Set apart, because neither of these is play: one changes what the cats
          are *for* until the visitor says otherwise, and the other ends the
          companion for this visit and every visit after it. The bed is the only
          exit now — "turn the cats off" is gone, being the same thing said twice
          with no way back — which is exactly why the place it sends them is
          visible and carries its own Wake control. */}
      <div className="mt-2 flex flex-col border-t border-rule">
        {/*
          One item, two states, and deliberately not a toggle in the ARIA sense.
          `aria-pressed` promises a control whose *name* stays put while its
          state flips underneath it, and the honest name for this one is the
          thing pressing it does — which is the opposite sentence in each state.
          So it is a plain button that says what will happen, which is true read
          aloud and true read off the screen, and it is exactly as operable from
          the keyboard as every other row here.

          Only offered where there is a roaming loop to change the shape of. On
          touch and under reduced motion the pair are parked in the corner and
          "let them wander" would be a control with nothing behind it — the same
          reason the scenes above are not offered there.
        */}
        {canPlay ? (
          <button
            type="button"
            onClick={onWander}
            className="flex min-h-11 items-center px-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle hover:text-fg"
          >
            {wandering ? "Follow my cursor" : "Let them wander"}
          </button>
        ) : null}
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
