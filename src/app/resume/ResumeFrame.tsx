"use client";

import { useSyncExternalStore } from "react";
import { BAND } from "@/lib/breakpoints";

/**
 * The PDF in a frame, from 40rem only (round 25).
 *
 * A phone shows an embedded PDF as one cropped page or as nothing, so under
 * 40rem `/resume` shows a picture of page one instead and this renders
 * nothing: the frame is not hidden there, it does not exist, so the PDF (the
 * page's heaviest file) is never fetched. The band is asked in JavaScript
 * because CSS can hide a frame but cannot stop it loading. The server renders
 * nothing; the page keeps the frame's room, so its arrival moves nothing, and
 * a `<noscript>` twin beside this covers a browser with JavaScript off.
 */

function subscribe(onChange: () => void) {
  const query = window.matchMedia(BAND.tablet);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function ResumeFrame({ src, title }: { readonly src: string; readonly title: string }) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(BAND.tablet).matches,
    () => false,
  );
  return wide ? <iframe title={title} src={src} className="min-h-0 w-full flex-1 border-0 bg-surface" /> : null;
}
