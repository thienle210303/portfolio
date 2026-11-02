"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { contactCopy } from "@/content/portfolio";

/**
 * The postcard's SENT stamp (round 23 inked it on the form; round 24 moved it
 * to empty paper and made it a rubber stamp's impression).
 *
 * One impression, two places, chosen by CSS alone (globals.css, "Round 24,
 * builder A"): where the postcard's two sides stand side by side it lands in
 * the picture's empty sky (`BoardStamp`, inside the picture's scene box, so it
 * keeps its place against the drawing at every width); where they stack there
 * is no empty sky big enough, so it lands on the address side's own paper,
 * just under the confirmation line (`SentImpression` in `LeadForm`). Both are
 * `aria-hidden`: the status line carries the meaning.
 *
 * `LeadForm` owns "was it sent", and tells the picture side through this
 * context, so the stamp comes and goes with the confirmation line. Rendered
 * without a `PostcardStamps` around it (a unit test), the form still works and
 * simply has nobody to tell.
 */

/** "TAYLORS SC": the postmark's own words, from the same place string. */
const PLACE = contactCopy.postcard.place.replace(",", "").toUpperCase();

/** The visitor's own date, in the stamp's caps: "NOV 1, 2026". */
export function stampDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

interface Stamps {
  /** The date inked on the stamp, or `null` while the card is unsent. */
  readonly sentOn: string | null;
  readonly setSentOn: (date: string | null) => void;
}

const StampsContext = createContext<Stamps>({ sentOn: null, setSentOn: () => {} });

/** The client boundary around the postcard's two sides. Renders no element. */
export function PostcardStamps({ children }: { readonly children: ReactNode }) {
  const [sentOn, setSentOn] = useState<string | null>(null);
  return <StampsContext value={{ sentOn, setSentOn }}>{children}</StampsContext>;
}

/** For the form: say that the card is (or is no longer) stamped. */
export function useSetStamp(): (date: string | null) => void {
  return useContext(StampsContext).setSentOn;
}

/** Keeps the stamp on screen when it lands: a phone's confirmation line can sit
 *  near the bottom edge, and the stamp is the point of it. A no-op when it is
 *  already visible, or not displayed at all (the other placement). It waits a
 *  frame so the form's own move of focus to the confirmation line (which
 *  scrolls) has happened first, instead of cancelling this. */
function useBroughtIntoView() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      ref.current?.scrollIntoView?.({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return ref;
}

/** The impression itself: a double rule round TAYLORS SC, SENT and the date,
 *  all in the annotation ink and worn at the edges by `stamp-wear.svg`. */
export function SentImpression({ date, where }: { readonly date: string; readonly where: "board" | "slot" }) {
  const ref = useBroughtIntoView();
  return (
    <div ref={ref} aria-hidden="true" data-sent-stamp={where} className={`sent-stamp sent-stamp--${where}`}>
      <span className="sent-stamp__place">{PLACE}</span>
      <span className="sent-stamp__word">{contactCopy.stamp}</span>
      <span className="sent-stamp__date">{date}</span>
    </div>
  );
}

/** The picture side's copy, rendered inside the picture's scene box. */
export function BoardStamp() {
  const { sentOn } = useContext(StampsContext);
  return sentOn ? <SentImpression date={sentOn} where="board" /> : null;
}
