"use client";

import { useCallback, useImperativeHandle, useRef, useState, type ComponentType, type Ref } from "react";

/**
 * The always-loaded half of the origin story: no UI of its own, just the
 * mount point that lazy-imports the player chunk the first time something
 * asks it to start.
 *
 * This file is the reason the player costs the initial page nothing. It
 * imports React and nothing else — no `src/content`, no `src/lib/origin-story`
 * — so nothing the player needs to draw the story is ever pulled into the
 * section's own chunk. `OriginStory.tsx` (default export) is fetched on the
 * first `start()`, via a plain `import()` rather than `next/dynamic`: the
 * player never renders on the server, so `next/dynamic`'s SSR/loading options
 * buy nothing here.
 *
 * `TreeBox.tsx` owns it and calls `start()` through the `ref` handle, from its
 * auto-play observer and from the "See how it grows" button. Each `start()`
 * bumps a run counter used as the player's `key`, so a start while a show is
 * running unmounts that player (its own cleanup releases the tree and sends
 * the companion `origin-story` "end") and mounts a fresh one: exactly one is
 * ever mounted. A failed import drops back to nothing, which just lets the
 * next press try again — the feature was never load-bearing.
 *
 * ## Focus
 *
 * `start({ opener })` is a press: the player takes focus (its Skip button),
 * and when it ends with focus still inside, focus goes back to `opener` —
 * with `preventScroll`, because the visitor may have scrolled the header the
 * button sits in out of view while watching. `start()` with no opener is the
 * auto-play: the visitor did not ask, so the player must not take focus.
 */

type PlayerComponent = ComponentType<{
  readonly onClose: (restoreFocus: boolean) => void;
  readonly takeFocus: boolean;
}>;

export interface OriginStartOptions {
  /** The control that asked, if a visitor asked. Absent for the auto-play. */
  readonly opener?: HTMLElement | null;
}

export interface OriginHandle {
  start(options?: OriginStartOptions): void;
}

interface Show {
  readonly id: number;
  readonly opener: HTMLElement | null;
}

export function WatchOrigin({ ref }: { readonly ref: Ref<OriginHandle> }) {
  const [show, setShow] = useState<Show | null>(null);
  const [Player, setPlayer] = useState<PlayerComponent | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      start({ opener = null } = {}) {
        openerRef.current = opener;
        setShow((previous) => ({ id: (previous?.id ?? 0) + 1, opener }));
        if (Player) return;
        import("./OriginStory")
          .then((mod) => setPlayer(() => mod.default))
          .catch(() => setShow(null));
      },
    }),
    [Player],
  );

  const handleClose = useCallback((restoreFocus: boolean) => {
    if (restoreFocus) openerRef.current?.focus({ preventScroll: true });
    setShow(null);
  }, []);

  if (!show || !Player) return null;
  return <Player key={show.id} onClose={handleClose} takeFocus={show.opener !== null} />;
}

export default WatchOrigin;
