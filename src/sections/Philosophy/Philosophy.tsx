/**
 * Philosophy — id="philosophy", tone "charcoal", eyebrow "02 / PHILOSOPHY".
 * Composes the section shell (Section + SectionHeading, matching
 * SelectedWork.tsx's conventions) around the two owned list components and
 * a closing pull-quote. Every fact rendered here comes from
 * `@/content/portfolio`; nothing is invented.
 *
 * Heading accessibility: the visible <h2> is the stylised glyph line
 * "Unsolved ≠ Unsolvable". A screen reader reading "≠" character-by-character
 * (or worse, silently dropping it and running "Unsolved" and "Unsolvable"
 * together) would not convey the intended sentence, so the glyph line is
 * marked `aria-hidden="true"` in full — not just the "≠" — and a sibling
 * `VisuallyHidden` span carries the real sentence as plain text. Per the
 * standard accessible-name-from-content algorithm, `aria-hidden`
 * descendants are excluded from the computation entirely, so the <h2>'s
 * accessible name resolves to exactly that hidden sentence — "Unsolved is
 * not the same as unsolvable." — with nothing left to read ambiguously.
 * That sentence is `profile.philosophy` itself (not a re-typed copy), the
 * same value ProblemSolvingLoop sets in the middle of its ring, so the two
 * can never drift out of sync.
 *
 * There is no longer a closing pull-quote here. It rendered exactly that
 * sentence, and the loop now sets it in the middle of the ring — where the
 * nine steps circle it, which is a better argument for it than a blockquote
 * underneath them was. Two visible copies of one sentence in one section is
 * one too many, and the ring's is the one that means something.
 */
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { philosophyIntro, principles, problemSolvingLoop, profile } from "@/content/portfolio";
import PrincipleList from "./PrincipleList";
import ProblemSolvingLoop from "./ProblemSolvingLoop";

const HEADING_ID = "philosophy-heading";

/*
 * Deliberately no `rail` here, unlike every other section.
 *
 * The original reason was width — ProblemSolvingLoop used to lay its nine
 * steps out as nine columns at >=1024px, and surrendering an 11rem margin
 * dropped each column to roughly 127px. That reason expired when the loop
 * became a vertical graph, but the other one did not, and it was always the
 * stronger of the two: the rail's notes here would have been counts of the two
 * lists rendered directly below it, which is annotation restating the page
 * rather than adding to it.
 */
export default function Philosophy() {
  return (
    <Section id="philosophy" labelledBy={HEADING_ID} eyebrow="Philosophy" tone="deep">
      {/* Not using SectionHeading's `lead` prop: philosophyIntro is two
          separate paragraphs, and `lead` wraps its children in a single
          <p> — nesting block <p>s inside it would be invalid HTML and a
          hydration risk. The paragraphs render manually just below instead. */}
      <SectionHeading id={HEADING_ID}>
        <span aria-hidden="true">Unsolved ≠ Unsolvable</span>
        <VisuallyHidden>{profile.philosophy}</VisuallyHidden>
      </SectionHeading>

      <div className="prose-measure mt-6 space-y-4">
        {philosophyIntro.map((paragraph) => (
          <p
            key={paragraph}
            className="text-[length:var(--step-1)] leading-[1.6] text-[color:var(--fg-muted)]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-16 md:mt-20">
        <PrincipleList principles={principles} />
      </div>

      <div className="mt-16 md:mt-20">
        <ProblemSolvingLoop steps={problemSolvingLoop} philosophy={profile.philosophy} />
      </div>
    </Section>
  );
}
