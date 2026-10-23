"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { Chapter, ChapterId } from "@/lib/hero";

/**
 * How far below the clothesline's top (Scenery.tsx) each tag's string meets
 * the curve. The line stretches with the section, so the sag under a tag
 * depends on the width: nearly flat across 1024–1279 (one value each), and
 * linear in the section's width (`cqw`) from 1280. Past 1920 the line stops
 * growing and stays centred, like the content, so the width is capped there.
 * Fitted against the curve: every string meets it within 2px at any width.
 * Hero.tsx does the same for the field tag.
 */
const DROPS = ["28.8px", "52.4px", "64.8px", "65.5px"];
const DROPS_XL = [
  "calc(31.9px + (min(100cqw, 1920px) - 1280px) * 0.0345)",
  "calc(55.7px + (min(100cqw, 1920px) - 1280px) * 0.0115)",
  "66.2px",
  "63.4px",
];
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
}: {
  readonly chapters: readonly (Chapter & { readonly href: string })[];
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
    <ul role="list" data-hero-step="line" className="flex flex-col lg:flex-row lg:gap-3 xl:gap-[38px]">
      {chapters.map(({ id, year, place, line, drawing, href }, i) => {
        const isOpen = open === id;
        const backId = `${base}-${id}-back`;
        return (
          <li
            key={id}
            style={{ "--drop": DROPS[i], "--drop-xl": DROPS_XL[i], "--tilt": TILTS[i] } as CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "Escape" && isOpen) turn(null);
            }}
            className={cn(
              "relative rotate-(--tilt) pt-3.5 lg:max-w-[152px] lg:min-w-0 lg:flex-1 lg:origin-top lg:translate-y-(--drop) xl:translate-y-(--drop-xl)",
              // Below 1024 the tags hang down the line, left, right, left, right,
              // 18px either side of it, each overlapping the one before; their
              // strings and clothespins are globals.css's.
              "max-lg:w-[min(160px,calc(50%-18px))] max-lg:odd:mr-[calc(50%+18px)] max-lg:odd:ml-auto max-lg:even:ml-[calc(50%+18px)] max-lg:not-first:-mt-19",
              // At 1024+ the tag's own string, from the clothesline down to the hole.
              "lg:after:absolute lg:after:top-0 lg:after:left-1/2 lg:after:z-10 lg:after:h-6.5 lg:after:w-[1.3px] lg:after:-translate-x-1/2 lg:after:bg-(--twine)",
            )}
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
