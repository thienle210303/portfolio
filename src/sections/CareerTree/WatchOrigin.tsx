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
 * Closing the player returns focus to this button (`buttonRef.current
 * .focus()`), the same contract every disclosure-style control on this page
 * keeps — a visitor who opened something with the keyboard lands back where
 * they were, not at the top of the document.
 */

type PlayerComponent = ComponentType<{ readonly onClose: () => void }>;
type ButtonState = "idle" | "loading" | "open";

const BUTTON_CLASS =
  "no-print ink-link-quiet eyebrow absolute right-0 top-1 z-10 inline-flex min-h-11 items-center px-2 text-accent disabled:pointer-events-none disabled:opacity-70";

interface WatchOriginProps {
  readonly className?: string;
}

export function WatchOrigin({ className }: WatchOriginProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Set the instant `handleClose` fires, read back the instant the button's
  // own `<button>` element exists again — see the effect below. `handleClose`
  // runs while the player is still mounted, which means `buttonRef.current`
  // is `null` right then (the button was unmounted, not merely hidden, the
  // moment `state` became `"open"`); focusing synchronously there would be a
  // no-op on a ref that hasn't pointed at anything since the player opened.
  const pendingFocusRef = useRef(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [Player, setPlayer] = useState<PlayerComponent | null>(null);

  const handlePress = useCallback(() => {
    if (state !== "idle") return;
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
      });
  }, [state]);

  const handleClose = useCallback(() => {
    pendingFocusRef.current = true;
    setState("idle");
    setPlayer(null);
  }, []);

  // Runs after every commit; the flag makes it a no-op except on the one
  // render right after `handleClose`, once the `<button>` is back in the DOM.
  useEffect(() => {
    if (pendingFocusRef.current && state === "idle") {
      pendingFocusRef.current = false;
      buttonRef.current?.focus();
    }
  });

  if (state === "open" && Player) {
    return <Player onClose={handleClose} />;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handlePress}
      aria-busy={state === "loading"}
      disabled={state === "loading"}
      className={cn(BUTTON_CLASS, className)}
    >
      {state === "loading" ? "Loading…" : "Watch how it grew"}
    </button>
  );
}

export default WatchOrigin;
