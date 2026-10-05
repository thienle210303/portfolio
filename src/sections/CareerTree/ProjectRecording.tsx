"use client";

/**
 * A screen recording that costs nothing until it is asked for.
 *
 * CaseStudy's Disclosure keeps its children mounted while closed, so a
 * `<video poster>` here would fetch every poster on every visit. Before the
 * press there is therefore no `<video>` and no `<img>` at all, only a button.
 * After it: `preload="none"`, muted, never `autoplay` (the one `play()` call
 * is the user's own press), and no `loop` under reduced motion.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/types/portfolio";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const list = window.matchMedia(REDUCED_MOTION);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const reducedMotionNow = () => window.matchMedia(REDUCED_MOTION).matches;

interface RecordingVideoProps {
  readonly recording: string;
  readonly title: string;
  readonly loop: boolean;
}

/** The mounted state, split out so the server markup of it can be asserted. */
export function RecordingVideo({ recording, title, loop }: RecordingVideoProps) {
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
      className="w-full border border-[color:var(--rule-color)] bg-[color:var(--surface)]"
    />
  );
}

interface ProjectRecordingProps {
  readonly project: Pick<Project, "title">;
  readonly recording: string;
}

export default function ProjectRecording({ project, recording }: ProjectRecordingProps) {
  const [pressed, setPressed] = useState(false);
  if (!pressed) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setPressed(true)}>
        Play the screen recording
      </Button>
    );
  }
  return <PressedRecording recording={recording} title={project.title} />;
}

/** Reads the motion preference only once there is a video to apply it to, so
 *  the thirty-odd closed case studies on the page subscribe to nothing. */
function PressedRecording({ recording, title }: Omit<RecordingVideoProps, "loop">) {
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotionNow, () => false);
  return <RecordingVideo recording={recording} title={title} loop={!reduced} />;
}
