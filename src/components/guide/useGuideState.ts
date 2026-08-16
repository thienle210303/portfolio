"use client";

import { useSyncExternalStore } from "react";
import {
  getDismissed,
  getDismissedServerSnapshot,
  getOpen,
  getOpenServerSnapshot,
  subscribeToGuide,
} from "./guideStore";

/** Whether the visitor has permanently dismissed the guide. */
export function useGuideDismissed(): boolean {
  return useSyncExternalStore(subscribeToGuide, getDismissed, getDismissedServerSnapshot);
}

/** Whether the guide's panel is currently open. */
export function useGuideOpen(): boolean {
  return useSyncExternalStore(subscribeToGuide, getOpen, getOpenServerSnapshot);
}
