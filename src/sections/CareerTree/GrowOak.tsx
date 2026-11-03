"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { GrowBeat } from "@/lib/origin-story";

/**
 * "Watch it grow" (round 22): the Journey's one primary control, and the show
 * it plays on the oak itself. Round 22 retired the drawn tree's box, so there
 * is one tree on the page and this grows it.
 *
 * A press stamps `data-growing` on `#tree`: the oak opens out from the foot
 * of its trunk and every tag waits (globals.css, "Watch it grow"). Then the
 * beats (`growBeats()`, computed on the server) come round one at a time:
 * the flight, a season per year, the shoot that is still growing. Each beat
 * writes its caption in the line beside the button, drops the tags whose
 * `data-year` it names (`data-grown`), and tells the cats (`origin-story-beat`,
 * the same contract `Companion.tsx` has always narrated). At the end every
 * tag is down, and the attributes come off: the grown oak is the page as it
 * always is.
 *
 * The caption is a paper label hung under the button and the lịch (beside
 * them from 1280), over the oak, so it never moves the page. While it plays the button says Skip, and a press or
 * Escape ends it at once.
 * Focus never moves: it is on the button the whole time. Under reduced motion,
 * and with JS off, the button is not shown, since the grown oak is already
 * the end state.
 *
 * Round 23: the show has weather. Each beat also stamps `data-weather` on
 * `#tree` (its `GrowBeat.weather`: a plane, rain, snow, a flood, a
 * thunderstorm, a hurricane, a UFO...), which globals.css draws over the oak
 * with CSS alone, and `--beat-ms` so every weather runs the length of its
 * beat. Beside the button a lịch bloc (a Vietnamese tear-off calendar) shows
 * the year and loses a page each time the year turns, so time visibly flies.
 * Both are `aria-hidden`: the caption carries the meaning. `finish` takes
 * every one of those attributes off again, whether the show ran out or was
 * skipped.
 *
 * Takes its words and beats as props: importing the content file here would
 * ship all of it to the browser.
 */

/** Each beat's share of the show: long enough to read the weather. */
export const BEAT_MS = 1600;
/** How long the grown oak holds before the attributes come off. */
export const HOLD_MS = 1200;
/** Room kept between the header's paper and the heading, and under the button. */
const CLEARANCE = 16;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The companion's side of the show: `"start"`, then `"end"` exactly once. */
const tellCats = (detail: string) => document.dispatchEvent(new CustomEvent("origin-story", { detail }));

/** The year the lịch shows on each beat: a season's own, else the last one shown. */
function calendarYears(beats: readonly GrowBeat[]): number[] {
  let year = beats.find((beat) => beat.year !== null)?.year ?? 0;
  return beats.map((beat) => (year = beat.year ?? year));
}

interface CalendarState {
  /** The year on the page now. */
  readonly year: number;
  /** The page that just came off, if any. */
  readonly torn: number | null;
  /** Bumped per page, so each torn page is a fresh element and replays its fall. */
  readonly n: number;
}

interface GrowOakProps {
  readonly label: string;
  readonly skipLabel: string;
  readonly beats: readonly GrowBeat[];
  readonly className?: string;
}

export default function GrowOak({ label, skipLabel, beats, className }: GrowOakProps) {
  const [growing, setGrowing] = useState(false);
  const [caption, setCaption] = useState("");
  const [calendar, setCalendar] = useState<CalendarState | null>(null);
  const timers = useRef<number[]>([]);
  const runningRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
    if (!runningRef.current) return;
    runningRef.current = false;
    const section = document.getElementById("tree");
    section?.removeAttribute("data-growing");
    section?.style.removeProperty("--grow-ms");
    section?.style.removeProperty("--beat-ms");
    section?.removeAttribute("data-weather");
    for (const tag of section?.querySelectorAll("[data-grown]") ?? []) tag.removeAttribute("data-grown");
    setGrowing(false);
    setCaption("");
    setCalendar(null);
    tellCats("end");
  }, []);

  useEffect(() => finish, [finish]);

  useEffect(() => {
    if (!growing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [growing, finish]);

  const start = () => {
    const section = document.getElementById("tree");
    if (!section || reducedMotion()) return;
    const tags = [...section.querySelectorAll<HTMLElement>("[data-hanging-tags] li[data-year]")];
    const total = beats.length * BEAT_MS + HOLD_MS;

    runningRef.current = true;
    const years = calendarYears(beats);
    section.style.setProperty("--grow-ms", `${total}ms`);
    section.style.setProperty("--beat-ms", `${BEAT_MS}ms`);
    section.setAttribute("data-growing", "");
    // From 1280 the button is under the oak, at the board's foot; below, it
    // is above it, under the heading.
    if (window.matchMedia("(width >= 80rem)").matches) {
      // Line the board's foot up with the bottom of the screen, but stop
      // while the heading still clears the header: the header has been
      // see-through paper since round 23, so a heading under it shows through
      // the TL tag. The button's row (the caption and the lịch) always stays
      // on screen. On a screen too short for both, the heading and its lead
      // go up past the top edge whole, so the oak fills the screen and nothing
      // sits half under the paper.
      const rect = (selector: string) => section.querySelector(selector)?.getBoundingClientRect();
      const header = document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0;
      const foot = section.getBoundingClientRect().bottom - window.innerHeight;
      const clear = Math.min(foot, (rect("h2")?.top ?? 0) - header - CLEARANCE);
      const row = (rootRef.current?.getBoundingClientRect().bottom ?? 0) + CLEARANCE - window.innerHeight;
      const gone = (rect("h2 + p") ?? rect("h2"))?.bottom ?? 0;
      window.scrollBy({ top: clear >= row ? clear : Math.max(row, gone), behavior: "smooth" });
    } else {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setGrowing(true);
    tellCats("start");

    beats.forEach((beat, i) => {
      const last = i === beats.length - 1;
      const timer = window.setTimeout(() => {
        setCaption(beat.caption);
        section.setAttribute("data-weather", beat.weather);
        setCalendar((was) => ({
          year: years[i],
          torn: was && was.year !== years[i] ? was.year : null,
          n: was ? was.n + (was.year !== years[i] ? 1 : 0) : 0,
        }));
        for (const tag of tags) {
          if (last || Number(tag.dataset.year) === beat.year) tag.setAttribute("data-grown", "");
        }
        document.dispatchEvent(
          new CustomEvent("origin-story-beat", { detail: { kind: beat.kind, year: beat.year, storm: beat.storm, weather: beat.weather } }),
        );
      }, i * BEAT_MS);
      timers.current.push(timer);
    });
    timers.current.push(window.setTimeout(finish, total));
  };

  return (
    <div ref={rootRef} data-grow="" className={cn("no-print relative w-fit", className)}>
      <Button
        variant="primary"
        onClick={() => (runningRef.current ? finish() : start())}
        className="motion-reduce:hidden [html:not([data-motion])_&]:hidden"
      >
        {growing ? skipLabel : label}
      </Button>
      <p
        aria-live="polite"
        data-grow-caption=""
        data-paper=""
        className={cn(
          "bg-surface px-3 py-1.5 font-mono text-[length:var(--step--2)] text-fg",
          caption
            ? "paper-lift absolute top-full left-0 z-10 mt-14 w-max max-w-[min(30rem,calc(100vw-2*var(--gutter)))] xl:top-1/2 xl:left-full xl:mt-0 xl:ml-28 xl:-translate-y-1/2"
            : "sr-only",
        )}
      >
        {caption}
      </p>
      {calendar && (
        <div
          aria-hidden="true"
          data-lich=""
          data-paper=""
          className="lich pointer-events-none absolute top-0 left-full ml-4 xl:top-1/2 xl:-translate-y-1/2"
        >
          <span className="lich-label">lịch</span>
          <span className="lich-year">{calendar.year}</span>
          {calendar.torn !== null && (
            <span key={calendar.n} data-lich-torn="" className="lich-torn">
              {calendar.torn}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
