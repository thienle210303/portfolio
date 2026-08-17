import {
  careerIndexable,
  education,
  experimentsIndexable,
  profile,
  projectsIndexable,
} from "@/lib/answer-sources";

/**
 * A grounded question-answering index over the site's own content.
 *
 * The defining property, and the reason it works this way rather than as a
 * language model: **it cannot fabricate.** Every answer it returns is a
 * verbatim string from `src/content`, carried with the source that string
 * already had and a link to the section it lives in. There is no generation
 * step, so there is nothing to hallucinate with. When nothing matches well
 * enough, it says so rather than reaching.
 *
 * That is not a consolation prize for a model. On a site whose whole claim is
 * that every figure names its origin, an extractive answer with a citation is
 * strictly more useful than a fluent paraphrase that might be wrong — and it
 * is instant, works offline, costs no download, and runs on any device.
 *
 * Ranking is deliberately simple: IDF-weighted term overlap with a small bonus
 * for matches in an entry's own label. It is a few hundred short documents, so
 * anything cleverer would be unmeasurable and harder to reason about.
 */

export interface Answer {
  /** Verbatim from the content layer. Never rewritten, never summarised. */
  readonly text: string;
  /** Where the claim came from — an employer, a résumé line, a benchmark. */
  readonly source: string;
  /** Section anchor, so the reader can go and see it in context. */
  readonly sectionId: string;
  /** Human label for the section, for the "read it in context" link. */
  readonly sectionLabel: string;
  readonly score: number;
}

interface Document {
  readonly text: string;
  readonly source: string;
  readonly sectionId: string;
  readonly sectionLabel: string;
  /** Extra terms — a title, an employer — that should match without being
   *  part of the quoted answer itself. */
  readonly label: string;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "do", "does", "for", "from",
  "has", "have", "he", "how", "i", "in", "is", "it", "its", "of", "on", "or", "that", "the",
  "their", "there", "they", "this", "to", "was", "were", "what", "when", "where", "which",
  "who", "why", "will", "with", "you", "your", "me", "my", "his",
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%+.-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/* -------------------------------------------------------------------------- */
/* The index                                                                   */
/* -------------------------------------------------------------------------- */

function buildDocuments(): Document[] {
  const docs: Document[] = [];

  for (const paragraph of profile.about) {
    docs.push({
      text: paragraph,
      source: "About, in his own words",
      sectionId: "about",
      sectionLabel: "About",
      label: `${profile.name} ${profile.title}`,
    });
  }

  docs.push({
    text: profile.focus,
    source: "About, in his own words",
    sectionId: "about",
    sectionLabel: "About",
    label: "focus areas specialism",
  });

  docs.push({
    text: profile.philosophy,
    source: "The idea the whole site hangs from",
    sectionId: "philosophy",
    sectionLabel: "Philosophy",
    label: "philosophy belief principle approach",
  });

  for (const project of projectsIndexable) {
    const where = project.organization ? `${project.title} — ${project.organization}` : project.title;

    docs.push({
      text: project.problem,
      source: `${where}, the problem`,
      sectionId: "work",
      sectionLabel: "Selected work",
      label: `${project.title} ${project.organization ?? ""} ${project.technologies.join(" ")}`,
    });

    docs.push({
      text: project.learned,
      source: `${where}, what it taught him`,
      sectionId: "work",
      sectionLabel: "Selected work",
      label: `${project.title} lesson learned takeaway`,
    });

    for (const claim of project.proof) {
      docs.push({
        text: claim,
        source: `${where}, evidence`,
        sectionId: "work",
        sectionLabel: "Selected work",
        label: `${project.title} result impact outcome proof`,
      });
    }

    for (const metric of project.metrics) {
      docs.push({
        text: `${metric.label}: ${metric.before} → ${metric.after}.`,
        source: metric.source,
        sectionId: "work",
        sectionLabel: "Selected work",
        label: `${project.title} metric number measured ${metric.label}`,
      });
    }
  }

  for (const experiment of experimentsIndexable) {
    docs.push({
      text: experiment.question,
      source: `AI Workflow Lab — ${experiment.title} (${experiment.status})`,
      sectionId: "lab",
      sectionLabel: "AI Workflow Lab",
      label: `${experiment.title} ai agent workflow experiment ${experiment.status}`,
    });

    for (const finding of experiment.verification) {
      docs.push({
        text: finding,
        source: `AI Workflow Lab — ${experiment.title}, verified`,
        sectionId: "lab",
        sectionLabel: "AI Workflow Lab",
        label: `${experiment.title} ai result verified finding`,
      });
    }
  }

  for (const entry of careerIndexable) {
    if (!entry.summary) continue;
    docs.push({
      text: entry.summary,
      source: `${entry.role}, ${entry.organization} · ${entry.dateRange}`,
      sectionId: "journey",
      sectionLabel: "Journey",
      label: `${entry.role} ${entry.organization} ${entry.type} career job role experience`,
    });
  }

  for (const school of education) {
    docs.push({
      text: `${school.credential}, ${school.institution} (${school.dateRange}).`,
      // Education is a timeline entry, and #resume is no longer a section on
      // the page — linking there would be a dead anchor.
      source: "Education",
      sectionId: "journey",
      sectionLabel: "Journey",
      label: `${school.institution} ${school.credential} education degree study university`,
    });
  }

  return docs;
}

const DOCUMENTS = buildDocuments();

/** Inverse document frequency, so a term like "scraper" outweighs "system". */
const IDF = (() => {
  const counts = new Map<string, number>();
  for (const doc of DOCUMENTS) {
    for (const term of new Set(tokenize(`${doc.text} ${doc.label}`))) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of counts) {
    idf.set(term, Math.log(1 + DOCUMENTS.length / count));
  }
  return idf;
})();

/**
 * Below this, a "match" is one incidental word in common and the honest
 * response is that the site does not answer the question. Tuned against the
 * cases in tests/lib/answers.test.ts — raise it and real questions start
 * returning nothing; lower it and unrelated questions start returning prose.
 */
const MIN_SCORE = 1.4;

export function answer(question: string, limit = 3): readonly Answer[] {
  const terms = tokenize(question);
  if (terms.length === 0) return [];

  const scored: Answer[] = [];

  for (const doc of DOCUMENTS) {
    const text = new Set(tokenize(doc.text));
    const label = new Set(tokenize(doc.label));

    let score = 0;
    for (const term of new Set(terms)) {
      const weight = IDF.get(term) ?? 0;
      if (text.has(term)) score += weight;
      // A title match is evidence about *which* thing is being asked about,
      // so it counts — but less than the answer text actually containing it.
      else if (label.has(term)) score += weight * 0.6;
    }

    if (score >= MIN_SCORE) {
      scored.push({
        text: doc.text,
        source: doc.source,
        sectionId: doc.sectionId,
        sectionLabel: doc.sectionLabel,
        score,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((entry, index, all) => all.findIndex((other) => other.text === entry.text) === index)
    .slice(0, limit);
}

/** Questions worth offering as one-tap buttons, so the common case needs no
 *  typing at all. Each is checked by a test to actually return something. */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "What does he do at DoorDash?",
  "What has he actually measured?",
  "What did he learn from work that failed?",
  "What is he exploring with AI agents?",
  "Where did he study?",
];
