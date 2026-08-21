"use client";

/**
 * In-section navigation for the case studies: five numbered titles, the
 * current one marked, each one a jump to its row.
 *
 * STICKY WITHIN THE SECTION, never viewport-fixed. At >=1024px it is a grid
 * item in its own column of `SelectedWork`'s layout, so the sticky range is
 * that grid row — it pins beside the studies, then leaves with them. It can
 * never overlap a case study, because it never shares horizontal space with
 * one. Below 1024px it docks under the site header as a single scrollable
 * row, still bounded by the section: it arrives with the first study and
 * leaves after the last.
 *
 * Why this is sticky when the margin rail (globals.css) deliberately is not:
 * the rail is annotation and an annotation has to stay level with the thing
 * it annotates — a rail that detaches ends up parked beside whitespace it
 * does not describe. This is navigation. "Where am I, and what else is here"
 * is a question asked halfway down a five-study section, not at the one
 * scroll position an index happens to be printed at.
 *
 * Colour comes only from the semantic aliases, so it reads correctly in both
 * themes and in any tone the section is ever set to.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/cn";
import { useActiveSection } from "@/hooks/useActiveSection";

export interface ProjectIndexItem {
  /** id of the `<article>` this entry points at — see ./anchors. */
  readonly id: string;
  /** Two-digit numeral, the same one printed on that article's masthead. */
  readonly numeral: string;
  readonly title: string;
}

interface ProjectIndexProps {
  /**
   * Must be referentially stable — build it once at module scope. The
   * scroll-spy observer tears down and rebuilds whenever the id array
   * changes identity.
   */
  readonly items: readonly ProjectIndexItem[];
  /** Layout placement, supplied by the section that owns the grid. */
  readonly className?: string;
}

/** Local copy of SiteNav's helper rather than an import: the scroll behaviour
 *  below is this component's own, and reaching into another package's file for
 *  three lines couples two independently-owned components for nothing. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Active marker: an underline in the docked row, a rule segment against the
 *  ruled column at >=1024px. Always in the DOM at a fixed size so it never
 *  shifts layout, and never the only signal — it is paired with `aria-current`
 *  and a text-colour step, matching SiteNav's own active treatment.
 *
 *  Draws in on top of the opacity flip (Workstream 3, P3, matching
 *  SiteNav's `ActiveIndicator`): `origin-left`/`scale-x` for the docked
 *  row's horizontal underline, `origin-top`/`scale-y` for the ruled
 *  column's vertical segment at >=1024px — the axis that actually has
 *  length flips with the layout, so each draws along its own line rather
 *  than growing sideways out of a segment that has none. */
function ActiveMarker({ active }: { readonly active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-[color:var(--accent)] transition-[opacity,transform] duration-(--dur-quick) ease-(--ease-ink)",
        "lg:inset-x-auto lg:inset-y-0 lg:-left-px lg:h-auto lg:w-px lg:origin-top lg:scale-x-100",
        active ? "scale-x-100 opacity-100 lg:scale-y-100" : "scale-x-0 opacity-0 lg:scale-y-0",
      )}
    />
  );
}

export default function ProjectIndex({ items, className }: ProjectIndexProps) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  // The shared hook, unchanged: it observes ids against a thin band in the
  // upper-middle of the viewport, which is exactly the question here with
  // `<article>`s in place of `<section>`s. It never clears its answer, so the
  // index keeps its last state once the section has scrolled past.
  const spied = useActiveSection(ids);
  // Before the first observation the reader is at the top of the section, so
  // the first study is the honest answer. Same value on the server and on the
  // first client render — nothing to reconcile at hydration.
  const activeId = spied ?? items[0]?.id;

  const scrollerRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Scroll affordance for the docked row: a fade at whichever edge still has
  // items behind it. Tracked rather than always-on, because a fade that never
  // clears at the end of the row reads as a rendering fault instead of a cue.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function update() {
      const element = scrollerRef.current;
      if (!element) return;
      const max = element.scrollWidth - element.clientWidth;
      const start = element.scrollLeft > 1;
      const end = max > 1 && element.scrollLeft < max - 1;
      // Bail out of the render when nothing changed — this runs per scroll
      // frame.
      setEdges((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end },
      );
    }

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Keep the current entry in view in the docked row. Measured from bounding
  // rects and applied as `scrollLeft` rather than `scrollIntoView`, which
  // would also be free to scroll the page vertically. A no-op at >=1024px,
  // where the list is a column and has nothing to scroll.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 0) return;
    const current = scroller.querySelector<HTMLElement>('[aria-current="true"]');
    if (!current) return;

    const scrollerBox = scroller.getBoundingClientRect();
    const currentBox = current.getBoundingClientRect();
    const delta =
      currentBox.left - scrollerBox.left - (scroller.clientWidth - currentBox.width) / 2;
    scroller.scrollTo({
      left: Math.max(0, Math.min(scroller.scrollLeft + delta, max)),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [activeId]);

  function handleClick(targetId: string) {
    return (event: ReactMouseEvent<HTMLAnchorElement>) => {
      const target = document.getElementById(targetId);
      // No target means no interception: let the browser follow the href
      // rather than swallowing a click that would otherwise still work.
      if (!target) return;
      event.preventDefault();

      // Every case-study article ships `tabindex="-1"` (see CaseStudy), so
      // this is a valid programmatic focus target: keyboard and screen-reader
      // users land where the page visually moved instead of continuing from
      // the index. Focusing never scrolls on its own, so the scroll below
      // stays in charge of position.
      target.focus({ preventScroll: true });
      window.history.pushState(null, "", `#${targetId}`);
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    };
  }

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Case studies"
      className={cn(
        "no-print z-30 bg-ground",
        // Docked under the site header, for the length of the section only.
        "sticky top-[var(--header-h)] border-b border-[color:var(--rule-color)]",
        // Its own column: pinned below the header with room to breathe, never
        // taller than the screen it has to fit in. The 1.5 of padding is the
        // room the global focus ring needs — `overflow-y` makes this a scroll
        // container, and a scroll container clips the ring off whichever entry
        // sits against its edge.
        "lg:top-24 lg:max-h-[calc(100svh-var(--header-h)-4rem)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:px-1.5 lg:py-1",
        className,
      )}
    >
      <p className="eyebrow hidden border-b border-[color:var(--rule-color)] pb-2 lg:block">
        Contents
      </p>

      {/* No negative margin pulling the row into the gutter: the docked bar
          has to be opaque across everything that scrolls under it, and any
          part of the row hanging outside the <nav>'s painted box would not
          be. */}
      <div className="relative">
        <ul
          ref={scrollerRef}
          role="list"
          className={cn(
            // Horizontal scroll is contained here and nowhere else: the row
            // clips inside this element, so nothing it holds can widen the page.
            "flex overflow-x-auto py-1.5",
            // The vertical padding is not decoration — it is the room the
            // global 2px focus ring at 3px offset needs, which a scroll
            // container would otherwise clip off a focused entry.
            "lg:mt-2 lg:block lg:overflow-visible lg:border-l lg:border-[color:var(--rule-color)] lg:py-0",
          )}
        >
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id} className="shrink-0 lg:shrink">
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={handleClick(item.id)}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2.5 whitespace-nowrap px-3 text-[length:var(--step--1)] transition-colors duration-150",
                    "lg:items-baseline lg:whitespace-normal lg:py-2.5 lg:pr-0",
                    isActive
                      ? "text-[color:var(--fg)]"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
                  )}
                >
                  {/* Hidden from assistive technology on purpose: the numeral
                      is a position the list itself already conveys, and the
                      link's accessible name should be the study's title. */}
                  <span
                    aria-hidden="true"
                    className="font-mono text-[color:var(--fg-subtle)]"
                  >
                    {item.numeral}
                  </span>
                  <span className="leading-snug">{item.title}</span>
                  <ActiveMarker active={isActive} />
                </a>
              </li>
            );
          })}
        </ul>

        {/* Fades drawn from `--ground` itself, so they dissolve the row into
            whatever ground the section's tone resolves to rather than into a
            colour of their own. */}
        <span
          aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(to right, var(--ground), transparent)" }}
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-6 transition-opacity duration-150 lg:hidden",
            edges.start ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(to left, var(--ground), transparent)" }}
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-6 transition-opacity duration-150 lg:hidden",
            edges.end ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </nav>
  );
}
