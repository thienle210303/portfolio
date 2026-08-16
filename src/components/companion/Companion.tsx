"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navItems, profile, socialLinks } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import CompanionCat, { CAT_H, CAT_W } from "./CompanionCat";

/**
 * A line-drawn cat that lives on the page, keeps loose company with the
 * pointer, and doubles as the site's quick-actions toolkit.
 *
 * Three rules shaped every decision below, because a companion is exactly the
 * kind of feature that turns a calm site into a noisy one:
 *
 *  1. It never covers what you are reading. The cat keeps a personal-space
 *     radius from the cursor and approaches from behind it, so it trails the
 *     reading position instead of sitting on top of it.
 *  2. It is never the only way to do anything. Every action in its toolkit
 *     also exists in the header, the hero or the contact section. Losing the
 *     cat costs a visitor nothing, which is why it can be dismissed outright.
 *  3. It costs nothing to people who do not want it. No model, no network, no
 *     images — the whole thing is inline SVG and one rAF loop that stops when
 *     the tab is hidden, when motion is reduced, and when the cat is at rest.
 *
 * On touch devices there is no cursor to follow, so the roaming behaviour is
 * skipped entirely and the cat simply rests in the corner as a toolkit button.
 */

const STORAGE_KEY = "companion";
const PANEL_ID = "companion-actions";

/** How close the cat is willing to get to the pointer, in px. */
const PERSONAL_SPACE = 104;
/** Pointer-idle time before the cat settles, then before it curls up, in ms. */
const SETTLE_AFTER = 2600;
const SLEEP_AFTER = 14000;
/** px per frame at 60fps, scaled by distance so it lopes rather than snaps. */
const MAX_SPEED = 4.2;

type Pose = "sit" | "walk" | "sleep";

interface Point {
  x: number;
  y: number;
}

/** Actions the cat carries. Every one of these exists elsewhere on the page
 *  too — the toolkit is a shortcut, never the only route. */
const JUMP_TO = ["work", "journey", "skills", "contact"] as const;

/* -------------------------------------------------------------------------- */
/* External state                                                              */
/*                                                                             */
/* Both the stored "go away" preference and the two media queries are state    */
/* that lives outside React, is unavailable while rendering on the server, and */
/* can change without React knowing. That is exactly what useSyncExternalStore */
/* is for — and it is why neither is read with a useEffect + setState, which   */
/* React 19 flags and which would render one frame of the wrong thing.         */
/* -------------------------------------------------------------------------- */

const dismissListeners = new Set<() => void>();

function subscribeDismissed(onChange: () => void) {
  dismissListeners.add(onChange);
  // `storage` fires for other tabs, so sending the cat away in one tab
  // dismisses it in the rest.
  window.addEventListener("storage", onChange);
  return () => {
    dismissListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    /* no-op: the cat simply returns on the next visit */
  }
  dismissListeners.forEach((listener) => listener());
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };
}

/** Server snapshot is `false` for every query here, which is the conservative
 *  answer in both cases: no roaming until the client says otherwise. */
function useMedia(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function Companion() {
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false);
  // Roaming needs a real pointer and a visitor who has not asked for calm.
  const finePointer = useMedia("(pointer: fine)");
  const stillness = useMedia("(prefers-reduced-motion: reduce)");
  const roams = finePointer && !stillness;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pose, setPose] = useState<Pose>("sit");
  const [phase, setPhase] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);

  const catRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The rAF loop closes over its initial props, so anything it has to react to
  // is mirrored into a ref rather than read from state.
  const openRef = useRef(false);
  // Position lives in a ref, not in state: it changes every frame, and putting
  // it through React would re-render the whole subtree 60 times a second.
  const posRef = useRef<Point>({ x: 24, y: 0 });
  const targetRef = useRef<Point | null>(null);
  const lastMoveRef = useRef(0);
  const frameRef = useRef(0);

  /* ---------------------------------------------------------------- setup -- */

  /**
   * Where the cat goes when it has nothing to follow. Bottom-right, not
   * bottom-left: the hero's calls to action, the "Scroll" marker and the
   * back-to-top control all live on the left, and the toolkit opens from this
   * corner too, so cat and panel stay together.
   */
  const restingSpot = useCallback(
    (): Point => ({
      x: Math.max(24, window.innerWidth - CAT_W - 24),
      y: Math.max(24, window.innerHeight - CAT_H - 28),
    }),
    [],
  );

  useEffect(() => {
    if (dismissed) return;
    const node = catRef.current;
    if (!node) return;

    if (!roams) {
      // Pinned by CSS to the corner in this mode. Writing a transform here as
      // well would offset the cat *from* that corner by a whole viewport and
      // push it off-screen — which is exactly what it did on every touch
      // device and for every visitor who asked for reduced motion.
      node.style.transform = "";
      return;
    }

    posRef.current = restingSpot();
    node.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
  }, [dismissed, roams, restingSpot]);

  /* ------------------------------------------------------------- pointer -- */

  useEffect(() => {
    if (!roams || dismissed) return;

    const onMove = (event: PointerEvent) => {
      lastMoveRef.current = performance.now();
      targetRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [roams, dismissed]);

  /* ------------------------------------------------------------ the loop -- */

  useEffect(() => {
    if (!roams || dismissed) return;

    let running = true;
    let localPhase = 0;

    const step = () => {
      if (!running) return;
      frameRef.current = requestAnimationFrame(step);

      const node = catRef.current;
      if (!node) return;

      const now = performance.now();
      const idleFor = now - lastMoveRef.current;
      const pos = posRef.current;
      const pointer = targetRef.current;

      let want: Point;
      if (openRef.current) {
        // Come home while the toolkit is open. The panel is anchored to the
        // corner, so a cat still chasing the cursor would end up sitting on
        // top of its own menu — which axe correctly flags as a touch target
        // obscuring another one.
        want = restingSpot();
      } else if (!pointer || idleFor > SLEEP_AFTER) {
        want = restingSpot();
      } else if (idleFor > SETTLE_AFTER) {
        // Pointer has stopped: hold station rather than creeping closer.
        want = pos;
      } else {
        // Approach to the edge of the personal-space radius, on the side the
        // cat is already on, so it trails the cursor instead of crossing it.
        const dx = pointer.x - pos.x;
        const dy = pointer.y - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        want =
          dist <= PERSONAL_SPACE
            ? pos
            : {
                x: pointer.x - (dx / dist) * PERSONAL_SPACE,
                y: pointer.y - (dy / dist) * PERSONAL_SPACE,
              };
      }

      const dx = want.x - pos.x;
      const dy = want.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.2) {
        const speed = Math.min(MAX_SPEED, dist * 0.12);
        pos.x += (dx / dist) * speed;
        pos.y += (dy / dist) * speed;
        node.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        if (Math.abs(dx) > 2) setFacing(dx > 0 ? 1 : -1);
        localPhase = (localPhase + 0.055) % 1;
        setPhase(localPhase);
        setPose("walk");
      } else if (idleFor > SLEEP_AFTER) {
        setPose("sleep");
        localPhase = (localPhase + 0.004) % 1;
        setPhase(localPhase);
      } else {
        setPose("sit");
        // A slow tail curl while sitting — enough to look alive, not enough to
        // pull the eye away from the page.
        localPhase = (localPhase + 0.006) % 1;
        setPhase(localPhase);
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameRef.current);
      } else if (!running) {
        running = true;
        lastMoveRef.current = performance.now();
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roams, dismissed, restingSpot]);

  /* -------------------------------------------------------------- blinks -- */

  useEffect(() => {
    if (dismissed || pose === "sleep") return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlinking(true);
          window.setTimeout(() => setBlinking(false), 130);
          schedule();
        },
        2800 + Math.random() * 4200,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [dismissed, pose]);

  /* --------------------------------------------------------------- panel -- */

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        catRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !catRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be blocked outright; the address is visible in the panel
      // and mailto still works, so there is nothing to recover from here.
    }
  }

  function dismiss() {
    setOpen(false);
    writeDismissed();
  }

  if (dismissed) return null;

  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    <div className="no-print pointer-events-none fixed inset-0 z-40">
      <button
        ref={catRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className={cn(
          "pointer-events-auto absolute grid place-items-center",
          "text-[color:var(--fg-muted)] transition-colors duration-200 hover:text-[color:var(--fg)]",
          // Two placement modes, never both. When roaming, the rAF loop owns
          // `transform` from the top-left origin — and there is deliberately no
          // CSS transition on it, because a transition layered over a
          // per-frame write fights the loop and smears the motion. When not
          // roaming, the cat is simply pinned to the corner.
          roams ? "left-0 top-0" : "bottom-6 right-6",
        )}
        style={{ width: CAT_W + 8, height: CAT_H + 6 }}
      >
        <span
          className="block"
          style={{ transform: `scaleX(${facing})`, width: CAT_W, height: CAT_H }}
        >
          <CompanionCat pose={pose} phase={phase} blinking={blinking || pose === "sleep"} />
        </span>
        <span className="sr-only">{open ? "Close quick actions" : "Open quick actions"}</span>
      </button>

      {open ? (
        // Deliberately not `role="menu"`. That role promises a menu widget —
        // arrow-key navigation between items, Home/End, typeahead — and this
        // is a small panel of ordinary links and buttons that Tab already
        // handles correctly. Claiming the role without implementing the
        // keyboard contract is worse for a screen-reader user than claiming
        // nothing, so the panel is a plain labelled group and the button
        // points at it with aria-controls.
        <div
          ref={panelRef}
          id={PANEL_ID}
          aria-label="Quick actions"
          className={cn(
            // Anchored to the corner rather than to the cat: the cat moves
            // every frame, and a panel that tracked it would be a moving
            // target to click. It clears the cat's own resting height so the
            // two never overlap — the cat returns to this corner whenever the
            // panel opens.
            "pointer-events-auto absolute bottom-[4.75rem] right-6 w-[min(19rem,calc(100vw-3rem))]",
            "border border-rule bg-surface p-1 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
          )}
        >
          <p className="px-3 pb-2 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
            Jump to
          </p>
          <div className="grid grid-cols-2 gap-px">
            {JUMP_TO.map((sectionId) => {
              const item = navItems.find((nav) => nav.sectionId === sectionId);
              if (!item) return null;
              return (
                <a
                  key={item.id}
                  href={`/#${item.sectionId}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <p className="px-3 pb-2 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
            Reach me
          </p>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={copyEmail}
              className="flex min-h-11 items-center justify-between gap-3 px-3 text-left text-[length:var(--step--1)] text-fg hover:text-accent"
            >
              <span className="wrap-anywhere">{profile.email}</span>
              <span aria-live="polite" className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-fg-subtle">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
            {github ? (
              <a
                  href={github.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
              >
                GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            {linkedin ? (
              <a
                  href={linkedin.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
              >
                LinkedIn
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-2 flex min-h-11 w-full items-center border-t border-rule px-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle hover:text-fg"
          >
            Send the cat away
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default Companion;
