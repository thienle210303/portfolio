import type { ReactNode } from "react";

interface SectionHeadingProps {
  /** Must match the `labelledBy` id passed to the enclosing <Section>. */
  readonly id: string;
  readonly children: ReactNode;
  readonly lead?: ReactNode;
}

/**
 * The <h2> pattern used by every section except the hero (the hero owns
 * the page's single <h1> directly and must not use this component).
 * Display serif at --step-4, with an optional lead paragraph in the muted
 * tone at --step-1.
 */
export function SectionHeading({ id, children, lead }: SectionHeadingProps) {
  return (
    <>
      <h2
        id={id}
        className="max-w-[74ch] font-display text-[length:var(--step-4)] leading-[1.05] tracking-[-0.02em] text-[color:var(--fg)]"
      >
        {children}
      </h2>
      {lead ? (
        <p className="prose-measure mt-4 text-[length:var(--step-1)] leading-relaxed text-[color:var(--fg-muted)]">
          {lead}
        </p>
      ) : null}
    </>
  );
}

export default SectionHeading;
