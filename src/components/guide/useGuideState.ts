"use client";

import { useSyncExternalStore } from "react";
import {
  getDismissed,
  getDismissedServerSnapshot,
  getOpen,
  getOpenServerSnapshot,
  subscribeToGuide,
} from "./guideStore";
import {
  getSemanticSession,
  getSemanticSessionServerSnapshot,
  getSemanticWorking,
  getSemanticWorkingServerSnapshot,
  subscribeToSemanticSession,
  type SemanticSession,
} from "./semanticSession";

/** Whether the visitor has permanently dismissed the guide. */
export function useGuideDismissed(): boolean {
  return useSyncExternalStore(subscribeToGuide, getDismissed, getDismissedServerSnapshot);
}

/** Whether the guide's panel is currently open. */
export function useGuideOpen(): boolean {
  return useSyncExternalStore(subscribeToGuide, getOpen, getOpenServerSnapshot);
}

/**
 * Whether the opt-in embedding model is currently downloading or encoding.
 *
 * A boolean rather than the session object, so the margin cats do not re-render
 * on every progress tick.
 */
export function useGuideWorking(): boolean {
  return useSyncExternalStore(
    subscribeToSemanticSession,
    getSemanticWorking,
    getSemanticWorkingServerSnapshot,
  );
}

/** The full model lifecycle, for the panel that has to describe it. */
export function useSemanticSession(): SemanticSession {
  return useSyncExternalStore(
    subscribeToSemanticSession,
    getSemanticSession,
    getSemanticSessionServerSnapshot,
  );
}
