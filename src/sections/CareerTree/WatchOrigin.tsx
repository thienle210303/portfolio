"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/cn";

/**
 * The always-loaded half of the origin story: one quiet text control that
 * lazy-imports the player chunk on press.
 *
 * This file is the reason the player costs the initial page nothing. It
 * imports React and `cn` and nothing else — no `src/content`, no
 * `src/lib/origin-story` — so nothing the player needs to draw the story is
 * ever pulled into the section's own chunk. `OriginStory.tsx` (default
 * export) is fetched only once someone actually presses the button, via a
 * plain `import()` rather than `next/dynamic`: `next/dynamic` buys SSR/loading
 * options this control does not need (the player never renders on the
 * server — see below), and a bare `import()` behind a click is the same
 * lazy chunk with one fewer abstraction between here and the network
 * request.
 *
 * Three states, not two: `"idle"` (the button, doing nothing), `"loading"`
 * (the chunk is in flight — `aria-busy` and a disabled control say so rather
 * than leaving a press with no feedback), and `"open"` (the player is
 * mounted in the button's place). There is no `"error"` state with its own
 * copy: a failed import silently drops back to `"idle"`, which just lets the
 * visitor press the same button again — the honest failure mode for a
 * feature that was never load-bearing to begin with.
 *
 * ## Where it lives, and when it shows (round 18)
 *
 * Through round 17 this button sat at the top-right of the drawing inside
 * `KnowledgeTree.tsx`'s figure. Round 18 replaced that figure with the pinned
 * stage, and round 18's second plan re-homed this control onto the stage's
 * own drawing: `CareerTree.tsx` renders it inside `[data-origin-host]`, the
 * relative wrapper around `<DrawnTree>` that is also the box
 * `OriginStory.tsx` overlays and conducts. The position is unchanged —
 * top-right of the drawing, which on the finished tree is the crown.
 *
 * It is the *finished* tree's control, not a second way through the acts. In
 * the pinned layout the stylesheet shows it only once the stage is at its end
 * state (`[data-at-end]` on `[data-stage]`: the last act, or released) — see
 * the "Journey stage" block in `globals.css`. Everywhere the pin never
 * engages at all — under 1280px, under `prefers-reduced-motion`, in print,
 * with JavaScript off — the tree on screen is already the finished one, so
 * the button simply shows. `data-origin-watch` is that stylesheet's only hook
 * into this file.
 *
 * Pressing this button while the pin is still in force also releases the pin,
 * for free: `Stage.tsx` releases on any click on a control inside the drawing,
 * because a clipped frame cannot show what a reader just reached into. That is
 * what the story needs anyway — the player draws over the *whole* drawing, and
 * inside the frame all but one screen of it would be clipped away.
 *
 * Closing the player restores focus to this button, but only when the
 * player says focus was still inside it when it ended (`onClose`'s
 * `restoreFocus` argument — see `OriginStory.tsx`). A visitor who pressed
 * Escape or Skip was just interacting with the keyboard and expects to land
 * back on the control that opened it, the same contract every
 * disclosure-style control on this page keeps. A visitor who scrolled the
 * player out of view was doing the opposite of that — their focus was never
 * on the stage to begin with — and calling `.focus()` on a button that is
 * itself now off-screen would yank their scroll position back up to chase
 * it. `{ preventScroll: true }` is a second, independent guard against that
 * same symptom: even in the courtesy case, this control sits at the top of
 * the drawing the visitor was just watching, so there is no reason focusing
 * it should ever move the viewport.
 */

type PlayerComponent = ComponentType<{ readonly onClose: (restoreFocus: boolean) => void }>;
type ButtonState = "idle" | "loading" | "open";

const BUTTON_CLASS =
  "no-print ink-link-quiet eyebrow absolute right-0 top-1 z-10 inline-flex min-h-11 items-center px-2 text-accent aria-disabled:pointer-events-none aria-disabled:opacity-70";

interface WatchOriginProps {
  readonly className?: string;
}

export function WatchOrigin({ className }: WatchOriginProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Set the instant `handleClose` fires (to whatever the player says
  // `restoreFocus` was), read back the instant the button's own `<button>`
  // element exists again — see the effect below. `handleClose` runs while
  // the player is still mounted, which means `buttonRef.current` is `null`
  // right then (the button was unmounted, not merely hidden, the moment
  // `state` became `"open"`); focusing synchronously there would be a no-op
  // on a ref that hasn't pointed at anything since the player opened.
  const pendingFocusRef = useRef(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [Player, setPlayer] = useState<PlayerComponent | null>(null);
  // Set only on the `.catch()` path, cleared the moment another press starts.
  // Nothing else reads it — it exists purely to give the sr-only status
  // region below something to announce, since a failed import leaves focus
  // exactly where it already was (see the `aria-disabled` swap below) with
  // no visible explanation beyond the label flipping back to its idle text.
  const [loadFailed, setLoadFailed] = useState(false);

  const handlePress = useCallback(() => {
    if (state !== "idle") return;
    setLoadFailed(false);
    setState("loading");
    import("./OriginStory")
      .then((mod) => {
        setPlayer(() => mod.default);
        setState("open");
      })
      .catch(() => {
        // The chunk failed to load (offline, a flaky deploy). Nothing was
        // promised yet — drop back to idle so the button is press-again-able
        // rather than stuck announcing a load that will never finish.
        setState("idle");
        setLoadFailed(true);
      });
  }, [state]);

  const handleClose = useCallback((restoreFocus: boolean) => {
    pendingFocusRef.current = restoreFocus;
    setState("idle");
    setPlayer(null);
  }, []);

  // Runs after every commit; the flag makes it a no-op except on the one
  // render right after `handleClose`, once the `<button>` is back in the DOM
  // — and even then, only when the player says focus was still inside it
  // (see the doc comment above). `preventScroll: true` covers the case
  // `restoreFocus` doesn't: focus can legitimately still be on this button's
  // own Skip control while the visitor scrolled the page with a wheel or
  // trackpad rather than the keyboard, and a plain `.focus()` there would
  // scroll the now off-screen button back into view anyway.
  useEffect(() => {
    if (pendingFocusRef.current && state === "idle") {
      pendingFocusRef.current = false;
      buttonRef.current?.focus({ preventScroll: true });
    }
  });

  if (state === "open" && Player) {
    return <Player onClose={handleClose} />;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-origin-watch=""
        onClick={handlePress}
        aria-busy={state === "loading"}
        // Not `disabled`: a disabled control is pulled out of the tab order
        // and, if focus was already on it, blurred straight to `<body>` —
        // exactly the mid-load focus-drop this control used to cause. The
        // `if (state !== "idle") return;` guard in `handlePress` already
        // makes a press while loading a no-op, so `aria-disabled` gets the
        // same "can't press this right now" signal without ever moving
        // focus off the button.
        aria-disabled={state === "loading"}
        className={cn(BUTTON_CLASS, className)}
      >
        {state === "loading" ? "Loading…" : "Watch how it grew"}
      </button>
      <span role="status" className="sr-only">
        {loadFailed ? "Couldn't load the story — try again." : ""}
      </span>
    </>
  );
}

export default WatchOrigin;
