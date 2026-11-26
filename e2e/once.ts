import type { TestInfo } from "@playwright/test";

/**
 * Which project runs a test that sets its own viewports (round 32, when the
 * suite gained WebKit and Firefox beside Chromium).
 *
 * - `oncePerEngine`: anything that renders, scrolls or interacts — the Diary's
 *   turns, the hero's yard, clipping — runs once in each engine's 1440
 *   project, because rendering is exactly what differs between engines.
 * - `onceOverall`: what reads bytes or metadata (the HTML a server sends, the
 *   sitemap), or a choreography long enough that one engine is all the run
 *   can afford (the cats' ten-minute walks), runs once, in `chromium-1440`.
 */
export const oncePerEngine = (info: TestInfo): boolean => info.project.name.endsWith("-1440");

export const onceOverall = (info: TestInfo): boolean => info.project.name === "chromium-1440";
