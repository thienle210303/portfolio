"use client";

/**
 * State for the site guide, as a tiny external store.
 *
 * Three components in **different React trees** need this: the cats in the
 * left margin (rendered at the end of the layout), the compact launcher in the
 * site header, and the "bring it back" control in the footer. Context would
 * mean hoisting a provider around the entire document; `useSyncExternalStore`
 * over a module-scope store is the smaller answer, and it gives cross-tab
 * behaviour for free via the `storage` event.
 *
 * Two pieces of state, with deliberately different lifetimes:
 *
 *  - `dismissed` — persisted. **One dismissal is permanent.** Not "until
 *    reload", not "for this session". A visitor who closes the guide should
 *    never see it reappear on its own.
 *  - `open` — ephemeral. Never persisted, so the guide is never open on
 *    arrival. It cannot greet anyone.

 *
 * Snapshots are primitives rather than an object, because `useSyncExternalStore`
 * compares them by identity — returning a fresh object from `getSnapshot`
 * makes React loop on its "snapshot changed during render" check.
 */

const STORAGE_KEY = "thienle.guide.dismissed";

const listeners = new Set<() => void>();

let dismissed = false;
let open = false;
let hydratedFromStorage = false;

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private-mode Safari and hardened browser configs throw on access rather
    // than returning null. A guide that cannot remember a dismissal is a
    // worse outcome than one that never appears, so treat an unreadable store
    // as "not dismissed" and let it be re-dismissed.
    return false;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToGuide(listener: () => void): () => void {
  // Deferred to first subscribe rather than done at module scope: this module
  // is imported by client components that Next also evaluates on the server
  // during SSR, where `window` does not exist.
  if (!hydratedFromStorage) {
    hydratedFromStorage = true;
    dismissed = readStorage();
  }

  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    const next = readStorage();
    if (next === dismissed) return;
    dismissed = next;
    if (dismissed) open = false;
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDismissed(): boolean {
  return dismissed;
}

export function getOpen(): boolean {
  return open;
}


/**
 * Server snapshots. `dismissed` is always `false` — the server cannot know,
 * and rendering the guide then removing it on hydration is the correct failure
 * direction: a visitor who dismissed it sees it vanish immediately, rather
 * than a visitor who did not sees nothing at all.
 */
export function getDismissedServerSnapshot(): boolean {
  return false;
}

export function getOpenServerSnapshot(): boolean {
  return false;
}


export function setOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  emit();
}


export function setDismissed(next: boolean): void {
  if (dismissed === next) return;
  dismissed = next;
  // Dismissing while open must also close, or the panel outlives the launcher
  // that owns its focus-restoration target.
  if (next) open = false;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Preference is kept in memory for this page either way.
  }
  emit();
}
