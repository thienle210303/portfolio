"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the cats are, persisted across visits.
 *
 * One key, three values, and there used to be a fourth. `off` removed the
 * companion for good and had no surface of its own left to undo it, which is
 * how the owner stranded himself twice: once with the original single cat, and
 * once with the footer link that existed only to rescue him from it. His round-7
 * note ends the argument — "turn the cats off is equivalent to send the cats to
 * bed" — so the quiet state is the bed, and the bed is a place you can see, with
 * a control on it that brings them back.
 *
 * `resting` is that state: no roaming, no scenes, the loop stopped, and the
 * corner drawn where the visitor put them.
 *
 * `wander` is the round-9 addition, and it is the *same* roaming layer with the
 * cursor taken out of it: the pair pick their own places to be and their own
 * things to do with the page, and the pointer is simply not one of the forces
 * acting on them. It is stored beside the other two rather than derived from
 * anything, because it is a preference in exactly the sense `resting` is — the
 * visitor said how they want the companion to behave, and a reload should not
 * quietly disagree with them.
 *
 * An absent or unrecognised value means roaming, so a corrupted entry — or one
 * written by a future version of this file — fails towards the default rather
 * than towards an empty corner. The one value that is neither — `off`, which
 * real browsers still hold — is read as `resting` and rewritten to it once, on
 * mount; see `read` and `migrateCompanionMode`.
 *
 * There is a second key beside this one, and only one thing reads it: which of
 * the two roaming modes to wake the cats back into. See `ROAM_KEY`.
 *
 * This is deliberately outside React. The value is unavailable while rendering
 * on the server, and it can change without React knowing (another tab), which
 * is what `useSyncExternalStore` exists for — and why it is not read with a
 * `useEffect` + `setState`, which would render one frame of the wrong thing.
 */
export type CompanionMode = "roam" | "resting" | "wander";

/** The two modes that put cats on the page. The bed is the third state and the
 *  only one that is not a way of roaming, which is the distinction the second
 *  key below exists to keep. */
export type RoamingMode = "roam" | "wander";

const STORAGE_KEY = "companion";

/**
 * Which of the two roaming modes the visitor last chose, remembered across a
 * trip to the bed.
 *
 * A second key rather than a second value, because `companion` answers "where
 * are the cats now" and this answers "how do they behave when they are out",
 * and the bed is precisely the state where those two are different questions.
 * With one key the bed overwrites the answer to both: a visitor who chose
 * `wander`, sent the pair to bed and woke them again got the cursor back, which
 * is the site forgetting a deliberate choice on their behalf.
 *
 * Absent means `roam` — the default the whole file falls towards — so a browser
 * that has never seen this key, or is carrying a value from a version that
 * spells the modes differently, wakes its cats onto the page rather than into
 * some state this build cannot draw. Nothing migrates: there is no old value to
 * retire, and a visitor whose stored mode predates this key simply has no
 * preference recorded yet.
 */
const ROAM_KEY = "companion-roam";

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
    if (stored === "resting" || stored === "off") return "resting";
    // Every other spelling, including one this build has never heard of, is the
    // default. A visitor carrying a value from a later version of the site must
    // find cats rather than an empty corner, which is the same promise the `off`
    // line above keeps for a value from an earlier one.
    return stored === "wander" ? "wander" : "roam";
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

/**
 * How the cats behave when they are out, whatever they are doing at the moment.
 *
 * Read by the Wake control, which is the one place that has to put the pair
 * back into a mode rather than into the mode they are already in.
 */
export function roamingChoice(): RoamingMode {
  try {
    return window.localStorage.getItem(ROAM_KEY) === "wander" ? "wander" : "roam";
  } catch {
    return "roam";
  }
}

export function setCompanionMode(mode: CompanionMode): void {
  try {
    if (mode === "roam") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
    // Only the two roaming modes say anything about how the cats behave. The
    // bed deliberately leaves the last answer standing — that is the whole of
    // what makes it a pause rather than a reset — and `roam`, being the
    // default, is recorded by having nothing recorded, exactly as it is above.
    if (mode === "roam") window.localStorage.removeItem(ROAM_KEY);
    else if (mode === "wander") window.localStorage.setItem(ROAM_KEY, "wander");
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
