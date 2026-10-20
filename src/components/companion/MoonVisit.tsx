"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CompanionCat, { CAT_H, CAT_W } from "./CompanionCat";
import { markSurpriseSpent, surpriseSpent } from "./companion-surprise";

/**
 * The Moon surprise for a visitor whose cats do not walk (reduced motion, or a
 * touch screen, where they sit in the corner as the toolkit button): the first
 * time the hero's sleeping "Moon, off duty" is on screen, Mi is simply sitting
 * beside it, no startle and no walk. Once per visit, like the walking version
 * (companion-surprise.ts). While she is there the corner button carries Moon
 * alone, her place in it empty (`onVisit`).
 *
 * Drawn into the drawing's own box, so she scrolls with it and takes the
 * section's colours. Marked `data-companion` so the placement probes look
 * through her and the specs still count two cats.
 */
export function MoonVisit({ onVisit }: { readonly onVisit: (visiting: boolean) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [seat, setSeat] = useState<{ left: number; top: number; facing: 1 | -1 } | null>(null);

  useEffect(() => {
    if (surpriseSpent()) return;
    const drawing = document.querySelector<HTMLElement>("[data-moon-off-duty]");
    if (!drawing) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.intersectionRatio >= 0.5)) return;
      observer.disconnect();
      markSurpriseSpent();
      setHost(drawing);
      onVisit(true);
    }, { threshold: 0.5 });
    observer.observe(drawing);
    return () => observer.disconnect();
  }, [onVisit]);

  useEffect(() => {
    if (!host) return;
    const place = () => {
      const box = host.getBoundingClientRect();
      const art = host.querySelector("svg")?.getBoundingClientRect() ?? box;
      // Left of the sleeper where the page leaves room, else right of the
      // drawing and its caption; level with the sleeper's bottom either way.
      setSeat(
        art.left >= CAT_W + 12
          ? { left: art.left - box.left - CAT_W - 4, top: art.bottom - box.top - CAT_H, facing: 1 }
          : { left: box.width + 4, top: box.height - CAT_H, facing: -1 },
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [host]);

  useEffect(() => () => onVisit(false), [onVisit]);

  if (!host || !seat) return null;
  return createPortal(
    <span
      data-companion=""
      data-cat-visit=""
      aria-hidden="true"
      className="absolute text-fg-muted"
      style={{ left: seat.left, top: seat.top, width: CAT_W, height: CAT_H }}
    >
      <span className="block" style={{ transform: `scaleX(${seat.facing})` }}>
        <CompanionCat variant="tabby" pose="sit" phase={0} blinking={false} facing={seat.facing} />
      </span>
    </span>,
    host,
  );
}

export default MoonVisit;
