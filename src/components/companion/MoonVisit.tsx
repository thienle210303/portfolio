"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CompanionCat, { CAT_H, CAT_W } from "./CompanionCat";
import { safeTop } from "./companion-space";
import { markSurpriseSpent, surpriseSpent } from "./companion-surprise";

/**
 * The Moon surprise for a visitor whose cats do not walk (reduced motion, or a
 * touch screen, where they sit in the corner as the toolkit button): the first
 * time the hero's sleeping "Moon, off duty" is on screen, Mi is simply sitting
 * beside it, no startle and no walk. Once per visit, like the walking version
 * (companion-surprise.ts). While she is there the corner button carries Moon
 * alone, her place in it empty (`onVisit`).
 *
 * Drawn on the companion's fixed layer and moved with the drawing on scroll
 * (no portal: `react-dom`'s entry would join the initial bundle). Hidden while
 * the drawing is under the sticky header.
 */
export function MoonVisit({ onVisit }: { readonly onVisit: (visiting: boolean) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (surpriseSpent()) return;
    const drawing = document.querySelector<HTMLElement>("[data-moon-off-duty]");
    if (!drawing) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.intersectionRatio >= 0.5)) return;
        observer.disconnect();
        markSurpriseSpent();
        setHost(drawing);
        onVisit(true);
      },
      { threshold: 0.5 },
    );
    observer.observe(drawing);
    return () => observer.disconnect();
  }, [onVisit]);

  // Before paint, so she never shows a frame at the layer's origin.
  useLayoutEffect(() => {
    if (!host) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const box = host.getBoundingClientRect();
      const art = host.querySelector("[data-moon-art]")?.getBoundingClientRect() ?? box;
      // Left of the sleeper where the page leaves room, else right of the
      // drawing and its caption; level with the sleeper's bottom either way.
      const left = art.left >= CAT_W + 12;
      const x = left ? art.left - CAT_W - 4 : box.right + 4;
      const y = (left ? art.bottom : box.bottom) - CAT_H;
      setFacing(left ? 1 : -1);
      if (node.current) {
        node.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        node.current.style.visibility = y < safeTop() ? "hidden" : "";
      }
    };
    const later = () => {
      frame ||= requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [host]);

  useEffect(() => () => onVisit(false), [onVisit]);

  if (!host) return null;
  return (
    <span
      ref={node}
      data-cat-visit=""
      aria-hidden="true"
      className="absolute left-0 top-0 text-fg-muted"
      style={{ width: CAT_W, height: CAT_H }}
    >
      <span className="block" style={{ transform: `scaleX(${facing})` }}>
        <CompanionCat variant="tabby" pose="sit" phase={0} blinking={false} facing={facing} />
      </span>
    </span>
  );
}

export default MoonVisit;
