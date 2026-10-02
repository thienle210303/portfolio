"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Act } from "./acts";

/**
 * The Journey's pinned stage.
 *
 * One screen holds still and time moves through it. The drawing is `sticky`;
 * the seven acts scroll beside it, and whichever one is crossing the middle of
 * the viewport is the moment the drawing is showing.
 *
 * Three rules this component exists to keep:
 *
 * 1. **Every act is always in the DOM.** Visibility is CSS. Conditional
 *    rendering would mean six of seven acts are unreachable with JavaScript
 *    off and under `prefers-reduced-motion`, and this section is the page's
 *    whole argument — it does not get to require scripting. The same goes for
 *    the drawing: every branch is rendered, and `data-through` on the root, with
 *    `data-branch-act` on each branch, is all the stylesheet needs to turn "not
 *    yet" into a fade, and only while the pin is live. The
 *    comparison between the two is CSS, not React.
 * 2. **The active act comes from an IntersectionObserver, never a scroll
 *    listener.** A scroll handler on the main thread is what makes this kind
 *    of effect stutter on a mid-range phone. There is exactly one observer,
 *    watching all seven acts.
 * 3. **Nothing steals focus.** No `inert`, no `tabindex="-1"` on act content,
 *    no focus moved when the act changes. A reader tabbing through is reading,
 *    not navigating a carousel — which is why *entering* the drawing with the
 *    keyboard releases the pin rather than fighting it (see `releaseForReading`).
 *
 * ## What is JavaScript and what is CSS
 *
 * JavaScript decides two things only: which act is active (`aria-current` on
 * the act, and the `Year` slider's value) and where the camera should look.
 * Everything that makes the pin *behave* — the sticky frame, the two columns,
 * the dimming, the fade-in of branches, the camera's transition — is in
 * `globals.css` under "Journey stage", hanging off the attributes below:
 *
 *   data-stage-live   set once this component has mounted in a browser that
 *                     has an IntersectionObserver. Until then — no
 *                     JavaScript, an old browser, the server render — the
 *                     stage is simply the finished tree above seven stacked
 *                     cards. The pin is an enhancement of that, never the
 *                     other way round.
 *   data-through      the index of the current act. The stylesheet compares it
 *                     with each branch's `data-branch-act`.
 *   data-released     the reader asked for the whole tree.
 *   data-at-end       the acts have played out — the last one is current, or
 *                     the pin is released. The stylesheet uses it for the one
 *                     control that belongs to the finished tree rather than to
 *                     the journey through it: "Watch how it grew"
 *                     (`WatchOrigin.tsx`), drawn at the crown, which stays out
 *                     of the way until there is a finished tree to watch grow.
 *
 * `prefers-reduced-motion` is not read here. The pin rules in `globals.css`
 * are inside `@media (prefers-reduced-motion: no-preference)`, so under reduced
 * motion they never match and the stage is the static layout — decided by the
 * same media query the user's setting drives, not by a JavaScript branch that
 * could disagree with it. The same is true below 1280px, where there is not
 * room for a drawing and a column of captions side by side.
 */
interface StageProps {
  readonly acts: readonly Act[];
  /** The finished drawing, shown from 1024px up. A slot, not an import: the
   *  drawing is 1,600 lines of SVG geometry and the case studies inside its
   *  branches are most of the site's prose, none of which has a hook or a
   *  handler in it, so none of it should ship as client JavaScript because
   *  this component happens to be the parent. Every branch carries
   *  `data-branch-act`; this component only ever says which act is current. */
  readonly drawing: ReactNode;
  /** The same branches as an indented list, shown below 1024px. */
  readonly list: ReactNode;
  /** The credentials strip, rendered inside the act whose `showsCredentials`
   *  is set. A slot for the same reason as the drawing. */
  readonly credentials?: ReactNode;
  /** Rendered once, after the acts, across the full width — for content that
   *  belongs to the story but has no branch to open from. Passed in rather
   *  than imported so it stays a Server Component. */
  readonly children?: ReactNode;
}

/** Space left above the newest branch's top edge so its bough has somewhere
 *  to be drawn from. */
const FRONT_MARGIN = 80;

/** How much of the foot of the tree is shown before any branch has grown. */
const BARE_GROUND = 200;

const noopSubscribe = () => () => {};
const hasObserver = () => typeof IntersectionObserver !== "undefined";
const noObserver = () => false;

interface PendingScroll {
  readonly element: Element;
  readonly block: ScrollLogicalPosition;
}

export default function Stage({ acts, drawing, list, credentials, children }: StageProps) {
  const [active, setActive] = useState(0);
  const [released, setReleased] = useState(false);
  // False on the server and during hydration, true afterwards in any browser
  // that can observe intersections. `useSyncExternalStore` rather than an
  // effect that sets state: it is exactly "a value the server cannot know".
  const live = useSyncExternalStore(noopSubscribe, hasObserver, noObserver);

  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingScroll = useRef<PendingScroll | null>(null);

  const lastAct = acts.length - 1;
  const current = acts[active];

  // Which act is current. One observer for the whole stage, watching a band
  // across the middle of the viewport, so an act becomes current when it is
  // being read rather than when its top edge appears.
  useEffect(() => {
    if (released || !live) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Taking the most-intersecting entry rather than the first means a
        // short act between two long ones still gets its turn.
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const index = actRefs.current.indexOf(best.target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );
    for (const element of actRefs.current) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [released, live, acts.length]);

  // Where the camera looks. The drawing is the whole finished tree, much
  // taller than the screen, and it grows upward from the ground — so the
  // frame follows the growth: the ground while the tree is short, the newest
  // branch's top once it is not. `--front` is how far down the tree has
  // actually grown, and the stylesheet hides everything above it, which is
  // what makes the trunk lengthen instead of standing finished from act one.
  //
  // This writes two CSS custom properties and nothing else; whether either is
  // used is the stylesheet's business (it is not, under reduced motion).
  useEffect(() => {
    if (released) return;
    const measure = () => {
      const camera = cameraRef.current;
      const frame = windowRef.current;
      const pin = pinRef.current;
      if (!camera || !frame || !pin) return;
      // Nothing below 1280px, under reduced motion or in print reads either
      // variable, and the drawing this measures is `display: none` there.
      // Measuring anyway costs a forced synchronous layout over a 4,300-node
      // document — one `getBoundingClientRect()` for the camera, one per drawn
      // branch, plus `offsetHeight` — on mount and again on the `live` flip.
      // The gate is the stylesheet's own answer read back, rather than a second
      // copy of its media query in JavaScript: the frame is `position: sticky`
      // exactly when the pin is in force, which is exactly when these two
      // variables mean anything. `releaseForReading` below asks the same
      // question the same way. `getComputedStyle` recalculates style, not
      // layout, so the case this skips stays cheap.
      if (getComputedStyle(pin).position !== "sticky") return;
      const top = camera.getBoundingClientRect().top;
      let front = Number.POSITIVE_INFINITY;
      for (const branch of camera.querySelectorAll<HTMLElement>("[data-branch-act]")) {
        if (Number(branch.dataset.branchAct) > active) continue;
        front = Math.min(front, branch.getBoundingClientRect().top - top);
      }
      const height = camera.offsetHeight;
      let frontY: number;
      if (active >= lastAct) frontY = 0;
      else if (Number.isFinite(front)) frontY = Math.max(0, front - FRONT_MARGIN);
      else frontY = Math.max(0, height - BARE_GROUND);
      const offset = Math.min(frontY, Math.max(0, height - frame.clientHeight));
      camera.style.setProperty("--front", `${Math.round(frontY)}px`);
      camera.style.setProperty("--camera", `${-Math.round(offset)}px`);
    };
    measure();
    // A resize reflows the drawing (the two columns re-wrap), and the camera
    // must follow it. A resize is not a scroll: this fires on a rotation or a
    // window drag, not on every frame of a flick.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, released, live, lastAct]);

  // Scrolling that has to wait for a state change to have reached the DOM:
  // releasing the pin changes the layout, and the thing the reader was
  // looking at has to be brought back into view afterwards.
  useEffect(() => {
    const pending = pendingScroll.current;
    pendingScroll.current = null;
    if (pending && typeof pending.element.scrollIntoView === "function") {
      pending.element.scrollIntoView({ block: pending.block });
    }
  }, [released]);

  // A link into the stage — `#act-retail-data` from a globe plaque, say — is
  // followed by the browser against the *static* layout the server rendered,
  // and the pin then reshapes the page under it: seven stacked cards become a
  // column of tall captions beside a sticky frame, so the target is somewhere
  // else by the time the stage is live. Say the landing again once the layout
  // has settled. Only for a target inside this stage; anything else on the page
  // did not move.
  useEffect(() => {
    if (!live) return;
    let id = window.location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // A malformed escape in the fragment: use it as written, which names
      // nothing, and the lookup below finds no target.
    }
    const target = id ? document.getElementById(id) : null;
    if (target && rootRef.current?.contains(target) && typeof target.scrollIntoView === "function") {
      target.scrollIntoView();
    }
  }, [live]);

  const onScrub = useCallback(
    (value: number) => {
      setActive(value);
      const target = document.getElementById(acts[value].anchorId);
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "center" });
      }
    },
    [acts],
  );

  const toggleRelease = () => {
    pendingScroll.current = rootRef.current ? { element: rootRef.current, block: "start" } : null;
    // Pinning again starts the show over; releasing shows the last frame, so
    // the year in the corner agrees with the finished tree beneath it.
    setActive(released ? 0 : lastAct);
    setReleased((value) => !value);
  };

  // Reaching into the drawing — with the keyboard, or by pressing something in
  // it — is a reader choosing to read it, not to watch it. The frame clips, so
  // a branch opened inside it could not be scrolled to; the honest answer is to
  // let go of the pin and put the thing they reached back on screen. Only while
  // the pin is actually in force: in the static layout (reduced motion, narrow
  // screens, no pin) the browser's own focus scroll is already right and there
  // is nothing to release.
  const releaseForReading = (target: Element) => {
    const pin = pinRef.current;
    if (released || !pin || getComputedStyle(pin).position !== "sticky") return;
    // One control here is a special case that deliberately is *not* handled:
    // "Watch how it grew" replaces itself with the player, so the element this
    // would scroll back to is gone by the time the effect runs. Nothing is done
    // about it, because nothing needs to be — `OriginStory.tsx` focuses its own
    // Skip button in a layout effect, and the browser scrolls that into view,
    // which lands the top of the drawing on screen. Measured in a browser: an
    // earlier version of this scrolled the drawing's ground line up instead and
    // the focus overrode it every time.
    pendingScroll.current = { element: target, block: "center" };
    setActive(lastAct);
    setReleased(true);
  };

  // Keyboard focus only. A pointer press focuses its target on the way down,
  // and releasing the pin at that moment moves the target out from under the
  // pointer before the click completes, so the press does nothing; the click
  // handler below takes that case after the click has landed.
  const onDrawingFocus = (event: FocusEvent<HTMLDivElement>) => {
    let byKeyboard = false;
    try {
      byKeyboard = event.target.matches(":focus-visible");
    } catch {
      // A browser without `:focus-visible` — treat as pointer; the click path
      // still releases.
    }
    if (byKeyboard) releaseForReading(event.target);
  };

  const onDrawingClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a")) {
      releaseForReading(event.target);
    }
  };

  return (
    // `data-stage` is what globals.css hangs the pin on. See the note above on
    // why reduced motion is decided there and not here.
    <div
      ref={rootRef}
      data-stage=""
      data-stage-live={live ? "" : undefined}
      data-through={active}
      data-at-end={released || active === lastAct ? "" : undefined}
      data-released={released ? "" : undefined}
      className="mt-10 scroll-mt-24"
    >
      <div ref={pinRef} data-stage-pin="">
        <div data-stage-bar="">
          <p className="font-mono text-[length:var(--step--1)] text-fg-muted">{current.year}</p>
          <button
            type="button"
            onClick={toggleRelease}
            className="min-h-11 text-[length:var(--step--1)] text-fg underline decoration-rule underline-offset-4 hover:decoration-fg"
          >
            {released ? "Watch it grow again" : "Show me the whole tree"}
          </button>
        </div>

        {/* The scrubber is *before* the drawing in the DOM and painted under it
            (`order` in globals.css). Drawing's own controls — a branch's
            disclosure — release the pin the moment the keyboard reaches them,
            so a keyboard reader who could only get to the scrubber by tabbing
            through all of them would never be able to use it. Tab order
            follows the DOM, and here it is the useful one. */}
        <label data-stage-scrub="">
          <span className="eyebrow shrink-0">Year</span>
          <input
            type="range"
            min={0}
            max={lastAct}
            step={1}
            value={active}
            onChange={(event) => onScrub(Number(event.target.value))}
            aria-valuetext={`${current.year} — ${current.title}`}
            className="w-full accent-(--accent)"
          />
        </label>

        <div
          ref={windowRef}
          data-stage-window=""
          onFocusCapture={onDrawingFocus}
          onClickCapture={onDrawingClick}
        >
          <div ref={cameraRef} data-stage-camera="">
            {/* Everything above the point the tree has grown to. Decorative:
                the branches under it are still in the document and still
                reachable, this only paints ground over the part of the
                drawing that has not happened yet. */}
            <div data-stage-unborn="" aria-hidden="true" />
            {drawing}
            {list}
          </div>
        </div>
      </div>

      <div data-stage-acts="">
        {acts.map((act, index) => (
          <section
            key={act.id}
            id={act.anchorId}
            ref={(element) => {
              actRefs.current[index] = element;
            }}
            data-act=""
            aria-current={index === active && !released ? "step" : undefined}
          >
            {/* The compatibility fragments for the entries this act draws.
                `journey-entry-<id>` was the timeline `<li>`'s id until round 18
                replaced the timeline with this stage, and those fragments are in
                bookmarks and in the chat's own citations; landing on the act
                that draws an entry is the nearest true answer to "take me to
                that role". Real zero-size elements, never a client-side hash
                rewrite, so a bookmark lands with JavaScript disabled — the same
                reasoning as the section-level ids in `CareerTree.tsx`.
                `scroll-mt-20` is 5rem, which is exactly the act's own
                `scroll-margin-top` in globals.css — so a fragment naming an
                entry clears the sticky header by the same margin as a link
                naming the act around it. (Under the pin the act's margin
                becomes `20svh`, a centring one; a span inside it keeps its
                own 5rem, which is the static answer and still clear.) */}
            {act.entryAnchorIds.map((anchorId) => (
              <span
                key={anchorId}
                id={anchorId}
                aria-hidden="true"
                className="sr-only scroll-mt-20"
              />
            ))}

            {/* Always rendered, and the section itself is never faded: the
                stylesheet dims the *title* of an act that is not current, by
                `opacity` alone — no `display: none`, no `visibility: hidden` —
                so the text stays in the accessible tree and Ctrl-F still
                finds it. The dim stops at 0.65 on purpose: body text at that
                opacity falls under 4.5:1 on paper, and an act is not a
                disabled control. */}
            <h3
              data-act-title=""
              className="font-display text-[length:var(--step-1)] font-normal leading-snug tracking-(--tracking-display-sm) text-fg"
            >
              {act.title}
            </h3>
            <p className="mt-2 font-mono text-[length:var(--step--1)] text-fg-muted">{act.year}</p>
            {act.showsCredentials ? credentials : null}
          </section>
        ))}
      </div>

      {children ? <div className="col-span-full">{children}</div> : null}
    </div>
  );
}
