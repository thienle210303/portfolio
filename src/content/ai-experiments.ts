/**
 * AI Workflow Lab content.
 *
 * Standing rules for this file — they are the reason the section is worth
 * reading at all:
 *
 *  1. Nothing here pretends to run live. No simulated terminal output, no
 *     fabricated benchmark, no invented "before/after" timing.
 *  2. An experiment may only carry an `outcome` if the outcome actually
 *     happened. `Exploring` entries are open questions and say so.
 *  3. Any claim about a product's current capabilities links to the vendor's
 *     own documentation, because those capabilities change faster than this
 *     file does.
 *  4. `started` is deliberately coarse. A coarse true date beats a precise
 *     invented one.
 */

import type { AiExperiment, LearningLog, ScrapingPlaybookMove, WorkflowStage } from "@/types/portfolio";

/** Drives the "last updated" indicator on the whole section. */
export const LAB_LAST_UPDATED = "2026-08-23";

export const labPositioning =
  "I use AI-assisted workflows to accelerate exploration while keeping architecture, verification, and accountability human-owned — including the chat box below, which will tell you about any of it without inventing a word.";

export const labIntro = [
  "Claude Code, Codex and Cursor are development tools and subjects I'm studying. None of them run this chat box — by default it's a lexical index over this page's own text, not a model, and it says so below.",
  "What I find interesting isn't the tools. It's the question underneath them: which parts of engineering judgement are actually delegable, and which parts quietly stop working the moment you delegate them.",
];

/**
 * Shown in place of `labIntro[0]` when `ASK_LLM_API_KEY` and `ASK_LLM_MODEL`
 * are both set (`src/lib/ask-live-config.ts`) — the one thing on this page
 * that then genuinely runs live. `AIWorkflowLab.tsx` picks between the two;
 * neither sentence is invented by the component itself. See
 * `docs/superpowers/specs/2026-08-23-round-10-design.md`, WP-D.
 */
export const labLiveNotice =
  "One thing on this page now runs live: the chat box below hands your question, and only the passages it retrieved from this page, to a real language model — and marks that answer as coming from a live model when it does.";

/**
 * The hero's "Ask Thien" tab (round 12, WP-K) is a smaller mirror of the Lab
 * chat box, not a second engine — same static index, same honesty about it.
 * One line, always shown (the hero tab never wires up live mode, regardless
 * of `askLiveModeConfigured()`), mirroring `labIntro[0]`'s framing above.
 */
export const heroAskCaption = "A lexical index over this page — no model.";

/* -------------------------------------------------------------------------- */
/* The scraping playbook                                                       */
/* -------------------------------------------------------------------------- */

/**
 * "How I solve problems with scraping knowledge" — deferred in round 7,
 * drafted and approved by the owner in round 11. Every claim and number
 * below is already made elsewhere on this page with sources (the USC and
 * DoorDash case studies, the career entries); each move links to where.
 */
export const scrapingPlaybookIntro =
  "Three employers in a row handed me the same problem wearing different clothes: data that exists on someone else's site, needed at a scale nobody wants to click for. This is what that work actually taught me.";

export const scrapingPlaybook = [
  {
    id: "bottleneck",
    title: "The bottleneck is rarely where you think",
    body: "The USC research scraper wasn't slow because of the network — it was slow because of the interaction model. Rewriting collection around DOM manipulation and in-page JavaScript execution cut runtime by 95%. The number is what proved the diagnosis; before measuring, I'd have optimized the wrong layer.",
    evidenceHref: "#work-usc-research-collection",
    evidenceLabel: "Two million records, unattended",
  },
  {
    id: "months-not-runs",
    title: "Months-long reliability is a different discipline from one-run correctness",
    body: "Research collection had to run unattended for months against sites actively defending against automation. Everything that could drift, eventually did. What survived: scrapers that mimic human interaction patterns, and breadth-first traversal of product and seller networks so coverage didn't depend on any one path staying open. Result: 2 million+ records at a 99.9% success rate.",
    evidenceHref: "#work-usc-research-collection",
    evidenceLabel: "Two million records, unattended",
  },
  {
    id: "fix-the-factory",
    title: "The scraper is never the unit that needs fixing — the way scrapers get made is",
    body: "At DoorDash, scrapers were built as individual artefacts, each with its own conventions and failure modes, so the retailer count was capped by engineer-hours. Standardizing the shared workflows, tooling and validation first — before optimizing any single scraper — is what made 30+ production scrapers in one week possible. Throughput problems in data work are organisational before they are technical.",
    evidenceHref: "#work-dd-scraper-platform",
    evidenceLabel: "Thirty scrapers in a week",
  },
  {
    id: "fail-loudly",
    title: "Wrong data must fail loudly",
    body: "Validation is a required stage, not a convention. A scraper that silently produces wrong data is worse than one that crashes — the crash tells you; the silence ships bad data into 18+ live integrations that depend on it being right.",
    evidenceHref: "#work-dd-scraper-platform",
    evidenceLabel: "Thirty scrapers in a week",
  },
] satisfies readonly ScrapingPlaybookMove[];

/* -------------------------------------------------------------------------- */
/* Workflow stages                                                             */
/* -------------------------------------------------------------------------- */

export const workflowStages = [
  {
    id: "explore-codebase",
    label: "Explore an unfamiliar codebase",
    question: "What is actually here, and what does it assume?",
    agentDoes: [
      "Sweep the tree for entry points, configuration and the real data flow.",
      "Report where a concept is defined versus where it is merely used.",
      "Surface the conventions the code follows without being told to.",
    ],
    humanOwns: [
      "Deciding which parts of the map matter for the task at hand.",
      "Judging whether an odd-looking pattern is a mistake or a constraint someone hit before you.",
    ],
    watchFor:
      "Confident architectural summaries drawn from a partial read. Ask which files it actually opened.",
  },
  {
    id: "idea-to-spec",
    label: "Turn an idea into a specification",
    question: "What exactly are we building, and how will we know it's done?",
    agentDoes: [
      "Draft the specification and name the decisions the idea leaves open.",
      "Propose a definition of done that is checkable rather than aspirational.",
    ],
    humanOwns: [
      "Every product decision the draft surfaces.",
      "Scope — an agent will happily specify more than anyone asked for.",
    ],
    watchFor:
      "A specification that reads well and quietly resolves ambiguities in whichever direction was easiest to write.",
  },
  {
    id: "plan-feature",
    label: "Plan a feature",
    question: "What is the order of operations, and what does it touch?",
    agentDoes: [
      "Break the work into steps with explicit file-level impact.",
      "Identify what has to land first for anything else to be testable.",
    ],
    humanOwns: [
      "Sequencing against real deadlines and other people's work.",
      "Deciding what to deliberately not build.",
    ],
    watchFor:
      "Plans that are complete on paper but assume no one else is editing the same files.",
  },
  {
    id: "implement",
    label: "Implement across multiple files",
    question: "Can the change be made coherently, not just locally?",
    agentDoes: [
      "Apply a change consistently across every place it needs to land.",
      "Follow the conventions already present rather than importing its own.",
    ],
    humanOwns: [
      "The architecture the change assumes.",
      "Reviewing the diff as a whole, not file by file.",
    ],
    watchFor:
      "Local correctness with global incoherence — every file compiles, the system no longer makes sense.",
  },
  {
    id: "diagnose",
    label: "Diagnose a difficult bug",
    question: "What does the evidence actually support?",
    agentDoes: [
      "Enumerate hypotheses and the observation that would eliminate each one.",
      "Reproduce the failure and narrow it down.",
    ],
    humanOwns: [
      "Accepting a root cause. This is the step where a plausible story is most dangerous.",
    ],
    watchFor:
      "A fix that makes the symptom disappear without an explanation of why it was there.",
  },
  {
    id: "refactor",
    label: "Refactor or optimise a system",
    question: "What changed, and did it change the thing we claimed?",
    agentDoes: [
      "Restructure mechanically and at volume, which is exactly where humans get bored and make mistakes.",
      "Keep behaviour identical while shape changes.",
    ],
    humanOwns: [
      "Choosing the target shape.",
      "Deciding whether the measured improvement was worth the churn.",
    ],
    watchFor:
      "Optimisation without a baseline. If there was no measurement before, there is no result after.",
  },
  {
    id: "tests",
    label: "Generate and run tests",
    question: "Do these tests fail when the code is wrong?",
    agentDoes: [
      "Cover the cases nobody enjoys writing — boundaries, empty states, long content.",
      "Run the suite and read the real output.",
    ],
    humanOwns: [
      "Judging whether a passing suite means anything.",
    ],
    watchFor:
      "Tests written to match the implementation rather than the requirement. They pass forever and catch nothing.",
  },
  {
    id: "review-diff",
    label: "Review a diff",
    question: "What is wrong here that I would miss on the third read?",
    agentDoes: [
      "Check the mechanical dimensions exhaustively and without fatigue.",
      "Flag inconsistencies between the diff and the stated intent.",
    ],
    humanOwns: [
      "Whether the change should exist at all.",
      "Dismissing findings — an agent's confidence is not evidence.",
    ],
    watchFor:
      "Volume mistaken for rigour. Ten stylistic notes can bury one real defect.",
  },
  {
    id: "parallel-research",
    label: "Coordinate parallel research",
    question: "What do several independent looks agree on?",
    agentDoes: [
      "Investigate several angles at once that would be serial for one person.",
      "Report findings separately, before they get merged into a narrative.",
    ],
    humanOwns: [
      "Reconciling contradictions rather than averaging them.",
    ],
    watchFor:
      "Synthesis that smooths over disagreement. Where two strategies disagree is usually the informative part.",
  },
  {
    id: "document",
    label: "Document what was learned",
    question: "What would the next person need, and what did we rule out?",
    agentDoes: [
      "Write up the decision and its context while both are still fresh.",
    ],
    humanOwns: [
      "Stating what did not work, which is the part that gets quietly dropped.",
    ],
    watchFor:
      "Documentation that records the final answer and none of the reasoning that made it the answer.",
  },
] satisfies readonly WorkflowStage[];

/* -------------------------------------------------------------------------- */
/* Experiments                                                                 */
/* -------------------------------------------------------------------------- */

export const experiments = [
  {
    id: "retailer-feasibility",
    title: "Multi-strategy retailer feasibility assessment",
    started: "Q4 2025",
    sortKey: "2025-11",
    status: "Adopted",
    question:
      "Can a set of agents working in parallel answer 'is this retailer's public catalog viable for an integration?' quickly enough to change when the decision gets made — not just how it gets made?",
    hypothesis:
      "A single investigation strategy will always have blind spots that look identical to an absence of data. Several independent strategies, reconciled against each other, should produce a judgement a human can actually trust and argue with.",
    toolIds: ["claude-code", "playwright"],
    whyThisTool:
      "The work is investigative rather than generative, so the agent needed to run real commands, drive a real browser and read real responses. Playwright supplied the browser; the agent supplied the parallel strategies and the synthesis.",
    contextSupplied: [
      "What a viable integration actually requires downstream, in concrete terms.",
      "The scope boundary: public surfaces of a prospective retail partner, nothing else.",
      "The shape of the deliverable — a judgement with its evidence attached, not a data dump.",
      "Prior assessments as worked examples of what a good answer looks like.",
    ],
    stageIds: ["explore-codebase", "parallel-research", "diagnose", "document"],
    humanDecisionPoints: [
      "Whether a retailer is in scope to assess at all.",
      "Accepting or rejecting the feasibility judgement before any launch date is committed.",
      "Approving anything that moves from investigation to collection at scale.",
    ],
    safetyBoundaries: [
      "Investigate and report only — the workflow does not begin large-scale collection on its own.",
      "Public surfaces within the scope of a prospective partnership.",
      "Findings are reported with their evidence, so a human can disagree on the evidence rather than on the conclusion.",
    ],
    verification: [
      "Findings cross-checked between independent strategies before synthesis; disagreement is surfaced rather than averaged.",
      "Assessments reviewed by a human before any launch commitment.",
      "Outcomes checked against reality — retailers assessed as viable were subsequently brought live.",
    ],
    outcome:
      "Adopted as the team's approach. Multiple retail partners were assessed and brought live, contributing to closing out the half-year onboarding goal, and the workflow became the basis for internal collection tooling — reducing reliance on external scraping vendors.",
    effortComparison:
      "A recorded benchmark, not a target: a full retailer assessment completes in under an hour, against days of manual investigation before.",
    limitation:
      "Early single-strategy versions produced confident conclusions from partial evidence. A catalog served through client-side calls was scored as thin, because the first pass never observed those calls fire.",
    humanCorrections: [
      "Added cross-checking between strategies so 'I found nothing' could be distinguished from 'there is nothing'.",
      "Required the evidence to travel with the judgement — a bare verdict was not reviewable.",
      "Kept the transition from investigating to collecting behind a human decision.",
    ],
    lesson:
      "The parallelism was not the interesting part. Forcing independent strategies to disagree in the open, instead of merging into one confident narrative, is what made the output trustworthy enough to commit a date to.",
    nextExperiment:
      "Continuous re-assessment. A retailer viable in January may not be in June, and today nobody finds out until something breaks.",
    lastUpdated: "2026-08-16",
  },

  {
    id: "spec-first-portfolio",
    title: "Building this site from a written specification",
    started: "August 2026",
    sortKey: "2026-08",
    status: "Tested",
    question:
      "If the factual content is separated out and owned by a human, can an agent implement an entire production site without fabricating any of it?",
    hypothesis:
      "Fabrication is mostly a context problem. Given a résumé as ground truth, an explicit instruction to mark gaps rather than fill them, and a typed content layer separate from the components, an agent should surface missing facts instead of inventing them.",
    toolIds: ["claude-code"],
    whyThisTool:
      "The test needed an agent that could run the project's own verification — type checking, linting, tests, a production build — rather than one that only writes code and hands it over.",
    contextSupplied: [
      "A long written specification covering art direction, accessibility, responsive and performance requirements.",
      "The résumé PDF, declared as the source of truth for employers, dates, education and metrics.",
      "Both previous portfolio repositories, as the source for project inventory and links.",
      "An explicit rule: mark anything unknown as needing input; never invent a fact.",
    ],
    stageIds: [
      "idea-to-spec",
      "plan-feature",
      "implement",
      "tests",
      "review-diff",
      "document",
    ],
    humanDecisionPoints: [
      "Art direction, and every judgement about what reads as credible rather than boastful.",
      "Which claims about my work are publishable, and how internal work gets described.",
      "How to describe reducing reliance on external vendors — the accurate framing, not the dramatic one.",
      "Whether a metric is evidence or decoration.",
    ],
    safetyBoundaries: [
      "No commit, push, or deploy without an explicit request.",
      "The résumé is authoritative; conflicts with older material get flagged, not silently resolved.",
      "Missing facts must surface as explicit markers in the content source, never as invented values or visible placeholder text.",
    ],
    verification: [
      "TypeScript strict type checking — clean.",
      "ESLint with the Next.js core-web-vitals ruleset — clean.",
      "147 component and unit tests covering navigation, filters, disclosures, tabs, form validation and the content helpers.",
      "140 browser tests across 320, 375, 390, 768, 1024 and 1440px plus simulated 200% zoom, checking horizontal overflow, keyboard paths, focus restoration and hydration warnings.",
      "A production build — eight routes, page prerendered as static content.",
    ],
    outcome:
      "The site was built and the full chain passes. The interesting result was not that it worked, but which checks actually caught things. Type checking and linting caught nothing an experienced reviewer wouldn't have: the defects that mattered were found by tests that exercised real behaviour. The browser suite found a broken skip link — activating it scrolled the page but left keyboard focus stranded, because a fragment link cannot focus an element without a tabindex. Everything else about that page was correct, and nothing short of driving a real browser would have noticed.",
    effortComparison:
      "Not measured. Wall-clock time is not a fair comparison here, because a solo build would not have produced the specification, the review rounds, or the browser suite that found the skip-link defect. [NEEDS INPUT: if you want a figure here, we would need a comparable feature built without agents.]",
    limitation:
      "The agent's PDF reader could not open the résumé and needed a fallback text extractor before any content work could start. Nothing downstream was possible until that was solved. Three agents were also killed mid-task by an output limit, each having written nothing at all — a full budget spent on work that never reached disk.",
    humanCorrections: [
      "The previous portfolios used Yarn and Vite; the agent had to be told the stack was a requirement, not a migration to reason about.",
      "Skill proficiency percentages from the old site were dropped — they were never measured, so they were decoration presented as data.",
      "The résumé and the older portfolio disagree on two award dates; the agent flagged the conflict for a human rather than picking one.",
      "Descriptions of internal work were pulled back from operational detail to the level of decisions and lessons.",
      "A test asserted that collapsed content was absent from the page. It wasn't a bug — the content stays in the DOM deliberately so the print stylesheet can expand it. Taken at face value, 'make the failing test pass' would have broken printing to satisfy a wrong assertion.",
      "Another test froze a defect as the expectation: it recorded a run-together screen-reader label as correct because that was what the code produced at the time. The observation was accurate; treating it as the contract was the error.",
    ],
    lesson:
      "Separating the content layer from the components did most of the work. Once facts had exactly one home and a type that permitted 'not known yet', fabrication became the awkward path rather than the convenient one. The sharper lesson came from the tests: twice, a suite asserted what the code did rather than what it should do, and a green run would have certified a defect. Verification is only worth what its assertions are worth, and that part does not delegate.",
    nextExperiment:
      "Run the same specification through a second tool and compare where each one chose to invent rather than ask.",
    sources: [
      { label: "Claude Code documentation", href: "https://code.claude.com/docs" },
    ],
    lastUpdated: "2026-08-16",
  },

  {
    id: "context-reuse",
    title: "Project instructions as the reusable unit",
    started: "August 2026",
    sortKey: "2026-08-c",
    status: "Exploring",
    question:
      "Which is the more durable artefact — a well-engineered prompt, or a written project instruction that every future session inherits?",
    hypothesis:
      "Prompts are disposable and get rewritten from memory each time. Instructions that live in the repository accumulate: each correction becomes a rule, and the same class of mistake stops recurring.",
    toolIds: ["claude-code", "cursor"],
    whyThisTool:
      "Both support repository-level instruction files, so the same idea can be tested across two tools without changing the underlying project.",
    contextSupplied: [],
    stageIds: ["idea-to-spec", "implement", "review-diff"],
    humanDecisionPoints: [
      "Deciding which corrections are general rules and which were one-off.",
    ],
    safetyBoundaries: [
      "Instructions describe conventions and constraints. They do not grant permission to act without review.",
    ],
    verification: [],
    nextExperiment:
      "Keep a log of corrections over a month, then check how many were repeats of something already written down. That ratio is the actual measure.",
    lastUpdated: "2026-08-16",
  },

  {
    id: "parallel-exploration",
    title: "Parallel agents on an unfamiliar codebase",
    started: "August 2026",
    sortKey: "2026-08-b",
    status: "Exploring",
    question:
      "When several agents explore the same unfamiliar system independently, does the disagreement between their reports carry more information than any single report?",
    hypothesis:
      "It should, for the same reason it did in the retailer feasibility work: a single pass cannot distinguish 'nothing here' from 'I didn't look there'. Independent passes can.",
    toolIds: ["claude-code"],
    whyThisTool:
      "It can run several investigations concurrently and keep their findings separate until a human asks for them to be combined.",
    contextSupplied: [],
    stageIds: ["explore-codebase", "parallel-research"],
    humanDecisionPoints: [
      "Reconciling contradictory findings, rather than accepting a synthesis that hides them.",
    ],
    safetyBoundaries: ["Read-only exploration. No edits during an investigation pass."],
    verification: [],
    nextExperiment:
      "Try it on a codebase I already know well, so I can actually score the reports instead of trusting them.",
    lastUpdated: "2026-08-16",
  },

  {
    id: "verification-gates",
    title: "Verification gates before automation touches live systems",
    started: "August 2026",
    sortKey: "2026-08-a",
    status: "Exploring",
    question:
      "What is the smallest set of automated checks that makes a human approval step meaningful rather than ceremonial?",
    hypothesis:
      "Approval steps decay when the reviewer has no cheap way to disagree. If the automation produces its evidence in a reviewable form, approval becomes a real decision instead of a signature.",
    toolIds: ["claude-code"],
    whyThisTool:
      "It can run a project's own checks and report the real output, which is the raw material a reviewer needs.",
    contextSupplied: [],
    stageIds: ["tests", "review-diff"],
    humanDecisionPoints: [
      "Everything the gate is guarding. That is the point of the gate.",
    ],
    safetyBoundaries: [
      "Anything with an irreversible effect stays behind an explicit human action.",
    ],
    verification: [],
    limitation:
      "I don't yet have a good answer for approval fatigue. A gate that fires constantly gets waved through, and I have not tested where that threshold sits.",
    nextExperiment:
      "Instrument one real workflow: record how often the gate is used to actually reject something. If that number is near zero, the gate is theatre.",
    lastUpdated: "2026-08-16",
  },
] satisfies readonly AiExperiment[];

/* -------------------------------------------------------------------------- */
/* Learning log                                                                */
/* -------------------------------------------------------------------------- */

export const learningLog = {
  lastUpdated: "2026-08-16",
  exploringNow: [
    "Where agentic workflows stop helping — the tasks where delegating the work costs more review time than doing it.",
    "Context engineering as a repository concern rather than a per-session one.",
    "Verification as a designed step, not an afterthought bolted on once something already works.",
  ],
  changedMyThinking: [
    {
      before: "Parallelism is about speed.",
      after:
        "Parallelism is about disagreement. Several independent looks are valuable because they contradict each other, and that is the part a single pass can never give you.",
    },
    {
      before: "A confident, well-written answer is a good sign.",
      after:
        "Fluency and correctness are unrelated. The useful question is what the answer would look like if it were wrong — and whether I could tell.",
    },
    {
      before: "The tool is the thing worth learning.",
      after:
        "The tools change every few months. What transfers is knowing which judgements can be delegated and which quietly break the moment you delegate them.",
    },
  ],
  wantToTestNext: [
    "Run the same written specification through a second tool and compare where each one invented rather than asked.",
    "Keep a month-long correction log and measure how many corrections were repeats of something already written down.",
    "Instrument one approval gate and count how often it is actually used to reject something.",
  ],
  entries: [
    {
      id: "log-2026-08-16-portfolio",
      date: "2026-08-16",
      title: "Separating content from components did the anti-fabrication work",
      body: "Building this site, the thing that prevented invented facts was not a careful prompt — it was giving every fact exactly one home in a typed content layer, with a type that permits 'not known yet'. Once a missing value had a legitimate representation, filling it in with a guess became the awkward path rather than the convenient one.",
      tags: ["context engineering", "Claude Code", "verification"],
    },
    {
      id: "log-2026-08-16-feasibility",
      date: "2026-08-16",
      title: "Wrote up the multi-strategy feasibility workflow properly for the first time",
      body: "Putting the retailer feasibility work into words surfaced something I had not articulated while building it: the value was never the parallelism or the speed. It was that forcing independent strategies to disagree in the open is what made the output trustworthy enough to commit a launch date to. Speed changed what the question was for; disagreement is what made the answer safe to act on.",
      tags: ["multi-agent", "reverse engineering", "verification"],
    },
  ],
} satisfies LearningLog;
