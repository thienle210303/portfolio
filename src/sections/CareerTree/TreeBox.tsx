"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { WatchOrigin, type OriginHandle } from "./WatchOrigin";

/**
 * The box the drawn tree grows in, and the header button that asks it to.
 *
 * The growth is the lazy `OriginStory` player (`WatchOrigin.tsx`). It plays on
 * its own once per page load, the first time the visitor stops scrolling with
 * the box half in view (`DWELL_MS`), and again whenever "See how it grows" is pressed.
 * The dwell keeps a visitor flinging past from spending the one auto-play, and
 * keeps the chunk's load and the conductor's setup out of a fast scroll
 * (`pnpm lag`'s 4x scroll lost ~5 fps when it started mid-fling). Under reduced motion neither
 * starts it: the finished tree is the tree, and the button only scrolls there.
 *
 * ## Height
 *
 * The box is the drawing's natural height (~1,986 px at 1440 wide), not a
 * fixed 720 px. Scaling it to fit was measured: at 0.36 the branch links are
 * 10.8 px tall and their text 5.8 px, under WCAG 2.5.8's 24 px target. Because
 * the box is taller than any screen, "half in view" also counts half the
 * screen filled — a ratio of 0.5 is never reached on a 900 px viewport.
 *
 * ## Why an event between the two halves
 *
 * The button sits in the section header and the box below the highlights,
 * with server-rendered blocks between them, so they share no React parent.
 * The button dispatches `GROW_EVENT` on itself; the box listens on `document`
 * and gets the opener as the event target, which is where focus returns when
 * a pressed show ends.
 *
 * `[data-origin-host]` must stay the drawing's own relative box: the player
 * overlays it `absolute inset-0` and finds it with `closest()`.
 */

const GROW_EVENT = "tree-grow";
const DWELL_MS = 600;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Half the box, or half the screen when the box is taller than the screen.
 *  `isIntersecting` first: Chrome reports the `display: none` box (below
 *  1024px) with zero-height root bounds, and half of zero is always met. */
function halfInView(entry: IntersectionObserverEntry): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= 0.5) return true;
  const screen = entry.rootBounds?.height ?? window.innerHeight;
  return entry.intersectionRect.height >= screen / 2;
}

interface TreeBoxProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function TreeBox({ children, className }: TreeBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<OriginHandle>(null);
  // Any start, on sight or on a press, uses up the one auto-play.
  const startedRef = useRef(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const onGrow = (event: Event) => {
      // `start`, not `center`: the box is taller than the screen, so centring
      // it shows neither the crown nor the ground, and the player's Skip
      // button (top right) would pull the page up to it anyway.
      box.scrollIntoView({ block: "start" });
      startedRef.current = true;
      if (reducedMotion()) return;
      const opener = event.target instanceof HTMLElement ? event.target : null;
      playerRef.current?.start({ opener });
    };
    document.addEventListener(GROW_EVENT, onGrow);

    let observer: IntersectionObserver | undefined;
    let dwell: number | undefined;
    const play = () => {
      window.removeEventListener("scroll", arm);
      if (startedRef.current) return;
      startedRef.current = true;
      observer?.disconnect();
      playerRef.current?.start();
    };
    // Every scroll while the box is half in view restarts the wait, so it
    // only runs out once the visitor has stopped.
    const arm = () => {
      window.clearTimeout(dwell);
      dwell = window.setTimeout(play, DWELL_MS);
    };
    const disarm = () => {
      window.clearTimeout(dwell);
      window.removeEventListener("scroll", arm);
    };
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (startedRef.current || reducedMotion() || !entries.some(halfInView)) {
            disarm();
            return;
          }
          arm();
          window.addEventListener("scroll", arm, { passive: true });
        },
        // 0.25 of a ~2,000 px box is past half of any laptop screen; 0 hears
        // it leave.
        { threshold: [0, 0.25, 0.5] },
      );
      observer.observe(box);
    }

    return () => {
      document.removeEventListener(GROW_EVENT, onGrow);
      observer?.disconnect();
      disarm();
    };
  }, []);

  return (
    <div
      ref={boxRef}
      data-tree-box=""
      className={cn("hidden scroll-mt-20 border border-rule p-6 lg:block", className)}
    >
      <div data-origin-host="" className="relative">
        {children}
        <WatchOrigin ref={playerRef} />
      </div>
    </div>
  );
}

/** The header's "See how it grows". Only at >=1024 px, where the box is. */
export function SeeHowItGrows({ className }: { readonly className?: string }) {
  return (
    <button
      type="button"
      onClick={(event) =>
        event.currentTarget.dispatchEvent(new CustomEvent(GROW_EVENT, { bubbles: true }))
      }
      className={cn(
        "no-print ink-link-quiet eyebrow hidden min-h-11 items-center px-2 text-accent lg:inline-flex",
        className,
      )}
    >
      See how it grows
    </button>
  );
}
