"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { Chapter, ChapterId } from "@/lib/hero";

/** The board's sag of the clothesline under each tag at 1440. */
const DROPS = ["0px", "19px", "27px", "25px"];
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
    <ul role="list" data-hero-step="line" className="grid grid-cols-2 gap-x-4 gap-y-8 lg:flex lg:gap-[38px]">
      {chapters.map(({ id, year, place, line, drawing, href }, i) => {
        const isOpen = open === id;
        const backId = `${base}-${id}-back`;
        return (
          <li
            key={id}
            style={{ "--drop": DROPS[i], "--tilt": TILTS[i] } as CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "Escape" && isOpen) turn(null);
            }}
            className={cn(
              "relative pt-3.5 lg:w-[152px] lg:origin-top lg:translate-y-(--drop) lg:rotate-(--tilt)",
              // Below 1024 each cell draws its share of the row's twine; at 1024+ the clothesline does.
              "before:absolute before:top-0 before:-inset-x-2 before:h-0.5 before:bg-(--twine) lg:before:hidden",
              // The tag's own string, from the line down to the hole.
              "after:absolute after:top-0 after:left-1/2 after:z-10 after:h-6.5 after:w-[1.3px] after:-translate-x-1/2 after:bg-(--twine)",
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
                    <span className="block text-[length:var(--step-1)] font-semibold">{place}</span>
                    <Drawing name={drawing} className="mt-1.5 h-[88px] w-full text-accent" />
                  </Tag>
                </button>
                <div id={backId} inert={!isOpen} className="no-print flex flex-col [grid-area:1/1] rotate-y-180 backface-hidden">
                  <Tag className={cn(PAPER, "flex flex-col")}>
                    <button
                      type="button"
                      onClick={() => turn(null)}
                      className="mb-3 cursor-pointer text-left font-serif text-[length:var(--step-1)] leading-snug italic"
                    >
                      {line}
                      {" "}<span className="sr-only">(turn the tag back)</span>
                    </button>
                    <a href={href} className="mt-auto self-start font-semibold underline underline-offset-4">
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
