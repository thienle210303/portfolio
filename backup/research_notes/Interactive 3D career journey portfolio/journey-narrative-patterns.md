# Interaction and Narrative Patterns for Life-and-Career Journey Websites

> **Source-quality warning for the report writer.** Searching this topic in 2026 returns a
> large volume of AI-generated SEO content farms (`scrollytelling.ai`, `cssawwwards.com`,
> `csstools.io`, `buildmvpfast.com`, `mintec.co`, `annnimate.com`, `pkgpulse.com`,
> `whichtool.fyi`, `trade-assistance.com`, `progzonline.com`). Several of these assert
> browser-support and bundle-size facts that **primary sources contradict** (documented
> below). I have marked every claim with its source tier. Where a number appears only on
> one of those domains, treat it as unverified.

---

## Q1. What distinct structural patterns exist for "journey" storytelling on the web?

### Takeaway

There is no single canonical taxonomy, but two useful ones exist: an academic vocabulary of
*scrollytelling techniques* from the Information Design Journal, and the practitioner
distinction between **scrollytelling** (content changes as you scroll, scroll mechanics
untouched) and **scrolljacking** (scroll mechanics are overridden). The seven structures the
assignment names are real and distinguishable, but only the scroll-driven, timeline-as-path,
and sticky-graphic patterns have well-documented, low-cost implementations; spatial/world and
companion-narrator patterns are almost entirely bespoke WebGL work with no cheap version.

### Cited Findings

**The core definitional split (this is the most load-bearing distinction in the whole topic):**

- The Pudding defines scrollytelling as the "scroll-to-trigger" pattern where "content is
  revealed or changed as users scroll" **without altering scroll mechanics**, and explicitly
  contrasts it with scrolljacking, which "manipulates the browser's scroll mechanics with
  JavaScript, which is generally considered bad practice" — [The Pudding, How to implement scrollytelling with six different libraries](https://pudding.cool/process/how-to-implement-scrollytelling/) *(pre-2024 — this article dates to the Waypoints/ScrollMagic era; library recommendations are stale, the definition is not)*
- Nielsen Norman Group defines scrolljacking as modifying "the velocity and occasionally the
  trajectory of page scrolling," and identifies three implementation axes: speed alteration,
  direction changes (vertical → horizontal), and progressive disclosure during scroll — [NN/g, Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/) *(NN/g article; publication date not confirmed in my fetch — NN/g's scrolljacking work predates 2024, flag as older)*

**Academic vocabulary of scrollytelling techniques (five named techniques):**

- A peer-reviewed vocabulary paper identifies five standard scrollytelling techniques:
  **graphic sequences, animated transitions, panning and zooming, scrolling through movies,
  and showing/auto-playing animated content** — "Scrolling into the Newsroom: A vocabulary for
  scrollytelling techniques in visual online articles," Information Design Journal, DOI
  `10.1075/idj.22005.oes` — [John Benjamins listing](https://www.jbe-platform.com/content/journals/10.1075/idj.22005.oes) *(paywalled — returned HTTP 403 on fetch; the five-technique list is from search-result summary only, NOT read in full. Pre-2024.)*
- The paper's framing notes scrollytelling "has become an integral part of online visual
  storytelling, though it is still costly to produce" — same source, snippet only

**Pattern 1 — Sticky-graphic scrollytelling (the workhorse).**

- The pattern: "a graphic scrolling into view, becoming 'stuck' for a duration of steps, then
  exiting when steps conclude," implemented with CSS `position: sticky` — [The Pudding, Easier scrollytelling with position sticky](https://pudding.cool/process/scrollytelling-sticky/) *(pre-2024)*
- The sticky element "remains static in the document until a certain threshold is reached, and
  then it becomes fixed," sticking only within its **parent container bounds, not the
  viewport** — this is what eliminates the JS dimension math earlier libraries needed — same source
- "Built-in graceful degradation": browsers without `position: sticky` support simply render
  the element in normal flow, no errors — same source
- Remaining JS need is only *step-entry detection*, not sticky management — same source

**Pattern 2 — Spatial / world traversal (drive or walk through a place).**

- Canonical example: **Bruno Simon's portfolio, https://bruno-simon.com/** — an immersive
  world where you drive a small car through a 3D scene to reach projects and skills; keyboard
  steers a vehicle through information; a physics engine handles suspension, collisions, and
  knocking over bowling pins that spell out section headings; built with Three.js and modelled
  in Blender — [Awwwards, Bruno's Portfolio](https://www.awwwards.com/sites/brunos-portfolio); [Bruno Simon, portfolio case study (Medium)](https://medium.com/@bruno_simon/bruno-simon-portfolio-case-study-960402cc259b); [The FWA case](https://thefwa.com/cases/bruno-simon-portfolio)
- It won **Awwwards Site of the Year 2020** and was reported at 400,000+ visits — same sources
  *(2019/2020 — flag as older; still the reference implementation everyone cites)*

**Pattern 3 — Map-based / geographic traversal (a route you move along).**

- **Mapbox Storytelling** is the canonical open template: "the primary input is a story broken
  into sections (chapters), each hooked to a particular view of a map." Built from Mapbox GL
  JS + **Scrollama.js**. Output is plain HTML + JS, no infrastructure — [Mapbox Storytelling repo](https://github.com/mapbox/storytelling); live demo [labs.mapbox.com/storytelling](https://labs.mapbox.com/storytelling/)
- Open-source fork without proprietary API keys: **maplibre-gl-storymaps**, using MapLibre GL
  JS — features listed include scroll-driven navigation with smooth transitions between map
  locations, chapters with text/images/map views, 3D terrain, optional inset minimap,
  responsive design, layer control — [opengeos/maplibre-gl-storymaps](https://github.com/opengeos/maplibre-gl-storymaps)
- **Migration Trail** is the closest journey-as-map precedent for a *personal* migration
  story: an interactive platform following the real-time journey of two imaginary migrants to
  Europe through maps, podcasts, fictional family conversations and interactive data
  visualisation; the cartographic view evolves over 10 days and serves as the background for
  the narration — surfaced via [Springer chapter listing](https://link.springer.com/10.1007/978-3-030-81226-3_4) *(secondary/snippet only — I did not reach a primary description of the project. Pre-2024.)*

**Pattern 4 — Chaptered "rooms" / worlds.**

- **benxrun.com — "Four-Chapter Portfolio"**, Awwwards Nominee, nominated **10 September
  2026**. Each chapter "answers a different question about human connection and creative
  craft" — the four being what makes us *look, feel, create, and become*. Awwwards tags:
  Art & Illustration, Web & Interactive, Animation, Portfolio, Scrolling, Illustration,
  Transitions, Storytelling, **CSS, Javascript** (no WebGL/3D tag listed). Jury: 15 voters,
  individual overall scores ranged 5.0–10.0, average ≈ **7.36/10** — [Awwwards, Four-Chapter Portfolio](https://www.awwwards.com/sites/four-chapter-portfolio)
  - Note for the writer: the ~7.36 average against a 5.0–10.0 spread is itself a finding — the
    chaptered-story portfolio format **divides juries**, it does not universally impress.

**Pattern 5 — Artifact museum / object inspection.**

- **Adobe × Bowie, "Bowie's Dressing Room"** — an award-winning microsite described as
  interactive with "a gameplay mode to allow people to learn more about David Bowie's life,
  music, and influence" — [Isadora Agency, museum & gallery website design](https://isadoradigitalagency.com/insights/museum-website-design) *(agency marketing post — secondary source, treat the framing as promotional)*
- **Brown Revisited** — historical reconstruction combining journalism, historic records,
  audio and photography "to bring viewers into the timeline" of Brown v. Board of Education —
  same source
- The general museum-microsite pattern is described as 360° panoramic gallery views, guided
  curator video tours, and interactive virtual exhibitions that mimic walking through a
  physical space — [Wonderful Museums](https://www.wonderfulmuseums.com/museum/best-museum-websites/) *(low-authority secondary)*

**Pattern 6 — Recent award-winning journey/portfolio sites (Sept 2026 Awwwards SOTD run).**

- Sites of the Day in the week of 12–15 September 2026 include **Léo Parpeix – Portfolio 2026**
  (15 Sep), **The Tuscan Journey Begins** (14 Sep), **Warm & Fuzzy** (13 Sep), **White Desert**
  (12 Sep) — [Awwwards Sites of the Day](https://www.awwwards.com/websites/sites_of_the_day/) *(listing snippet; I did not open the individual pages, so tech stacks are unverified)*
- **Rauno Freiberg, "Portfolio 2025"** — Awwwards Honorable Mention; Estonian interaction
  designer; built with **React and Next.js**, tagged animation/scrolling/interaction design —
  [Awwwards, Portfolio 2025](https://www.awwwards.com/sites/portfolio-2025) *(the live URL was not confirmed in my fetch — do not publish a URL for this one without checking)*
- **Stefan Vitasović Portfolio 2025** — Codrops case study. Minimalist design plus typographic
  animations, a **WebGL video grid**, and seamless page transitions. The stated hard problem
  was reconciling two scrolls (the WebGL scroll and the navigation scroll), solved with
  **Lethargy** for scroll-event detection plus a **custom scroll controller built on Virtual
  Scroll**. HD video at 60fps served from Cloudflare R2 and used as WebGL textures — [Codrops case study](https://tympanus.net/codrops/2025/03/05/case-study-stefan-vitasovic-portfolio-2025/)
- **Gianluca Gradogna — Portfolio '25** — [Codrops case study](https://tympanus.net/codrops/2025/01/30/case-study-gianluca-gradogna-portfolio-25/)
- **"More Than a Portfolio: Building a Scroll-Driven 3D World with Something to Say"** (Codrops,
  28 April 2026) — title indicates a scroll-driven-3D-world case study with an explicit
  narrative claim, which is exactly the target pattern — [Codrops](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/) **⚠ I could not read this article — WebFetch timed out twice at 60s. Only the title is verified. Someone should open it manually; it is likely the single most relevant case study found.**
- **"The Journey of Creating a 3D Portfolio"** — [Codrops, 21 Jan 2025](https://tympanus.net/codrops/2025/01/21/the-journey-of-creating-a-3d-portfolio/) *(not read)*

### Inferences

- The seven structures in the assignment collapse into two implementation families: (a) those
  that keep native scroll and only *swap what is on screen* — sticky graphic, timeline-as-path,
  chaptered rooms, artifact museum — and (b) those that replace navigation with a custom input
  model — spatial world, guided companion, branching paths. Family (a) is cheap and can be
  accessible; family (b) is expensive and has no documented accessible implementation.
- Awwwards's own tagging of the Four-Chapter Portfolio as `CSS, Javascript` with no 3D tag
  suggests a chaptered narrative portfolio can win jury attention without WebGL. That is the
  most directly transferable precedent found for a JS-budget-constrained site.
- The academic five-technique vocabulary maps almost one-to-one onto what is now expressible in
  CSS: graphic sequences → `view()` timelines; animated transitions → View Transitions;
  panning/zooming → `scroll()` timelines on a transform. "Scrolling through movies" is the one
  that still demands JS and heavy bytes.

### Gaps

- **Guided tour with a companion/narrator**: I found no named, documented implementation of this
  pattern on a personal or portfolio site, and no critical writing on it. This is a genuine gap
  — the report should not assert examples here.
- **Branching / user-chosen paths**: likewise no named portfolio implementation found, and no
  cost or accessibility data. The nearest documented relatives are the "stepper" pattern (see
  Q4) and Bruno Simon's free-roam world, which is exploratory rather than branching.
- I could not read the Codrops 2026 scroll-driven-3D-world case study (repeated timeouts), which
  is the highest-value missing item in this section.

---

## Q2. What does each pattern cost in JavaScript and interaction complexity?

### Takeaway

Against a **~190 KB gzipped total budget that is already at 188.2 KB**, only one animation
library in this space fits at all (Lenis, ~3.6 KB) and even that consumes twice the remaining
headroom. GSAP + ScrollTrigger is reported at ~46 KB gzipped — roughly a quarter of the site's
entire budget. The zero-library routes are `position: sticky` + IntersectionObserver
(hand-rolled, a few hundred bytes) or CSS scroll-driven animations (0 bytes of JS, but see the
Firefox problem in Q5).

### Cited Findings

**Measured/reported gzipped sizes (all secondary — none verified against bundlephobia or a real build):**

| Library | Reported gzipped size | Source tier |
|---|---|---|
| **Lenis** | **3.6 KB**; README says "under 4 KB gzipped" | comparison post + project README |
| **Locomotive Scroll** | **12.1 KB**, dropping to **9.4 KB** after v5 adopted Lenis as its scroll engine | dev.to analysis |
| **GSAP ScrollSmoother** | **26.08 KB** | comparison post |
| **GSAP core** | ~71 KB minified; **~22 KB gzipped** tree-shaken to core only | secondary |
| **GSAP ScrollTrigger plugin** | **~12 KB** added to core (one source) / **18.3 KB** min+gzip (another) — *sources conflict* | secondary |
| **GSAP core + ScrollTrigger together** | **~46 KB gzipped** | secondary |
| **Framer Motion / `motion` (full)** | ~106 KB minified ≈ **~34 KB gzipped**; "30+ kB" | secondary |
| **`motion` with LazyMotion mini bundle** | **~5 KB** | vendor docs + secondary |
| **Motion One `animate()`** | **3.8 KB** | secondary |

- Lenis / Locomotive / GSAP ScrollSmoother figures — [Born Digital, smooth scrolling libraries comparison](https://www.borndigital.be/blog/our-smooth-scrolling-libraries); Lenis "under 4KB gzipped" — [Lenis README](https://github.com/jongsin/lib-animations-lenis)
- Locomotive's 12.1 KB → 9.4 KB change on adopting Lenis — [dev.to, Why Lenis Beat Locomotive Scroll](https://dev.to/keymelgaston/i-went-looking-for-why-lenis-beat-locomotive-scroll-the-real-story-surprised-me-4ed3)
- GSAP sizes — [GSAP forum, "GSAP Size too large?"](https://gsap.com/community/forums/topic/33319-gsap-size-too-large/); [pkgpulse comparison](https://www.pkgpulse.com/compare/framer-motion-vs-gsap) *(pkgpulse is a likely AI-generated comparison site — low confidence on the 46 KB figure specifically)*
- Framer Motion / Motion One sizes — [Motion docs, Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size); [LogRocket, Exploring Motion One from Framer Motion](https://blog.logrocket.com/exploring-motion-one-framer-motion/)
- Vendor consolidation: Motion One and Framer Motion have been merged into one `motion`
  package at motion.dev, so "Motion One vs Framer Motion" is now a bundle-entry-point choice,
  not a library choice — [whichtool comparison](https://whichtool.fyi/compare/framer-motion-vs-motion-one) *(low-authority)*

**The zero-library route:**

- **Scrollama** is "a modern and lightweight JavaScript library for scrollytelling using
  IntersectionObserver in favor of scroll events... vanilla JS so there are no dependencies like
  jQuery or D3." Three features: step triggers, step progress (0–100%), and sticky-graphic
  convenience helpers. Current version **3.2.0**, refactored in 3.0, with built-in resize via
  ResizeObserver — [scrollama README](https://github.com/russellsamora/scrollama/blob/main/README.md); [The Pudding, Introducing Scrollama](https://pudding.cool/process/introducing-scrollama/)
- Its performance argument: IntersectionObserver "removes the need to monitor scroll events,
  which contribute towards a sluggish experience" — same source
- **I could not obtain Scrollama's gzipped size** (npmjs.com returned HTTP 403). Flagged as a gap.
- CSS scroll-driven animations "run off the main thread," enabling smooth animation where
  "traditional scroll-event listeners suffer from asynchronous delivery and main-thread jank" —
  [Chrome for Developers, Scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- `position: sticky` removes the JS that previously managed stuck state and dimension math
  entirely; only step-entry detection remains — [The Pudding, position sticky](https://pudding.cool/process/scrollytelling-sticky/) *(pre-2024)*

**Interaction complexity — the WebGL/world pattern's real cost:**

- Stefan Vitasović's portfolio needed **two reconciled scroll systems** — the WebGL scroll and
  the navigation scroll — solved with the Lethargy library plus a hand-built scroll controller
  on top of Virtual Scroll — [Codrops case study](https://tympanus.net/codrops/2025/03/05/case-study-stefan-vitasovic-portfolio-2025/). This is the clearest published evidence that custom-scroll worlds carry an *architectural* cost, not just a byte cost.
- Bruno Simon's world needs Three.js **plus a physics engine** for vehicle suspension and
  collisions — [Awwwards](https://www.awwwards.com/sites/brunos-portfolio)
- Map traversal requires a full map renderer (Mapbox GL JS or MapLibre GL JS) in addition to
  Scrollama — [mapbox/storytelling](https://github.com/mapbox/storytelling)

### Inferences

- Budget arithmetic for the target site (188.2 KB used of ~190 KB): remaining headroom is
  **~1.8 KB gzipped**. Every library in the table above exceeds it. Lenis at 3.6 KB is 2× the
  headroom; GSAP+ScrollTrigger at ~46 KB is ~24% of the entire budget. The honest conclusion is
  that **no scroll library is affordable without removing something else first.**
- Three.js and Mapbox GL JS are each an order of magnitude beyond the remaining budget. I did
  not verify their gzipped sizes, so the report should say "order of magnitude" rather than
  quoting a number.
- The affordable patterns are, in ascending cost: (1) pure CSS scroll-driven animation — 0 KB
  JS; (2) `position: sticky` + a hand-rolled IntersectionObserver step observer — a few hundred
  bytes, no dependency; (3) View Transitions for chapter-to-chapter moves — 0 KB JS for the
  cross-document form. Everything else requires a budget renegotiation.

### Gaps

- **No exact gzipped size for Scrollama** (npm 403). Needs a direct check.
- **No verified size for Three.js or Mapbox GL JS / MapLibre GL JS** in this research.
- The GSAP ScrollTrigger figure conflicts across sources (12 KB vs 18.3 KB added; ~46 KB
  combined). None of these came from a primary GSAP-published measurement.
- I found **no published bundle-size or Lighthouse figures for any of the specific award-winning
  portfolio sites** — Awwwards and Codrops publish craft narratives, not performance budgets.
  This is a systematic gap in the award-site literature and worth stating in the report.

---

## Q3. Which patterns are known to fail, and what is the actual critique?

### Takeaway

The strongest evidence is NN/g's scrolljacking usability study, which found disorientation in
the majority of participants, a sharp split between task-oriented and exploratory users, and
substantially worse mobile outcomes — and which recommends excluding scrolljacking from mobile
entirely. The critique is specifically of *scroll mechanics being overridden*, not of
scroll-linked content change; that distinction is the most useful thing to carry into a design.

### Cited Findings

**NN/g's findings (the primary usability evidence):**

- "The majority of participants experienced disorientation, particularly with lengthy
  scrolljacks" — [NN/g, Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/)
- **Task-oriented users showed significantly lower tolerance than exploratory browsers** — same
  source. (This is the finding that maps directly onto the recruiter case in Q4.)
- "Mobile experiences proved substantially worse than desktop versions" — same source
- Users **misinterpreted scrolljacks as technical malfunctions** — same source
- Confusion about navigation direction, especially where vertical scroll was converted to
  horizontal movement — same source
- **Cognitive strain when reading animated text while scrolling** — same source
- **Reduced discoverability of information below the scrolljack** — same source
- Participant quote: *"That was a full swipe, and it moved nowhere. . . if I were looking at
  this as a prospect, I would get severely agitated and just move on."* — same source
- Another participant felt the scrolljack "wasted" time while researching college transfer
  information — same source
- NN/g's recommendations: use only to progressively disclose *valuable* information; test and
  tune scroll rates; avoid combining direction changes with animated text; **exclude from mobile
  designs**; reserve for below-the-fold content; balance scrolljacked sections with
  normal-scrolling areas — same source

**Practitioner critique:**

- Scrolljacking "flips the script on one of the oldest, most sacred agreements in web UX: you
  scroll, the page moves — exactly when and how you expect," and such practices erode trust so
  that "when we can no longer trust simple things like scrolling and clicking, the web starts to
  feel like a ghetto of misdirection and cheap thrills" — [Webdesigner Depot, How Scrolljacking Breaks UX Fundamentals](https://webdesignerdepot.com/how-scrolljacking-breaks-ux-fundamentals/)
- Reported consequences include "massive performance drag, lag, browser crashes, and CPU spikes
  on users' devices," and that scrolljacking "breaks the accessibility of the site, effectively
  crippling the user's ability to control how fast they consume information" — same source
- [Beamtic, Avoid Scrolljacking and Smooth-scroll Effects](https://beamtic.com/scrolljacking-a-ux-problem) and [Get-Started Int., "Scrolljacking is evil"](https://www.get-started-int.com/en/post/scrolljacking-is-evil-ux-guide) make the same case from a B2B-conversion angle *(both are marketing-adjacent; use for framing, not for data)*

**Cross-document View Transitions — documented failure modes:**

- **The 4-second timeout.** "If the new page doesn't reach a state the browser considers
  'renderable' within 4 seconds of the navigation starting, the transition just… dies." The
  timeout starts at **navigation start, not when HTML arrives**, so network latency counts
  against it — and **developers testing on localhost will never see this fail** — [CSS-Tricks, Cross-Document View Transitions: The Gotchas Nobody Mentions](https://css-tricks.com/cross-document-view-transitions-part-1/)
- Render-blocking resources (large hero images, slow API calls, `font-display: block` web fonts)
  are the usual cause — same source
- `navigation: auto` only fires for **same-origin, user-initiated** navigations. Programmatic
  `window.location.href`, cross-origin links, and POST form submissions are excluded by design
  — same source
- The **"taffy effect"**: transitioning images stretch because the browser snapshots bitmaps and
  scales them without respecting `object-fit`; the fix is `object-fit` on
  `::view-transition-old(...)` / `::view-transition-new(...)` — same source
- Cross-document transitions work **only on multi-page apps**, not on SPA client-side routers
  that prevent full page loads — same source
- On motion: "animations can literally make people physically nauseous"; `prefers-reduced-motion`
  must be respected — same source

**Accessibility-specific failure modes:**

- Chrome's own scroll-driven-animations documentation **contains no guidance on
  `prefers-reduced-motion` or graceful fallbacks** — the only safety net is that unsupporting
  browsers ignore `animation-timeline` — [Chrome for Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations). *(This is a notable omission to flag: the platform is shipping the capability faster than the guidance.)*
- Practitioner consensus is that a **stepper** pattern is preferable "when the states are
  discrete and the reader needs direct access, known length, replay, or controlled comparison
  more than continuous scroll," and that scrollytelling should be avoided "when the story is
  clearer as a static chart, direct-label small multiples, a conventional article with inline
  figures, or an explicit stepper" — [scrollytelling.ai, Design Patterns](https://scrollytelling.ai/scrollytelling-design-patterns/) **⚠ likely AI-generated content farm — the advice is sensible and matches NN/g's direction, but it is not independent evidence. Do not cite as authority.**

### Inferences

- The NN/g finding that task-oriented users are far less tolerant than exploratory browsers is
  the single most important result for a career-journey portfolio, because the audience is
  *mixed*: a recruiter is task-oriented, a peer developer is exploratory. A design that serves
  only one of them fails half its traffic.
- NN/g's "exclude from mobile" recommendation combined with their "mobile substantially worse"
  finding means any journey pattern must have a genuinely different mobile mode, not a
  responsive squeeze of the desktop one.
- The 4-second cross-document timeout is a real hazard for a Vercel-hosted site with real-world
  latency, and it is invisible in local development. Any use of cross-document View Transitions
  needs throttled-network testing.

### Gaps

- **I did not find the Reddit/Hacker News threads the assignment asked for.** Queries for
  r/webdev and HN critiques of portfolio sites returned only DEV.to promotional posts and
  Dribbble shots. Either the search tool is not surfacing those forums, or the threads are not
  well-indexed. The report should not claim forum consensus that I could not locate.
- No post-mortem from NYT, Reuters, Bloomberg or The Pudding on a *failed* scrollytelling
  project was found. Reuters publishes a Svelte `Scroller` component and graph-pattern
  templates ([reuters-graphics/graphics-svelte-components](https://reuters-graphics.github.io/graphics-svelte-components/components/scroller/), [example_svelte-graph-patterns](https://github.com/reuters-graphics/example_svelte-graph-patterns)) but I found no published performance or failure retrospective.
- No WCAG-conformance audit of any specific scrollytelling implementation was found.

---

## Q4. How do journey sites serve the "I just want the facts" visitor?

### Takeaway

The documented pattern is **dual-mode**: a scannable standard view plus an optional deep/narrative
view, with the narrative never being the only route to the facts. The supporting numbers about
how long recruiters actually spend are widely repeated but **I could not trace any of them to a
primary study**, and at least one commonly cited statistic appears to be fabricated.

### Cited Findings

**Named escape-hatch / dual-mode patterns:**

- **Dual viewing modes**: "seamless toggling between high-level summary and low-level
  engineering specification," where the Standard View is "a clear, concise, recruiter-friendly
  overview focusing on problem framing, delivered solutions, verified outcome metrics, and
  career timeline" — [Sumedh Gaikwad portfolio repo](https://github.com/SumedhGaikwad03/Sumedh_portfolio) *(a single developer's README, not a studied pattern — but it is a concrete, inspectable implementation)*
- **Skip the homepage entirely**: open directly on the strongest case study, with navigation to
  others in a sidebar or header — "if recruiters only read one thing, make it the best thing" —
  [The Crit, Portfolio Layout Examples](https://thecrit.co/resources/portfolio-layout-examples)
- **What reviewers skip**: long introductions, skill bar charts, tool icon grids, testimonials
  from unrecognised people, "and anything that requires scrolling before they see actual work" —
  [UX Dictionary, Optimizing Your Portfolio for Recruiter Scan-ability](https://uxdictionary.io/article/optimizing-your-portfolio-for-recruiter-scan-ability)
- **Video mode / presentation mode**: offering a 3–5 minute consumable version alongside the
  browsable site — same source cluster *(weakly sourced)*
- A practising reviewer's account of what actually gets looked at in a portfolio review —
  [Emily Backes, What I Actually Look At in a Portfolio Review](https://emilybackes.design/post/what-i-actually-look-at-in-a-portfolio-review)
- [OpenDoors Careers, How Recruiters and Hiring Managers Actually Look at Your Portfolio](https://blog.opendoorscareers.com/p/how-recruiters-and-hiring-managers-actually-look-at-your-portfolio)

**Reported timing numbers — ALL UNVERIFIED, treat with suspicion:**

- "Employers spend an average of 15 seconds on portfolio sites during initial screening"; "most
  developer portfolios are filtered out in 60 seconds"; "about 55 seconds... to evaluate both
  resume and portfolio"; "30–90 seconds on your site" — these appear across several DEV.to and
  newsletter posts with **no primary study cited by any of them**
- "A hiring manager will spend 6 seconds on your portfolio. Design for those 6 seconds." —
  [UX University newsletter](https://newsletter.uxuniversity.io/p/a-hiring-manager-will-spend-6-seconds)
- "Eye-tracking studies on portfolio reviews show recruiters spend 6–10 seconds on homepages
  before deciding to dig deeper or bounce" — [UX Dictionary](https://uxdictionary.io/article/optimizing-your-portfolio-for-recruiter-scan-ability) *(no study named or linked)*
- [ADPList, "Only 30 seconds to reject your portfolio"](https://adplist.substack.com/p/only-30-seconds-to-reject-your-portfolio)
- ⚠ **Probably false**: a DEV.to post attributes to "the Stack Overflow Developer Survey 2024"
  the claim that "73% of hiring managers consider a strong portfolio more important than a
  perfect resume." The Stack Overflow Developer Survey surveys developers, not hiring managers,
  and I could not find this figure in it. **Do not repeat this statistic.** Seen at
  [DEV.to portfolio checklist](https://dev.to/_d7eb1c1703182e3ce1782/developer-portfolio-checklist-20-things-hiring-managers-look-for-388p)

**Supporting evidence from scroll research (older but primary-adjacent):**

- NN/g eye-tracking: participants spent "more than 42% of their viewing time on the top 20% of a
  page and more than 65% of their time on the top 40% of a page — regardless of the length of
  the page" — reported in [UXmatters, Debunking the Myth of the Fold](https://www.uxmatters.com/mt/archives/2020/11/debunking-the-myth-of-the-fold.php) *(pre-2024)*
- NN/g's **"Illusion of Completeness"**: when the initially visible content looks complete but
  more exists below, users never discover it — [St Andrews Digital Communications, Scrolling and the Illusion of Completeness](https://digitalcommunications.wp.st-andrews.ac.uk/2020/09/21/scrolling-and-the-illusion-of-completeness/) *(2020 — flag as older)*
- NN/g's scrolljacking study's own finding of "reduced discoverability of information below
  scrolljacks" — [NN/g](https://www.nngroup.com/articles/scrolljacking-101/)

### Inferences

- The "illusion of completeness" risk is *amplified*, not reduced, by a chaptered journey: a
  full-viewport chapter that looks self-contained is precisely the shape NN/g warns about.
- The defensible design conclusion, which follows from NN/g's task-oriented-vs-exploratory
  split rather than from the unverifiable timing statistics, is: the facts must be reachable
  **without** traversing the journey, via a persistent, above-the-fold affordance (a chapter
  index, a "résumé" route, a skip link) — and the journey should be the *optional* path, not the
  default gate.
- The target site already has the right primitive for this: a separate `/resume` route that
  reads the same content. That is structurally the "standard view" half of the dual-mode pattern
  described above, and it is stronger than most of the examples found because it is
  content-derived rather than a hand-maintained duplicate.

### Gaps

- **Every recruiter timing number in the literature is untraceable.** I found no primary,
  methodologically described study of how long technical recruiters spend on a portfolio site.
  The report should say so rather than pick a number.
- No A/B test, analytics case study, or conversion data comparing a narrative portfolio against
  a conventional one was found.

---

## Q5. What is the 2026 state of native scroll-driven animation, View Transitions, and `@starting-style`?

### Takeaway

**Scroll-driven animations are NOT Baseline in 2026 — Firefox has not shipped them**, and
web-platform-dx explicitly records Baseline as "blocked since September 2025 by Firefox." Several
2026 blog posts claim universal support; they are wrong. View Transitions, by contrast, are in
good shape: same-document is at ~92% global usage with Firefox 144+, and cross-document works in
Chromium 126+ and Safari 18.2+ but not Firefox. `@starting-style` is the safest of the three.

### Cited Findings

**Scroll-driven animations — the authoritative position:**

- Baseline status: **"Limited availability"**, with the note *"Baseline availability blocked
  since September 2025 by Firefox (12 months)"* — [Web Platform Features Explorer, scroll-driven-animations](https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/)
- Supported: **Chrome 115+** (18 Jul 2023), **Chrome Android 115+** (21 Jul 2023), **Edge 115+**
  (21 Jul 2023), **Safari 26+** (15 Sep 2025), **Safari iOS 26+** (15 Sep 2025) — same source
- **Not supported: Firefox and Firefox for Android**, though Mozilla's standards position on the
  proposal is "positive" — same source
- The feature comprises `animation-timeline`, `scroll-timeline`, and `view-timeline` — same source
- MDN carries the banner: *"This feature is not Baseline because it does not work in some of the
  most widely-used browsers"* — [MDN, animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline)
- Chrome's docs list support as Chrome/Edge 115+, Safari 26+, **Firefox "Technology Preview
  only"** — [Chrome for Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- ⚠ **Direct contradiction to flag.** Multiple 2026 posts assert the opposite: "In 2026, browser
  support for the Scroll-driven Animations Specification is universal" ([mintec.co](https://mintec.co/blog/scroll-driven-view-transitions-css-2026/)); "Firefox 132+ (stable)... global support at approximately 84%" ([cssawwwards.com](https://cssawwwards.com/blog/css-scroll-driven-animations-guide-2026)); "Firefox has partial support behind a flag" ([dev.to](https://dev.to/nickbenksim/creating-complex-scroll-driven-animations-with-pure-css-in-2026-17l)). **All contradicted by web-platform-dx and MDN. These are AI-content-farm domains. The report must not repeat their support claims.**
- One search summary states Firefox 152 (June 2026) still keeps the feature behind the
  `layout.css.scroll-driven-animations.enabled` flag in stable, on by default in Nightly, and
  that it is a named **Interop 2026** priority. *(Plausible and consistent with web-platform-dx, but I could not verify it from a primary source — treat as unconfirmed.)*

**What scroll-driven animations give you, mechanically:**

- `scroll()` — a *scroll progress timeline*: links animation to "the scroll position of a scroll
  container along a particular axis," 0% at start to 100% at end — [Chrome for Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- `view()` — a *view progress timeline*: tracks "the relative position of a particular element
  within its scroll container," i.e. element entry and exit — same source
- Anonymous timelines (`scroll(root block)` inline) vs named timelines (`scroll-timeline-name:
  --id` on the scroller, referenced elsewhere) — named are needed when automatic lookup fails or
  multiple timelines coexist — same source
- Animations "run off the main thread," avoiding the jank of scroll-event listeners — same source

**New in 2026 — scroll-*triggered* animations (distinct feature):**

- Chrome 145 (2026) ships `animation-trigger`, `timeline-trigger-name`, and
  `timeline-trigger-source`: **time-based** animations that start/stop at a scroll offset, as
  opposed to scroll-driven animations whose *progress* is tied to scroll — [Chrome for Developers, CSS scroll-triggered animations are coming!](https://developer.chrome.com/blog/scroll-triggered-animations)
- Chrome's framing: *"Say goodbye to `IntersectionObserver` for this type of effect, as you can
  now do it declaratively in CSS."* — same source
- Example syntax from that post:
  ```css
  animation: unclip 0.35s ease-in-out both;
  animation-trigger: --t play-forwards play-backwards;
  timeline-trigger-name: --t;
  timeline-trigger-source: view();
  ```
- ⚠ Chrome-only as of this research. This is the *newest* and *least portable* of everything here.

**View Transitions — same-document:**

- **Global usage 91.75%** — [caniuse, view-transitions](https://caniuse.com/view-transitions)
- Chrome 111+, Edge 111+, Safari 18.0+, **Firefox 144+** (disabled by default in 143), Opera 97+,
  Chrome Android 154+, Safari iOS 18.0+, Samsung Internet 23+ — same source
- Chrome 147 adds **element-scoped view transitions**: `element.startViewTransition()` on
  arbitrary HTML elements, so pseudo-elements are affected by ancestor clips and transforms and
  multiple transitions can run concurrently — [web.dev, New to the web platform in April 2026](https://web.dev/blog/web-platform-04-2026)

**View Transitions — cross-document (MPA):**

- Supported from **Chrome 126** (limited to main-frame navigations in 126), **Edge 126**, and
  **Safari 18.2** (Dec 2024, macOS and iOS/iPadOS). **Not supported in Firefox**; Nightly exposes
  partial support behind a flag — [Chrome for Developers, Cross-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document); [TestMu AI support tracker](https://www.testmuai.com/web-technologies/cross-document-view-transitions/) *(the "Firefox 146–151 partial" detail is from the aggregator only — unverified)*
- Google maintains published guidance for the pattern — [GoogleChrome/modern-web-guidance, cross-document-transitions.md](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/user-experience/cross-document-transitions.md)
- Its limitations are listed under Q3 (4s timeout, same-origin-only, taffy effect, MPA-only).

**`@starting-style`:**

- Supported in **Chrome 105, Edge 105, Safari 17.2, Firefox 140** — [MDN, @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style) *(versions from search summary of MDN; I did not read MDN's compat table directly)*
- It "enables entry animations from `display: none` without JavaScript timing hacks in all major
  browsers" — [modern-css, What's New in CSS 2026](https://modern-css.com/whats-new-in-css-2026/)
- ⚠ **Conflicting dates**: one source says it has worked "since August 2024," another that it
  "reaches cross-browser baseline in 2026." The August 2024 date is inconsistent with Firefox 140
  (a 2025 release). The safe statement is: supported in all four major engines; Baseline achieved
  once Firefox 140 shipped. Do not assert a specific Baseline date.

### Inferences — which journey patterns can now be built with zero JS

Given the support picture above, for a site that must work in Firefox:

| Journey mechanic | Zero-JS today? | Basis |
|---|---|---|
| Sticky chapter graphic that holds while text scrolls past | **Yes** | `position: sticky` is universal; graceful degradation built in ([Pudding](https://pudding.cool/process/scrollytelling-sticky/)) |
| Chapter-to-chapter page transition (MPA) | **Yes, as progressive enhancement** | Cross-document View Transitions in Chromium 126+/Safari 18.2+; Firefox simply gets an instant navigation |
| Entry animation from `display: none` (chapter reveal, dialog, popover) | **Yes** | `@starting-style` in all four engines |
| Progress rail / scroll-position indicator | **Enhancement only** | `scroll()` timeline works in Chromium + Safari; **Firefox shows nothing** — must be designed as decoration, never as the only progress cue |
| Element-enters-view reveal | **Enhancement only** | `view()` timeline, same Firefox gap. A tiny IntersectionObserver remains the portable route |
| Play-on-enter, reverse-on-leave without IntersectionObserver | **No** | `animation-trigger` is Chrome 145+ only |
| Scroll-linked 3D world / map traversal | **No** | Requires Three.js / MapLibre plus custom scroll control |

- The practical consequence for the target site: **scroll-driven animation is a decoration layer,
  not a structural layer.** Because Firefox renders nothing, any information carried only by an
  `animation-timeline` (a progress bar, a chapter counter, a revealing label) is invisible to a
  meaningful share of visitors. That is the same failure the project's own "margin rail carries
  facts already true in the content layer" rule guards against.
- Cross-document View Transitions are a genuinely good fit for a chaptered journey **if** the
  chapters are routes rather than sections — but the existing site is deliberately single-page,
  and cross-document transitions explicitly do not work with client-side routing.
- Since unsupporting browsers silently ignore `animation-timeline`, the pattern is safe to adopt
  *only* when the un-animated state is the correct, complete state. That should be the acceptance
  test for every scroll-driven rule added.

### Gaps

- Could not read caniuse's `css-animation-timeline` table (the page returned only the feature
  index, not the support grid), so there is **no global-usage percentage** for scroll-driven
  animations in these notes — only the per-browser list from web-platform-dx.
- Could not confirm the Firefox bug/flag status from a Mozilla primary source (Bugzilla, Firefox
  release notes, or the Interop 2026 dashboard).
- No data on how many real visitors this Firefox gap represents for a portfolio audience.

---

## Q6. Immigration / origin-to-now narratives on personal sites

### Takeaway

**This is the weakest-supported section of the research and should be reported as such.** I found
no writing at all on building a *personal website* around a migration spine — no case study, no
critique, no craft essay. What exists is adjacent: interviews with relocated designers, one
academic essay on immigrant design identity, and one journalistic migration-as-map project.

### Cited Findings

- **Migration Trail** — the only found example of an origin-to-destination journey rendered as an
  interactive web narrative: follows two imaginary migrants to Europe through maps, podcasts,
  fictional family conversations and interactive data visualisation, with a cartographic view
  that "evolves over the course of 10 days" as the background for narration of fictional border
  crossings — surfaced via [Springer chapter listing](https://link.springer.com/10.1007/978-3-030-81226-3_4) *(snippet only; I did not reach the project itself. Pre-2024.)*
- Three designers who relocated internationally (Macau → UK, UK → Germany among them) discuss
  culture, community and care; they emphasise **learning the local language** as the pivot of the
  experience — [The Brand Identity, Relocating abroad as a creative](https://the-brandidentity.com/insight/relocating-abroad-as-a-creative-three-designers-provide-insights-on-culture-community-and-care)
- Academic/personal essay on immigrant design identity and self-decolonisation — [Parsons Transdisciplinary Design, A journey of self decolonization through design](http://sds.parsons.edu/transdesign/seminar/self-decolonizing-as-an-immigrant-designer/)
- Practitioner essays framing the immigrant designer experience around "adapting to a different
  culture, dealing with bureaucracy for visas and contracts, and navigating communication in a new
  language with all the nuances that comes with it" — [Alejandro Largo, (Immigrant) designer](https://medium.com/design-bootcamp/immigrant-designer-a-more-inclusive-view-of-design-6071cbbdc6b5); [Al Lucca, The State of Designers Immigrants](https://medium.com/@all_lucca/the-state-of-designers-immigrants-f92ea73c69fa)
- General definition of the "third culture" frame sometimes used for these narratives — [Wikipedia, Third culture kid](https://en.wikipedia.org/wiki/Third_culture_kid)

### Inferences

These are inferences from adjacent evidence, **not findings** — they should be labelled as such
in any report:

- The relocated-designer interviews consistently foreground *specific, unglamorous particulars*
  (language acquisition, visa bureaucracy, contract navigation) rather than arcs of triumph. That
  is the observable difference between accounts that read as testimony and accounts that read as
  sentiment, and it is consistent with the project's existing "margin rail carries facts already
  true in the content layer" principle: a migration spine earns its place when each stop carries
  a dated, checkable particular, and becomes sentimental when it carries only an emotion.
- Migration Trail's structural choice — the map is the *ground* the narration happens over, not
  the subject — is the one transferable formal idea found. Applied to a career site: geography as
  the chapter index rather than as the content.
- NN/g's task-oriented/exploratory split (Q3) suggests the migration spine is safest as the
  *organising metaphor* of an optional path, never as the only route to the career facts. A
  recruiter should never have to pass through someone's origin story to reach their experience.

### Gaps

- **No writing found on origin-to-now narratives as a personal-site structure.** Searches for this
  returned essay-mill content ("Personal Narrative Essay: The Journey Of An Immigrant") — the
  query phrase collides with a large student-essay SEO corpus, which crowds out any design
  writing that might exist.
- **No critique found** distinguishing "genuine" from "sentimental" treatments of personal-origin
  narratives on the web. The assignment's question is a good one and appears to be unanswered in
  public writing; the report should say so rather than manufacture criteria.
- No named developer/designer portfolio using migration as its explicit spine was identified.

---

## Cross-cutting note for the report writer: what is and is not verified

**High confidence (primary sources, read directly):**
- Scroll-driven animations are not Baseline; Firefox has not shipped; exact browser versions
  (web-platform-dx, MDN, Chrome for Developers)
- View Transitions support figures and the 91.75% global usage number (caniuse)
- Cross-document View Transitions gotchas including the 4-second timeout (CSS-Tricks)
- NN/g scrolljacking findings, quotes, and recommendations (NN/g)
- The scrollytelling-vs-scrolljacking definition and `position: sticky` technique (The Pudding)
- `animation-trigger` shipping in Chrome 145 (Chrome for Developers)
- benxrun.com's Awwwards nomination date, tags, and jury scores (Awwwards)
- Bruno Simon's stack and Site of the Year 2020 (Awwwards / FWA / author's own case study)
- Stefan Vitasović's Lethargy + Virtual Scroll architecture (Codrops)

**Medium confidence (single secondary source, plausible, unverified):**
- All library gzipped sizes in the Q2 table
- Migration Trail's description
- `@starting-style` version numbers

**Low confidence / do not repeat:**
- Any claim that scroll-driven animations are universally supported in 2026
- The "73% of hiring managers / Stack Overflow Developer Survey 2024" statistic (likely fabricated)
- All recruiter timing figures (6s / 15s / 30s / 55s / 60s / 90s) — none traceable to a study
- Anything sourced to scrollytelling.ai, cssawwwards.com, csstools.io, buildmvpfast.com,
  mintec.co, pkgpulse.com, annnimate.com, whichtool.fyi

**Known holes that a follow-up pass should fill:**
1. The Codrops 2026-04-28 scroll-driven-3D-world case study (WebFetch timed out twice)
2. Scrollama's actual gzipped size (npm returned 403)
3. Three.js / MapLibre GL JS gzipped sizes
4. A Mozilla primary source on the Firefox scroll-driven-animations flag and Interop 2026 status
5. Reddit r/webdev and Hacker News critique threads on portfolio UX (search did not surface them)
6. Any primary study of recruiter time-on-portfolio
