/**
 * The guide's retrieval eval set.
 *
 * ## What this is for
 *
 * Every decision about the guide's search — keep the embedding model, drop it,
 * expand the index, retune the blend — is otherwise a matter of opinion. This
 * turns it into a number. `tests/lib/guide-retrieval.test.ts` scores the real
 * index against these cases and reports recall@k and MRR.
 *
 * ## The one rule that makes it worth anything
 *
 * **Queries are phrased the way a visitor would type them, deliberately not the
 * way the passages are written.** An eval set that reuses each passage's own
 * vocabulary measures nothing but string equality, and it will happily tell you
 * a keyword matcher is perfect. So: "did anything go wrong" rather than "what
 * failed", "how do you keep bots from getting blocked" rather than "mimic human
 * interaction patterns", "can he manage people" rather than "leadership".
 *
 * Where a query *does* share a word with its target, it is because a visitor
 * genuinely would use that word — a technology name, an employer, "résumé".
 * Those cases matter too; they are the ones a semantic model is worst at.
 *
 * ## Reading `expect`
 *
 * Each case lists every entry id that would be a *correct* top hit. Several
 * passages often answer one question honestly, and forcing a single gold answer
 * would penalise the retriever for a defensible choice. Recall@k asks whether
 * any listed id appears in the top k.
 *
 * Ids are asserted to exist by the harness, so a content rename fails loudly
 * here instead of silently rotting the eval.
 */

export interface EvalCase {
  /** How a visitor would ask. */
  readonly query: string;
  /** Any of these entry ids counts as a correct hit. */
  readonly expect: readonly string[];
  /** Why this case is in the set — what it is probing. */
  readonly probes: string;
}

export const EVAL_CASES: readonly EvalCase[] = [
  /* --- Paraphrase: the visitor's words share little with the passage ------ */
  {
    query: "did anything go wrong on the projects",
    expect: [
      "project-dd-feasibility-agent-failed",
      "project-dd-feasibility-agent-failure-lesson",
    ],
    probes: "failure, asked without the word 'failed' being the subject",
  },
  {
    query: "how do you stop bots from getting blocked",
    expect: [
      "project-usc-research-collection-tagline",
      "project-usc-research-collection-decision-0",
      "career-usc-scraping-built-0",
    ],
    probes: "anti-detection, phrased colloquially",
  },
  {
    query: "what happens when a long job quietly breaks",
    expect: [
      "project-usc-research-collection-next",
      "project-usc-research-collection-learned",
      "project-usc-research-collection-mattered",
    ],
    probes: "silent degradation, no shared vocabulary",
  },
  {
    query: "can he lead or manage other engineers",
    expect: [
      "command-resume-lens-leadership",
      "career-usc-ta-context",
      "project-dd-scraper-platform-tagline",
    ],
    probes: "leadership, asked as a hiring question",
  },
  {
    query: "does he write tests or check his work",
    expect: [
      "stage-tests-question",
      "stage-review-diff-question",
      "experiment-verification-gates-question",
    ],
    probes: "verification, asked as a hiring question",
  },
  {
    query: "has he ever changed his mind about something",
    expect: ["log-changed-0-before", "log-changed-0-after"],
    probes: "the learning log's before/after pairs",
  },
  {
    query: "what does he think about using AI to write code",
    expect: ["lab-positioning", "lab-intro-0", "lab-intro-1"],
    probes: "the lab's thesis, asked plainly",
  },
  {
    query: "is he any good at making slow things fast",
    expect: [
      "command-resume-lens-optimization",
      "project-usc-research-collection-tagline",
      "project-dd-scraper-platform-tagline",
      "principle-measure-summary",
    ],
    probes: "optimisation, colloquial phrasing",
  },
  {
    query: "how does he decide what to build",
    expect: [
      "principle-understand-summary",
      "principle-understand-detail",
      "philosophy-loop",
    ],
    probes: "process, asked as a question about judgement",
  },
  {
    query: "what is he curious about right now",
    expect: ["log-exploring-0", "log-exploring-1", "log-exploring-2", "profile-intro"],
    probes: "current interests",
  },
  {
    query: "tell me about working with factory staff",
    expect: [
      "project-schaeffler-setup-sheets-tagline",
      "career-schaeffler-context",
      "principle-understand-evidence",
    ],
    probes: "the manufacturing work, described from the outside",
  },
  {
    query: "has he taught anyone",
    expect: ["career-usc-ta-context", "career-usc-ta-impact-0", "career-usc-ta-impact-1"],
    probes: "teaching, one word away from the content",
  },
  {
    query: "what would he do differently",
    expect: [
      "project-dd-scraper-platform-next",
      "project-usc-research-collection-next",
      "project-schaeffler-setup-sheets-next",
      "project-dd-feasibility-agent-next",
    ],
    probes: "the open-question fields",
  },
  {
    query: "any experience with messy or dirty data",
    expect: [
      "project-schaeffler-setup-sheets-decision-2",
      "project-schaeffler-setup-sheets-explored-1",
      "skills-practices",
    ],
    probes: "fuzzy matching, described by symptom",
  },
  {
    query: "how big were the datasets he handled",
    expect: [
      "project-usc-research-collection-proof-0",
      "career-usc-scraping-impact-0",
      "project-usc-research-collection-tagline",
    ],
    probes: "scale, asked as a quantity question",
  },

  /* --- Exact terms: what a visitor actually types ------------------------- */
  {
    query: "mendix",
    expect: ["skills-platforms", "career-schaeffler-context"],
    probes: "a technology named only in keywords for most entries",
  },
  {
    query: "playwright",
    expect: [
      "skills-frameworks",
      "project-dd-feasibility-agent-tagline",
      "project-dd-feasibility-agent-decision-1",
    ],
    probes: "a technology that appears in both prose and keywords",
  },
  {
    query: "doordash",
    expect: ["career-doordash-context"],
    probes: "employer lookup",
  },
  {
    query: "damerau levenshtein",
    expect: [
      "project-schaeffler-setup-sheets-decision-2",
      "career-schaeffler-built-2",
    ],
    probes: "an accented multiword algorithm name",
  },
  {
    query: "resume",
    expect: ["command-print-resume", "command-download-resume", "resume-summary"],
    probes: "diacritic folding — the site writes Résumé",
  },
  {
    query: "graphql",
    expect: ["skills-data", "career-wordification-context"],
    probes: "a technology from a less prominent role",
  },
  {
    query: "pytorch",
    expect: ["skills-frameworks", "career-llm-classifier-built-0"],
    probes: "a technology from a coursework project",
  },
  {
    query: "typescript",
    expect: ["skills-languages"],
    probes: "a common language, should not be swamped",
  },
  {
    query: "selenium",
    expect: ["skills-frameworks", "career-usc-scraping-context"],
    probes: "keyword-only technology match",
  },
  {
    query: "elevenlabs",
    expect: ["career-wordification-built-1", "career-wordification-context"],
    probes: "a narrow proper noun",
  },

  /* --- Commands: the visitor wants an action ------------------------------ */
  {
    query: "copy his email",
    expect: ["command-copy-email"],
    probes: "imperative promotion of a command",
  },
  {
    query: "print the resume",
    expect: ["command-print-resume"],
    probes: "imperative, with a diacritic-folded noun",
  },
  {
    query: "download cv",
    expect: ["command-download-resume", "command-print-resume"],
    probes: "'cv' as a synonym for résumé",
  },
  {
    query: "how do I contact him",
    expect: ["command-copy-email", "command-goto-contact"],
    probes: "a question that should resolve to an action",
  },
  {
    query: "take me to his work",
    expect: ["command-goto-work"],
    probes: "navigation phrased as an instruction",
  },
  {
    query: "show only the automation work",
    expect: ["command-resume-lens-automation"],
    probes: "a lens filter, phrased as a request",
  },
  {
    query: "just the ai stuff on the resume",
    expect: ["command-resume-lens-ai-workflows"],
    probes: "a lens filter, phrased loosely",
  },

  /* --- Subject lookups: 'tell me about X' -------------------------------- */
  {
    query: "the thirty scrapers thing",
    expect: ["project-dd-scraper-platform-tagline"],
    probes: "a project referred to by its headline number",
  },
  {
    query: "feasibility agent",
    expect: ["project-dd-feasibility-agent-tagline", "experiment-retailer-feasibility-question"],
    probes: "a project referred to by shorthand",
  },
  {
    query: "where did he go to school",
    expect: ["career-usc-degree-context", "resume-summary"],
    probes: "education, asked plainly",
  },
  {
    query: "what awards has he won",
    expect: [
      "achievement-a-cockyhacks",
      "achievement-a-code-to-give",
      "achievement-a-magellan",
      "achievement-a-deans",
    ],
    probes: "achievements",
  },
  {
    query: "hackathons",
    expect: [
      "achievement-a-cockyhacks",
      "achievement-a-code-to-give",
      "career-cockyhacks-context",
      "career-code-to-give-context",
    ],
    probes: "a category word that appears only in context lines",
  },
  {
    query: "what is his philosophy",
    expect: ["philosophy-belief", "philosophy-intro-0", "philosophy-intro-1"],
    probes: "the core belief",
  },
  {
    query: "who is he",
    expect: ["profile-positioning", "profile-intro", "profile-focus"],
    probes: "the top-level introduction",
  },
  {
    query: "what languages does he know",
    expect: ["skills-languages"],
    probes: "skills by category",
  },
  {
    query: "cloud experience aws azure",
    expect: ["skills-platforms"],
    probes: "multiple technologies in one query",
  },
  {
    query: "agentic workflows",
    expect: ["skills-ai", "lab-positioning", "experiment-retailer-feasibility-question"],
    probes: "a term of art the site itself uses",
  },
  {
    query: "how many retailers has he integrated",
    expect: ["career-doordash-impact-2", "career-doordash-context"],
    probes: "a specific quantity from the current role",
  },

  /* --- Honest emptiness: the site has no answer -------------------------- */
  {
    query: "kubernetes helm operator",
    expect: [],
    probes: "must return nothing rather than a weak match",
  },
  {
    query: "salary expectations",
    expect: [],
    probes: "a plausible recruiter question the site deliberately does not answer",
  },
  {
    query: "rust golang elixir",
    expect: [],
    probes: "languages he does not list",
  },
];
