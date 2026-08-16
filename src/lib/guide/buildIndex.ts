/**
 * Builds the guide's search index out of `src/content/**`.
 *
 * This runs at **build time only** — it is called from the statically
 * prerendered `/guide-index.json` route handler, never in the browser and
 * never during a request. Two consequences worth keeping true:
 *
 *  1. This module, and the ~240-entry index it produces, stay out of the
 *     client bundle: the browser fetches a JSON file, and only when the visitor
 *     first opens the guide. That is what keeps the feature off the critical
 *     path. (Note the narrow claim — a few individual content constants do
 *     reach the client, because `actions.ts` needs `profile.email` and the
 *     résumé lens ids, exactly as `SiteNav` already imports `navItems`. What
 *     never ships is the corpus.)
 *  2. It is free to be thorough. Cost here is paid once, by the build.
 *
 * Every `quote` is a verbatim content string (run through `stripNeedsInput`,
 * like all rendered prose). Nothing is summarised, joined into a new
 * sentence, or otherwise authored here.
 */

import {
  achievements,
  careerEntries,
  philosophyIntro,
  principles,
  problemSolvingLoop,
  profile,
  projects,
  resumeLenses,
  resumeSummary,
  skillCategories,
} from "@/content/portfolio";
import {
  experiments,
  labIntro,
  labPositioning,
  learningLog,
  workflowStages,
} from "@/content/ai-experiments";
import { isEntirelyNeedsInput, stripNeedsInput } from "@/lib/content";
import type { GuideEntry, GuideIndex } from "./types";

/**
 * Score multiplier for the entry that best *introduces* a subject — a
 * project's tagline, a job's context line, the résumé summary.
 *
 * Without it, every passage about one project matches a query like "scrapers"
 * identically on word overlap and the tiebreak falls to alphabetical order by
 * id, which puts "— a decision" and "— a path explored" above the tagline that
 * actually summarises the thing. 1.6 is enough to win a tie without letting a
 * weakly-matching summary outrank a strongly-matching detail.
 */
const PRIMARY = 1.6;

/* -------------------------------------------------------------------------- */
/* Section labels — the provenance line shown above each quote                */
/* -------------------------------------------------------------------------- */

const SECTION_LABEL = {
  about: "About",
  philosophy: "Philosophy",
  work: "Selected work",
  lab: "AI Workflow Lab",
  journey: "Career journey",
  resume: "Résumé",
  contact: "Contact",
} as const;

type SectionId = keyof typeof SECTION_LABEL;

/* -------------------------------------------------------------------------- */
/* Entry construction                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Accumulates entries while dropping anything that would render as an empty
 * quote. A field that is entirely a `[NEEDS INPUT: ...]` marker is unsupplied,
 * and an unsupplied field must not become a searchable result that quotes
 * nothing — so it is skipped rather than emitted blank.
 */
class EntryCollector {
  private readonly entries: GuideEntry[] = [];
  private readonly seenIds = new Set<string>();

  content(args: {
    id: string;
    sectionId: SectionId;
    title: string;
    quote: string | undefined;
    keywords?: readonly string[];
    weight?: number;
  }): void {
    if (args.quote === undefined) return;
    const quote = stripNeedsInput(args.quote);
    if (quote.length === 0) return;

    // A duplicate id would make React keys collide in the results list and
    // make the Tier 1 vector cache ambiguous. Surfacing it at build time is
    // far better than either.
    if (this.seenIds.has(args.id)) {
      throw new Error(`Duplicate guide entry id: ${args.id}`);
    }
    this.seenIds.add(args.id);

    this.entries.push({
      id: args.id,
      kind: "content",
      source: SECTION_LABEL[args.sectionId],
      title: stripNeedsInput(args.title),
      quote,
      keywords: (args.keywords ?? []).filter((keyword) => !isEntirelyNeedsInput(keyword)),
      // Omitted rather than written as 1, so the shipped JSON only carries the
      // field for the minority of entries that are actually promoted.
      ...(args.weight === undefined ? {} : { weight: args.weight }),
      action: { kind: "goto", sectionId: args.sectionId },
    });
  }

  /** Adds several quotes that share a title, suffixing ids by position. */
  contentList(args: {
    idPrefix: string;
    sectionId: SectionId;
    title: string;
    quotes: readonly (string | undefined)[];
    keywords?: readonly string[];
  }): void {
    args.quotes.forEach((quote, index) => {
      this.content({
        id: `${args.idPrefix}-${index}`,
        sectionId: args.sectionId,
        title: args.title,
        quote,
        keywords: args.keywords,
      });
    });
  }

  command(entry: GuideEntry): void {
    if (this.seenIds.has(entry.id)) {
      throw new Error(`Duplicate guide entry id: ${entry.id}`);
    }
    this.seenIds.add(entry.id);
    this.entries.push(entry);
  }

  all(): readonly GuideEntry[] {
    return this.entries;
  }
}

/* -------------------------------------------------------------------------- */
/* Content fingerprint                                                         */
/* -------------------------------------------------------------------------- */

/**
 * FNV-1a, 32-bit, hex. Not cryptographic and does not need to be — it is a
 * cache key for locally-computed embedding vectors, where the only failure
 * mode of a collision is searching slightly stale vectors on one visitor's
 * machine. Hand-rolled because it must produce an identical value in Node
 * (build) and the browser (cache lookup) with no dependency.
 */
function fingerprint(entries: readonly GuideEntry[]): string {
  let hash = 0x811c9dc5;
  for (const entry of entries) {
    for (const part of [entry.id, entry.title, entry.quote, entry.keywords.join(" ")]) {
      for (let index = 0; index < part.length; index += 1) {
        hash ^= part.charCodeAt(index);
        // `Math.imul` keeps the multiply in 32-bit space; a plain `*` would
        // silently drift into float territory and diverge across engines.
        hash = Math.imul(hash, 0x01000193);
      }
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* -------------------------------------------------------------------------- */
/* The build                                                                   */
/* -------------------------------------------------------------------------- */

export function buildGuideIndex(): GuideIndex {
  const collect = new EntryCollector();

  /* --- About ------------------------------------------------------------- */

  collect.content({
    id: "profile-positioning",
    sectionId: "about",
    title: profile.name,
    quote: profile.positioning,
    keywords: ["who", "summary", "intro", profile.title],
    weight: PRIMARY,
  });
  collect.content({
    id: "profile-focus",
    sectionId: "about",
    title: "What I focus on",
    quote: profile.focus,
    keywords: ["specialty", "strengths", "skills"],
  });
  collect.content({
    id: "profile-headline",
    sectionId: "about",
    title: "Headline",
    quote: profile.headline,
  });
  collect.content({
    id: "profile-intro",
    sectionId: "about",
    title: "Introduction",
    quote: profile.intro,
  });
  collect.contentList({
    idPrefix: "profile-about",
    sectionId: "about",
    title: "About",
    quotes: profile.about,
    keywords: ["background", "story", "history"],
  });

  /* --- Philosophy -------------------------------------------------------- */

  collect.content({
    id: "philosophy-belief",
    sectionId: "philosophy",
    title: "Core belief",
    quote: profile.philosophy,
    keywords: ["impossible", "unsolvable", "belief", "motto"],
  });
  collect.contentList({
    idPrefix: "philosophy-intro",
    sectionId: "philosophy",
    title: "On calling things impossible",
    quotes: philosophyIntro,
    keywords: ["impossible", "constraints", "assumptions"],
  });

  for (const principle of principles) {
    collect.content({
      id: `principle-${principle.id}-summary`,
      sectionId: "philosophy",
      title: principle.title,
      quote: principle.summary,
      keywords: ["principle", "how i work"],
      weight: PRIMARY,
    });
    collect.content({
      id: `principle-${principle.id}-detail`,
      sectionId: "philosophy",
      title: principle.title,
      quote: principle.detail,
      keywords: ["principle", "how i work"],
    });
    collect.content({
      id: `principle-${principle.id}-evidence`,
      sectionId: "philosophy",
      title: `${principle.title} — ${principle.evidence.context}`,
      quote: principle.evidence.body,
      keywords: ["evidence", "example", principle.evidence.context],
    });
  }

  collect.content({
    id: "philosophy-loop",
    sectionId: "philosophy",
    title: "The problem-solving loop",
    // The nine step labels, in order. This is the one place a quote is a join
    // of content strings rather than a single field — it is a list of labels
    // presented as a list, not prose assembled into a new claim.
    quote: problemSolvingLoop.map((step) => step.label).join(" · "),
    keywords: ["process", "method", "loop", "approach", "how i work"],
  });
  for (const step of problemSolvingLoop) {
    collect.content({
      id: `loop-${step.id}`,
      sectionId: "philosophy",
      title: `Loop — ${step.label}`,
      quote: step.detail,
      keywords: ["process", "method", "loop"],
    });
  }

  /* --- Selected work ----------------------------------------------------- */

  for (const project of projects) {
    const keywords = [...project.technologies, "project", "case study", "work"];

    collect.content({
      id: `project-${project.id}-tagline`,
      sectionId: "work",
      title: project.title,
      quote: project.tagline,
      keywords,
      weight: PRIMARY,
    });
    collect.content({
      id: `project-${project.id}-problem`,
      sectionId: "work",
      title: `${project.title} — the problem`,
      quote: project.problem,
      keywords,
    });
    collect.content({
      id: `project-${project.id}-mattered`,
      sectionId: "work",
      title: `${project.title} — why it mattered`,
      quote: project.whyItMattered,
      keywords,
    });
    collect.content({
      id: `project-${project.id}-assumption`,
      sectionId: "work",
      title: `${project.title} — the assumption challenged`,
      quote: project.assumption,
      keywords,
    });
    collect.content({
      id: `project-${project.id}-failed`,
      sectionId: "work",
      title: `${project.title} — what failed`,
      quote: project.whatFailed,
      keywords: [...keywords, "failure", "mistake", "went wrong"],
    });
    collect.content({
      id: `project-${project.id}-failure-lesson`,
      sectionId: "work",
      title: `${project.title} — what the failure taught`,
      quote: project.failureLesson,
      keywords: [...keywords, "failure", "lesson"],
    });
    collect.content({
      id: `project-${project.id}-learned`,
      sectionId: "work",
      title: `${project.title} — what I learned`,
      quote: project.learned,
      keywords: [...keywords, "lesson", "takeaway"],
    });
    collect.content({
      id: `project-${project.id}-next`,
      sectionId: "work",
      title: `${project.title} — the open question`,
      quote: project.nextQuestion,
      keywords: [...keywords, "open question", "next"],
    });
    collect.contentList({
      idPrefix: `project-${project.id}-decision`,
      sectionId: "work",
      title: `${project.title} — a decision`,
      quotes: project.decisions,
      keywords: [...keywords, "decision", "tradeoff"],
    });
    collect.contentList({
      idPrefix: `project-${project.id}-explored`,
      sectionId: "work",
      title: `${project.title} — a path explored`,
      quotes: project.pathsExplored,
      keywords: [...keywords, "alternative", "path", "tried"],
    });
    collect.contentList({
      idPrefix: `project-${project.id}-proof`,
      sectionId: "work",
      title: `${project.title} — result`,
      quotes: project.proof,
      keywords: [...keywords, "result", "impact", "outcome", "metric"],
    });
  }

  /* --- Career journey ---------------------------------------------------- */

  for (const entry of careerEntries) {
    const keywords = [
      ...entry.technologies,
      entry.organization,
      entry.role,
      entry.dateRange,
      "job",
      "role",
      "experience",
    ];

    collect.content({
      id: `career-${entry.id}-context`,
      sectionId: "journey",
      title: `${entry.role} — ${entry.organization}`,
      quote: entry.context,
      keywords,
      weight: PRIMARY,
    });
    collect.content({
      id: `career-${entry.id}-learned`,
      sectionId: "journey",
      title: `${entry.organization} — what I learned`,
      quote: entry.learned,
      keywords: [...keywords, "lesson"],
    });
    collect.contentList({
      idPrefix: `career-${entry.id}-impact`,
      sectionId: "journey",
      title: `${entry.organization} — impact`,
      quotes: entry.impact,
      keywords: [...keywords, "impact", "result", "metric", "achievement"],
    });
    collect.contentList({
      idPrefix: `career-${entry.id}-built`,
      sectionId: "journey",
      title: `${entry.organization} — built`,
      quotes: entry.built,
      keywords: [...keywords, "built", "shipped"],
    });
  }

  /* --- Résumé ------------------------------------------------------------ */

  collect.content({
    id: "resume-summary",
    sectionId: "resume",
    title: "Résumé summary",
    quote: resumeSummary,
    keywords: ["cv", "resume", "summary", "overview"],
    weight: PRIMARY,
  });
  // The lenses are commands, not prose: the useful response to "show me the
  // automation work" is to *apply* the filter, not to quote its description at
  // someone. The description still travels along as the command's `quote`, so
  // nothing is lost from the searchable surface.
  for (const lens of resumeLenses) {
    collect.command({
      id: `command-resume-lens-${lens.id}`,
      kind: "command",
      source: "Résumé",
      title: `Filter the résumé — ${lens.label}`,
      quote: lens.description,
      keywords: ["cv", "resume", "filter", "lens", "show", "only", lens.label],
      action: { kind: "resume-lens", lensId: lens.id },
    });
  }
  for (const category of skillCategories) {
    collect.content({
      id: `skills-${category.id}`,
      sectionId: "resume",
      title: `Skills — ${category.label}`,
      quote: category.evidence,
      keywords: [...category.skills, "skills", "technologies", "stack", "experience with"],
    });
  }
  for (const achievement of achievements) {
    collect.content({
      id: `achievement-${achievement.id}`,
      sectionId: "resume",
      title: achievement.title,
      quote: `${achievement.context}${achievement.date ? ` — ${achievement.date}` : ""}`,
      keywords: ["award", "achievement", "honour", "honor", "prize"],
    });
  }

  /* --- AI Workflow Lab --------------------------------------------------- */

  collect.content({
    id: "lab-positioning",
    sectionId: "lab",
    title: "AI Workflow Lab",
    quote: labPositioning,
    keywords: ["ai", "agents", "claude", "codex", "cursor", "llm"],
    weight: PRIMARY,
  });
  collect.contentList({
    idPrefix: "lab-intro",
    sectionId: "lab",
    title: "About the lab",
    quotes: labIntro,
    keywords: ["ai", "agents", "static", "live"],
  });

  for (const stage of workflowStages) {
    collect.content({
      id: `stage-${stage.id}-question`,
      sectionId: "lab",
      title: `Workflow stage — ${stage.label}`,
      quote: stage.question,
      keywords: ["ai", "agent", "workflow", "stage"],
    });
    collect.content({
      id: `stage-${stage.id}-watch`,
      sectionId: "lab",
      title: `${stage.label} — what to watch for`,
      quote: stage.watchFor,
      keywords: ["ai", "agent", "risk", "failure mode", "watch for"],
    });
  }

  for (const experiment of experiments) {
    const keywords = ["ai", "experiment", "agent", ...experiment.toolIds];

    collect.content({
      id: `experiment-${experiment.id}-question`,
      sectionId: "lab",
      title: experiment.title,
      quote: experiment.question,
      keywords,
      weight: PRIMARY,
    });
    collect.content({
      id: `experiment-${experiment.id}-hypothesis`,
      sectionId: "lab",
      title: `${experiment.title} — hypothesis`,
      quote: experiment.hypothesis,
      keywords,
    });
    collect.content({
      id: `experiment-${experiment.id}-outcome`,
      sectionId: "lab",
      title: `${experiment.title} — outcome`,
      quote: experiment.outcome,
      keywords: [...keywords, "outcome", "result"],
    });
    collect.content({
      id: `experiment-${experiment.id}-limitation`,
      sectionId: "lab",
      title: `${experiment.title} — limitation`,
      quote: experiment.limitation,
      keywords: [...keywords, "limitation", "caveat"],
    });
    collect.content({
      id: `experiment-${experiment.id}-lesson`,
      sectionId: "lab",
      title: `${experiment.title} — lesson`,
      quote: experiment.lesson,
      keywords: [...keywords, "lesson"],
    });
    collect.content({
      id: `experiment-${experiment.id}-next`,
      sectionId: "lab",
      title: `${experiment.title} — next experiment`,
      quote: experiment.nextExperiment,
      keywords: [...keywords, "next"],
    });
  }

  collect.contentList({
    idPrefix: "log-exploring",
    sectionId: "lab",
    title: "Exploring now",
    quotes: learningLog.exploringNow,
    keywords: ["current", "exploring", "learning", "now"],
  });
  collect.contentList({
    idPrefix: "log-next",
    sectionId: "lab",
    title: "Want to test next",
    quotes: learningLog.wantToTestNext,
    keywords: ["next", "todo", "plan"],
  });
  learningLog.changedMyThinking.forEach((change, index) => {
    collect.content({
      id: `log-changed-${index}-before`,
      sectionId: "lab",
      title: "Changed my thinking — before",
      quote: change.before,
      keywords: ["changed my mind", "was wrong", "before"],
    });
    collect.content({
      id: `log-changed-${index}-after`,
      sectionId: "lab",
      title: "Changed my thinking — after",
      quote: change.after,
      keywords: ["changed my mind", "now think", "after"],
    });
  });
  for (const logEntry of learningLog.entries) {
    collect.content({
      id: `log-entry-${logEntry.id}`,
      sectionId: "lab",
      title: logEntry.title,
      quote: logEntry.body,
      keywords: [...logEntry.tags, "log", "note", logEntry.date],
    });
  }

  /* --- Commands (the toolkit) ------------------------------------------- */

  // Every command below drives a control that already exists in the UI. The
  // guide does not gain an ability by listing it here; it gains a name.
  for (const [sectionId, label] of Object.entries(SECTION_LABEL)) {
    collect.command({
      id: `command-goto-${sectionId}`,
      kind: "command",
      source: "Navigate",
      title: `Go to ${label}`,
      quote: `Scrolls to the ${label} section and moves keyboard focus there.`,
      keywords: ["go", "goto", "jump", "navigate", "show", "take me", "open", label],
      action: { kind: "goto", sectionId },
    });
  }

  collect.command({
    id: "command-copy-email",
    kind: "command",
    source: "Contact",
    title: "Copy email address",
    quote: `Copies ${profile.email} to your clipboard.`,
    keywords: ["copy", "email", "address", "contact", "reach", "get in touch", profile.email],
    action: { kind: "copy-email" },
  });

  collect.command({
    id: "command-print-resume",
    kind: "command",
    source: "Résumé",
    title: "Print the résumé",
    quote: "Opens your browser's print dialog with only the résumé on the page.",
    keywords: ["print", "resume", "cv", "paper", "pdf"],
    action: { kind: "print-resume" },
  });

  collect.command({
    id: "command-download-resume",
    kind: "command",
    source: "Résumé",
    title: "Download the résumé PDF",
    quote: `Opens ${profile.resumePdfLabel} in a new tab.`,
    keywords: ["download", "pdf", "resume", "cv", "save"],
    action: { kind: "download-resume" },
  });

  const entries = collect.all();
  return { revision: fingerprint(entries), entries };
}
