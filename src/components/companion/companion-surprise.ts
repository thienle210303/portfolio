import { CAT_H, CAT_W, type CatPose } from "./CompanionCat";
import type { Point, RectLike } from "./companion-space";

/**
 * "Only the live cats are cats" (round 21 spec §7). The hero's rice holds one
 * drawn cat, "Moon, off duty", asleep — the setup for a joke. The first time a
 * walking cat comes near it, she stops, startles (ears back, a hop), creeps up,
 * sniffs it, and sits down beside it. Once per visit.
 *
 * Pure apart from the visit flag: the loop in Companion.tsx owns where the cat
 * is and asks this module what she is doing.
 */

export type SurpriseStep = "stop" | "startle" | "creep" | "sniff" | "sit";

export interface Surprise {
  readonly cat: "lead" | "follow";
  readonly step: SurpriseStep;
  /** When a timed step ends; a creep ends when she arrives. */
  readonly until: number;
}

/** How long each timed step holds. The sit is the punchline, so it is long. */
export const SURPRISE_MS = { stop: 450, startle: 750, sniff: 1300, sit: 7000 } as const;

/** How close a walking cat has to come before she notices it, in px. */
export const SURPRISE_REACH = 150;

/** A creep, per reference frame: about a quarter of a walk. */
export const CREEP_SPEED = 1.1;

/** The gap she leaves between herself and the drawing. */
const SEAT_GAP = 4;

export function startSurprise(cat: Surprise["cat"], now: number): Surprise {
  return { cat, step: "stop", until: now + SURPRISE_MS.stop };
}

/** The next state, or null once she has sat long enough. `arrived` is whether
 *  she is at her seat. */
export function advanceSurprise(s: Surprise, now: number, arrived: boolean): Surprise | null {
  switch (s.step) {
    case "stop":
      return now < s.until ? s : { ...s, step: "startle", until: now + SURPRISE_MS.startle };
    case "startle":
      return now < s.until ? s : { ...s, step: "creep", until: Infinity };
    case "creep":
      return arrived ? { ...s, step: "sniff", until: now + SURPRISE_MS.sniff } : s;
    case "sniff":
      return now < s.until ? s : { ...s, step: "sit", until: now + SURPRISE_MS.sit };
    case "sit":
      return now < s.until ? s : null;
  }
}

export function surprisePose(step: SurpriseStep): { readonly pose: CatPose; readonly hopping: boolean } {
  if (step === "startle") return { pose: "startle", hopping: true };
  if (step === "creep") return { pose: "walk", hopping: false };
  if (step === "sniff") return { pose: "sniff", hopping: false };
  return { pose: "sit", hopping: false };
}

/** Whether a cat whose box starts at `pos` is within reach of the drawing. */
export function nearDrawing(pos: Point, drawing: RectLike, reach = SURPRISE_REACH): boolean {
  const cx = pos.x + CAT_W / 2;
  const cy = pos.y + CAT_H / 2;
  const dx = Math.max(drawing.left - cx, 0, cx - drawing.right);
  const dy = Math.max(drawing.top - cy, 0, cy - drawing.bottom);
  return Math.hypot(dx, dy) <= reach;
}

/** Which way to face to look at the drawing from `pos`. */
export function surpriseFacing(pos: Point, drawing: RectLike): 1 | -1 {
  return pos.x + CAT_W / 2 < (drawing.left + drawing.right) / 2 ? 1 : -1;
}

/**
 * Her seat: level with the drawing's bottom, just off its left edge, or its
 * right where the left is off the page. `clear` is the content probe (`isClearSpot`);
 * a side off the page or on content is skipped, and null means neither fits.
 */
export function seatBeside(
  drawing: RectLike,
  view: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
  clear: (spot: Point) => boolean,
): Point | null {
  const y = drawing.bottom - CAT_H;
  const left = { x: drawing.left - SEAT_GAP - CAT_W, y };
  const right = { x: drawing.right + SEAT_GAP, y };
  // Left first: on the right are the caption and, from 1024, the hero's
  // stool and its vignette. On a phone the drawing is at the left edge, so
  // the left seat is off the page and she takes the right.
  for (const seat of [left, right]) {
    if (seat.x < view.minX || seat.x > view.maxX || seat.y < view.minY || seat.y > view.maxY) continue;
    if (clear(seat)) return seat;
  }
  return null;
}

const KEY = "cats-met-moon";
/** The flag again, in memory, for a browser whose storage throws. */
let spentHere = false;

export function surpriseSpent(): boolean {
  if (spentHere) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markSurpriseSpent(): void {
  spentHere = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Private mode or blocked storage: once per page view instead.
  }
}

/** Tests only: forget the in-memory flag. */
export function resetSurpriseForTests(): void {
  spentHere = false;
}
