"use client";

/**
 * A screen recording that costs nothing until it is asked for.
 *
 * The page promises zero requests until a visitor asks (spec §6.4), and a
 * `<video poster>` fetches its poster on mount. Before the press there is
 * therefore no `<video>` and no `<img>` at all, only a button, however visible
 * the button is. After it: `preload="none"`, muted, never `autoplay` (the one
 * `play()` call is the user's own press), and no `loop` under reduced motion.
 */
import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/* The shared Button's `secondary`/`sm` classes, in its own order, written out
   by hand (as CaseStudy's "Discuss this project" link is) so this client
   component does not pull Button and ExternalLink into the page's initial
   JS. `tests/sections/ProjectRecording.test.tsx` holds the two equal. */
const PLAY_BUTTON_CLASS =
  "relative inline-flex min-h-11 items-center gap-2 border font-sans font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 " +
  "justify-center px-4 py-2 text-[length:var(--step--1)] " +
  "border-[color:var(--rule-color)] bg-transparent text-[color:var(--fg)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] " +
  "active:translate-y-px";

interface RecordingVideoProps {
  readonly recording: string;
  readonly title: string;
  readonly loop: boolean;
  /** The id of the caption that says what the recording visibly shows: its
   *  text alternative (WCAG 1.2.1). */
  readonly describedBy: string;
}

/** The mounted state, split out so the server markup of it can be asserted. */
export function RecordingVideo({ recording, title, loop, describedBy }: RecordingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    // Runs only after the press mounted this element. The button it replaced
    // is gone, so focus moves to the video; a rejected play (policy, missing
    // codec) leaves the native controls to start it.
    ref.current?.focus();
    ref.current?.play?.()?.catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src={`/media/${recording}.mp4`}
      poster={`/media/${recording}.jpg`}
      preload="none"
      muted
      playsInline
      controls
      loop={loop}
      aria-label={`${title} — screen recording`}
      aria-describedby={describedBy}
      // The frame is 16:9 whatever the file is: holding it before the poster
      // arrives keeps the press from shifting what is below it, and a
      // recording that is not 16:9 (Food Route is 604×568) letterboxes inside
      // it instead of resizing it.
      className="aspect-video w-full border border-[color:var(--rule-color)] bg-[color:var(--surface)]"
    />
  );
}

interface ProjectRecordingProps {
  readonly title: string;
  readonly recording: string;
  readonly description: string;
  readonly descriptionId: string;
}

export default function ProjectRecording({ title, recording, description, descriptionId }: ProjectRecordingProps) {
  // The motion preference only matters at the press, so it is read once,
  // there, rather than subscribed to by every closed case study on the page.
  const [pressed, setPressed] = useState<null | { readonly loop: boolean }>(null);
  return (
    <>
      {pressed ? (
        <RecordingVideo recording={recording} title={title} loop={pressed.loop} describedBy={descriptionId} />
      ) : (
        <button
          type="button"
          // Several of these sit on the page; the title tells them apart. The
          // visible text leads the name, so speech input still matches it.
          aria-label={`Play the screen recording of ${title}`}
          onClick={() => setPressed({ loop: !window.matchMedia(REDUCED_MOTION).matches })}
          className={PLAY_BUTTON_CLASS}
        >
          Play the screen recording
        </button>
      )}
      <p id={descriptionId} className="mt-2 text-[length:var(--step--1)] text-fg-muted">
        {description}
      </p>
    </>
  );
}
