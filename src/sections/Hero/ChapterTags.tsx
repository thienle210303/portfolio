"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Tag } from "@/components/ui/Tag";
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

const PAPER = "min-h-[190px] flex-1 px-3.5 pt-8 pb-3";

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
        return (
          <li
            key={id}
            // Its place on the line, its string and its tilt; `--i` is its
            // place in the row from 1024 (`.hero-yard` in globals.css).
            style={{ ...hang, "--tilt": TILTS[i], "--i": i } as CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "Escape" && isOpen) turn(null);
            }}
            className={hung}
          >
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
                  <Tag className={PAPER}>
                    <span className="block font-mono text-[length:var(--step--2)] text-fg-muted">{year}</span>{" "}
                    <span className="block text-[length:var(--step-1)] font-semibold lg:max-xl:text-[length:var(--step-0)]">{place}</span>
                    <Drawing name={drawing} className="mt-1.5 h-[88px] w-full text-accent" />
                  </Tag>
                </button>
                <div id={backId} inert={!isOpen} className="no-print flex flex-col [grid-area:1/1] rotate-y-180 backface-hidden">
                  <Tag className={cn(PAPER, "flex flex-col")}>
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
                  </Tag>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
