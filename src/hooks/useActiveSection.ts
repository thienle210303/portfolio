"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which of `sectionIds` currently owns the "active" slot in a
 * fixed-header scrollspy nav, using `IntersectionObserver` against a thin
 * trigger band biased toward the upper-middle of the viewport (see
 * `rootMargin` below) rather than the literal top of the page.
 *
 * Pass a referentially-stable array — e.g. a module-scope constant built
 * once from `navItems`. A fresh array literal on every render would tear
 * down and rebuild the observer on every render.
 *
 * SSR-safe: no observer work happens during render, only inside the
 * effect. Degrades gracefully (returns `null` forever) when
 * `IntersectionObserver` is unavailable, rather than throwing.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    // Which of `sectionIds` currently overlaps the trigger band. Only the
    // entries whose intersection state changed are reported per callback,
    // so this map persists the last known state for every observed id.
    const intersecting = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.set(entry.target.id, entry.isIntersecting);
        }
        // Sections are stacked top-to-bottom in `sectionIds` order, and
        // the band rarely overlaps more than one at a time. The lowest
        // (last, in source order) id still inside the band is the one the
        // reader has most recently scrolled into, so it wins ties during
        // the brief instant two sections both touch the band.
        let next: string | null = null;
        for (const id of sectionIds) {
          if (intersecting.get(id)) next = id;
        }
        if (next) setActiveId(next);
      },
      {
        // Shrinks the effective viewport to a thin band starting 20% down
        // from the top and ending 30% down (100% - 20% - 70%), so the
        // active item changes when a section reaches the upper-middle of
        // the screen rather than the instant it appears at the bottom edge.
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
