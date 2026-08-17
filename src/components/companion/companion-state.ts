"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the cats are, persisted across visits.
 *
 * One key, three values. The old behaviour — "send the cat away" wrote `off`
 * and the cat never came back, with nothing on screen to bring it back — is
 * kept as exactly one of them, because a visitor who genuinely does not want a
 * companion is entitled to remove it. What it is no longer is the *only* exit:
 * `resting` is the middle state the corner box represents, one click from
 * awake, and it is what the friendly-sounding action now does.
 *
 * The legacy value keeps its meaning on purpose: anyone who dismissed the old
 * single cat wrote `off`, and they should not find two cats back on their next
 * visit. An absent or unrecognised value means roaming, so a corrupted entry
 * fails towards the default rather than towards an empty corner.
 *
 * This is deliberately outside React. The value is unavailable while rendering
 * on the server, and it can change without React knowing (another tab), which
 * is what `useSyncExternalStore` exists for — and why it is not read with a
 * `useEffect` + `setState`, which would render one frame of the wrong thing.
 */
export type CompanionMode = "roam" | "resting" | "off";

const STORAGE_KEY = "companion";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // `storage` fires for *other* tabs, so putting the cats to bed in one tab
  // settles them in the rest.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(): CompanionMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "off" || stored === "resting" ? stored : "roam";
  } catch {
    return "roam";
  }
}

export function setCompanionMode(mode: CompanionMode): void {
  try {
    if (mode === "roam") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked outright. The choice still holds for this visit;
    // it just does not survive the next one.
  }
  listeners.forEach((listener) => listener());
}

/** Server snapshot is `roam` — the same conservative answer the media queries
 *  give: render the default until the client says otherwise. */
export function useCompanionMode(): CompanionMode {
  return useSyncExternalStore(subscribe, read, () => "roam");
}
