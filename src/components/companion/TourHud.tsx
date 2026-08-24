"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { DialogueBeat } from "./companion-dialogue";
import type { TourRoute } from "./companion-tour";

/**
 * The tour's accessible surface.
 *
 * Field notes are `aria-hidden` decoration; the tour is not — it is the one
 * thing the companion narrates on request, so it needs a real landmark a
 * screen reader can find and a `role="status"` a screen reader will actually
 * announce. Anchored in the same corner the toolkit panel opens from, for the
 * same reason: it is furniture, not part of the cats, and the visitor already
 * knows to look there.
 *
 * Mounted only while a tour is running — see `Companion`'s `tour` state —
 * which is what keeps an idle visit from carrying a live region nobody asked
 * for.
 */

export interface TourHudProps {
  readonly stopIndex: number;
  readonly totalStops: number;
  readonly label: string;
  /** Empty until the pair have arrived — the status region must exist from
   *  first render (see below), so it mounts with no lines and fills. */
  readonly lines: readonly DialogueBeat[];
  readonly isLast: boolean;
  /** The one fork in the walk: true for exactly the juncture where "Follow
   *  Grey" / "Follow Tabby" replace "Next stop" — see `Companion.tsx`'s
   *  `chooseRoute`. False everywhere else, before and after it. */
  readonly showRouteChoice: boolean;
  readonly onChooseRoute: (route: TourRoute) => void;
  readonly onNext: () => void;
  readonly onEnd: () => void;
  readonly hudRef?: RefObject<HTMLDivElement | null>;
}

const BUTTON_CLASS =
  "min-h-11 border border-rule bg-surface px-3 text-[length:var(--step--1)] text-fg hover:text-accent";

export function TourHud({
  stopIndex,
  totalStops,
  label,
  lines,
  isLast,
  showRouteChoice,
  onChooseRoute,
  onNext,
  onEnd,
  hudRef,
}: TourHudProps) {
  // The container this widget lives in. `hudRef` is the same object
  // `Companion.tsx` already reads for its own "focus the HUD at tour start" /
  // "a click landed outside it" checks, so the two focus-restoration effects
  // below read the very same ref rather than a second one that would need
  // keeping in sync with it — a plain fallback (never itself written to)
  // covers the case no `hudRef` was passed at all.
  const localHudRef = useRef<HTMLDivElement | null>(null);
  const containerRef = hudRef ?? localHudRef;

  // The two buttons a route-choice transition needs to be able to hand focus
  // to — "Follow Grey" when the fork appears, the restored "Next stop"/
  // "Finish tour" once a route has been picked. Only one of the two branches
  // below is ever mounted at a time, so only one of these refs is ever
  // attached to a real node at once; the other is simply `null`, which the
  // effect below already treats as "nothing to focus".
  const routeButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Whether focus is somewhere inside this HUD — tracked off one
  // `document`-level `focusin` listener rather than `document.activeElement`
  // read at effect time, or a container-level `focusout`. Both of those
  // fail for the same reason: browsers reset `document.activeElement` to
  // `<body>` — with no reliable `relatedTarget` and, in most browsers, no
  // `focusin` on `<body>` either — as an immediate, synchronous consequence
  // of *removing* the node that held it, which is exactly what happens to
  // "Next stop" the moment the fork it caused replaces it. React effects
  // only run after that removal has already committed, so by the time one
  // could ask "was focus in the HUD", the answer is already the false
  // positive "no". A `focusin` that only ever fires for a *genuine* new
  // focus target sidesteps this: the ambiguous reset-to-`<body>` never
  // raises one, so this ref simply keeps its last real answer straight
  // through that moment, and only flips to `false` once focus is confirmed
  // to have actually landed somewhere outside the container.
  const hudFocusedRef = useRef(false);
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      hudFocusedRef.current = containerRef.current?.contains(event.target as Node | null) ?? false;
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
    // `containerRef` (either `hudRef` or `localHudRef`) is the same object
    // for this component's entire mounted life, so there is no second
    // identity this effect would ever need to re-run for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Moves focus across exactly the two transitions that unmount whatever
  // button used to hold it — see the file banner on why `transition-*`
  // properties are not the only thing in this codebase that fails to survive
  // a swapped-out DOM node. Skipped entirely when focus was never in the HUD
  // to begin with (a visitor who scrolled off to read something else keeps
  // reading it — the fork appearing under them is not a reason to yank their
  // focus across the page). Both directions — the fork appearing (driven by
  // the story's own clock, no click involved) and a route just having been
  // chosen (driven by a click on the very button about to be unmounted) —
  // read the *same* snapshot, taken during the render that made each
  // transition happen; there is no need for the chosen-route case to prove
  // its own focus separately; the click that caused it already did.
  const prevShowRouteChoice = useRef(showRouteChoice);
  useEffect(() => {
    const was = prevShowRouteChoice.current;
    prevShowRouteChoice.current = showRouteChoice;
    if (was === showRouteChoice || !hudFocusedRef.current) return;
    if (showRouteChoice) routeButtonRef.current?.focus({ preventScroll: true });
    else nextButtonRef.current?.focus({ preventScroll: true });
  }, [showRouteChoice]);

  const transcript = lines
    .map((beat) => `${beat.speaker === "grey" ? "Grey" : "Tabby"}: ${beat.sub}`)
    .join(" · ");
  // Told to the same status region the dialogue already narrates through,
  // rather than a second live region of its own — a screen reader visitor
  // who has been listening to `status` learns the controls just changed the
  // same way they learn every other beat of this tour, instead of needing a
  // second landmark to have discovered first.
  const statusText =
    showRouteChoice && transcript ? `${transcript} · Choose who to follow.` : transcript;

  return (
    <div
      ref={containerRef}
      // Not `role="dialog"` — nothing here traps focus or blocks the rest of
      // the page, and a visitor is free to keep reading while it is open. It
      // is a small labelled panel, exactly like the toolkit panel it stands
      // in for while a tour is running.
      aria-label="Guided tour"
      tabIndex={-1}
      className={cn(
        "pointer-events-auto absolute bottom-[4.75rem] right-6 flex w-[min(19rem,calc(100vw-3rem))] flex-col gap-2",
        "border border-rule bg-surface p-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
      )}
    >
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
        {`Stop ${stopIndex + 1} of ${totalStops} — ${label}`}
      </p>

      {/* Mounted empty and filled once the pair arrive — a `role="status"`
          region a screen reader has never seen before is one it may not
          announce, so it has to be present from the first render rather than
          mounted with the first line already in it. Round 10: `sr-only`
          rather than removed — mini-Thien is now the visible translation
          beside the speaking cat (`Companion.tsx`), so this line's job is
          purely the accessible announcement it always made through
          `role="status"`; a sighted visitor reads the same words off him
          instead of off this panel. */}
      <p role="status" className="sr-only">
        {statusText}
      </p>

      {showRouteChoice ? (
        // The fork: two routes through the same eight stops (see
        // `stopsFor`), offered here instead of "Next stop" and nowhere
        // else. Stacked rather than squeezed onto one row alongside "End
        // tour" — three buttons at this width would either wrap unpredictably
        // or crowd the 44px target every one of them needs.
        <div className="mt-1 flex flex-col gap-2">
          <button type="button" onClick={onEnd} className={BUTTON_CLASS}>
            End tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={routeButtonRef}
              onClick={() => onChooseRoute("grey")}
              className={BUTTON_CLASS}
            >
              Follow Grey
            </button>
            <button type="button" onClick={() => onChooseRoute("tabby")} className={BUTTON_CLASS}>
              Follow Tabby
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" onClick={onEnd} className={BUTTON_CLASS}>
            End tour
          </button>
          <button type="button" ref={nextButtonRef} onClick={onNext} className={BUTTON_CLASS}>
            {isLast ? "Finish tour" : "Next stop"}
          </button>
        </div>
      )}
    </div>
  );
}

export default TourHud;
