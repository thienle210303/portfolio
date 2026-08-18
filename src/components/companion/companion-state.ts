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
 * towards an empty corner. The one value that is neither — `off`, which real
 * browsers still hold — is read as `resting` and rewritten to it once, on
 * mount; see `read` and `migrateCompanionMode`.
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
 * Legacy migration, half one.
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
 * The map has to live here even though `migrateCompanionMode` rewrites it,
 * because this function is the `useSyncExternalStore` snapshot: it answers the
 * *first* render, and every render after it, whereas the rewrite is an effect
 * and cannot run until the first one has been committed. A snapshot that
 * consulted the storage key alone would put two cats on the page for a frame
 * before the migration caught up. Nothing is written from in here for the same
 * reason — a snapshot is a read, and a snapshot with a side effect in it is a
 * render with a side effect in it.
 */
function read(): CompanionMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "resting" || stored === "off" ? "resting" : "roam";
  } catch {
    return "roam";
  }
}

/**
 * Legacy migration, half two: retire the stored `"off"` rather than reading
 * around it forever.
 *
 * Called once from an effect on mount — see `Companion` — which is a legitimate
 * place to touch storage in a way `read` is not. Without it a value from a
 * union this code no longer has outlives the code that understood it: it sits
 * in every one of those browsers until the visitor happens to make a deliberate
 * change, which for somebody who is happy with the cats asleep is never. It
 * changes nothing about what anybody sees — both values mean the same corner —
 * which is exactly why it is safe to do without asking, and why it does not
 * notify the listeners either.
 */
export function migrateCompanionMode(): void {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "off") {
      window.localStorage.setItem(STORAGE_KEY, "resting");
    }
  } catch {
    // Storage can be blocked outright, in which case there is nothing stored
    // under the old name to migrate.
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
