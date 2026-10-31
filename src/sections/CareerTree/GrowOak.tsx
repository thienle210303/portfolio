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
 * The caption is a paper label hung under the button (beside it from 1280),
 * over the oak, so it never moves the page. While it plays the button says Skip, and a press or
 * Escape ends it at once.
 * Focus never moves: it is on the button the whole time. Under reduced motion,
 * and with JS off, the button is not shown, since the grown oak is already
 * the end state.
 *
 * Takes its words and beats as props: importing the content file here would
 * ship all of it to the browser.
 */

/** Each beat's share of the show. */
const BEAT_MS = 850;
/** How long the grown oak holds before the attributes come off. */
const HOLD_MS = 1200;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The companion's side of the show: `"start"`, then `"end"` exactly once. */
const tellCats = (detail: string) => document.dispatchEvent(new CustomEvent("origin-story", { detail }));

interface GrowOakProps {
  readonly label: string;
  readonly skipLabel: string;
  readonly beats: readonly GrowBeat[];
  readonly className?: string;
}

export default function GrowOak({ label, skipLabel, beats, className }: GrowOakProps) {
  const [growing, setGrowing] = useState(false);
  const [caption, setCaption] = useState("");
  const timers = useRef<number[]>([]);
  const runningRef = useRef(false);

  const finish = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
    if (!runningRef.current) return;
    runningRef.current = false;
    const section = document.getElementById("tree");
    section?.removeAttribute("data-growing");
    section?.style.removeProperty("--grow-ms");
    for (const tag of section?.querySelectorAll("[data-grown]") ?? []) tag.removeAttribute("data-grown");
    setGrowing(false);
    setCaption("");
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
    section.style.setProperty("--grow-ms", `${total}ms`);
    section.setAttribute("data-growing", "");
    // From 1280 the button is under the oak, at the board's foot; below, it
    // is above it, under the heading.
    const board = window.matchMedia("(width >= 80rem)").matches;
    section.scrollIntoView({ behavior: "smooth", block: board ? "end" : "start" });
    setGrowing(true);
    tellCats("start");

    beats.forEach((beat, i) => {
      const last = i === beats.length - 1;
      const timer = window.setTimeout(() => {
        setCaption(beat.caption);
        for (const tag of tags) {
          if (last || Number(tag.dataset.year) === beat.year) tag.setAttribute("data-grown", "");
        }
        document.dispatchEvent(
          new CustomEvent("origin-story-beat", { detail: { kind: beat.kind, year: beat.year, storm: beat.storm } }),
        );
      }, i * BEAT_MS);
      timers.current.push(timer);
    });
    timers.current.push(window.setTimeout(finish, total));
  };

  return (
    <div data-grow="" className={cn("no-print relative w-fit", className)}>
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
            ? "paper-lift absolute top-full left-0 z-10 mt-2 w-max max-w-[min(30rem,calc(100vw-2*var(--gutter)))] xl:top-1/2 xl:left-full xl:mt-0 xl:ml-4 xl:-translate-y-1/2"
            : "sr-only",
        )}
      >
        {caption}
      </p>
    </div>
  );
}
