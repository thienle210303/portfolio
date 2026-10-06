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
  NavItem,
  Origin,
  Profile,
  Project,
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
  // Round 18. Every sentence below traces to `origin`, a career entry, or a
  // metric — which the previous drafts of these fields did not. They were
  // written *about* Thien rather than *by* him, and that is what a reader was
  // picking up on. (A fifth, `intro`, was deleted in Plan B: it restated
  // `positioning` one line above it on the page.)
  //
  // `about` is three short paragraphs, deliberately: the owner asked for a
  // "quick less introduction", and this section's job is sixty seconds, not
  // a biography.
  positioning:
    "I write software for retail data at DoorDash. Before that I was a chef in my family's restaurant.",
  focus:
    "Automated collection and integration systems — the pipelines that decide whether a retail partner can be described accurately at all.",
  // A motto he adopted, not a fact the site asserts. It was generated rather
  // than sourced, and he asked to keep it.
  philosophy: "Unsolved is not the same as unsolvable.",
  headline: "I keep asking, and I go and look.",
  about: [
    "I moved from Kiên Giang, Việt Nam to Taylors, South Carolina in December 2018, at fifteen, with my family. I could read and write English. I could not speak it.",
    "For the next two and a half years I finished high school, worked the line and the floor at my family's restaurant, and drove for Uber Eats. I started university in chemical engineering. My friends told me to try computer science instead.",
    "Since then: three million records collected unattended for a research group, a paper manufacturing process taken off paper, and a retail catalog scraper taken from seventeen hours to three minutes. What I'm most curious about now is LLMs and machine learning.",
  ],
  email: "thienle210303@gmail.com",
  // Round 18: both set, and the round-17 comment explaining why they were
  // deliberately blank is superseded rather than deleted — the reason it gave
  // was real (an availability line advertises a job search to a current
  // employer, and a location discourages inbound), and the owner has decided
  // that trade is worth making. Recording the decision matters more than
  // recording the hesitation.
  // `availability` is printed in the hero's rail. `location` is kept as an
  // authored fact but nothing renders it today: the first About paragraph says
  // the same place in prose, and the rail dropped its "Based" note for that.
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
  // United States and said so out loud in the arrival pin's `where` line (now Living
  // Earth's). Both change with this one field.
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
// Round 18: four sections. Selected Work and Skills are gone — the case studies
// render inside the Journey's branches. The Journey is the `tree` section,
// labelled "Journey" because that is what a hiring manager scans for, and it
// answers both #tree and #journey (src/sections/CareerTree/CareerTree.tsx).
export const navItems = [
  { id: "nav-about", sectionId: "about", label: "About" },
  // Round 16: Playground Earth takes the slot Philosophy used to hold.
  { id: "nav-worlds", sectionId: "worlds", label: "Worlds" },
  { id: "nav-tree", sectionId: "tree", label: "Journey" },
  { id: "nav-contact", sectionId: "contact", label: "Contact" },
] satisfies readonly NavItem[];

/* -------------------------------------------------------------------------- */
/* Hero code artifact                                                          */
/* -------------------------------------------------------------------------- */

export const codeTabs = [
  {
    id: "projector",
    label: "The globe",
    filename: "src/lib/globe.ts",
    source: "From this site's own source code.",
    summary:
      "A TypeScript function named project that rotates a three-dimensional point by the globe's spin and tilt, then returns its x and y screen position, whether it faces the viewer, and its depth.",
    code: `export function project(v: Vec3, spin: number, tilt: number, view: Viewport): Projected {
  const r = rotate(v, spin, tilt);
  return {
    x: view.cx + view.radius * r[1],
    y: view.cy - view.radius * r[2],
    front: r[0] > 0,
    depth: r[0],
  };
}`,
  },
  {
    id: "honesty",
    label: "The rule",
    filename: "tests/lib/worlds.test.ts",
    source: "From this site's own source code.",
    summary:
      "A TypeScript test asserting that the text of every field plaque on the globe is a string the content layer can produce.",
    code: `  it("renders every field plaque verbatim from the content layer", () => {
    for (const world of resolved) {
      for (const plaque of world.plaques) {
        if (plaque.kind !== "field") continue;
        expect(
          AUTHORED.has(plaque.text),
          \`\${world.id}: "\${plaque.text}" is not a string the content layer can produce\`,
        ).toBe(true);
      }
    }
  });`,
  },
  {
    id: "overlap",
    label: "The overlap",
    filename: "src/lib/knowledge-tree.ts",
    source: "From this site's own source code.",
    summary:
      "A TypeScript function named concurrentWith that returns the ids of every other non-milestone career entry whose start and end months overlap the given entry's, comparing the months inclusively.",
    code: `export function concurrentWith(entryId: string): readonly string[] {
  const subject = ENTRIES.find((entry) => entry.id === entryId);
  if (!subject || subject.type === "milestone") return [];
  const own = span(subject);
  return ENTRIES
    .filter((other) => other.id !== entryId && other.type !== "milestone")
    .filter((other) => {
      const theirs = span(other);
      return own.start <= theirs.end && theirs.start <= own.end;
    })
    .map((other) => other.id);
}`,
  },
] satisfies readonly CodeTab[];

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
    // Omitted on purpose: no other career entry carries one, so a single
    // location here reads as an inconsistency rather than information.
    locationOrMode: undefined,
    context:
      "Retail data — the pipelines and integrations that decide whether a retail partner can be represented accurately on the platform.",
    responsibilities: [
      "Build production web scrapers that generate the structured datasets powering retail partner onboarding.",
      "Maintain operating hours, holiday schedules and location data across 20+ live retailer integrations.",
      "Set the shared standards other engineers build collection work against.",
    ],
    built: [
      "An agentic scraping platform with reusable AI skills, multi-agent orchestration and deterministic validation gates.",
      "Production Python/Scrapy and Kotlin pipelines processing millions of SKU-location records.",
      "A monthly eight-stage SKU governance pipeline, collapsed from a manual process into a single run.",
      "Automated nationwide store-data audits across the live integrations.",
      "A multi-strategy agent workflow that assesses whether a retailer's public catalog can support an integration.",
    ],
    impact: [
      "Re-engineered a major retailer's catalog scraper from HTML crawling to a direct API: runtime 17 hours to 3 minutes, coverage 654 to 1,529 products, failures 3.9% to zero, plus hidden data the crawl never reached.",
      "Automated an eight-stage SKU governance process into one run, restoring SKUs that generated $2.8M cumulative GOV.",
      "Delivered 30+ production scrapers in a single week once the platform and its validation gates were in place.",
      "40+ merchants and 20+ live integrations kept current on hours, holidays and location data.",
      "Reduced cancellations caused by stale hours and unreported closures.",
    ],
    learned:
      "Throughput problems in data work are usually organisational before they are technical. The scraper was never the unit that needed fixing — the way scrapers got made was.",
    technologies: [
      "Python",
      "Kotlin",
      "Scrapy",
      "Playwright",
      "Snowflake",
      "Databricks",
      "PostgreSQL",
      "Zyte API",
      "gRPC",
      "Docker",
      "HTTP / API analysis",
      "SQL",
      "Claude Code",
    ],
  },
  {
    id: "wordification",
    type: "work",
    dateRange: "May 2024 — May 2025",
    sortKey: "2024-05-b",
    endSortKey: "2025-05",
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
      "A no-account interactive game preview, letting an educator play a lesson from the student's side and validate teacher-configured content before assigning it.",
      "An automated speech-generation QA pipeline using ElevenLabs and Google Cloud speech recognition, with transcript verification and automatic regeneration.",
    ],
    impact: [
      "The preview removed account creation as a prerequisite for evaluating the product.",
      "99.9% validated audio accuracy through transcript verification and automatic regeneration.",
      "50+ issues resolved across frontend, backend and database layers.",
    ],
    learned:
      "The highest-leverage feature was the one that removed a step before the product could be judged at all.",
    technologies: ["RedwoodJS", "TypeScript", "GraphQL", "Prisma", "ElevenLabs API", "Google Cloud"],
    link: {
      label: "wordification.scholastechnology.com",
      href: "https://wordification.scholastechnology.com/",
    },
  },
  {
    id: "schaeffler",
    type: "work",
    dateRange: "May 2024 — August 2024",
    sortKey: "2024-05-a",
    endSortKey: "2024-08",
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
  },
  {
    // Round 18 date fix. `D:\Project\Portfolio-v2`'s own experience data
    // records this role as starting August 2022; the résumé's "August 2023"
    // is the later revision and the earlier one is right. The site was
    // understating a year of research — and it is the year the CS switch
    // happened, which makes it the year the two halves of the story meet.
    id: "usc-scraping",
    type: "work",
    dateRange: "August 2022 — May 2025",
    sortKey: "2022-08",
    endSortKey: "2025-05",
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
      "3M+ Amazon and Kroger product and seller records generated at a 99.9% success rate across months-long production runs.",
      "95% scraper runtime reduction by executing custom JavaScript inside Selenium for direct DOM extraction, replacing element-by-element WebDriver calls.",
      "Modelled seller–product relationships as a graph and crawled breadth-first, prioritising sellers by rating, review volume and product count while preventing duplicate traversal.",
    ],
    learned:
      "Reliability over months is a different discipline from correctness on one run. Everything that could drift, eventually did.",
    technologies: ["Python", "Selenium", "JavaScript", "DOM", "BFS"],
  },
  {
    id: "usc-ta",
    type: "work",
    dateRange: "August 2023 — May 2025",
    sortKey: "2023-08-a",
    endSortKey: "2025-05",
    role: "Undergraduate Teaching Assistant",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "Two course tracks: Algorithm Design I & II, and Introduction to Computer Concepts & General Programming.",
    responsibilities: [
      "Lead lab sessions for Algorithm Design I & II covering data structures and algorithms.",
      "Support students during open lab hours for the introductory programming courses.",
    ],
    built: [],
    impact: [
      "Led lab sessions for 30+ students in Algorithm Design I & II.",
      "Supported 200+ students during open lab hours.",
    ],
    learned:
      "Explaining a data structure to someone who isn't a CS major is the fastest way to find out whether you understand it.",
    technologies: ["Java", "Data structures", "OOP", "Python", "JavaScript", "HTML/CSS"],
  },
  {
    id: "usc-degree",
    type: "learning",
    dateRange: "August 2021 — May 2025",
    sortKey: "2021-08-b",
    endSortKey: "2025-05",
    role: "B.S. Computer Science, Cybersecurity minor",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "The degree he finished, in computer science with a cybersecurity minor — after starting in chemical engineering. GPA 3.8.",
    responsibilities: [],
    built: [],
    impact: ["Graduated with a 3.8 GPA.", "Dean's List, 2021–2025."],
    learned:
      "The cybersecurity minor changed how I read systems — I started looking for what a system assumes about the people using it.",
    technologies: [],
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
  },
  /* ---------------------------------------------------------------------- */
  /* Round 18: the years before the degree.                                  */
  /*                                                                         */
  /* Every fact below came from the owner directly (2026-09-30 input sheet)   */
  /* or from `D:\Project\Portfolio-v2`. None of it is on the résumé, which is */
  /* exactly why the site did not have it: the content layer only ever read   */
  /* the résumé, the old repo's project list, and one DoorDash narrative      */
  /* detail. A résumé starts at the degree. A journey does not.               */
  /* ---------------------------------------------------------------------- */
  /*
   * The facts in these six entries are his. The `learned` field of every
   * entry below, `usc-honors-ta.responsibilities` ("give written feedback"),
   * and `cs-switch.context`'s remark about origin stories were drafted for
   * him rather than by him, and he APPROVED them as written on 2026-10-02.
   * They are his voice now; edit them as his words, not as placeholders.
   */
  {
    id: "eastside-high",
    type: "learning",
    dateRange: "2018 — June 2021",
    sortKey: "2018-12",
    endSortKey: "2021-06",
    role: "High school",
    organization: "Eastside High School, Taylors, South Carolina",
    locationOrMode: undefined,
    context:
      "Three years of American high school, started three weeks after landing, in a language he could read and write but not speak.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "Reading a language and speaking it are different skills, and only one of them can be practised alone.",
    technologies: [],
  },
  {
    id: "fu-of-kyoto",
    type: "work",
    // The end is his (2026-10-02): "I believe I stop working after first
    // summer 2022" — the summer after his first university year. So it ran
    // INTO university, through `usc-cheme`, and stopped before the fall.
    // "2022-07" is the last summer month that does not touch the fall
    // semester. TRAP: `concurrentWith` compares months inclusively, and
    // `usc-scraping` starts 2022-08 — ending this at "2022-08" would draw a
    // "Ran alongside" line to research he says he did not overlap.
    dateRange: "2019 — Summer 2022",
    sortKey: "2019-01",
    endSortKey: "2022-07",
    role: "Chef and server",
    organization: "Fu of Kyoto",
    locationOrMode: undefined,
    context:
      "The family restaurant. Both sides of it — cooking on the line, and waiting tables in the language he was still learning.",
    responsibilities: [
      "Cook on the line during service.",
      "Serve tables, take orders, and handle the front of house.",
    ],
    built: [],
    impact: [],
    learned:
      "Service is a system under load, and the kitchen teaches you where a process actually breaks faster than any diagram.",
    technologies: [],
  },
  {
    id: "self-taught-gap",
    type: "learning",
    // No `endSortKey` on purpose: it has no end. The owner (2026-10-01): "It
    // carried on — I still do some of it." An entry without one is treated as
    // still running, which is the true reading here.
    dateRange: "2019 — Present",
    sortKey: "2019-06",
    role: "Whatever he felt like learning",
    organization: "No institution",
    locationOrMode: undefined,
    // The owner's own description of this period was "just being bored and
    // live day by day". That line is better than anything this file could
    // write about him, and it is the one string in this round that must not
    // ship without him approving it — he asked that nothing go public that is
    // "not worth it". It is deliberately NOT authored here. What is authored
    // is only what he did. On 2026-10-02 he cut the hobby list (investing,
    // plants, aquarium — still true, "not that useful" to show); what he is
    // curious about now, LLMs and machine learning, lives in `profile.about`.
    context:
      "Drove for Uber Eats, and taught himself whatever he was curious about.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "This is the only stretch of the record where nothing was assigned — which makes it the only evidence of what he does when nobody is asking.",
    technologies: [],
  },
  {
    id: "usc-cheme",
    type: "learning",
    dateRange: "August 2021 — May 2022",
    sortKey: "2021-08-a",
    endSortKey: "2022-05",
    role: "Chemical engineering",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context: "The first major. Not the one he graduated in.",
    responsibilities: [],
    built: [],
    impact: [],
    learned:
      "Kept on the record on purpose. A portfolio that admits its author started somewhere else is worth more than one that pretends the line was straight.",
    technologies: [],
  },
  {
    id: "cs-switch",
    type: "milestone",
    dateRange: "2022",
    sortKey: "2022-01",
    role: "Switched to computer science",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "His friends told him to try it. He tried it, and it stuck — which is a more honest account of how most people find their field than any origin story about childhood computers.",
    responsibilities: [],
    built: [],
    impact: [],
    learned: "The recommendation was worth more than the plan.",
    technologies: [],
  },
  {
    id: "usc-honors-ta",
    type: "work",
    dateRange: "August 2023 — May 2025",
    sortKey: "2023-08-c",
    endSortKey: "2025-05",
    role: "Honors Teaching Assistant",
    organization: "University of South Carolina",
    locationOrMode: undefined,
    context:
      "The honors section of Introduction to Computer Concepts & General Applications Programming — students who are not computer science majors.",
    responsibilities: [
      "Support the honors section and lead open lab hours.",
      "Grade assignments and give written feedback.",
    ],
    built: [],
    impact: ["Supported and graded a 24+ student honors section."],
    learned:
      "Teaching people who did not choose this subject is the fastest way to find out which parts of it you only think you understand.",
    technologies: ["JavaScript", "HTML/CSS", "Python"],
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
      "Turning one-off collection scripts into a standardised delivery system — and taking a legacy scraper from 17 hours to 3 minutes along the way.",
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
      "20+ integrations already live and depending on continuously accurate data.",
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
      "Maintenance of operating hours, holiday schedules and location data across 20+ live retailer integrations.",
    ],
    metrics: [
      {
        label: "Legacy scraper runtime",
        before: "17 hours",
        after: "3 minutes",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Product coverage",
        before: "654 products",
        after: "1,529 products",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Scraper failure rate",
        before: "3.9%",
        after: "Zero",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Production scrapers delivered",
        before: "Built individually",
        after: "30+ in a single week",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
      {
        label: "Sales restored",
        before: "SKUs lost to a manual eight-stage process",
        after: "$2.8M cumulative GOV",
        source: "Résumé, September 2026 revision — DoorDash, Software Engineer",
      },
    ],
    proof: [
      "Re-engineered a legacy scraper from HTML crawling to a direct API: runtime 17 hours to 3 minutes, coverage 654 to 1,529 products, failures 3.9% to zero.",
      "30+ production scrapers delivered in a single week once the standard and tooling were in place.",
      "20+ live retailer integrations kept current on hours, holidays and location data.",
    ],

    learned:
      "The 17-hours-to-3-minutes win got the attention, but the 30-scrapers-in-a-week number is the one that actually changed the team's ceiling. Optimising one thing is a result; changing how the things get made is a different category.",
    nextQuestion:
      "Where does standardisation start costing more than it saves? Some retailers are strange enough that the standard is friction, and I don't yet have a principled way to spot those early.",

    technologies: ["Python", "Playwright", "Data validation", "SQL"],
    inProgressNote:
      "Internal DoorDash work — no public demo or source. Figures are drawn from my résumé.",
  },

  {
    id: "usc-research-collection",
    title: "Three million records, unattended",
    tagline:
      "Research-scale collection of Amazon and Kroger data that had to survive months of unsupervised production running — at a 99.9% success rate.",
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
        after: "3,000,000+",
        source: "Résumé, September 2026 revision — University of South Carolina, Web Scraping Engineer",
      },
      {
        label: "Success rate",
        before: "—",
        after: "99.9% across months-long runs",
        source: "Résumé, September 2026 revision — University of South Carolina, Web Scraping Engineer",
      },
      {
        label: "Runtime",
        before: "Baseline",
        after: "95% reduction",
        source: "Résumé, September 2026 revision — University of South Carolina, Web Scraping Engineer",
      },
    ],
    proof: [
      "3M+ Amazon and Kroger product and seller records generated at a 99.9% success rate across months-long production runs.",
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

  /* ---------------------------------------------------------------------- */
  /* Round 18: recovered from `D:\Project\Portfolio-v2`.                     */
  /*                                                                         */
  /* Four builds the content layer never knew about, each with a real screen */
  /* recording in that repo's `src/assets/experience`. Plan C wires the       */
  /* recordings in; this file only records that they exist.                  */
  /*                                                                         */
  /* What is sourced: each title, tagline, role, skills list and link comes  */
  /* from that repo's `src/data/experience.jsx` (a title, a one-line summary, */
  /* a skills list, a role, a course). No per-project date is carried here:  */
  /* the only dates in the content layer are `usc-degree`'s own. The one     */
  /* claim from the owner himself is that the chess project had no class, no */
  /* client and no résumé line behind it. Everything else a field says is a  */
  /* restatement of those, kept short on purpose.                            */
  /* ---------------------------------------------------------------------- */
  /*
   * APPROVED BY THE OWNER, 2026-10-02. The sentences below are judgment, not
   * record, and were drafted for him rather than by him:
   *   chess-minmax         `problem`, `whyItMattered`, `nextQuestion`, and the
   *                        clause "the point being to understand search" in
   *                        `decisions`.
   *   conscea              `whyItMattered`, `learned`, `nextQuestion`.
   *   degreeworks-rebuild  `learned`, `nextQuestion`.
   *   toy-storefront       `nextQuestion`.
   * `learned` on chess-minmax and toy-storefront is a flat restatement of what
   * the old repo says, not a lesson: no lesson from either is on record. He
   * approved them as written; they feed the chat's index through
   * `answer-sources.ts`, so the chat can quote any of them to a visitor.
   */
  {
    id: "chess-minmax",
    recording: "chess",
    recordingDescription: "A desktop chess window: pieces move one turn at a time, each move is highlighted on the board, and the move list grows beside it.",
    title: "Chess and a min-max bot",
    tagline:
      "A chess game and a min-max bot, built from a YouTube video — no class, no client, no résumé line.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem: "No class, no client and no résumé line is behind it.",
    whyItMattered: "It is the one thing here that nobody asked him to build.",
    assumption: undefined,
    constraints: ["Followed an existing video."],
    responsibility: "Developer.",
    decisions: [
      "Follow Professor Eddie Sharick's video, the point being to understand search.",
    ],
    pathsExplored: [],
    built: ["A chess game in Pygame.", "A chess bot using the Min-Max strategy."],
    proof: ["Source on GitHub (thienle210303/Chess), and a screen recording."],
    learned:
      "Followed one video to build a chess game and a bot that plays it with Min-Max.",
    nextQuestion:
      "Where does alpha-beta pruning stop helping and the evaluation function become the whole problem?",
    technologies: ["Python", "Pygame", "AI", "Min-Max algorithm"],
    source: {
      label: "github.com/thienle210303/Chess",
      href: "https://github.com/thienle210303/Chess",
    },
  },
  {
    id: "conscea",
    recording: "conscea",
    recordingDescription: "The Conscea web app's Certificate List, Dashboard and Profile pages, opened in turn from its top menu, with empty tables and blank profile fields.",
    title: "Conscea — employee certificates",
    tagline:
      "A business application for managing employee certificates, built with classmates. The website has fully developed functionality; the recording shows only its protocol, due to data privacy.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem: "A business application for managing employee certificates.",
    whyItMattered:
      "An expired certificate nobody noticed is a compliance problem, not an admin problem.",
    assumption: undefined,
    constraints: [
      "Built with classmates, in a course on Azure.",
      "The recording shows only the website's protocol, due to data privacy.",
    ],
    responsibility: "Full-stack Developer.",
    decisions: [],
    pathsExplored: [],
    built: [
      "A business application for managing employee certificates, with fully developed functionality.",
    ],
    proof: [
      "Built in a University of South Carolina course on Azure; the recording shows only the website's protocol, due to data privacy.",
    ],
    learned:
      "The constraint that shaped the deliverable was the demo, not the build: deciding what a public recording is allowed to contain is a design decision.",
    nextQuestion:
      "How do you demonstrate a data-heavy application convincingly without exposing any of its data?",
    technologies: ["C#/ASP.NET", "JavaScript/React", "Azure", "AI", "SQL"],
  },
  {
    id: "degreeworks-rebuild",
    recording: "degreework",
    recordingDescription: "A University of South Carolina desktop app: a sign-up form, a course search with a course's details, a semester-by-semester plan and a degree-progress chart.",
    title: "A better version of DegreeWorks",
    tagline:
      "A better version of UofSC DegreeWorks, built with classmates in a software-engineering course.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem: "Making a better version of UofSC DegreeWorks.",
    whyItMattered: "A course project, done with classmates.",
    assumption: undefined,
    constraints: [
      "Built with classmates, in a software-engineering course.",
      "A GUI application in Java.",
    ],
    responsibility: "Developer.",
    decisions: [],
    pathsExplored: [],
    built: ["A better version of UofSC DegreeWorks, in Java with JavaFX and Maven."],
    proof: [
      "Source on GitHub, in AlexRishmawi's repository (AlexRishmawi/degreeauditGUI), and a screen recording.",
    ],
    learned:
      "Rebuilding a tool is the fastest way to find out which of its problems are the data's and which are the interface's.",
    nextQuestion:
      "Which of this tool's problems were actually upstream, in how degree requirements are encoded?",
    technologies: ["Java", "JavaFX", "Maven", "OOP", "GUI"],
    source: {
      label: "github.com/AlexRishmawi/degreeauditGUI",
      href: "https://github.com/AlexRishmawi/degreeauditGUI",
    },
  },
  {
    id: "toy-storefront",
    recording: "toys",
    recordingDescription: "The JVToys storefront: its home page, a contact form, product cards and a product pop-up, a cart with quantities and a total, and a sign-in page.",
    title: "A toy storefront",
    tagline: "An e-commerce platform for toy sales, built with a team of three.",
    careerEntryId: "usc-degree",
    status: "shipped",
    featured: false,
    problem: "An e-commerce platform specializing in toy sales.",
    whyItMattered: "A team project in e-commerce, built with a team of three.",
    assumption: undefined,
    constraints: ["A team of three."],
    responsibility: "Full-stack Developer.",
    decisions: [],
    pathsExplored: [],
    built: ["An e-commerce platform for toy sales, built with React, Flask, Chakra UI and MongoDB."],
    proof: ["A screen recording of the platform."],
    learned: "Worked as one of a team of three on an e-commerce platform.",
    nextQuestion:
      "Nothing open. This one is finished, and its interest is historical.",
    technologies: ["JavaScript/React", "Python/Flask", "Chakra UI", "MongoDB"],
  },
] satisfies readonly Project[];

/* -------------------------------------------------------------------------- */
/* Résumé                                                                      */
/* -------------------------------------------------------------------------- */

export const resumeSummary =
  "Software engineer working on retail data at DoorDash. I build automated collection and integration systems, and I'm at my best on problems where the path isn't defined yet — optimising what already exists, or creating a workflow that didn't previously exist. B.S. Computer Science, University of South Carolina, 3.8 GPA.";

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
  },
  {
    id: "data",
    label: "Data & storage",
    skills: ["PostgreSQL", "SQL", "MongoDB", "GraphQL", "Prisma"],
    evidence:
      "GraphQL and Prisma on Wordification; relational data throughout the DoorDash retail pipelines.",
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
      "3M+ records at USC; 20+ live retailer integrations and 30+ scrapers in a week at DoorDash; Damerau–Levenshtein matching over 1M+ records at Schaeffler.",
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
  },
  {
    id: "platforms",
    label: "Cloud & platforms",
    skills: ["AWS", "Azure", "Google Cloud", "Mendix", "Git/GitHub"],
    evidence:
      "Azure on the capstone and Conscea projects; Mendix throughout the Schaeffler co-op.",
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
    messageDraft:
      "Hi Thien,\n\nI'm reaching out about a role. I'll send the team, what the work involves and where it's based. If it looks like a fit, let's find a time to talk.\n\nBest,",
  },
  {
    id: "crazy-idea",
    label: "I have a crazy idea",
    description: "A project, a collaboration, something nobody asked for yet.",
    subject: "A crazy idea",
    messageDraft:
      "Hi Thien,\n\nI have an idea nobody asked for, and I'd like to think it through with you. I'll explain what it is and where I think the hard part is. Tell me if it's interesting or nonsense.\n\nBest,",
  },
  {
    id: "hello",
    label: "Just want to say hello",
    description: "No agenda required. Feedback about this site lands here too.",
    subject: "Hello",
    messageDraft:
      "Hi Thien,\n\nNo agenda. I found your site and wanted to say hello. I'll tell you a little about what I do, and if there's a reason to keep talking, we'll find it.\n\nBest,",
  },
  {
    id: "secret",
    label: "It's a secret \u{1F92B}",
    description: "The cats have been briefed. They'll deny everything.",
    subject: "A secret",
    messageDraft:
      "Hi Thien,\n\nI can't say much here. What I can say is that it's worth a reply, and I'd rather explain it somewhere other than a contact form.\n\nBest,",
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
