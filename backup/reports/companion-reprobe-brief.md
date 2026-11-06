# Re-probe a resting explorer when the page shifts without a scroll

Owner request (2026-10-02): "fix the ResizeObserver re-probe too".

## The gap
`onPageMoved` (src/components/companion/Companion.tsx ~3743-3800) re-probes a held explore stop with
`heldExploreClear` only on `scroll` and `resize` (listeners ~3840-3841). Ground that shifts under a
resting cat with neither — the hero chat replacing its `min-h-[8rem]` "Loading…" placeholder
(AskThienHeroTab.tsx ~99), a panel opening, a list re-laying out — is never re-probed, so a cat can sit
with its head/feet on text for the rest of its stay (4–9 s). The comment at ~3776-3779 states this gap.

## The fix (bounded)
- Add a `ResizeObserver` on `document.body` (created in the same effect as the scroll/resize listeners,
  disconnected in its cleanup). The companion layer is `position: fixed`, so cats never change body size
  (no feedback loop). Ignore the observer's initial callback (it fires once on `observe`).
- On a callback: schedule the SAME throttled (250 ms, shared `recheck` timer) re-probe of the held explore
  stop with `heldExploreClear`; if it fails, drop `exploreRun.current` and call `wake()` so a frame runs
  and the pair re-plan. Do NOT stamp the presence clock (`lastSignRef`/`lastMoveRef`) — a layout that
  keeps changing on its own must not keep the cats awake or count as a reader — and do NOT wake sleeping
  cats when nothing was dropped. Do not end a running play scene from this path (scroll/resize still do).
  Refactor so the re-probe body is shared rather than duplicated (e.g. extract `reprobeHeld()` used by
  both the timer in `onPageMoved` and the observer), keeping scroll/resize behaviour byte-for-byte
  equivalent.
- Rewrite the ~3776-3779 comment so it is true (what is re-probed now, and what still is not — e.g. a
  shift that changes no body size).

## Tests (failing first)
- e2e in e2e/companion.spec.ts (fine pointer, 1440×900): get the pair holding an explore stop that is
  clear; set `document.documentElement.style.overflowAnchor = "none"` (so the browser does not compensate
  with a scroll — which would hit the existing path and hide the bug); insert a tall block of text above
  the cats' stop so the content under a resting cat changes with no scroll event; assert that within
  1500 ms no still cat rests on content (reuse `restingOnContent`/the head-band helper the suite already
  has). Show it RED on main (53ec294) and GREEN after. Also assert no scroll event fired during the
  shift (guard against the test passing through the old path).
- e2e: a layout change on its own does not keep the cats awake — idle the page past EXPLORE_IDLE_MS while
  a test-only interval grows/shrinks a block every second; both cats still nap and rAF reaches 0 (reuse
  the zero-frames helper). Red/green not required if it passes on main; it pins the "no presence stamp"
  rule.

## Gates
pnpm verify; companion + axe e2e at --workers=2 against a production build (throwaway config, 31xx port —
3000 is the main checkout's dev server — launchOptions.executablePath =
C:/Users/thien/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe);
the two new tests at --repeat-each=8 (8/8). Never pipe e2e through tail; kill servers by PID; delete
throwaways. If initial JS moves more than ~200 B, say so.
