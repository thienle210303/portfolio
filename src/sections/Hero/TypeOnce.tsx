"use client";

import { useEffect, useState, type ReactNode } from "react";

// Module scope, so it outlives the panel: `Tabs` unmounts an inactive panel,
// and switching back to `whoami` must not type it a second time. Effects never
// run on the server, so the server render and the first client render agree.
let typedOnce = false;

/**
 * Marks its children for the terminal's typing animation on the first mount
 * only. The animation itself is CSS (`[data-typing] [data-type-line]` in
 * globals.css); this decides whether the marker is present, nothing more.
 */
export default function TypeOnce({ children }: { readonly children: ReactNode }) {
  const [typing] = useState(() => !typedOnce);
  useEffect(() => {
    typedOnce = true;
  }, []);
  return <div data-typing={typing ? "" : undefined}>{children}</div>;
}
