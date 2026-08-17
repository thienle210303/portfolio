/**
 * Search vocabulary for the guide — document expansion, checked in.
 *
 * ## What this is
 *
 * The classic fix for vocabulary mismatch is doc2query: run a model over each
 * passage, have it predict questions the passage answers, and append the
 * predicted terms to the index. The gain comes from *term injection* — putting
 * words into a document's search surface that a reader would use but the author
 * did not.
 *
 * This does exactly that, with the model swapped for a human and the output
 * committed to the repo. That trade is deliberate:
 *
 *  - **The runtime stays empty.** No model, no build-time inference, no API key,
 *    no network during `next build`. The whole benefit lands in the existing
 *    17 KB index and the existing lexical matcher.
 *  - **Builds stay deterministic**, which a generation step would not be.
 *  - **It is reviewable in a diff**, which matters on a site whose content file
 *    opens by declaring itself the single source of truth for everything
 *    factual.
 *
 * ## The rule these terms live under
 *
 * **A term here is a search alias, never a claim.** These strings are merged
 * into an entry's `keywords`, which are matched against but never rendered.
 * They may not enter `quote`, so the guide's central promise — every result is a
 * passage from the site, word for word — is untouched by anything in this file.
 *
 * So "blocked", "banned" and "captcha" are legitimate aliases for prose about
 * evading detection. "Kubernetes" would not be, however much someone might
 * search for it.
 *
 * ## Honest limitation
 *
 * These terms and the eval set in `tests/fixtures/guide-eval.ts` were written by
 * the same hand, which is the classic way to score well on a benchmark while
 * changing nothing for real visitors. The eval is the weaker half: it is worth
 * more once its queries come from someone who did not write the aliases.
 */

/**
 * Keyed by the content id that `buildIndex` is already iterating — a project id,
 * a career-entry id, a skill-category id, a principle id, an experiment id. Every
 * entry derived from that subject inherits these terms.
 */
/**
 * One rule about scope, learned from getting it wrong: **a subject's aliases
 * must describe the subject, never one of its fields.**
 *
 * "wrong" and "mistake" started out here under `dd-feasibility-agent`. Because
 * subject aliases are inherited by every entry derived from that subject, the
 * word "wrong" ended up on all eleven of that project's passages — including its
 * tagline, which then outranked the actual "what failed" passage for the query
 * "did anything go wrong". Field-specific vocabulary belongs on the field, in
 * `buildIndex`, where only the relevant entry gets it.
 */
export const subjectExpansions: Record<string, readonly string[]> = {
  /* --- Projects ---------------------------------------------------------- */

  "dd-feasibility-agent": [
    "feasibility",
    "viability",
    "assessment",
    "evaluate",
    "investigate",
    "investigation",
    "multi-agent",
    "parallel",
    "agents",
    "catalog",
    "storefront",
    "endpoint",
    "network requests",
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
    "leverage",
    "faster",
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
    "big",
    "large",
    "size",
    "record",
    "scale",
    "detection",
    "detected",
    "blocked",
    "blocking",
    "banned",
    "ban",
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
    "broke",
    "breaks",
    "millions",
    "volume",
    "dataset",
    "crawl",
    "crawler",
    "traversal",
    "coverage",
    "runtime",
    "faster",
  ],

  "schaeffler-setup-sheets": [
    "factory",
    "shop floor",
    "manufacturing",
    "plant",
    "operator",
    "technician",
    "staff",
    "paper",
    "form",
    "digitise",
    "digitize",
    "low-code",
    "permission",
    "role",
    "access control",
    "versioning",
    "legacy",
    "messy",
    "dirty",
    "duplicate",
    "typo",
    "transposition",
    "fuzzy",
    "matching",
    "reconcile",
    "label",
    "printing",
    "throughput",
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
    "transcription",
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
    "student",
    "lab",
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

  cockyhacks: ["hackathon", "competition", "prize", "won", "winning", "team", "mentorship"],

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

  languages: ["programming language", "coding language", "stack", "fluent", "proficient"],
  data: ["database", "storage", "query", "schema", "orm", "relational"],
  frameworks: ["library", "framework", "stack", "tooling"],
  practices: [
    "crawling",
    "extraction",
    "pipeline",
    "etl",
    "data engineering",
    "messy",
    "dirty",
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

  /* --- Principles -------------------------------------------------------- */

  understand: [
    "requirement",
    "root cause",
    "discovery",
    "user research",
    "diagnose",
    "judgement",
    "judgment",
    "decide",
    "decision",
    "approach",
    "first step",
    "brief",
    "stated problem",
  ],
  system: [
    "root cause",
    "systemic",
    "leverage",
    "structural",
    "architecture",
    "prevention",
    "reusable",
    "recurring",
  ],
  measure: [
    "metric",
    "measurement",
    "number",
    "before and after",
    "impact",
    "proof",
    "evidence",
    "result",
    "benchmark",
    "worked",
  ],

  /* --- Lab experiments --------------------------------------------------- */

  "retailer-feasibility": ["feasibility", "viability", "multi-agent", "parallel", "assessment"],
  "spec-first-portfolio": ["specification", "spec", "brief", "this site", "this website"],
  "context-reuse": ["context", "reuse", "project instructions", "memory", "conventions"],
  "parallel-exploration": ["parallel", "unfamiliar", "codebase", "onboarding", "exploration"],
  "verification-gates": [
    "verification",
    "verify",
    "check",
    "checked",
    "test",
    "gate",
    "guardrail",
    "safety",
    "review",
    "approval",
  ],

  /* --- The learning log -------------------------------------------------- */

  "learning-log": [
    "curious",
    "curiosity",
    "interest",
    "lately",
    "recently",
    "right now",
    "these days",
    "reading",
    "studying",
  ],

  /* --- Résumé lenses ----------------------------------------------------- */
  /* Each label is a single word, so the lens commands need synonyms or they  */
  /* are reachable only by someone who guessed the exact term.               */

  "lens-engineering": ["engineer", "engineering", "software", "development", "coding", "build"],
  "lens-automation": ["automate", "automating", "script", "manual", "repetitive", "workflow"],
  "lens-optimization": [
    "optimise",
    "optimize",
    "faster",
    "speed",
    "performance",
    "slow",
    "efficiency",
    "improve",
  ],
  "lens-ai-workflows": ["ai", "llm", "agent", "agentic", "genai", "model", "automation"],
  "lens-leadership": [
    "lead",
    "leading",
    "manage",
    "manager",
    "managing",
    "people",
    "team",
    "mentor",
    "teach",
    "standards",
  ],
};

/**
 * Applied to every entry in a section. Kept short on purpose — a term here lands
 * on dozens of entries at once, so anything only loosely related to the section
 * costs precision everywhere rather than earning recall somewhere.
 */
export const sectionExpansions: Record<string, readonly string[]> = {
  about: ["who", "bio", "introduction", "background", "profile", "himself"],
  philosophy: [
    "philosophy",
    "value",
    "belief",
    "principle",
    "mindset",
    "approach",
    "how he thinks",
  ],
  work: ["project", "portfolio", "case study", "shipped", "built"],
  lab: ["experiment", "ai", "research", "note"],
  journey: ["career", "history", "job", "role", "timeline", "employment", "worked"],
  resume: ["cv", "qualification", "experience", "skill"],
  contact: ["reach", "hire", "hiring", "get in touch", "message", "email"],
};
