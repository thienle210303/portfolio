/**
 * Single source of truth for everything factual on this site.
 *
 * Provenance:
 *  - Résumé (Thien_s_Resume.pdf) is authoritative for employers, dates,
 *    roles, education, awards, skills and certifications.
 *  - portfolio-v2 (github.com/thienle210303/portfolio-v2) supplied the
 *    project inventory, contact details and links.
 *  - The DoorDash narrative detail was supplied directly by Thien.
 *
 * Anything not covered by those three sources is marked `[NEEDS INPUT: ...]`
 * and is omitted from the rendered UI rather than guessed at.
 */

import { resolveSiteUrl } from "@/lib/site-url";
import type {
  Achievement,
  AiTool,
  CareerEntry,
  Certification,
  CodeTab,
  Companion,
  ContactIntent,
  EducationEntry,
  LoopStep,
  NavItem,
  Origin,
  Principle,
  Profile,
  Project,
  ResumeLens,
  SkillCategory,
  SocialLink,
} from "@/types/portfolio";

/* -------------------------------------------------------------------------- */
/* Site                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The domain the site describes itself as living at. It drives metadataBase,
 * canonical URLs, the sitemap and JSON-LD.
 *
 * The literal below is the fallback — change it when the real domain changes.
 * A deployment can override it without a code change by setting
 * `NEXT_PUBLIC_SITE_URL`, and a preview deployment falls back to its own
 * hostname so it never claims to be production. See `resolveSiteUrl`.
 */
export const SITE_URL = resolveSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_URL,
  "https://thienle.dev",
);

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export const profile = {
  name: "Thien Le",
  shortName: "Thien",
  monogram: "TL",
  title: "Software Engineer",
  positioning:
    "I engineer software that turns complex work into clear, reliable systems.",
  focus:
    "Software engineer focused on automation, developer experience, performance, and workflows that did not exist before.",
  philosophy: "Unsolved is not the same as unsolvable.",
  headline: "I build where the answer isn't obvious.",
  intro:
    "I'm a software engineer and curious systems builder drawn to difficult, undefined problems. I question assumptions, navigate constraints, explore unconventional paths, and keep iterating until something useful emerges.",
  about: [
    "Most of my work has started the same way: someone hands me a process that already technically functions, and everyone has quietly agreed to live with how slow, brittle or manual it is.",
    "I'm less interested in whether a problem is hard than in whether anyone has actually looked at it recently. Constraints move. Assumptions expire. The direct path being blocked is information, not a verdict.",
    "I write software for retail data at DoorDash. Before that I built scrapers at research scale, shipped features for an educational spelling platform, and replaced paper workflows on a manufacturing floor.",
  ],
  email: "thienle210303@gmail.com",
  // Round 18: both set, and the round-17 comment explaining why they were
  // deliberately blank is superseded rather than deleted — the reason it gave
  // was real (an availability line advertises a job search to a current
  // employer, and a location discourages inbound), and the owner has decided
  // that trade is worth making. Recording the decision matters more than
  // recording the hesitation.
  location: "Taylors, South Carolina",
  availability: "Open to remote, and to relocation when it's worth it.",
  resumePdf: "/thien-le-resume.pdf",
  resumePdfLabel: "Thien Le — Résumé (PDF)",
} satisfies Profile;

/**
 * The only geographic fact the origin story may draw. Every caption, label
 * and storyboard frame the story renders computes from career entries or
 * from this block — never a second, independently-typed place name.
 */
export const origin = {
  // Province level, no city (owner's decision, 2026-09-02). This one string
  // serves the globe's pin, the origin story's captions and the résumé — the
  // site must never carry two names for one place.
  from: "Kiên Giang, Việt Nam",
  // Round 18: a city, not a country. Until now no city was authored anywhere
  // on this site, which is why the globe pinned the geographic centre of the
  // United States and said so out loud in the USA world's `where` line. Both
  // change with this one field.
  to: "Taylors, South Carolina",
  arrived: "December 2018",
  arrivedOn: "2018-12",
  arrivedYear: 2018,
  born: "2003-03-03",
  withFamily: true,
  english: "Basic reading, writing and listening. No speaking.",
  coordinates: {
    from: { lat: 10.0, lon: 105.1 },
    // Taylors, South Carolina — 34°54′48″N 82°18′39″W per Wikipedia and
    // TopoZone (GNIS). The one coordinate pair on this site that is not from
    // the résumé or the old repo, so it names its source instead.
    to: { lat: 34.9133, lon: -82.3108 },
  },
} satisfies Origin;

/**
 * The two cats. Order is load-bearing: the lead cat is first, which is the
 * same order `Companion.tsx` draws them in and the order the globe's plinth
 * labels them under.
 */
export const companions = [
  {
    id: "moon",
    name: "Moon",
    coat: "the blue cat",
    habit: "Leads, and sets the pace.",
    authoredOn: "2026-09-02",
    belongsTo: "my girlfriend",
  },
  {
    id: "mi",
    name: "Mi",
    coat: "the grey tabby",
    habit: "Follows, and gets distracted.",
    authoredOn: "2026-09-02",
    belongsTo: "my girlfriend",
  },
] satisfies readonly Companion[];

export const socialLinks = [
  {
    id: "github",
    platform: "GitHub",
    label: "GitHub",
    handle: "thienle210303",
    href: "https://github.com/thienle210303",
    external: true,
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    label: "LinkedIn",
    handle: "in/thienle210303",
    href: "https://www.linkedin.com/in/thienle210303",
    external: true,
  },
  {
    id: "email",
    platform: "Email",
    label: "Email",
    handle: profile.email,
    href: `mailto:${profile.email}`,
    external: false,
  },
] satisfies readonly SocialLink[];

// Order must match the render order in src/app/page.tsx: the nav doubles as
// the page's table of contents, and a nav that lists sections in a different
// order than the page scrolls through them is actively misleading.
// Round 10: Journey no longer has its own section — its timeline is now the
// career tree's own "List" face (see src/sections/CareerTree/CareerTree.tsx).
// The nav item that used to point at #journey is gone; "tree" keeps its own
// entry, relabelled "Journey" — what a hiring manager scans for — since it
// now answers both #tree and #journey (src/sections/CareerTree/anchors.ts).
export const navItems = [
  { id: "nav-about", sectionId: "about", label: "About" },
  // Round 16: Playground Earth takes the slot Philosophy used to hold.
  { id: "nav-worlds", sectionId: "worlds", label: "Worlds" },
  { id: "nav-work", sectionId: "work", label: "Work" },
  { id: "nav-skills", sectionId: "skills", label: "Skills" },
  { id: "nav-tree", sectionId: "tree", label: "Journey" },
  // Round 16: the Workshop. Seven items is the most this nav has carried, so
  // it was measured rather than assumed: at 1024px (SiteNav's own `lg:`
  // breakpoint, the narrowest width the desktop row exists at) the seven
  // items occupy 449px of the header's 907px of content box and leave 257px
  // spare — one row, nothing clipped, no horizontal overflow, and 368px/624px
  // spare at 1152px/1440px. `gap-6` is therefore unchanged; an eighth item
  // would still fit before the gap has to give.
  { id: "nav-workshop", sectionId: "workshop", label: "Workshop" },
  { id: "nav-contact", sectionId: "contact", label: "Contact" },
] satisfies readonly NavItem[];

/* -------------------------------------------------------------------------- */
/* Hero code artifact                                                          */
/* -------------------------------------------------------------------------- */

export const codeTabs = [
  {
    id: "profile",
    label: "Profile",
    filename: "builder.ts",
    summary:
      "A TypeScript object literal named builder, describing the role Software Engineer, a mindset of curious, practical and always learning, strengths in turning ambiguity into systems, optimizing what already exists and creating workflows from zero, the belief that unsolved is not the same as unsolvable, and the goal of building useful systems people can trust.",
    code: `const builder = {
  role: "Software Engineer",
  mindset: ["curious", "practical", "always learning"],
  strengths: [
    "turning ambiguity into systems",
    "optimizing what already exists",
    "creating workflows from zero",
  ],
  belief: "Unsolved is not the same as unsolvable",
  goal: "Build useful systems people can trust",
};`,
  },
  {
    id: "principles",
    label: "Principles",
    filename: "principles.ts",
    summary:
      "A TypeScript object literal named principles, listing three working rules: read the system before changing it, prefer the fix that removes the whole class of problem, and measure the thing you claimed to improve. It also records that assumptions are treated as expiring, and that hard describes the current state of understanding.",
    code: `const principles = {
  first: "Read the system before changing it",
  second: "Prefer the fix that removes the class of problem",
  third: "Measure the thing you claimed to improve",
  onAssumptions: "Treat them as expiring, not permanent",
  onDifficulty: "Hard describes understanding, not the limit",
};`,
  },
  {
    id: "exploring",
    label: "Currently exploring",
    filename: "exploring.ts",
    summary:
      "A TypeScript object literal named exploring, listing current areas of study: agentic development workflows, context engineering, reverse engineering of public data surfaces, and verification as a first-class step. It notes that architecture and accountability stay human-owned.",
    code: `const exploring = {
  now: [
    "agentic development workflows",
    "context engineering for repeatable results",
    "verification as a first-class build step",
  ],
  tools: ["Claude Code", "Codex", "Cursor"],
  boundary: "Architecture and accountability stay human-owned",
};`,
  },
] satisfies readonly CodeTab[];

/* -------------------------------------------------------------------------- */
/* Philosophy                                                                  */
/* -------------------------------------------------------------------------- */

export const philosophyIntro = [
  "I don't call something impossible just because the direct path is blocked. Most of the time, \"impossible\" is shorthand for \"nobody has re-examined this since the constraints changed.\"",
  "That's not optimism. Plenty of things I've tried didn't work, and some problems stay unsolved. But the honest position is narrower than \"impossible\": I don't know how to do this yet, with what I currently understand.",
];

export const principles = [
  {
    id: "understand",
    index: 1,
    title: "Understand the real problem",
    summary:
      "The stated problem is usually a symptom someone has already interpreted for you.",
    detail:
      "Before writing anything, I want to know what the work actually looks like today — who touches it, where it stalls, and what people have quietly stopped expecting. The request and the problem are rarely the same sentence.",
    evidence: {
      context: "Schaeffler Group — manufacturing floor",
      body: "The ask was to digitise a paper process setup sheet. Watching how operators, technicians and engineers actually used those sheets showed the paper was not the problem — the absence of version control, role-based access and reusable templates was. I built for that instead.",
      projectId: "schaeffler-setup-sheets",
    },
  },
  {
    id: "system",
    index: 2,
    title: "Improve the system, not only the symptom",
    summary:
      "Fixing one instance is work. Removing the reason the instance exists is leverage.",
    detail:
      "When the same failure keeps arriving in different costumes, the individual fix is the wrong unit of work. I'd rather spend the time once on the thing that generates the failures — the tooling, the validation, the shared shape everyone builds against.",
    evidence: {
      context: "DoorDash — retail data",
      body: "Rather than hand-building scrapers one at a time, I standardised the workflows, tooling and validation they all shared. That standardisation is what made delivering 30+ production scrapers in a single week possible.",
      projectId: "dd-scraper-platform",
    },
  },
  {
    id: "measure",
    index: 3,
    title: "Build something useful and measurable",
    summary:
      "If I can't say what changed, I haven't finished — I've just moved code around.",
    detail:
      "I want a number, a before, and an after. Not because metrics are the point, but because they're the fastest way to find out I was wrong about which thing mattered.",
    evidence: {
      context: "University of South Carolina — research collection",
      body: "Rewriting collection around DOM manipulation and in-page JavaScript execution cut scraper runtime by 95%. The number is what proved the bottleneck was the interaction model, not the network.",
      projectId: "usc-research-collection",
    },
  },
] satisfies readonly Principle[];

export const problemSolvingLoop = [
  {
    id: "observe",
    label: "Observe",
    detail: "Watch the real workflow before touching it. Note where people hesitate.",
  },
  {
    id: "question",
    label: "Question assumptions",
    detail: "Ask which constraints are physics, which are policy, and which are habit.",
  },
  {
    id: "constraints",
    label: "Understand constraints",
    detail: "Separate the ones I must respect from the ones I merely inherited.",
  },
  {
    id: "reframe",
    label: "Reframe",
    detail: "Restate the problem so the blocked path stops being the only path.",
  },
  {
    id: "explore",
    label: "Explore alternate paths",
    detail: "List the approaches nobody costed out, including the unglamorous ones.",
  },
  {
    id: "experiment",
    label: "Build a small experiment",
    detail: "Make the cheapest thing that can be wrong in an informative way.",
  },
  {
    id: "test",
    label: "Test",
    detail: "Try to break it on purpose, at the size it will actually run.",
  },
  {
    id: "learn",
    label: "Learn",
    detail: "Write down what the result ruled out, not just what it confirmed.",
  },
  {
    id: "iterate",
    label: "Iterate",
    detail: "Feed it back in. Stop when it's useful, not when it's clever.",
  },
] satisfies readonly LoopStep[];

/* -------------------------------------------------------------------------- */
/* Career — canonical source for organisations, roles and dates                */
/* -------------------------------------------------------------------------- */

export const careerEntries = [
  {
    id: "doordash",
    type: "work",
    dateRange: "October 2025 — Present",
    sortKey: "2025-10",
    role: "Software Engineer",
    organization: "DoorDash, Inc.",
    // Omitted on purpose: no other timeline entry carries one, so a single
    // location here reads as an inconsistency rather than information.
    locationOrMode: undefined,
    context:
      "Retail data — the pipelines and integrations that decide whether a retail partner can be represented accurately on the platform.",
    responsibilities: [
      "Build production web scrapers that generate the structured datasets powering retail partner onboarding.",
      "Maintain operating hours, holiday schedules and location data across 18+ live retailer integrations.",
      "Set the shared standards other engineers build collection work against.",
    ],
    built: [
      "Production scrapers feeding retail partner onboarding.",
      "Standardised scraping workflows, tooling and validation used across the team.",
      "A multi-strategy agent workflow that assesses whether a retailer's public catalog can support an integration.",
    ],
    impact: [
      "Optimised a legacy scraper: 99% runtime reduction, 2.3× product coverage, failures eliminated.",
      "Standardisation enabled delivery of 30+ production scrapers in a single week.",
      "18+ live retailer integrations kept current on hours, holidays and locations.",
    ],
    learned:
      "Throughput problems in data work are usually organisational before they are technical. The scraper was never the unit that needed fixing — the way scrapers got made was.",
    technologies: ["Python", "Playwright", "HTTP / API analysis", "SQL", "Claude Code"],
    lenses: ["engineering", "automation", "optimization", "ai-workflows", "leadership"],
  },
  {
    id: "wordification",
    type: "work",
    dateRange: "May 2024 — May 2025",
    sortKey: "2024-05-b",
    role: "Software Engineer",
    organization: "Wordification by ScholarsTech LLC",
    locationOrMode: undefined,
    context:
      "The Wordification™ Project — a web-based system for language-based (rather than memory-based) English spelling instruction.",
    responsibilities: [
      "Ship features across the frontend, backend and database layers of a RedwoodJS application.",
      "Integrate and validate third-party speech services.",
    ],
    built: [
      "A demo mode letting educators evaluate personalised spelling lessons without creating student accounts.",
      "An ElevenLabs API integration with custom validation.",
    ],
    impact: [
      "Demo mode removed account creation as a prerequisite for evaluating the product.",
      "99.9% transcription accuracy achieved through the integration's custom validation layer.",
      "50+ issues resolved across frontend, backend and database layers.",
    ],
    learned:
      "The highest-leverage feature was the one that removed a step before the product could be judged at all.",
    technologies: ["RedwoodJS", "TypeScript", "GraphQL", "Prisma", "ElevenLabs API"],
    link: {
      label: "wordification.scholastechnology.com",
      href: "https://wordification.scholastechnology.com/",
    },
    lenses: ["engineering"],
  },
  {
    id: "schaeffler",
    type: "work",
    dateRange: "May 2024 — August 2024",
    sortKey: "2024-05-a",
    role: "Software Engineer Co-op",
    organization: "Schaeffler Group",
    locationOrMode: undefined,
    context:
      "Shop-floor manufacturing operations still running on paper process setup sheets.",
    responsibilities: [
      "Develop and deploy a low-code application replacing paper-based manufacturing workflows.",
      "Work directly with operators, technicians and engineers as the actual users.",
    ],
    built: [
      "A low-code application with version control, role-based access control and reusable templates.",
      "Custom Java functions integrated into the low-code platform.",
      "A Jira Issues Collector API integration for real-time production debugging, plus automated Zebra label printing.",
    ],
    impact: [
      "96% increase in production throughput after integrating custom Java functions.",
      "Fuzzy matching across 1M+ legacy records at 99.9% accuracy using the Damerau–Levenshtein algorithm.",
    ],
    learned:
      "Low-code platforms are a constraint, not a ceiling. The interesting work was deciding exactly where to escape into real Java and where the platform was genuinely faster.",
    technologies: ["Mendix", "Java", "External APIs", "Damerau–Levenshtein"],
    lenses: ["engineering", "automation", "optimization"],
  },
  {
    id: "usc-scraping",
    type: "work",
    dateRange: "August 2023 — May 2025",
    sortKey: "2023-08-b",
    role: "Web Scraping Engineer",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "Research data collection that had to keep running unattended for months at a time.",
    responsibilities: [
      "Design and operate resilient collection systems for long-running research datasets.",
      "Keep collection viable across sites actively defending against automated traffic.",
    ],
    built: [
      "Resilient scrapers that mimic human interaction patterns to avoid detection.",
      "A breadth-first traversal of product and seller networks to maximise crawl coverage.",
    ],
    impact: [
      "2 million+ records generated at a 99.9% success rate across months-long production runs.",
      "95% scraper runtime reduction through DOM manipulation and JavaScript execution.",
    ],
    learned:
      "Reliability over months is a different discipline from correctness on one run. Everything that could drift, eventually did.",
    technologies: ["Python", "Selenium", "JavaScript", "DOM", "BFS"],
    lenses: ["engineering", "automation", "optimization"],
  },
  {
    id: "usc-ta",
    type: "work",
    dateRange: "August 2023 — May 2025",
    sortKey: "2023-08-a",
    role: "Undergraduate Teaching Assistant",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "Two course tracks: Algorithm Design I & II, and Introduction to Computer Concepts & General Programming.",
    responsibilities: [
      "Lead lab sessions for Algorithm Design I & II covering data structures and algorithms.",
      "Support students during open lab hours for the introductory programming courses.",
      "Assist the honors section and grade assignments.",
    ],
    built: [],
    impact: [
      "Led lab sessions for 30+ students in Algorithm Design I & II.",
      "Supported 200+ students during open lab hours.",
      "Assisted the honors section and graded assignments for 24+ students.",
    ],
    learned:
      "Explaining a data structure to someone who isn't a CS major is the fastest way to find out whether you understand it.",
    technologies: ["Java", "Data structures", "OOP", "Python", "JavaScript", "HTML/CSS"],
    lenses: ["leadership", "engineering"],
  },
  {
    id: "usc-degree",
    type: "learning",
    dateRange: "August 2021 — May 2025",
    sortKey: "2021-08",
    role: "B.S. Computer Science, Cybersecurity minor",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "Four years of computer science with a cybersecurity minor. GPA 3.8.",
    responsibilities: [],
    built: [],
    impact: ["Graduated with a 3.8 GPA.", "Dean's List, 2021–2025."],
    learned:
      "The cybersecurity minor changed how I read systems — I started looking for what a system assumes about the people using it.",
    technologies: [],
    lenses: ["engineering"],
  },
  {
    id: "graduation",
    type: "milestone",
    dateRange: "May 2025",
    sortKey: "2025-05-e",
    role: "Graduated — B.S. Computer Science",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "Cybersecurity minor, 3.8 GPA, Dean's List 2021–2025.",
    responsibilities: [],
    built: [],
    impact: [],
    learned: undefined,
    technologies: [],
    lenses: ["engineering"],
  },
  {
    id: "cockyhacks",
    type: "milestone",
    dateRange: "April 2024",
    sortKey: "2024-04",
    role: "Best Design — MentorHub",
    organization: "CockyHacks, ACM@USC",
    locationOrMode: undefined,
    context:
      "Led a team of three to build a responsive web application connecting students with academic mentors.",
    responsibilities: [],
    built: ["MentorHub — a mentorship-matching web application built during the hackathon."],
    impact: ["Best Design."],
    learned: undefined,
    technologies: ["Python/Flask", "JavaScript/React", "APIs"],
    link: {
      label: "github.com/aarshrpatel/MentorHub",
      href: "https://github.com/aarshrpatel/MentorHub",
    },
    lenses: ["engineering", "leadership"],
  },
  {
    id: "code-to-give",
    type: "milestone",
    dateRange: "April 2023",
    sortKey: "2023-04",
    role: "2nd Place — Food Route",
    organization: "Code to Give Hackathon, Morgan Stanley",
    locationOrMode: undefined,
    context:
      "Built a web application routing people to food based on their location and preferences.",
    responsibilities: [],
    built: ["Food Route — a location- and preference-aware routing application."],
    impact: ["2nd place."],
    learned: undefined,
    technologies: ["Python/Flask", "JavaScript/React", "Redux", "SQL"],
    link: {
      label: "github.com/mellieho9/MSCodeToGive2023Project",
      href: "https://github.com/mellieho9/MSCodeToGive2023Project",
    },
    lenses: ["engineering"],
  },
  {
    id: "capstone",
    type: "milestone",
    dateRange: "May 2025",
    sortKey: "2025-05-b",
    role: "Automotive GenAI Capstone",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "Senior capstone project.",
    responsibilities: [],
    built: [
      "An AI-powered chatbot recommending real-time vehicle data with generated navigation links.",
    ],
    impact: [],
    learned: undefined,
    technologies: ["C#/ASP.NET", "JavaScript/React", "Azure", "AI"],
    lenses: ["engineering", "ai-workflows"],
  },
  {
    id: "llm-classifier",
    type: "milestone",
    dateRange: "May 2025",
    sortKey: "2025-05-a",
    role: "LLM Reviewer Classification",
    organization: "Coursework project",
    locationOrMode: undefined,
    context: "Fine-tuning study on review sentiment classification.",
    responsibilities: [],
    built: ["A DistilBERT classifier fine-tuned on a 50K IMDB review dataset."],
    impact: ["92% accuracy."],
    learned: undefined,
    technologies: ["PyTorch", "Transformers", "DistilBERT", "GPT-2", "Fine-tuning"],
    lenses: ["engineering", "ai-workflows"],
  },
  {
    id: "magellan",
    type: "milestone",
    dateRange: "2024 — 2025",
    sortKey: "2024-09",
    role: "Magellan Research Award — TRIO",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "Undergraduate research award.",
    responsibilities: [],
    built: [],
    impact: [],
    learned: undefined,
    technologies: [],
    lenses: ["engineering"],
  },
  {
    id: "acm-webmaster",
    type: "milestone",
    dateRange: "2024",
    sortKey: "2024-01",
    role: "Webmaster",
    organization: "ACM@USC",
    locationOrMode: undefined,
    context: "Chapter leadership.",
    responsibilities: ["Maintained the chapter's web presence."],
    built: [],
    impact: [],
    learned: undefined,
    technologies: [],
    lenses: ["leadership"],
  },
  {
    id: "deans-list",
    type: "milestone",
    dateRange: "2021 — 2025",
    sortKey: "2021-09",
    role: "Dean's List",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "Every year of the degree.",
    responsibilities: [],
    built: [],
    impact: [],
    learned: undefined,
    technologies: [],
    lenses: [],
  },
] satisfies readonly CareerEntry[];

export function careerEntryById(id: string): CareerEntry | undefined {
  return careerEntries.find((entry) => entry.id === id);
}

/* -------------------------------------------------------------------------- */
/* Selected work                                                               */
/* -------------------------------------------------------------------------- */

export const projects = [
  {
    id: "dd-feasibility-agent",
    title: "The one-hour feasibility question",
    tagline:
      "A multi-strategy agent workflow that answers whether a retailer's public catalog can support an integration — in under an hour instead of days of manual investigation.",
    careerEntryId: "doordash",
    status: "shipped",
    featured: true,

    problem:
      "Deciding whether a retailer could be onboarded meant a slow, manual investigation of their public storefront: what data exists, where it lives, how it's served, and whether it can be collected reliably enough to keep a live integration accurate. Every retailer was a fresh start, and the answer arrived late enough to threaten launch dates.",
    whyItMattered:
      "The assessment sat on the critical path. A retailer we couldn't evaluate quickly was a retailer we couldn't commit to, and the half-year onboarding targets were built out of those commitments.",
    assumption:
      "That this was irreducibly manual senior-engineer judgement — or work you outsourced to a specialist scraping vendor.",

    constraints: [
      "Under an hour per retailer, end to end, or it doesn't change the decision timeline.",
      "Public surfaces only, within the scope of a prospective retail partnership.",
      "The output has to be trustworthy enough to commit a launch date to — a confident wrong answer is worse than a slow one.",
      "Every retailer is architecturally different; no single strategy generalises.",
    ],
    responsibility:
      "I designed and built the workflow, and owned the judgement calls about what it should and shouldn't attempt.",

    decisions: [
      "Run several independent strategies in parallel rather than one 'correct' pipeline — static source analysis, network/API surface analysis, sitemap and robots.txt reading, and real-browser observation each see things the others miss.",
      "Drive a real Chrome session through Playwright rather than only issuing bare requests, so the workflow observes what the site actually does — which calls fire, in what order, and what triggers them.",
      "Treat the site's own structure as the specification: derive endpoint shapes, parameters, pagination behaviour and rate limits from observation rather than assuming a standard.",
      "Make the deliverable a feasibility judgement with its reasoning attached, not a raw dump. A human has to be able to disagree with it.",
      "Keep the destructive-adjacent parts human-gated: the workflow investigates and reports, it doesn't unilaterally start collecting at scale.",
    ],
    pathsExplored: [
      "A single general-purpose crawler — too shallow; it found pages but not the data-serving mechanics behind them.",
      "Pure request-level analysis without a browser — missed everything driven by client-side execution and event timing.",
      "Static source inspection alone — surfaced embedded data on some sites, nothing on others.",
      "Combining all of the above as parallel agents with a synthesis step — this is what worked.",
    ],
    whatFailed:
      "Early single-strategy versions produced confident conclusions from partial evidence. A site whose catalog was served through client-side calls would be scored as thin because the first pass never saw those calls fire.",
    failureLesson:
      "One strategy's blind spot reads exactly like an absence of data. Cross-checking independent strategies against each other is what turns 'I found nothing' into 'there is nothing' — and those are very different answers to hand a stakeholder.",

    built: [
      "A dynamic multi-agent workflow that investigates a retailer site through several independent strategies and reconciles the findings.",
      "Real-browser observation via Playwright to capture how and when a site's data calls are actually triggered.",
      "Structural analysis of robots.txt, sitemaps and page source, including data embedded in the source itself.",
      "A synthesis step producing a feasibility judgement with its supporting evidence attached.",
    ],
    workflow: {
      beforeLabel: "Before — manual investigation",
      afterLabel: "After — parallel strategies, one hour",
      before: [
        { label: "Engineer opens the site by hand" },
        { label: "Clicks through, reads source, guesses at structure" },
        { label: "Writes a throwaway probe script" },
        { label: "Repeats per retailer, from scratch", note: "days of elapsed time" },
        { label: "Feasibility answered late, or outsourced" },
      ],
      after: [
        { label: "Point the workflow at the retailer" },
        {
          label: "Strategies run in parallel",
          note: "source · network · sitemap · real browser",
        },
        { label: "Findings cross-checked against each other" },
        { label: "Feasibility judgement with evidence attached", note: "< 1 hour" },
        { label: "Human reviews and commits the launch decision" },
      ],
    },

    metrics: [
      {
        label: "Time to a feasibility answer",
        before: "Days of manual investigation",
        after: "Under 1 hour, end to end",
        source: "Recorded benchmark — DoorDash retailer feasibility workflow",
      },
    ],
    proof: [
      "A full retailer assessment completes in under an hour — a recorded benchmark, against days of manual investigation before.",
      "Multiple retail partners assessed and brought live on the platform.",
      "Contributed to closing out the half-year retail onboarding goal.",
      "Adopted by the team as the basis for internal collection tooling, reducing reliance on external scraping vendors.",
    ],

    learned:
      "The valuable output was never the data — it was a defensible answer to 'can we commit to this?' delivered while the answer still mattered. Speed changed what the question was for.",
    nextQuestion:
      "How much of the feasibility judgement can be made continuously rather than once? A retailer that was viable in January may not be in June, and nobody currently finds out until something breaks.",

    technologies: [
      "Python",
      "Playwright",
      "Multi-agent workflows",
      "HTTP / API analysis",
      "Claude Code",
    ],
    inProgressNote:
      "This work is internal to DoorDash, so there is no public demo or source link.",
  },

  {
    id: "dd-scraper-platform",
    title: "Thirty scrapers in a week",
    tagline:
      "Turning one-off collection scripts into a standardised delivery system — and taking 99% off a legacy scraper's runtime along the way.",
    careerEntryId: "doordash",
    status: "shipped",
    featured: true,

    problem:
      "Production scrapers were being built as individual artefacts. Each one carried its own conventions, its own validation, its own failure modes. Scaling the number of live retailers meant scaling the number of bespoke things to maintain.",
    whyItMattered:
      "Retail partner onboarding is gated on structured data existing. If producing that data is a per-retailer craft project, the partner count is capped by engineer-hours rather than by demand.",
    assumption:
      "That scraper count and maintenance burden necessarily grow together.",

    constraints: [
      "18+ integrations already live and depending on continuously accurate data.",
      "No freeze — standardisation had to happen while the existing scrapers kept running.",
      "Retailer sites change without notice, so the standard had to absorb change rather than assume stability.",
    ],
    responsibility:
      "I built the production scrapers and defined the shared workflows, tooling and validation the team now builds against.",

    decisions: [
      "Standardise the workflow and validation layer first, before optimising any individual scraper — the shared shape is what makes the rest cheap.",
      "Make validation a required stage rather than a convention, so a scraper that silently produces wrong data fails loudly instead.",
      "Rewrite the worst legacy scraper against the new standard as the proof case, rather than arguing for the standard in the abstract.",
    ],
    pathsExplored: [
      "Incrementally patching the legacy scraper's performance — bounded by its original design, and it kept failing for the same structural reasons.",
      "A framework everyone must adopt at once — too disruptive against live integrations.",
      "A standard plus tooling that made the standard the path of least resistance — adopted without a mandate.",
    ],

    built: [
      "Standardised scraping workflows, tooling and validation used across the team.",
      "Production scrapers generating the structured datasets that power retail partner onboarding.",
      "Maintenance of operating hours, holiday schedules and location data across 18+ live retailer integrations.",
    ],
    metrics: [
      {
        label: "Legacy scraper runtime",
        before: "Baseline",
        after: "99% reduction",
        source: "Résumé — DoorDash, Software Engineer",
      },
      {
        label: "Product coverage",
        before: "Baseline",
        after: "2.3× increase",
        source: "Résumé — DoorDash, Software Engineer",
      },
      {
        label: "Production scrapers delivered",
        before: "Built individually",
        after: "30+ in a single week",
        source: "Résumé — DoorDash, Software Engineer",
      },
    ],
    proof: [
      "99% runtime reduction and 2.3× product coverage on the optimised legacy scraper, with its failures eliminated.",
      "30+ production scrapers delivered in a single week once the standard and tooling were in place.",
      "18+ live retailer integrations kept current on hours, holidays and location data.",
    ],

    learned:
      "The 99% runtime win got the attention, but the 30-scrapers-in-a-week number is the one that actually changed the team's ceiling. Optimising one thing is a result; changing how the things get made is a different category.",
    nextQuestion:
      "Where does standardisation start costing more than it saves? Some retailers are strange enough that the standard is friction, and I don't yet have a principled way to spot those early.",

    technologies: ["Python", "Playwright", "Data validation", "SQL"],
    inProgressNote:
      "Internal DoorDash work — no public demo or source. Figures are drawn from my résumé.",
  },

  {
    id: "usc-research-collection",
    title: "Two million records, unattended",
    tagline:
      "Research-scale collection that had to survive months of unsupervised production running — at a 99.9% success rate.",
    careerEntryId: "usc-scraping",
    status: "shipped",
    featured: true,

    problem:
      "The research needed millions of records gathered over months. Collection had to run unattended against sites actively defending against automated traffic, and a run that quietly degraded halfway through would poison the dataset without anyone noticing.",
    whyItMattered:
      "A months-long collection run that fails at week six doesn't cost you a week — it costs you the whole window, because the data you wanted described a moment that has passed.",
    assumption:
      "That scale here was a throughput problem, solved by running more of everything in parallel.",

    constraints: [
      "Months of continuous unattended operation.",
      "Target sites actively detecting and disrupting automated traffic.",
      "Product and seller relationships form a graph, not a list — naive iteration misses most of it.",
    ],
    responsibility:
      "I designed, built and operated the collection systems, and owned the integrity of the resulting dataset.",

    decisions: [
      "Model collection on human interaction patterns rather than raw request volume, so throughput came from efficiency instead of aggression.",
      "Move the expensive work into the page: DOM manipulation and in-page JavaScript execution instead of round-tripping every step.",
      "Traverse product and seller networks breadth-first, so coverage grew evenly rather than descending into one deep branch.",
    ],
    pathsExplored: [
      "More parallelism against the same per-item cost — increased detection pressure without improving useful throughput.",
      "Naive depth-first traversal — went deep on a narrow slice of the network and missed breadth entirely.",
      "Reducing per-item cost via in-page execution, plus BFS for coverage — this is what held up over months.",
    ],

    built: [
      "Resilient scrapers modelled on human interaction patterns.",
      "An in-page execution path using DOM manipulation and JavaScript to collapse per-item cost.",
      "Breadth-first traversal across product and seller networks for even crawl coverage.",
    ],
    metrics: [
      {
        label: "Records collected",
        before: "—",
        after: "2,000,000+",
        source: "Résumé — University of South Carolina, Web Scraping Engineer",
      },
      {
        label: "Success rate",
        before: "—",
        after: "99.9% across months-long runs",
        source: "Résumé — University of South Carolina, Web Scraping Engineer",
      },
      {
        label: "Runtime",
        before: "Baseline",
        after: "95% reduction",
        source: "Résumé — University of South Carolina, Web Scraping Engineer",
      },
    ],
    proof: [
      "2 million+ records generated at a 99.9% success rate across months-long production runs.",
      "95% runtime reduction from moving work into the page.",
    ],

    learned:
      "Reliability at this duration is a design property, not an operational one. Everything that could drift did drift — and the only defence was assuming that in advance.",
    nextQuestion:
      "What's the right way to detect silent degradation in a long-running collection job, when the output still looks structurally valid?",

    technologies: ["Python", "Selenium", "JavaScript", "DOM", "BFS", "Automation"],
  },

  {
    id: "schaeffler-setup-sheets",
    title: "Taking the setup sheet off paper",
    tagline:
      "Replacing a paper manufacturing workflow with a low-code application — and knowing exactly when to escape into real Java.",
    careerEntryId: "schaeffler",
    status: "shipped",
    featured: true,

    problem:
      "Process setup sheets on the shop floor were paper. There was no version history, no access control, and no reuse — every sheet was rewritten from scratch, and the current revision was whichever copy you happened to be holding.",
    whyItMattered:
      "Operators, technicians and engineers all depend on the same sheet meaning the same thing. On paper, they were three people with three copies and no way to know which was current.",
    assumption:
      "That the task was 'digitise the form' — put the paper on a screen.",

    constraints: [
      "A low-code platform (Mendix) as the delivery environment.",
      "Three distinct user groups on the floor with genuinely different permissions and needs.",
      "1M+ legacy records to reconcile, with inconsistent historical data entry.",
      "A fixed co-op term — it had to be in production, not a prototype handover.",
    ],
    responsibility:
      "I built the application and worked directly with the shop-floor users who would live with it.",

    decisions: [
      "Design for version control, role-based access and reusable templates rather than replicating the paper form — the missing structure was the actual problem.",
      "Use the low-code platform for what it's fast at, and drop into custom Java where the platform's model was the bottleneck.",
      "Use Damerau–Levenshtein for legacy record matching, because the historical data's errors were transpositions and typos, not random noise.",
      "Wire in the Jira Issues Collector API so production problems could be reported from inside the tool, at the moment they happened.",
    ],
    pathsExplored: [
      "A pure low-code build with no custom code — hit a ceiling on the parts that determined throughput.",
      "Exact-match reconciliation of legacy records — failed against real historical data entry.",
      "Fuzzy matching tuned for transposition errors — this is what got the legacy data usable.",
    ],

    built: [
      "A low-code application with version control, role-based access control and reusable templates.",
      "Custom Java functions integrated into the low-code platform.",
      "A Damerau–Levenshtein fuzzy-matching pass over 1M+ legacy records.",
      "Jira Issues Collector API integration for real-time production debugging, plus automated Zebra label printing.",
    ],
    metrics: [
      {
        label: "Production throughput",
        before: "Baseline",
        after: "96% increase",
        source: "Résumé — Schaeffler Group, Software Engineer Co-op",
      },
      {
        label: "Legacy records reconciled",
        before: "1,000,000+ unmatched",
        after: "99.9% matching accuracy",
        source: "Résumé — Schaeffler Group, Software Engineer Co-op",
      },
    ],
    proof: [
      "96% increase in production throughput after integrating custom Java functions.",
      "1M+ legacy records fuzzy-matched at 99.9% accuracy.",
      "Deployed to shop-floor operators, technicians and engineers.",
    ],

    learned:
      "The users told me what the real problem was in the first hour, but only because I asked about their day instead of about the form. The paper was never the complaint.",
    nextQuestion:
      "How do you keep a low-code application maintainable once a meaningful share of its behaviour lives in custom code? The escape hatch that made it work is also the thing that makes it harder to hand over.",

    technologies: ["Mendix", "Java", "External APIs", "Damerau–Levenshtein", "Jira API"],
  },

  {
    id: "automotive-genai",
    title: "Automotive GenAI capstone",
    tagline:
      "An AI-powered chatbot that recommends real-time vehicle data and generates the navigation links to act on it.",
    careerEntryId: "capstone",
    status: "shipped",
    featured: false,

    problem:
      "Vehicle information is spread across sources and formats, so answering a practical question about a car means assembling the answer yourself from several places.",
    whyItMattered:
      "The gap wasn't information availability — it was that getting from a question to something you could act on took too many steps.",
    assumption: undefined,

    constraints: [
      "A fixed academic term with a team delivering together.",
      "Recommendations had to be grounded in real-time vehicle data, not model recall.",
    ],
    // Sourced from portfolio-v2, which records the capstone role as
    // "Project Manager & Full-stack Developer". Do not put a [NEEDS INPUT]
    // marker in this field: `responsibility` is a required `string`, not a
    // `Maybe<string>`, so `resolved()` does not apply and a marker here
    // renders straight into the page.
    responsibility:
      "Project manager and full-stack developer on the capstone team.",

    decisions: [
      "Ground the chatbot's recommendations in real-time vehicle data rather than relying on the model's own knowledge.",
      "Generate navigation links alongside answers, so the output was actionable rather than just informative.",
    ],
    pathsExplored: [],

    built: [
      "An AI-powered chatbot recommending real-time vehicle data with generated navigation links.",
    ],
    proof: [
      "Delivered as the University of South Carolina senior capstone, May 2025.",
    ],

    learned:
      "Grounding a model in live data is less about the model and more about being strict on what it's allowed to answer from.",
    nextQuestion:
      "How do you communicate to a user which part of an answer came from live data and which came from the model?",

    technologies: ["C#/ASP.NET", "JavaScript/React", "Azure", "AI"],
    demo: {
      label: "Live demo",
      href: "https://fat-tabby-cat.azurewebsites.net/about",
    },
    inProgressNote:
      "Team project — the full case study is still being written up with my specific contributions separated out.",
  },
] satisfies readonly Project[];

/* -------------------------------------------------------------------------- */
/* Résumé                                                                      */
/* -------------------------------------------------------------------------- */

export const resumeSummary =
  "Software engineer working on retail data at DoorDash. I build automated collection and integration systems, and I'm at my best on problems where the path isn't defined yet — optimising what already exists, or creating a workflow that didn't previously exist. B.S. Computer Science, University of South Carolina, 3.8 GPA.";

export const resumeLenses = [
  {
    id: "engineering",
    label: "Software engineering",
    description: "Shipping production systems across the stack.",
  },
  {
    id: "automation",
    label: "Automation",
    description: "Removing manual steps from work that repeats.",
  },
  {
    id: "optimization",
    label: "Optimization",
    description: "Making existing systems measurably faster or more reliable.",
  },
  {
    id: "ai-workflows",
    label: "AI workflows",
    description: "Agentic development, with verification kept human-owned.",
  },
  {
    id: "leadership",
    label: "Leadership",
    description: "Setting standards, teaching, and raising a team's ceiling.",
  },
] satisfies readonly ResumeLens[];

export const skillCategories = [
  {
    id: "languages",
    label: "Languages",
    skills: [
      "Python",
      "Java",
      "TypeScript",
      "JavaScript",
      "C#",
      "C/C++",
      "SQL",
      "HTML/CSS",
    ],
    evidence:
      "Python and JavaScript across all collection work; Java at Schaeffler and as a TA; TypeScript on Wordification and this site.",
    lenses: ["engineering"],
  },
  {
    id: "data",
    label: "Data & storage",
    skills: ["PostgreSQL", "SQL", "MongoDB", "GraphQL", "Prisma"],
    evidence:
      "GraphQL and Prisma on Wordification; relational data throughout the DoorDash retail pipelines.",
    lenses: ["engineering"],
  },
  {
    id: "frameworks",
    label: "Frameworks & libraries",
    skills: [
      "React",
      "Next.js",
      "RedwoodJS",
      "ASP.NET",
      "Flask",
      "Selenium",
      "Playwright",
      "PyTorch",
      "Transformers",
    ],
    evidence:
      "Selenium and Playwright across production collection systems; RedwoodJS on Wordification; PyTorch for the DistilBERT fine-tuning project.",
    lenses: ["engineering", "automation"],
  },
  {
    id: "practices",
    label: "Automation & data extraction",
    skills: [
      "Web scraping at scale",
      "API analysis",
      "Browser automation",
      "Data validation",
      "BFS / graph traversal",
      "Fuzzy matching",
    ],
    evidence:
      "2M+ records at USC; 18+ live retailer integrations and 30+ scrapers in a week at DoorDash; Damerau–Levenshtein matching over 1M+ records at Schaeffler.",
    lenses: ["automation", "optimization", "engineering"],
  },
  {
    id: "ai",
    label: "AI-assisted engineering",
    skills: [
      "Claude Code",
      "Codex",
      "Cursor",
      "Agentic workflows",
      "Context engineering",
      "Model fine-tuning",
    ],
    evidence:
      "Multi-agent feasibility workflow at DoorDash; DistilBERT fine-tuning at 92% accuracy.",
    lenses: ["ai-workflows", "automation"],
  },
  {
    id: "platforms",
    label: "Cloud & platforms",
    skills: ["AWS", "Azure", "Google Cloud", "Mendix", "Git/GitHub"],
    evidence:
      "Azure on the capstone and Conscea projects; Mendix throughout the Schaeffler co-op.",
    lenses: ["engineering"],
  },
] satisfies readonly SkillCategory[];

export const education = [
  {
    id: "usc",
    institution: "University of South Carolina",
    credential: "B.S. Computer Science — Cybersecurity minor",
    dateRange: "August 2021 — May 2025",
    details: [
      "GPA 3.8",
      "Dean's List, 2021–2025",
      "Magellan Research Award — TRIO, 2024–2025",
      "Webmaster, ACM@USC, 2024",
    ],
  },
] satisfies readonly EducationEntry[];

export const certifications = [
  {
    id: "att",
    name: "Technology Academy",
    issuer: "AT&T",
    date: undefined,
  },
  {
    id: "jpmorgan",
    name: "Software Engineering",
    issuer: "JPMorgan",
    date: undefined,
  },
  {
    id: "visa",
    name: "Token Service Technology",
    issuer: "VISA",
    date: undefined,
  },
] satisfies readonly Certification[];

export const achievements = [
  // Dates here follow portfolio-v2, not the résumé. Thien confirmed the
  // résumé's PROJECT & COMPETITION dates are wrong for these two events.
  {
    id: "a-cockyhacks",
    title: "Best Design",
    context: "CockyHacks, ACM@USC — MentorHub",
    date: "April 2024",
  },
  {
    id: "a-code-to-give",
    title: "2nd Place",
    context: "Code to Give Hackathon, Morgan Stanley — Food Route",
    date: "April 2023",
  },
  {
    id: "a-magellan",
    title: "Magellan Research Award — TRIO",
    context: "University of South Carolina",
    date: "2024 — 2025",
  },
  {
    id: "a-deans",
    title: "Dean's List",
    context: "University of South Carolina",
    date: "2021 — 2025",
  },
] satisfies readonly Achievement[];

/* -------------------------------------------------------------------------- */
/* AI tooling reference                                                        */
/* -------------------------------------------------------------------------- */

export const aiTools = [
  {
    id: "claude-code",
    name: "Claude Code",
    vendor: "Anthropic",
    what: "Agentic coding in the terminal and editor.",
    href: "https://code.claude.com/docs",
  },
  {
    id: "codex",
    name: "Codex",
    vendor: "OpenAI",
    what: "Agentic coding assistant.",
    href: "https://developers.openai.com/codex/",
  },
  {
    id: "cursor",
    name: "Cursor",
    vendor: "Anysphere",
    what: "AI-native code editor.",
    href: "https://cursor.com/docs",
  },
  {
    id: "playwright",
    name: "Playwright",
    vendor: "Microsoft",
    what: "Browser automation — used as the agent's hands, not as an AI tool.",
    href: "https://playwright.dev/docs/intro",
  },
] satisfies readonly AiTool[];

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */

export const contactIntents = [
  {
    id: "opportunity",
    label: "I have a career opportunity",
    description: "Roles, teams, and what the work actually looks like.",
    subject: "Career opportunity",
    messageStarter:
      "Hi Thien,\n\nI'm reaching out about a role I think could be a fit. Here's the team and what the work looks like:\n\n",
  },
  {
    id: "crazy-idea",
    label: "I have a crazy idea",
    description: "A project, a collaboration, something nobody asked for yet.",
    subject: "A crazy idea",
    messageStarter:
      "Hi Thien,\n\nOkay, hear me out:\n\n",
  },
  {
    id: "hello",
    label: "Just want to say hello",
    description: "No agenda required. Feedback about this site lands here too.",
    subject: "Hello",
    messageStarter:
      "Hi Thien,\n\nJust wanted to say hello. A bit about me:\n\n",
  },
  {
    id: "secret",
    label: "It's a secret \u{1F92B}",
    description: "The cats have been briefed. They'll deny everything.",
    subject: "A secret",
    messageStarter:
      "Hi Thien,\n\nI can't say much here. What I can say:\n\n",
  },
] satisfies readonly ContactIntent[];

/* -------------------------------------------------------------------------- */
/* Closing                                                                     */
/* -------------------------------------------------------------------------- */

export const closing = {
  heading: "Thank you for spending a little time with my work.",
  body: "Whether you arrived with an opportunity, an idea, or simple curiosity, I'm glad you visited.",
} as const;

/**
 * The sign-off (round 15, item 4): the page's parting line, one per deploy.
 * Owner-approved wordplay in the owner's voice — approved with creative
 * license 2026-08-25 ("whatever makes it look good, unique and outstanding").
 *
 * `pivot` is the word the pun lands on, rendered in the site's mono as an
 * inline code token — the joke arrives in the same face the site writes
 * code in, which is the whole point. A signoff with an empty `pivot` is a
 * plain line (the chiasmus needs no costume). Rendering picks ONE by
 * day-of-year at render time; the page is statically built, so the choice
 * is frozen per deploy and can never mismatch between server and client.
 */
export const closingSignoffs = [
  { lead: "Turn an idea into an ", pivot: "i_did", tail: "." },
  { lead: "Practice makes ", pivot: "AI", tail: "." },
  { lead: "Learn as you build. Build as you learn.", pivot: "", tail: "" },
] as const;
