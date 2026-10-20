"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { WatchOrigin, type OriginHandle } from "./WatchOrigin";

/**
 * The box the drawn tree grows in, and the stage's "Watch it grow" that asks it to.
 *
 * The growth is the lazy `OriginStory` player (`WatchOrigin.tsx`). It plays on
 * its own once per page load, the first time the visitor stops scrolling with
 * the box half in view (`DWELL_MS`), and again whenever "Watch it grow" is
 * pressed. The dwell keeps a visitor flinging past from spending the one
 * auto-play, and keeps the chunk's load and the conductor's setup out of a
 * fast scroll. A visitor whose pointer or focus is already in the box when the
 * dwell runs out spends the auto-play without it starting. Under reduced motion neither starts it: the finished tree is
 * the tree, and the button only scrolls there.
 *
 * ## A window onto the tree, not a shrunken tree
 *
 * The drawing is ~1,986 px tall at 1440. Scaling it to fit was measured and
 * rejected: at 0.36 the branch links are 10.8 px tall and their text 5.8 px,
 * under WCAG 2.5.8's 24 px. So the box is a fixed-height scroll container,
 * `min(720px, 80svh)`, holding the tree at full size. It starts at the crown.
 * It is keyboard-scrollable (`tabIndex=0`, named) and never captures the page's
 * own scroll.
 *
 * Once hydrated, it is only rendered, and only a scroll container, while it is
 * within 200 px of the viewport or a show is running; otherwise it is
 * `data-far`: contents `content-visibility: hidden`, `overflow: clip`. With JS
 * off it is never `data-far`. As an
 * always-on scroller it roughly doubled the compositor's per-frame update at
 * the top of the page, and rendered (even under `content-visibility: auto`,
 * whose margin is not ours to set) it slowed the scroll through Worlds
 * (docs/feedback-tracker.md, R20-P5). Hidden contents leave the accessibility
 * tree while far away; every branch label it holds is also a timeline row.
 *
 * When a show starts (the companion's `origin-story` "start"), the box jumps
 * to the ground, where the growth begins. It then follows the growth front
 * upward: each released group (`data-origin-pending` removed) that sits above
 * the upper third scrolls the box up to it. A wheel, a touch drag, a press on
 * the box's scrollbar or a scroll key hands it back to the visitor until the
 * next show; a click that advances the story does not.
 * When the show ends the box stays where it is, which is the crown on a full run.
 *
 * ## Why an event between the button and the box
 *
 * The button sits on the Journey's stage and the box below it, with
 * server-rendered blocks between them, so they share no React parent.
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

const halfInView = (entry: IntersectionObserverEntry) => entry.intersectionRatio >= 0.5;

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** Scrolls `box` up so the highest group just released sits in its upper
 *  third. Reads only the groups this batch of mutations released. */
function followFront(box: HTMLElement, records: readonly MutationRecord[]) {
  let front = Infinity;
  for (const { target } of records) {
    if (!(target instanceof HTMLElement)) continue;
    if (target.hasAttribute("data-origin-pending")) continue;
    if (target.dataset.originTier === "trunk") continue;
    front = Math.min(front, target.getBoundingClientRect().top);
  }
  if (front === Infinity) return;
  const target = box.scrollTop + (front - box.getBoundingClientRect().top) - box.clientHeight / 3;
  if (target < box.scrollTop) box.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

interface TreeBoxProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function TreeBox({ children, className }: TreeBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<OriginHandle>(null);
  // Any start, on sight or on a press, uses up the one auto-play.
  const startedRef = useRef(false);

  // Auto-play and Watch it grow.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const onGrow = (event: Event) => {
      box.scrollIntoView({ block: "center" });
      startedRef.current = true;
      if (reducedMotion()) return;
      const opener = event.target instanceof HTMLElement ? event.target : null;
      // Drawn before the player mounts: inside `content-visibility: hidden`
      // the player's Skip refuses focus. The far observer agrees once the
      // scroll above lands, and the show's start keeps it drawn meanwhile.
      box.removeAttribute("data-far");
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
      // A visitor already pointing at or focused in the box is using it: a
      // show starting under them would cover the branch links they are on.
      if (box.matches(":hover") || box.contains(document.activeElement)) return;
      playerRef.current?.start();
    };
    // Every page scroll while the box is half in view restarts the wait, so it
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
        { threshold: [0, 0.5] },
      );
      observer.observe(box);
    }

    return () => {
      document.removeEventListener(GROW_EVENT, onGrow);
      observer?.disconnect();
      disarm();
    };
  }, []);

  // Following the growth inside the box while a show runs.
  useEffect(() => {
    const box = boxRef.current;
    const host = hostRef.current;
    if (!box || !host) return;

    let near = false;
    let showing = false;
    const setScroller = () => box.toggleAttribute("data-far", !near && !showing);
    const nearby =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(
            (entries) => {
              near = entries.some((entry) => entry.isIntersecting);
              setScroller();
            },
            { rootMargin: "200px 0px" },
          );
    if (nearby) nearby.observe(box);
    else {
      near = true;
      setScroller();
    }

    let mutations: MutationObserver | undefined;
    const stopFollowing = () => {
      mutations?.disconnect();
      mutations = undefined;
    };
    const onShow = (event: Event) => {
      stopFollowing();
      showing = (event as CustomEvent<string>).detail === "start";
      setScroller();
      if (!showing) return;
      box.scrollTop = box.scrollHeight;
      mutations = new MutationObserver((records) => followFront(box, records));
      mutations.observe(host, { subtree: true, attributeFilter: ["data-origin-pending"] });
    };
    // Only real scroll intent hands the box back. Not a plain pointerdown:
    // clicking the stage to advance the story bubbles one up to here.
    const onPointer = (event: PointerEvent) => {
      if (event.target === box) stopFollowing(); // the scrollbar
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) stopFollowing();
    };
    document.addEventListener("origin-story", onShow);
    box.addEventListener("wheel", stopFollowing, { passive: true });
    box.addEventListener("touchmove", stopFollowing, { passive: true });
    box.addEventListener("pointerdown", onPointer);
    box.addEventListener("keydown", onKey);
    return () => {
      stopFollowing();
      nearby?.disconnect();
      document.removeEventListener("origin-story", onShow);
      box.removeEventListener("wheel", stopFollowing);
      box.removeEventListener("touchmove", stopFollowing);
      box.removeEventListener("pointerdown", onPointer);
      box.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      data-tree-box=""
      role="region"
      aria-label="Career tree"
      tabIndex={0}
      className={cn(
        // `pt-16`: the still-growing shoot and its label draw ~36 px above
        // the host, and a scroller cannot scroll to content above its top.
        // Paper does not scroll: print the whole tree, not one window of it.
        "hidden h-[min(720px,80svh)] overflow-y-auto data-[far]:overflow-clip data-[far]:[content-visibility:hidden] border border-rule px-6 pt-16 pb-6 lg:block print:h-auto print:overflow-visible print:[content-visibility:visible]!",
        className,
      )}
    >
      <div ref={hostRef} data-origin-host="" className="relative">
        {children}
        <WatchOrigin ref={playerRef} />
      </div>
    </div>
  );
}

/**
 * "Watch it grow", the Journey's one primary control. Only at >=1024 px, where
 * the box is, and only once the page script has run (`data-motion` on
 * <html>): with JS off it could start nothing, and the finished tree is right
 * below. The label is a prop because this is a client module: importing the
 * content file here would ship all of it to the browser.
 */
export function WatchItGrow({ label, className }: { readonly label: string; readonly className?: string }) {
  return (
    <Button
      variant="primary"
      onClick={(event) =>
        event.currentTarget.dispatchEvent(new CustomEvent(GROW_EVENT, { bubbles: true }))
      }
      className={cn("no-print hidden lg:inline-flex [html:not([data-motion])_&]:hidden", className)}
    >
      {label}
    </Button>
  );
}
