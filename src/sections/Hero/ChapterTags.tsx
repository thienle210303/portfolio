"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { cn } from "@/lib/cn";
import type { Chapter, ChapterId } from "@/lib/hero";

/**
 * Each tag tilts a little about the point where its string meets the line,
 * the opposite way to its neighbour. Where that point is, and how long the
 * string is, come from the line's one description (line.ts) below 1024 and
 * from the scenery's curve from there (`.hero-yard` in globals.css); nothing
 * here is fitted to a width. Hero.tsx works the first out on the server and
 * hands each tag its custom properties (`hang`) and the class that reads
 * them (`hung`), so none of that arithmetic ships to the browser.
 */
const TILTS = ["-3deg", "2deg", "-1.5deg", "2.5deg"];

/**
 * Round 28 (design/round-28-finish, approved by Thien 2026-11-07): each
 * chapter hangs as the thing it was, not as a fifth copy of one tag. Kiên
 * Giang is a rice seed packet, Taylors a boarding-pass stub, USC a library
 * card, DoorDash a receipt. Two are clothespinned straight to the line, two
 * hang on a string from an eyelet, so no two tops line up. The papers are in
 * globals.css (`[data-chapter-paper]`); where each string meets the line is
 * still line.ts's below 1024 and the scenery's curve from there.
 */
export type ChapterObject = "packet" | "stub" | "card" | "receipt";
export const CHAPTER_OBJECTS: readonly { readonly kind: ChapterObject; readonly pinned: boolean }[] = [
  { kind: "packet", pinned: true },
  { kind: "stub", pinned: false },
  { kind: "card", pinned: true },
  { kind: "receipt", pinned: false },
];

/** One chapter's paper; both faces of its flip are cut from the same one. */
function ChapterPaper({
  kind,
  pinned,
  className,
  children,
}: {
  readonly kind: ChapterObject;
  readonly pinned: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div data-chapter-paper={kind} className={cn("relative flex-1", kind === "receipt" && "bg-surface text-fg", className)}>
      {pinned ? null : <span aria-hidden="true" data-chapter-eyelet="" />}
      {children}
    </div>
  );
}

const YEAR = "font-mono text-[length:var(--step--2)] font-bold tracking-[0.08em] text-fg-muted";
const PLACE = "block text-[length:var(--step-1)] font-semibold lg:max-xl:text-[length:var(--step-0)]";

/** The front of each object: the year and the place set as that object would set them. */
function Front({ kind, year, place, drawing }: { readonly kind: ChapterObject } & Pick<Chapter, "year" | "place" | "drawing">) {
  const art = <Drawing name={drawing} className={cn("mt-1.5 w-full text-accent", kind === "stub" ? "h-[56px]" : kind === "receipt" ? "h-[80px] lg:h-[60px]" : "h-[80px] lg:h-[72px]")} />;
  switch (kind) {
    case "packet":
      return (
        <>
          <span data-chapter-flap="" className={YEAR}>{year}</span>{" "}
          <span className={PLACE}>{place}</span>
          {art}
        </>
      );
    case "stub":
      return (
        <>
          <span className="flex items-baseline justify-between gap-2">
            <span className={YEAR}>{year}</span>
            <span aria-hidden="true" data-chapter-arrow="" className={YEAR} />
          </span>{" "}
          <span className={cn(PLACE, "mt-1")}>{place}</span>
          <span aria-hidden="true" data-chapter-rule="" />
          {art}
        </>
      );
    case "card":
      // The card's year is a date stamp under its name, but it is read first,
      // like every other chapter's ("2021 USC"): `-order-1` lifts the name.
      return (
        <>
          <span data-date="" className="mt-1.5 self-start [--turn:-4deg]">{year}</span>{" "}
          <span className={cn(PLACE, "-order-1")}>{place}</span>
          {art}
        </>
      );
    case "receipt":
      return (
        <>
          <span className={YEAR}>{year}</span>
          <span aria-hidden="true" data-chapter-rule="" />{" "}
          <span className={PLACE}>{place}</span>
          <span aria-hidden="true" data-chapter-rule="" />
          {art}
        </>
      );
  }
}

/**
 * Four chapter tags on a line; pressing one turns it over to my line about
 * that chapter. One is open at a time. The flip is `BusinessCard`'s: both
 * faces share a grid cell, the face turned away is `inert`, the global
 * reduced-motion rule drops the transition, and focus follows the turn.
 */
export default function ChapterTags({
  chapters,
  hung,
}: {
  readonly chapters: readonly (Chapter & { readonly href: string; readonly hang: Readonly<Record<string, string>> })[];
  readonly hung: string;
}) {
  const [open, setOpen] = useState<ChapterId | null>(null);
  const base = useId();
  // Focus only follows a turn the visitor made; `last` is the tag that closed.
  const turned = useRef(false);
  const last = useRef<ChapterId | null>(null);

  useEffect(() => {
    if (!turned.current) return;
    if (open) document.getElementById(`${base}-${open}-back`)?.querySelector("button")?.focus();
    else if (last.current) document.getElementById(`${base}-${last.current}-front`)?.focus();
  }, [open, base]);

  function turn(to: ChapterId | null) {
    turned.current = true;
    last.current = open;
    setOpen(to);
  }

  return (
    <ul role="list" data-hero-step="line">
      {chapters.map(({ id, year, place, line, drawing, href, hang }, i) => {
        const isOpen = open === id;
        const backId = `${base}-${id}-back`;
        const { kind, pinned } = CHAPTER_OBJECTS[i];
        return (
          <li
            key={id}
            // Its place on the line, its string and its tilt; `--i` is its
            // place in the row from 1024 (`.hero-yard` in globals.css).
            style={{ ...hang, "--tilt": TILTS[i], "--i": i } as CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "Escape" && isOpen) turn(null);
            }}
            data-hang={pinned ? "pin" : "string"}
            className={hung}
          >
            {pinned ? <Drawing name="clothespin" className="chapter-clothespin text-(--twine)" /> : null}
            <div className="perspective-distant">
              <div
                data-flip
                className={cn(
                  "grid transform-3d transition-transform duration-(--dur-settle) ease-(--ease-ink)",
                  isOpen && "rotate-y-180",
                )}
              >
                <button
                  id={`${base}-${id}-front`}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={backId}
                  inert={isOpen}
                  onClick={() => turn(id)}
                  className="flex cursor-pointer flex-col text-left [grid-area:1/1] backface-hidden"
                >
                  <ChapterPaper kind={kind} pinned={pinned} className="flex flex-col">
                    <Front kind={kind} year={year} place={place} drawing={drawing} />
                  </ChapterPaper>
                </button>
                <div id={backId} inert={!isOpen} className="no-print flex flex-col [grid-area:1/1] rotate-y-180 backface-hidden">
                  <ChapterPaper kind={kind} pinned={pinned} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => turn(null)}
                      className="mb-3 cursor-pointer text-left font-serif text-[length:var(--step-0)] leading-[1.3] italic"
                    >
                      {line}
                      {" "}<span className="sr-only">(turn the tag back)</span>
                    </button>
                    <a href={href} className="mt-auto inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
                      Read this part
                    </a>
                  </ChapterPaper>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
