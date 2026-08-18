"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the cats are, persisted across visits.
 *
 * One key, two values, and there used to be three. `off` removed the companion
 * for good and had no surface of its own left to undo it, which is how the
 * owner stranded himself twice: once with the original single cat, and once
 * with the footer link that existed only to rescue him from it. His round-7
 * note ends the argument — "turn the cats off is equivalent to send the cats to
 * bed" — so the quiet state is the bed, and the bed is a place you can see, with
 * a control on it that brings them back.
 *
 * `resting` is that state: no roaming, no scenes, the loop stopped, and the
 * corner drawn where the visitor put them. An absent or unrecognised value
 * means roaming, so a corrupted entry fails towards the default rather than
 * towards an empty corner.
 *
 * This is deliberately outside React. The value is unavailable while rendering
 * on the server, and it can change without React knowing (another tab), which
 * is what `useSyncExternalStore` exists for — and why it is not read with a
 * `useEffect` + `setState`, which would render one frame of the wrong thing.
 */
export type CompanionMode = "roam" | "resting";

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

/**
 * Legacy migration, and the reason it cannot be a no-op.
 *
 * Browsers that visited while `off` existed still have `"off"` under this key.
 * Dropping the value from the union without mapping it would send every one of
 * those visitors down the `roam` branch — two cats back on a page whose owner
 * had explicitly turned them off — or, worse under any reading that kept the
 * old early return, to a page with no companion on it and nothing anywhere to
 * bring one back. So `off` reads as `resting`: they find the cats asleep in the
 * corner, quiet exactly as they asked, with the Wake control right there if they
 * change their mind.
 *
 * Deliberately a *read*-side map rather than a rewrite. This function is the
 * `useSyncExternalStore` snapshot and runs during render, which is no place for
 * a storage write; the stale `"off"` is simply re-read as `resting` every time,
 * and the first deliberate change the visitor makes overwrites it.
 */
function read(): CompanionMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "resting" || stored === "off" ? "resting" : "roam";
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
