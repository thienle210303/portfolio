"use client";

import { navItems } from "@/content/portfolio";
import type { CompanionFacts } from "@/lib/companion-facts";

/**
 * The guided tour: the accessible half of D5.
 *
 * Field notes (companion-notes.ts) are ambient and decorative; this is the
 * opposite — a visitor presses "Show me around" in the toolkit panel, and the
 * pair walk the page's own eight sections in order, saying one factual line
 * at each stop through the HUD's `role="status"`. It is the only thing the
 * companion narrates out loud, on purpose: everything else it does is a
 * drawing, and a drawing that starts talking to a screen reader unprompted is
 * noise. Asked for, it is a small guided reading of the page rather than a
 * feature nobody who cannot see the cats has any way to reach.
 *
 * `TOUR_STOPS` is derived from `navItems` rather than kept as a parallel
 * list, so the tour can never visit a section the nav does not, or skip one
 * it does — the two are structurally the same eight entries.
 */

export interface TourStop {
  readonly sectionId: string;
  readonly label: string;
}

export const TOUR_STOPS: readonly TourStop[] = navItems.map((item) => ({
  sectionId: item.sectionId,
  label: item.label,
}));

/** `walking` while the pair are on their way to a stop; `arrived` once they
 *  are standing at it and the HUD has something to say. */
export type TourPhase = "walking" | "arrived";

/**
 * The tour in progress. `index` is the stop the pair are walking to or
 * standing at; `arrivedAt` is zero until `phase` becomes `"arrived"`, which is
 * what lets the caller tell "just got here" from "has been standing here a
 * while" without a second clock.
 */
export interface TourRun {
  index: number;
  phase: TourPhase;
  arrivedAt: number;
}

export function startTour(): TourRun {
  return { index: 0, phase: "walking", arrivedAt: 0 };
}

export function isLastStop(index: number): boolean {
  return index >= TOUR_STOPS.length - 1;
}

/**
 * One factual sentence per stop, every number read straight off
 * `CompanionFacts` — never typed here — which is the same discipline
 * companion-notes.ts follows and for the same reason: the tour is the
 * accessible narrator, so it is the one place a wrong number would actually
 * be heard.
 */
export function tourLine(sectionId: string, facts: CompanionFacts): string {
  switch (sectionId) {
    case "about":
      return facts.about.role && facts.about.organization
        ? `This is the start — right now that's ${facts.about.role} at ${facts.about.organization}.`
        : "This is the start of the page.";
    case "philosophy":
      return `${facts.philosophy.principles} principles run this loop, over and over.`;
    case "work":
      return `${facts.work.caseStudies} case studies, ${facts.work.sourcedMetrics} sourced figures between them.`;
    case "journey":
      return `${facts.journey.entries} entries on the timeline — ${facts.journey.work} of them work.`;
    case "skills":
      return `${facts.skills.categories} categories, ${facts.skills.distinctSkills} distinct skills.`;
    case "tree":
      return `${facts.tree.branches} branches, ${facts.tree.leaves} leaves, ${facts.tree.technologies} technologies.`;
    case "lab":
      return `${facts.lab.experiments} experiments here, ${facts.lab.verified} of them verified.`;
    case "contact":
      return "And that's everywhere — this is where you'd reach out.";
    default:
      return "";
  }
}
