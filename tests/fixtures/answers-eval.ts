/**
 * The retrieval eval set for "Ask this site".
 *
 * ## What this is for
 *
 * Every decision about the ask box's search — add an embedding model, drop it,
 * expand the index, retune the threshold — is otherwise a matter of opinion.
 * This turns it into a number. `tests/lib/answers-retrieval.test.ts` scores the
 * real index against these cases and reports recall@k and MRR.
 *
 * ## The one rule that makes it worth anything
 *
 * **Queries are phrased the way a visitor would type them, deliberately not the
 * way the passages are written.** An eval set that reuses each passage's own
 * vocabulary measures nothing but string equality, and it will happily tell you
 * a keyword matcher is perfect. So: "did anything go wrong" rather than "what it
 * taught him", "how do you stop bots from getting blocked" rather than "sites
 * actively discouraging collection", "can he lead or manage other engineers"
 * rather than "led lab sessions".
 *
 * Where a query *does* share a word with its target, it is because a visitor
 * genuinely would use that word — a technology name, an employer, "resume".
 *
 * ## Reading `expect`
 *
 * Each case lists snippets, and an answer counts as correct when its text
 * *contains* one of them. Several passages often answer one question honestly,
 * and forcing a single gold answer would penalise the retriever for a defensible
 * choice — recall@k asks whether any listed snippet appears in the top k.
 *
 * Snippets are asserted to exist somewhere in the index by the harness, so an
 * edit to `src/content` fails loudly here instead of silently rotting the eval.
 *
 * ## Honest limitation
 *
 * These queries and the aliases in `src/content/answer-expansion.ts` were
 * written by the same hand, which is the classic way to score well on a
 * benchmark while changing nothing for real visitors. The absolute numbers are
 * worth less than the *movement* in them; the set is worth more once its queries
 * come from someone who did not write the aliases.
 */

export interface EvalCase {
  /** How a visitor would ask. */
  readonly query: string;
  /** An answer containing any of these substrings counts as correct. */
  readonly expect: readonly string[];
  /** Why this case is in the set — what it is probing. */
  readonly probes: string;
}

export const EVAL_CASES: readonly EvalCase[] = [
  /* --- Paraphrase: the visitor's words share little with the passage ------ */
  {
    query: "did anything go wrong on the projects",
    expect: [
      "The users told me what the real problem was in the first hour",
      "The valuable output was never the data",
      "Reliability at this duration is a design property",
      "The 99% runtime win got the attention",
    ],
    probes: "trouble, asked without any word the passages use — routes to 'what it taught him'",
  },
  {
    query: "how do you stop bots from getting blocked",
    expect: [
      "Collection had to run unattended",
      "2 million+ records generated at a 99.9% success rate",
      "Selenium and Playwright across production collection systems",
    ],
    probes: "anti-detection, phrased colloquially; no shared vocabulary at all",
  },
  {
    query: "what happens when a long job quietly breaks",
    expect: [
      "Reliability at this duration is a design property",
      "Reliability over months is a different discipline",
      "Collection had to run unattended",
    ],
    probes: "silent degradation, described by symptom",
  },
  {
    query: "can he lead or manage other engineers",
    expect: [
      "Led lab sessions for 30+ students",
      "Led a team of three",
      "Two course tracks",
      "Standardisation enabled delivery of 30+ production scrapers",
    ],
    probes: "leadership, asked as a hiring question",
  },
  {
    query: "is he any good at making slow things fast",
    expect: [
      "99% runtime reduction",
      "95% runtime reduction",
      "Legacy scraper runtime",
      "Runtime: Baseline",
      "96% increase in production throughput",
    ],
    probes: "optimisation, colloquial phrasing",
  },
  {
    query: "how does he decide what is worth working on",
    expect: ["Unsolved is not the same as unsolvable"],
    probes: "judgement, asked plainly",
  },
  {
    query: "tell me about working with factory staff",
    expect: [
      "Deployed to shop-floor operators",
      "Process setup sheets on the shop floor were paper",
      "The users told me what the real problem was in the first hour",
      "Shop-floor manufacturing operations still running on paper",
    ],
    probes: "the manufacturing work, described from the outside",
  },
  {
    query: "has he taught anyone",
    expect: [
      "Led lab sessions for 30+ students",
      "Supported 200+ students",
      "Supported and graded a 24+ student honors section",
      "Two course tracks",
      "Explaining a data structure to someone who isn't a CS major",
    ],
    probes: "teaching, one word away from the content",
  },
  {
    query: "any experience with messy or duplicated data",
    expect: [
      "Fuzzy matching across 1M+ legacy records",
      "1M+ legacy records fuzzy-matched",
      "Legacy records reconciled",
    ],
    probes: "fuzzy matching, described by symptom rather than by algorithm",
  },
  {
    query: "how big were the datasets he handled",
    expect: [
      "Records collected",
      "2 million+ records generated",
      "2M+ records at USC",
      "The research needed millions of records",
    ],
    probes: "scale, asked as a quantity question",
  },
  {
    query: "what has he actually measured",
    expect: [
      "Legacy scraper runtime",
      "Records collected",
      "Product coverage",
      "Time to a feasibility answer",
      "Production throughput",
    ],
    probes: "the metric documents, asked for as a category",
  },

  /* --- Technology and proper-noun lookups -------------------------------- */
  {
    query: "mendix",
    expect: ["Mendix throughout the Schaeffler co-op"],
    probes: "a technology named only in a skills evidence line",
  },
  {
    query: "playwright",
    expect: [
      "Selenium and Playwright across production collection systems",
      "Collection had to run unattended",
    ],
    probes: "a technology in both prose and skill lists",
  },
  {
    query: "doordash",
    expect: [
      "Retail data",
      "I write software for retail data at DoorDash",
      "Multi-agent feasibility workflow at DoorDash",
    ],
    probes: "employer lookup",
  },
  {
    query: "damerau levenshtein",
    expect: [
      "Fuzzy matching across 1M+ legacy records",
      "Damerau–Levenshtein",
    ],
    probes: "a multiword algorithm name punctuated with an en dash",
  },
  {
    query: "resume",
    expect: [
      "Legacy scraper runtime",
      "Records collected",
      "Product coverage",
      "Runtime: Baseline",
      "Production throughput",
      "Legacy records reconciled",
      "Success rate",
      "Production scrapers delivered",
    ],
    probes: "diacritic folding — every metric cites 'Résumé — …' as its source",
  },
  {
    query: "graphql",
    expect: ["GraphQL and Prisma on Wordification"],
    probes: "a technology from a less prominent role",
  },
  {
    query: "pytorch",
    expect: ["PyTorch for the Dist"],
    probes: "a technology from a coursework project",
  },
  {
    query: "typescript",
    expect: ["TypeScript on Wordification"],
    probes: "a common language, which should not be swamped by prose",
  },
  {
    query: "azure",
    expect: ["Azure on the capstone"],
    probes: "a cloud platform named once",
  },

  /* --- Shorthand and headline numbers ------------------------------------ */
  {
    query: "the thirty scrapers thing",
    expect: [
      "30+ production scrapers delivered in a single week",
      "Production scrapers were being built as individual artefacts",
      "The 99% runtime win got the attention",
      "Standardisation enabled delivery of 30+ production scrapers",
      "Production scrapers delivered",
    ],
    probes: "a project referred to by its headline number",
  },
  {
    query: "feasibility agent",
    expect: [
      "Deciding whether a retailer could be onboarded",
      "A full retailer assessment completes in under an hour",
      "The valuable output was never the data",
      "Time to a feasibility answer",
      "Multi-agent feasibility workflow at DoorDash",
    ],
    probes: "a project referred to by shorthand — the dd-feasibility-agent case study in Work, since round 16 removed the Lab's own experiment document",
  },
  {
    query: "how many retailers has he integrated",
    expect: [
      "18+ live retailer integrations",
      "Multiple retail partners assessed",
    ],
    probes: "a specific quantity from the current role",
  },

  /* --- Plain questions about the person ---------------------------------- */
  {
    query: "who is he",
    expect: [
      "I write software for retail data at DoorDash",
      "Software engineer focused on automation",
      "less interested in whether a problem is hard",
    ],
    probes: "the top-level introduction — every word here is a stop word but one",
  },
  {
    query: "where did he go to school",
    expect: [
      "B.S. Computer Science",
      "The degree he finished, in computer science",
      "Graduated with a 3.8 GPA",
      "The cybersecurity minor changed how I read systems",
    ],
    probes: "education, asked plainly",
  },
  {
    query: "what awards has he won",
    expect: [
      "Undergraduate research award",
      "Dean's List",
      "Every year of the degree",
      "Led a team of three",
    ],
    probes: "achievements",
  },
  {
    query: "what languages does he know",
    expect: ["Python and JavaScript across all collection work"],
    probes: "skills by category — and the plural that an '-es' stemmer broke",
  },
  {
    query: "what projects has he shipped",
    expect: [
      "Production scrapers were being built as individual artefacts",
      "The research needed millions of records",
      "Deciding whether a retailer could be onboarded",
      "Process setup sheets on the shop floor were paper",
      "Vehicle information is spread across sources",
    ],
    probes: "the plural of 'project', which needs stemming to match the aliases",
  },
  {
    query: "what is his philosophy",
    expect: ["Unsolved is not the same as unsolvable"],
    probes: "the core belief",
  },
  {
    query: "how does he use ai agents",
    expect: ["Multi-agent feasibility workflow at DoorDash"],
    probes: "the site's own suggested question, reworded after the AI Workflow Lab was removed",
  },
];

/**
 * Queries the site genuinely does not answer. Returning nothing is the correct
 * behaviour, and the honest-refusal path is as much a feature as retrieval is —
 * a threshold tuned only for recall will answer these with whatever scored
 * highest, which on a page making factual claims about employment is worse than
 * silence.
 */
export const MUST_BE_EMPTY: readonly EvalCase[] = [
  {
    query: "kubernetes helm operator",
    expect: [],
    probes: "infrastructure he does not claim",
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
  {
    query: "does he have a security clearance",
    expect: [],
    probes: "a question whose vocabulary overlaps the cybersecurity minor without being answered",
  },
];
