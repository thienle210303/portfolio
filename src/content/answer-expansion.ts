/**
 * Search vocabulary for "Ask this site" — document expansion, checked in.
 *
 * ## What this is
 *
 * The classic fix for vocabulary mismatch is doc2query: run a model over each
 * passage, have it predict the questions that passage answers, and append the
 * predicted terms to the index. The gain comes from *term injection* — putting
 * words into a document's search surface that a reader would use but the author
 * did not.
 *
 * This does exactly that, with the model swapped for a human and the output
 * committed to the repo. That trade is deliberate:
 *
 *  - **The runtime stays empty.** No model, no build-time inference, no API key,
 *    no network during `next build`. The whole benefit lands in the existing
 *    index and the existing ranking function.
 *  - **Builds stay deterministic**, which a generation step would not be.
 *  - **It is reviewable in a diff**, which matters on a site whose content file
 *    opens by declaring itself the single source of truth for everything
 *    factual.
 *
 * ## The rule these terms live under
 *
 * **A term here is a search alias, never a claim.** These strings are merged
 * into a document's `label`, which is matched against but never rendered. They
 * may not enter an answer's `text`, so the feature's central promise — every
 * answer is a sentence from the site, word for word — is untouched by anything
 * in this file.
 *
 * So "blocked", "banned" and "captcha" are legitimate aliases for prose about
 * evading detection. "Kubernetes" would not be, however much someone might
 * search for it.
 *
 * ## One rule about scope, learned from getting it wrong
 *
 * **A subject's aliases must describe the subject, never one of its fields.**
 *
 * "wrong" and "mistake" started out under `dd-feasibility-agent`. Because
 * subject aliases are inherited by every document derived from that subject, the
 * word "wrong" landed on all of that project's passages — including the problem
 * statement, which then outranked the passage that actually discusses the
 * mistake. Field-specific vocabulary belongs on the field, in `buildDocuments`,
 * where only the relevant document gets it.
 *
 * ## Honest limitation
 *
 * These terms and the eval set in `tests/fixtures/answers-eval.ts` were written
 * by the same hand, which is the classic way to score well on a benchmark while
 * changing nothing for real visitors. The eval is the weaker half: it is worth
 * more once its queries come from someone who did not write the aliases.
 */

/**
 * Keyed by the content id `buildDocuments` is already iterating — a project id,
 * a career-entry id, a skill-category id, an experiment id. Every document
 * derived from that subject inherits these terms.
 */
export const subjectExpansions: Record<string, readonly string[]> = {
  /* --- Projects ---------------------------------------------------------- */

  "dd-feasibility-agent": [
    "feasibility",
    "viability",
    "assessment",
    "evaluate",
    "investigate",
    "multi-agent",
    "parallel",
    "agents",
    "catalog",
    "storefront",
    "endpoint",
    "reverse engineer",
    "onboard",
    "launch decision",
    "blind spot",
    "cross-check",
  ],

  "dd-scraper-platform": [
    "standardise",
    "standardize",
    "standardisation",
    "platform",
    "tooling",
    "framework",
    "throughput",
    "team",
    "scale",
    "maintenance",
    "reuse",
    "faster",
    "fast",
    "slow",
    "speed",
    "runtime",
    "performance",
    "optimise",
    "optimize",
    "legacy",
    "ceiling",
    "volume",
  ],

  "usc-research-collection": [
    "large",
    "size",
    "record",
    "scale",
    "detection",
    "detected",
    "blocked",
    "blocking",
    "banned",
    "bot",
    "captcha",
    "rate limit",
    "stealth",
    "human-like",
    "unattended",
    "long-running",
    "months",
    "reliability",
    "reliable",
    "flaky",
    "brittle",
    "drift",
    "degrade",
    "degradation",
    "silently",
    "quietly",
    "broke",
    "break",
    "millions",
    "volume",
    "dataset",
    "crawl",
    "crawler",
    "coverage",
    "fast",
    "slow",
    "faster",
  ],

  "schaeffler-setup-sheets": [
    "factory",
    "shop floor",
    "manufacturing",
    "plant",
    "operator",
    "technician",
    "paper",
    "form",
    "digitise",
    "digitize",
    "low-code",
    "permission",
    "access control",
    "versioning",
    "legacy",
    "staff",
    "worker",
    "messy",
    "duplicate",
    "duplicated",
    "dedupe",
    "typo",
    "fuzzy",
    "matching",
    "reconcile",
    "printing",
  ],

  "automotive-genai": [
    "chatbot",
    "conversational",
    "vehicle",
    "car",
    "automotive",
    "capstone",
    "grounding",
    "grounded",
    "real-time",
    "recommendation",
  ],

  /* --- Career entries ---------------------------------------------------- */

  doordash: [
    "retail",
    "delivery",
    "marketplace",
    "partner",
    "onboarding",
    "integration",
    "current",
    "currently",
    "present",
    "employer",
    "today",
    "retailer",
  ],

  wordification: [
    "education",
    "edtech",
    "spelling",
    "literacy",
    "student",
    "teacher",
    "educator",
    "speech",
    "voice",
    "audio",
    "startup",
  ],

  schaeffler: [
    "co-op",
    "coop",
    "internship",
    "intern",
    "manufacturing",
    "shop floor",
    "factory",
    "industrial",
  ],

  "usc-scraping": [
    "research",
    "university",
    "academic",
    "collection",
    "crawl",
    "crawling",
    "dataset",
    "unattended",
  ],

  "usc-ta": [
    "lead",
    "leading",
    "manage",
    "people",
    "team",
    "teach",
    "teaching",
    "taught",
    "tutor",
    "instructor",
    "assistant",
    "mentor",
    "mentoring",
    "algorithm",
    "data structure",
    "grading",
  ],

  "usc-degree": [
    "school",
    "university",
    "college",
    "degree",
    "bachelor",
    "studied",
    "graduated",
    "gpa",
    "cybersecurity",
    "minor",
    "education",
  ],

  graduation: ["graduated", "degree", "school", "university"],

  cockyhacks: ["hackathon", "competition", "prize", "won", "winning", "mentorship"],

  "code-to-give": ["hackathon", "competition", "prize", "won", "winning", "food", "routing"],

  capstone: ["capstone", "senior project", "final year", "team project"],

  "llm-classifier": [
    "fine-tuning",
    "fine tune",
    "finetune",
    "classifier",
    "classification",
    "sentiment",
    "nlp",
    "bert",
    "training",
    "trained",
    "coursework",
    "accuracy",
  ],

  magellan: ["award", "research award", "grant", "undergraduate research", "won"],

  "acm-webmaster": ["club", "chapter", "society", "volunteer", "webmaster", "leadership"],

  "deans-list": ["honour", "honor", "academic award", "gpa", "won"],

  /* --- Skill categories -------------------------------------------------- */

  languages: ["programming language", "coding language", "stack", "fluent", "proficient", "know"],
  data: ["database", "storage", "query", "schema", "orm", "relational"],
  frameworks: ["library", "framework", "stack", "tooling"],
  practices: [
    "crawling",
    "extraction",
    "pipeline",
    "etl",
    "data engineering",
    "messy",
    "deduplication",
    "blocked",
    "detection",
  ],
  ai: [
    "llm",
    "genai",
    "agent",
    "agentic",
    "copilot",
    "assistant",
    "prompt",
    "prompting",
    "context",
    "fine-tuning",
    "model",
  ],
  platforms: ["cloud", "hosting", "infrastructure", "devops", "deployment", "gcp", "serverless"],
};

/**
 * Applied to every document in a section. Kept short on purpose — a term here
 * lands on dozens of documents at once, so anything only loosely related to the
 * section costs precision everywhere rather than earning recall somewhere.
 *
 * The keys are retrieval vocabularies, not page sections. `work` and `skills`
 * are still here after round 18 deleted both sections: documents for the case
 * studies and the skill categories still pass them to `label()` in
 * `answer-corpus.ts`, and still link to `#tree`, where that content now lives.
 * Removing a key here changes what queries match, which the retrieval eval
 * prices; it is not part of deleting a section.
 */
export const sectionExpansions: Record<string, readonly string[]> = {
  about: ["who", "bio", "introduction", "background", "profile", "himself"],
  // Round 16: Playground Earth. Every plaque document is indexed under this
  // section (see buildDocuments in answer-corpus.ts), so its aliases are the
  // vocabulary for the globe itself rather than for any one plaque's field.
  worlds: ["globe", "world", "map", "earth", "vietnam", "việt nam", "kiên giang", "cat", "cats", "moon", "mi", "origin"],
  // "work" itself was missing, which is easy to miss because it is the section's
  // own key — but the key is not indexed, only these strings are.
  work: ["work", "project", "portfolio", "case study", "shipped", "built"],
  journey: ["career", "history", "job", "role", "timeline", "employment", "worked"],
  skills: ["skill", "technology", "tech", "tool", "stack", "experience"],
};
