import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionTone = "ink" | "charcoal" | "paper";

interface SectionProps {
  readonly id: string;
  /** id of this section's <h2> (rendered by the caller, typically via
   * SectionHeading), wired up as this <section>'s aria-labelledby. */
  readonly labelledBy: string;
  readonly eyebrow?: string;
  readonly tone?: SectionTone;
  readonly children: ReactNode;
}

const TONE_BACKGROUND: Record<SectionTone, string> = {
  ink: "bg-ink",
  charcoal: "bg-charcoal",
  paper: "bg-paper",
};

/** The one structural wrapper every section on the page uses: a hairline
 * top border, fluid `--section-y` block padding, the `.shell` max-width
 * container, and the mono eyebrow pattern. `tone="paper"` additionally
 * applies `.on-light`, flipping every semantic colour alias used by
 * anything nested inside. */
export function Section({ id, labelledBy, eyebrow, tone = "ink", children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "hairline-t scroll-mt-20 py-[var(--section-y)]",
        TONE_BACKGROUND[tone],
        tone === "paper" && "on-light",
      )}
    >
      <div className="shell">
        {eyebrow ? <p className="eyebrow mb-8">{eyebrow}</p> : null}
        {children}
      </div>
    </section>
  );
}
