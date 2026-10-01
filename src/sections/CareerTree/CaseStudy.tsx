/**
 * One project row: a masthead (index numeral, where and when, title,
 * tagline), the measured proof, the metadata, and the full Problem ->
 * Constraint -> Decision -> Build -> Proof -> Lesson deep dive inside a
 * shared Disclosure.
 *
 * The row opens like a chapter rather than a card. The numeral is set at
 * display size against the rule that separates this row from the one above,
 * and organisation and dates rise to sit on its baseline — provenance is the
 * first thing a reader wants and it used to be printed under the title. What
 * follows is ordered by what answers "did this work?" soonest: figures,
 * then the technologies, then the actions, then the deep dive.
 *
 * The numeral no longer occupies a 2/12 gutter. That column is what pays for
 * the case-study index beside the list (see SelectedWork.tsx), and a numeral
 * locked into the masthead has more presence than one parked in a margin.
 *
 * `id` + `tabindex="-1"` are the jump-target contract with that index: it
 * scrolls here and moves focus here. `scroll-mt-*` is what keeps the landing
 * clear of the sticky header and, below 1024px, of the docked index row.
 *
 * Every fact is read from the `Project` object or, for organisation and
 * dates, looked up once via `careerEntryById` — never restated as a literal
 * so the résumé, timeline and this case study cannot drift apart. Optional
 * fields that are genuinely absent on a given project render nothing: no
 * empty heading, no placeholder.
 *
 * Colour comes exclusively from the semantic aliases (--fg / --fg-muted /
 * --fg-subtle / --rule-color) defined in globals.css, matching every shared
 * primitive — never the raw --color-* tokens.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { careerEntryById } from "@/content/portfolio";
import { resolved, type Project } from "@/types/portfolio";
import { Disclosure } from "@/components/ui/Disclosure";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { caseStudyAnchorId, caseStudyNumeral } from "./anchors";
import WorkflowDiagram from "./WorkflowDiagram";
import MetricHighlights from "./MetricHighlights";
import MetricTable from "./MetricTable";

const PROSE_CLASS = "text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]";

/*
 * The six-part arc — Problem, Constraint, Decision, Build, Proof, Lesson —
 * repeated once per case study, so thirty of these render on the page. Set in
 * bold uppercase mono at step-1 they were thirty shouts; in the display serif
 * they read as what they are, headings, and they give the type system a
 * mid-range voice it was missing between the section headline and body copy.
 */
const H4_CLASS =
  "font-display text-[length:var(--step-1)] leading-snug text-[color:var(--fg)]";

/** The site's recurring mono/uppercase micro-label treatment — same class
 * `<Section>`'s own eyebrow uses, reused here for sub-labels within a case
 * study so the typographic motif stays consistent at every depth. */
const MICRO_LABEL_CLASS = "eyebrow";

/** Text link for a demo or a repository. `--fg` at rest with `.ink-link`'s
 *  quiet rest underline (Workstream 3, P3 — replacing a flat `underline
 *  hover:no-underline` with the shared fade-on-hover vocabulary every other
 *  standalone link on the site now uses), matching how every other section
 *  sets an inline link (see ExperimentEntry, TimelineEntry); `min-h-11` buys
 *  the tap target without touching the type size. These used to render with
 *  no class at all, which left them in the browser's default link colour —
 *  the one colour on the page belonging to no palette. */
const TEXT_LINK_CLASS =
  "ink-link-quiet wrap-anywhere inline-flex min-h-11 items-center text-[length:var(--step--1)] text-[color:var(--fg)]";

const BULLET_ITEM_CLASS =
  "wrap-anywhere relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[color:var(--fg-subtle)] before:content-['']";

/* -------------------------------------------------------------------------- */
/* Small local helpers — deep-dive presentation only, not shared elsewhere    */
/* -------------------------------------------------------------------------- */

interface ProseListProps {
  readonly items: readonly string[];
  readonly ariaLabel: string;
}

/** A bullet list with a hand-drawn CSS marker (Tailwind's preflight strips
 * native list markers), with `role="list"` restoring list semantics for the
 * browser/AT combinations that drop the implicit role once markers are gone. */
function ProseList({ items, ariaLabel }: ProseListProps) {
  if (items.length === 0) return null;
  return (
    <ul role="list" aria-label={ariaLabel} className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className={cn(BULLET_ITEM_CLASS, PROSE_CLASS)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

interface LeadInProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** A single sentence introduced by a small mono label, e.g. "What people
 * assumed" or "The next question I'd explore" — prose, not a new heading. */
function LeadIn({ label, children }: LeadInProps) {
  return (
    <p className={PROSE_CLASS}>
      <span className={cn(MICRO_LABEL_CLASS, "mr-2")}>{label}</span>
      {children}
    </p>
  );
}

interface SectionBlockProps {
  readonly heading: string;
  readonly children: ReactNode;
}

/** One of the six Problem/Constraint/.../Lesson parts of the deep dive. */
function SectionBlock({ heading, children }: SectionBlockProps) {
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <h4 className={H4_CLASS}>{heading}</h4>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

interface FailureAsideProps {
  readonly whatFailed: string;
  readonly failureLesson: string;
}

/** Set-apart bordered aside — only rendered when a project actually has a
 * recorded failure. Most don't, and render nothing here. */
function FailureAside({ whatFailed, failureLesson }: FailureAsideProps) {
  return (
    <aside className="border border-[color:var(--rule-color)] p-5">
      <h5 className={MICRO_LABEL_CLASS}>What failed, and what it taught me</h5>
      <p className={cn(PROSE_CLASS, "mt-3")}>{whatFailed}</p>
      <p className={cn(PROSE_CLASS, "mt-3")}>{failureLesson}</p>
    </aside>
  );
}

/** Quiet, professional stand-in for a deep dive that isn't fully written up
 * yet. Never a TODO — always the author's own words. */
function InProgressNote({ note }: { readonly note: string }) {
  return (
    <div className="mt-6 border border-[color:var(--rule-color)] p-4">
      <p className={MICRO_LABEL_CLASS}>Case study in progress</p>
      <p className={cn(PROSE_CLASS, "mt-2")}>{note}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Case study                                                                  */
/* -------------------------------------------------------------------------- */

interface CaseStudyProps {
  readonly project: Project;
  readonly index: number;
  /**
   * Suffix for every id this component writes, for the one case where the same
   * case study is rendered twice. The Journey draws its branches two ways — a
   * drawing at >=1024px and a list below it, exactly one of them displayed —
   * and a case study lives inside a branch in each, so without a scope every
   * `id`, `aria-controls` and `aria-labelledby` here would exist twice in the
   * document and point at whichever copy came first. Omitted for the copy that
   * owns the `work-<id>` anchor.
   */
  readonly idScope?: string;
}

export default function CaseStudy({ project, index, idScope }: CaseStudyProps) {
  const entry = careerEntryById(project.careerEntryId);
  const assumption = resolved(project.assumption);
  const scope = idScope ? `-${idScope}` : "";

  const titleId = `${project.id}-title${scope}`;
  const techLabelId = `${project.id}-tech-label${scope}`;
  const proofLabelId = `${project.id}-proof-label${scope}`;
  const metricsLabelId = `${project.id}-metrics-label${scope}`;

  // Disclosure's trigger keeps `summary` visible at all times (state is
  // conveyed by an icon + hidden text, not by the visible label changing) —
  // so the project title lives in `summary` itself, guaranteeing every one
  // of the six triggers has a distinguishable accessible name regardless of
  // open/closed state. `expandLabel`/`collapseLabel` still carry the
  // "read/collapse" verb pair SECTIONS.md asks for, appended to the
  // accessible name only, matching Disclosure's own documented contract.
  //
  // The visible label is set in the display serif at the same step as the
  // deep dive's own headings, so the trigger reads as the entrance to a
  // chapter rather than as one more line of body copy. The wording is a
  // contract: four e2e specs find this trigger by an accessible name
  // starting "Read the full case study" — restyle it freely, do not rename it.
  const disclosureSummary = (
    <span className="font-display text-[length:var(--step-1)] leading-snug text-[color:var(--fg)]">
      Read the full case study
      {/* Explicit text-node space — a space inside VisuallyHidden is trimmed
          out of the computed name, which announced this as "case study—
          Title". Disclosure and ExternalLink both document the same trap. */}
      {" "}
      <VisuallyHidden>— {project.title}</VisuallyHidden>
    </span>
  );

  return (
    <article
      id={`${caseStudyAnchorId(project.id)}${scope}`}
      // Focus target for the case-study index, which moves focus here after
      // scrolling. Programmatic only — negative tabindex keeps the article
      // itself out of the tab order.
      tabIndex={-1}
      aria-labelledby={titleId}
      // Landing offset for that jump: 4rem of sticky header plus, below
      // 1024px, the docked index row (~3.5rem) and a little air. Written as
      // scale steps rather than calc() for the same reason `Section` writes
      // `scroll-mt-20` — one class, no arbitrary-value arithmetic.
      className="relative scroll-mt-36 border-t border-[color:var(--rule-color)] py-14 first:border-t-0 first:pt-0 md:py-20 lg:scroll-mt-24"
    >
      {/* Chapter tick (Workstream 3, P5): a short registration mark crossing
          this article's own top rule. `index > 0` only — the first article
          opts out of the top rule entirely (`first:border-t-0` above), so a
          tick with no line to cross would float. */}
      {index > 0 ? <span aria-hidden="true" className="chapter-tick" /> : null}

      <header>
        {/*
          The chapter opener. The numeral is structural, not informative —
          the index announces position, and the <article> is named by its
          <h3> — so it is hidden from assistive technology and free to be
          large. Baseline-aligned with the provenance line, which is why they
          share a row rather than being stacked.
        */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p
            aria-hidden="true"
            className="font-mono text-[length:var(--step-4)] leading-[0.85] tracking-(--tracking-display-lg) text-[color:var(--fg-subtle)]"
          >
            {caseStudyNumeral(index)}
          </p>
          {entry ? (
            <p className="wrap-anywhere eyebrow">
              {entry.organization} · {entry.dateRange}
            </p>
          ) : null}
        </div>

        <h3
          id={titleId}
          className="mt-4 text-balance font-display text-[length:var(--step-3)] font-normal leading-[1.05] tracking-(--tracking-display) text-[color:var(--fg)]"
        >
          {project.title}
        </h3>

        <p className="prose-measure mt-4 text-[length:var(--step-1)] leading-[1.6] text-[color:var(--fg)]">
          {project.tagline}
        </p>
      </header>

      {/*
        Figures, not prose bullets — and they come before the metadata now.

        This slot used to hold the first three `proof` sentences. Someone
        scanning the section is deciding whether to open the case study, and
        that decision is answered by a number far faster than by a sentence —
        so the measured results come up out of the disclosure and the prose
        stays inside it, where a reader who has already decided to read will
        find every proof line in full. Sitting them directly under the tagline
        puts the section's evidence where the eye already is, ahead of the
        technology list, which is metadata rather than proof.

        Projects without metrics keep the prose: for those, the sentences are
        the only evidence there is, and showing nothing would be worse.
      */}
      {project.metrics && project.metrics.length > 0 ? (
        <MetricHighlights
          metrics={project.metrics}
          labelId={metricsLabelId}
          projectTitle={project.title}
        />
      ) : project.proof.length > 0 ? (
        <div className="mt-8">
          <p id={proofLabelId} className={MICRO_LABEL_CLASS}>
            Proof
          </p>
          <ul role="list" aria-labelledby={proofLabelId} className="mt-3 space-y-2.5">
            {project.proof.slice(0, 3).map((item) => (
              <li
                key={item}
                className={cn(
                  BULLET_ITEM_CLASS,
                  "text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg)]",
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.technologies.length > 0 ? (
        <div className="mt-8">
          <p id={techLabelId} className={MICRO_LABEL_CLASS}>
            Technologies
          </p>
          <ul role="list" aria-labelledby={techLabelId} className="token-run mt-3">
            {project.technologies.map((tech) => (
              <li key={tech}>
                <span className="wrap-anywhere">{tech}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1">
        {project.demo ? (
          <ExternalLink href={project.demo.href} className={TEXT_LINK_CLASS}>
            {project.demo.label}
          </ExternalLink>
        ) : null}
        {project.source ? (
          <ExternalLink href={project.source.href} className={TEXT_LINK_CLASS}>
            {project.source.label}
          </ExternalLink>
        ) : null}
        {/*
         * Deliberately a plain <a>, not the shared Button primitive.
         * Contact listens for `document.querySelectorAll("a[data-project-title]")`
         * clicks — Button's typed prop union has no room for an arbitrary
         * data-* attribute, and this specific link is a cross-agent
         * contract that must not depend on how a component I don't own
         * forwards props. Styled to match Button's secondary/sm recipe by
         * hand so it's visually indistinguishable from a real one.
         */}
        <a
          href="#contact"
          data-project-title={project.title}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[color:var(--rule-color)] bg-transparent px-4 py-2 font-sans text-[length:var(--step--1)] font-medium text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)]"
        >
          Discuss this project
          {" "}
          <VisuallyHidden>— {project.title}</VisuallyHidden>
        </a>
      </div>

      {/*
        The deep dive reads as a panel you open, not as a line you click: the
        trigger and everything it reveals share one bordered box, and the box
        answers the pointer. The `:has()` selector is scoped to the direct
        child button so a control *inside* an expanded case study never lights
        up the frame around it.
      */}
      <div className="mt-8">
        <Disclosure
          id={`case-study-${project.id}${scope}`}
          summary={disclosureSummary}
          expandLabel="Expand"
          collapseLabel="Collapse"
          defaultOpen={false}
          className="border border-[color:var(--rule-color)] px-4 pb-2 transition-colors duration-200 [&:has(>button:hover)]:border-[color:var(--fg)] md:px-6"
        >
          <div className="divide-y divide-[color:var(--rule-color)]">
            <SectionBlock heading="Problem">
              <p className={PROSE_CLASS}>{project.problem}</p>
              <p className={PROSE_CLASS}>{project.whyItMattered}</p>
              {assumption ? <LeadIn label="What people assumed">{assumption}</LeadIn> : null}
            </SectionBlock>

            <SectionBlock heading="Constraint">
              <ProseList items={project.constraints} ariaLabel="Constraints" />
              <LeadIn label="My responsibility">{project.responsibility}</LeadIn>
            </SectionBlock>

            <SectionBlock heading="Decision">
              <ProseList items={project.decisions} ariaLabel="Decisions" />
              {project.pathsExplored.length > 0 ? (
                <div>
                  <p className={MICRO_LABEL_CLASS}>Paths explored</p>
                  <div className="mt-2.5">
                    <ProseList items={project.pathsExplored} ariaLabel="Paths explored" />
                  </div>
                </div>
              ) : null}
              {project.whatFailed && project.failureLesson ? (
                <FailureAside whatFailed={project.whatFailed} failureLesson={project.failureLesson} />
              ) : null}
            </SectionBlock>

            <SectionBlock heading="Build">
              <ProseList items={project.built} ariaLabel="What I built" />
              {project.workflow ? <WorkflowDiagram diagram={project.workflow} /> : null}
            </SectionBlock>

            <SectionBlock heading="Proof">
              <ProseList items={project.proof} ariaLabel="Proof" />
              {project.metrics && project.metrics.length > 0 ? (
                <MetricTable metrics={project.metrics} caption={`Metrics — ${project.title}`} />
              ) : null}
            </SectionBlock>

            <SectionBlock heading="Lesson">
              <p className={PROSE_CLASS}>{project.learned}</p>
              <LeadIn label="The next question I'd explore">{project.nextQuestion}</LeadIn>
            </SectionBlock>
          </div>

          {project.inProgressNote ? <InProgressNote note={project.inProgressNote} /> : null}
        </Disclosure>
      </div>
    </article>
  );
}
