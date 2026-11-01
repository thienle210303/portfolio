import { ExternalLink } from "@/components/ui/ExternalLink";
import { projects, record } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { entryBlurb, entryHighlight, entryTitle, KIND_WORD, recordYearId } from "@/lib/record";
import type { CareerEntry } from "@/types/portfolio";
import { caseStudyAnchorId, journeyEntryAnchorId, RECORD_WORK_ENTRY_ID } from "@/sections/CareerTree/anchors";
import ProjectRecording from "@/sections/CareerTree/ProjectRecording";
import DiaryFigure from "./DiaryFigure";
import { ImageDialog } from "./ImageDialog";
import { KindDot } from "./KindDot";

/**
 * A real element, with no height, that a fragment can land on, so a bookmark
 * to a retired id (or a ring on the tree slice) arrives with JavaScript off.
 * It sits at the top of its page and is as wide as the page: the browser
 * brings a fragment's target into view by its edges, so a zero-width anchor
 * on a page's left edge would leave the previous page showing.
 */
export function Anchor({ id }: { readonly id: string }) {
  return <span id={id} aria-hidden="true" className="diary-anchor pointer-events-none absolute top-0 left-0 block h-0 w-full scroll-mt-20" />;
}

/** The fun fact: a sticky note, taped on, in the hero's handwriting voice. */
export function FunFact({ children, className }: { readonly children: string; readonly className?: string }) {
  return (
    <aside
      aria-label={record.funFactLabel}
      className={cn("diary-note relative mt-2 max-w-[24rem] bg-surface px-4 pt-5 pb-4 paper-lift rotate-[-1.2deg]", className)}
    >
      <span aria-hidden="true" className="record-tape top-[-0.55rem] left-1/2 w-16 -translate-x-1/2 rotate-[2deg]" />
      <p className="font-mono text-[length:var(--step--2)] tracking-(--tracking-caps) text-fg-muted uppercase">{record.funFactLabel}</p>
      <p className="mt-1 font-serif text-[length:var(--step-0)] leading-snug text-fg italic">{children}</p>
    </aside>
  );
}

/** Link, award and recording: the entry's things to open, one wrapping row. */
export function EntryThings({ entry }: { readonly entry: CareerEntry }) {
  const title = entryTitle(entry);
  return (
    <>
      {entry.link || entry.award ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {entry.link ? (
            <ExternalLink
              href={entry.link.href}
              className="inline-flex min-h-11 items-center font-mono text-[length:var(--step--1)] text-accent underline underline-offset-4 hover:no-underline wrap-anywhere"
            >
              {entry.link.label}
            </ExternalLink>
          ) : null}
          {entry.award ? (
            <ImageDialog
              id={`award-${entry.id}`}
              title={title}
              meta={`${entry.organization} · ${entry.dateRange}`}
              image={entry.award}
              className="inline-flex min-h-11 items-center gap-2 border border-rule px-4 text-[length:var(--step--1)] text-fg hover:border-[color:var(--accent)] hover:text-accent"
            >
              See the award
            </ImageDialog>
          ) : null}
        </div>
      ) : null}
      {entry.recording && entry.recordingDescription ? (
        <div className="no-print">
          <ProjectRecording
            title={entry.role}
            recording={entry.recording}
            description={entry.recordingDescription}
            descriptionId={`${entry.id}-recording`}
          />
        </div>
      ) : null}
    </>
  );
}

function Eyebrow({ entry }: { readonly entry: CareerEntry }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[length:var(--step--1)] text-fg-muted">
      <KindDot kind={entry.type} />
      <span>
        {KIND_WORD[entry.type]} · {entry.dateRange}
      </span>
    </p>
  );
}

/** The zero-size anchors an entry answers besides its own fragment: its case
 *  studies' retired `work-<projectId>` ids, and `#work` on DoorDash. */
function LegacyAnchors({ entry }: { readonly entry: CareerEntry }) {
  return (
    <>
      {entry.id === RECORD_WORK_ENTRY_ID ? <Anchor id="work" /> : null}
      {projects
        .filter((p) => p.careerEntryId === entry.id)
        .map((p) => (
          <Anchor key={p.id} id={caseStudyAnchorId(p.id)} />
        ))}
    </>
  );
}

/** The years a chapter's first page answers for (`#record-2019` …). */
export function ChapterAnchors({ years }: { readonly years: readonly number[] }) {
  return (
    <>
      {years.map((year) => (
        <Anchor key={year} id={recordYearId(year)} />
      ))}
    </>
  );
}

/**
 * An entry with a page to itself: kind and dates, role and organisation, a
 * sentence or two, the one figure that stands for it, a few short bullets, a
 * small chart of the work, and a fun fact on a sticky note. No case study:
 * the owner found them boring (2026-11-01).
 *
 * The page is the entry's `journey-entry-<id>` fragment.
 */
export default function EntryPage({
  entry,
  years,
}: {
  readonly entry: CareerEntry;
  /** Set when this is a chapter's first page. */
  readonly years?: readonly number[];
}) {
  const id = journeyEntryAnchorId(entry.id);
  const highlight = entryHighlight(entry);
  const diary = entry.diary;
  return (
    <article
      id={id}
      data-tree-branch={entry.id}
      data-kind={entry.type}
      aria-labelledby={`${id}-title`}
      className="diary-page @container relative flex min-h-full scroll-mt-20 flex-col gap-5 bg-surface px-5 pt-9 pb-16 sm:px-10 sm:pt-10"
    >
      {years ? <ChapterAnchors years={years} /> : null}
      <LegacyAnchors entry={entry} />
      <header>
        <Eyebrow entry={entry} />
        <h3 id={`${id}-title`} className="mt-2 font-display text-[length:var(--step-3)] leading-[1.08] font-semibold tracking-(--tracking-display) text-fg">
          {entryTitle(entry)}
        </h3>
        <p className="mt-1 text-[length:var(--step-0)] text-fg-muted">{entry.organization}</p>
      </header>
      <p className="max-w-[34rem] text-[length:var(--step-0)] leading-relaxed text-fg">{entryBlurb(entry)}</p>
      {highlight ? (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-[length:var(--step-4)] leading-none font-semibold tracking-(--tracking-display-lg) text-accent">
            {highlight.value}
          </span>
          <span className="font-mono text-[length:var(--step--1)] leading-snug text-fg-muted">
            {highlight.measure ? <span className="block">{highlight.measure}</span> : null}
            {highlight.label}
          </span>
        </p>
      ) : null}
      <div className="grid gap-6 @min-[34rem]:grid-cols-[minmax(0,1fr)_14.5rem] @min-[34rem]:items-start">
        {diary?.bullets ? (
          <ul role="list" className="list-disc space-y-2 pl-5 text-[length:var(--step-0)] leading-snug text-fg marker:text-fg-muted">
            {diary.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        {diary?.figure ? <DiaryFigure figure={diary.figure} /> : null}
      </div>
      <EntryThings entry={entry} />
      {diary?.funFact ? <FunFact className="mt-auto self-end">{diary.funFact}</FunFact> : null}
    </article>
  );
}

/**
 * A block on a shared page: an entry with little to say. Title, kind and
 * dates, its sentence or two and, if it has one, a fun fact. The block is the
 * entry's `journey-entry-<id>` fragment.
 */
export function EntryBlock({ entry }: { readonly entry: CareerEntry }) {
  const id = journeyEntryAnchorId(entry.id);
  const lines = entry.diary?.blurb ? [entry.diary.blurb] : [entry.context, ...entry.built.slice(0, 1)];
  return (
    <section
      id={id}
      data-tree-branch={entry.id}
      data-kind={entry.type}
      aria-labelledby={`${id}-title`}
      className="diary-entry relative scroll-mt-20"
    >
      <LegacyAnchors entry={entry} />
      <Eyebrow entry={entry} />
      <h4 id={`${id}-title`} className="mt-1.5 font-display text-[length:var(--step-1)] leading-tight font-semibold text-fg">
        {entryTitle(entry)}
      </h4>
      <p className="text-[length:var(--step--1)] text-fg-muted">{entry.organization}</p>
      <p className="mt-2 max-w-[34rem] text-[length:var(--step-0)] leading-relaxed text-fg">{lines.join(" ")}</p>
      <EntryThings entry={entry} />
      {entry.diary?.funFact ? <FunFact className="mt-3 max-w-[22rem]">{entry.diary.funFact}</FunFact> : null}
    </section>
  );
}

/** A page of entries with little to say, up to three. */
export function SharedPage({
  pageId,
  entries,
  years,
  label,
}: {
  readonly pageId: string;
  readonly entries: readonly CareerEntry[];
  readonly years?: readonly number[];
  /** The page's heading, for the screen-reader name. */
  readonly label: string;
}) {
  return (
    <article
      id={pageId}
      aria-labelledby={`${pageId}-title`}
      className="diary-page @container relative flex min-h-full scroll-mt-20 flex-col gap-6 bg-surface px-5 pt-9 pb-16 sm:px-10 sm:pt-10"
    >
      {years ? <ChapterAnchors years={years} /> : null}
      <h3 id={`${pageId}-title`} className="sr-only">
        {label}
      </h3>
      {entries.map((entry) => (
        <EntryBlock key={entry.id} entry={entry} />
      ))}
    </article>
  );
}
