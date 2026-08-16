"use client";

import {
  createSemanticSearcher,
  type SemanticProgress,
  type SemanticSearcher,
} from "@/lib/guide/semantic";
import type { GuideIndex } from "@/lib/guide/types";

/**
 * The lifecycle of the opt-in embedding model, as a module-scope store.
 *
 * ## Why this is not component state
 *
 * It started as `useState` inside `GuidePanel`, and that was wrong in a way
 * visitors could see: the panel unmounts when closed, so enabling Tier 1,
 * closing the guide and reopening it presented the "Enable meaning-based
 * search" button again — offering a 25 MB download that had already happened.
 * The work is not the panel's; the panel is just one view onto it.
 *
 * Moving it here fixes three things at once:
 *
 *  1. Reopening the guide shows the real state — mid-download, ready, or failed.
 *  2. A load that is in flight when the panel closes keeps running *and* keeps
 *     being reported, which is what lets the cats in the margin stay in their
 *     working posture until it actually finishes.
 *  3. There is one source of truth. `working` used to be a second, separately
 *     maintained boolean in `guideStore`; it is now derived from this state, so
 *     the two can no longer disagree.
 *
 * ## Why it lives in its own module
 *
 * `guideStore` holds UI state — dismissed, open. This holds the model's
 * lifecycle, and it needs to import `@/lib/guide/semantic`. Keeping them apart
 * means `guideStore` (imported by the header and footer) stays free of that
 * dependency. Nothing heavy ships either way: the transformers library sits
 * behind a dynamic import *inside* `createSemanticSearcher`.
 *
 * The ready searcher is retained for the lifetime of the page. That is
 * deliberate — it holds the encoder and ~300 KB of vectors, and holding them is
 * exactly what makes a reopened panel instant.
 */
export type SemanticSession =
  | { readonly status: "off" }
  | { readonly status: "loading"; readonly progress: SemanticProgress }
  | { readonly status: "ready"; readonly searcher: SemanticSearcher }
  | { readonly status: "failed" };

/**
 * A module constant, not a fresh literal. `useSyncExternalStore` compares
 * snapshots by identity, and returning a new object each call makes React loop
 * on its "snapshot changed during render" check.
 */
const IDLE: SemanticSession = { status: "off" };

let session: SemanticSession = IDLE;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToSemanticSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSemanticSession(): SemanticSession {
  return session;
}

export function getSemanticSessionServerSnapshot(): SemanticSession {
  return IDLE;
}

/**
 * Whether the model is currently loading, as a plain boolean.
 *
 * Separate from `getSemanticSession` on purpose: the margin cats only need to
 * know "busy or not", and subscribing them to the full session object would
 * re-render them on every download-progress tick, since each tick replaces the
 * loading object. A primitive lets React bail out instead.
 */
export function getSemanticWorking(): boolean {
  return session.status === "loading";
}

export function getSemanticWorkingServerSnapshot(): boolean {
  return false;
}

/**
 * Downloads the encoder and embeds the corpus, reporting progress as it goes.
 *
 * Idempotent for anything already underway or done, so a second click cannot
 * start a second download. A previous *failure* is retryable, which is why
 * `failed` is not in the guard.
 *
 * Nothing here touches React, so the whole sequence survives the panel
 * unmounting halfway through.
 */
export function startSemanticSession(index: GuideIndex): void {
  if (session.status === "loading" || session.status === "ready") return;

  session = { status: "loading", progress: { phase: "downloading", percent: null } };
  emit();

  void createSemanticSearcher(index, (progress) => {
    // Guarded because a progress callback can still arrive after the session
    // has settled or been superseded; it must not resurrect a loading state.
    if (session.status !== "loading") return;
    session = { status: "loading", progress };
    emit();
  })
    .then((searcher) => {
      session = { status: "ready", searcher };
    })
    .catch(() => {
      session = { status: "failed" };
    })
    .finally(emit);
}
