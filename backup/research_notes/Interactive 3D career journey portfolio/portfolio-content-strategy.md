# Portfolio Content Strategy for a Software Engineer's Personal Site

*Research conducted 2026-09-28. Where evidence is older than ~3 years, the age is flagged inline. A standing warning applies to this whole topic: it is heavily colonised by SEO content marketing, and most "X% of hiring managers" figures circulating in 2026 trace back to no primary source at all. Specific examples of unverifiable stats are listed under Gaps in Question 1.*

---

## Q1: Who reads these and how? (recruiter/hiring-manager behaviour on engineer personal sites)

### Takeaway

The honest answer is that the evidence is thin, mostly indirect, and partly contradictory — but the best available direct evidence (a 60+ hiring-manager survey) says engineers' portfolio *sites* are widely looked at and barely weighted, while GitHub and the résumé carry the decision. Nobody has published eye-tracking or analytics data on engineer portfolio sites specifically; the numbers everyone quotes are about **résumés**, not sites, and the strongest-sounding portfolio statistics in circulation are uncited.

### Cited Findings

**The one direct survey I could find**

- Profy.dev surveyed hiring managers and React team leads about portfolio websites: they "reached out to 300+ recruiters and React team leads" and got **60+ responses**, asking two questions on a 0–5 scale — whether they'd look at a portfolio site, and whether a candidate's chances would be lower without one — [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- The survey's own summary of the result: "The overwhelming majority of hiring managers look at your website... but don't give a crap." Responses on the *impact* question clustered at 0–2 — [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- A search-index summary of the original article at profy.dev reports the look-at figures as **65% "would definitely look"** at an inexperienced candidate's portfolio site and **93% "likely to have a look."** ⚠️ **I could not load profy.dev directly** (DNS resolution failure from this environment), so I am reporting these two percentages second-hand from the search index; the DEV.to mirror, which I did read in full, describes the same data qualitatively but does not restate those two numbers — [profy.dev (unreachable)](https://profy.dev/article/portfolio-websites-survey)
- Direct quotes from respondents:
  - "All of this can be found in GitHub projects as well" — Renato Sinohara, Tech Lead
  - "Your code speaks for itself" — Sam L., Recruiter
  - "Most developers aren't born designers... a bad design can make you look incompetent" — Krishna Glick, Team Lead
  - "Websites have to be maintained. Broken links in portfolios were only a few weeks old" — Louis H., Recruiter
  - "Character is important to fit into the team. Creativity is crucial for solving problems" — Jason M., Team Lead (the dissenting, pro-portfolio view)
  - — all from [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- ⚠️ Source-quality caveat: profy.dev sells a React training product ("React Job Simulator") whose pitch is that portfolio sites are the wrong investment. The conclusion is commercially convenient for the author. The raw quotes and methodology disclosure still make it the best direct evidence available.

**Peer-reviewed evidence — but about GitHub, not personal sites, and 13 years old**

- Marlow & Dabbish, *Activity traces and signals in software developer recruitment and hiring*, CSCW '13: interviews with GitHub community members found that **profile cues were seen as more reliable indicators of technical ability and motivation than résumé information**, because work actions are transparent and behaviour traces are hard to fake — [ACM DL](https://dl.acm.org/doi/10.1145/2441776.2441794)
- Same study: signals are read as reliable when they show (i) *history* of activity (multi-year commitment to a project) and (ii) *networking* (contributions to high-status OSS). Critically — "**employers only chose to look at those activity traces that are easy to verify quickly**" — [Semantic Scholar](https://www.semanticscholar.org/paper/Activity-traces-and-signals-in-software-developer-Marlow-Dabbish/f3ce01466c01bbdad41186508a40f6e699c797c5)
- ⚠️ Age: 2013. Pre-dates modern ATS, AI screening, and the current GitHub norm of private work repos. Treat the *mechanism* (verifiable traces beat claims) as durable; treat the *specifics* as dated.

**Scanning-time evidence — about résumés, from a vendor, 8 years old**

- Ladders Inc. 2018 eye-tracking study: **30 professional recruiters**, tracked over **10 weeks** across hundreds of résumés, found an average of **7.4 seconds** on an initial résumé screen, up from ~6 seconds in their 2012 study — [TheLadders study PDF](https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf); [HR Dive coverage](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/)
- Gaze order found: current title/company → previous title/company → dates (checking progression) → education. Résumés that held attention had "simple layouts, with clear sections and heading titles," bold titles and bulleted accomplishments — [TheLadders](https://www.theladders.com/career-advice/why-do-recruiters-spend-only-7-4-seconds-on-resumes)
- ⚠️ Three caveats: (a) it measures résumés, not websites; (b) Ladders Inc. sells résumé services, so the finding "your résumé must be scannable" is commercially self-serving; (c) it is 2018 data, and at least one recruiting practitioner source publicly questions whether the 6-second scan was ever more than a soundbite — [Spectacle Talent Partners](https://spectacletalentpartners.com/is-the-6-second-resume-scan-a-myth/)

**General web-attention evidence (applies to any landing screen)**

- NN/g: "the average page visit lasts a little less than a minute"; "users often leave Web pages in 10–20 seconds, but pages with a clear value proposition can hold people's attention for much longer." To earn several minutes you must "clearly communicate your value proposition within 10 seconds" — [NN/g, How Long Do Users Stay on Web Pages?](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/)
- NN/g's own caveat, which matters here: "the time users spend on individual page visits varies widely... the average is not the most fruitful way of analyzing user behaviors" — [NN/g](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/)
- ⚠️ Age: Nielsen's article dates to 2011. Fifteen years old. The Weibull-distribution finding (leave-fast-or-stay-long) is robust across later web research; the specific seconds are not worth over-fitting to.

**Practitioner writing from the hiring side (opinion, not data — but consistent)**

- HN, *Ask HN: What are some good examples of personal websites (Software Engineers)?* — commenter **gt2**: "A simple list of skills, previous projects, basic mission statement, and method to contact you is all you need." Commenter **warrenm**, describing reviewing sites: "I want to see honesty. And readability... It needs to be 'you'." Commenter **_m8fo**: if job-hunting within 6 months, prioritise GitHub presence over building a website — [HN 15228025](https://news.ycombinator.com/item?id=15228025) (⚠️ 2017 thread)
- Dan Luu (engineer, ex-Google/Microsoft/Twitter, widely-read technical blogger) on writing's career value: his blog "helps him with job searching and it helps companies hire," and he endorses Steve Yegge's framing that writing is "potentially high value and the value may show up in ways you don't expect" — [danluu.com/writing-non-advice](https://danluu.com/writing-non-advice/)
- Dan Luu on what makes a candidate credible: hiring managers "would rather spend time on someone who has authored an intelligible blog post on a technology that the team uses, rather than someone who simply lists technology names as 'competencies'" — [danluu.com/corp-eng-blogs](https://danluu.com/corp-eng-blogs/)

### Inferences

- The evidence supports a specific decomposition: a personal site rarely *causes* a hire, but it is read, and its main measurable downside risks are **staleness** and **bad visual execution** (both named unprompted by survey respondents). So the dominant strategy is: don't build a site to win the screen; build it to survive the screen and to win the *second* read — the one that happens after a recruiter has already decided to forward you, when an engineer on the team actually clicks through.
- Two distinct audiences with opposite needs are being conflated in almost all the writing on this topic. Audience A (recruiter, first pass, ~10 seconds, possibly on mobile) needs title, company, stack, and a contact route above the fold. Audience B (an engineer who will interview you, arriving later, on desktop, curious) is the only audience an interactive artifact can reach. A site that serves only A is a decorated résumé; a site that serves only B never gets to B.
- Marlow & Dabbish's "easy to verify quickly" constraint is the single most transferable finding for this project: a claim that a reviewer can *check* in seconds outperforms a claim that is merely stated impressively. This is the research basis for the entire "show the measurement" pattern in Q4.

### Gaps

- **No eye-tracking or analytics study of engineer portfolio sites exists that I could find.** Nobody has published time-on-page, scroll-depth, or click-through data for personal engineering sites. Everything quantified is about résumés.
- **No data on whether reviewers click past the landing screen.** techinterview.org asserts "click-through rate is low enough that for non-frontend tracks, the time investment in a polished personal site rarely pays off" but provides **zero named sources, interviews, or data** — it is an opinion piece styled as guidance — [techinterview.org](https://www.techinterview.org/post/3233474627/personal-website-portfolio-engineers/)
- **Statistics I found but will not report as fact** (no primary source, appearing only on lead-gen/SEO sites, mutually inconsistent, and of the shape LLM-generated marketing copy produces):
  - "71% of hiring managers say portfolio quality directly influences their hiring decision" and "candidates with a strong portfolio have a 50% higher chance of landing a job" — [myseera.com](https://myseera.com/blog/personal-website-for-job-seekers), no source given
  - "80% of hiring managers say that a portfolio helps them better assess a candidate's real-world problem-solving skills than a traditional interview," attributed to "surveys of 500+ hiring managers" with no survey named — [northeasternise.substack.com](https://northeasternise.substack.com/p/hiring-managers-look-at-three-things)
  - "A recruiter visiting your portfolio gives it about fifteen seconds" — asserted without a study behind it across several 2026 SEO pages.
  - **Do not use any of these.** If the final brief needs a number for recruiter attention, use the Ladders 7.4s résumé figure with its caveats, or the NN/g 10-second value-proposition window, and say which one it is.

---

## Q2: What distinguishes memorable engineer portfolios? (named examples, last ~3 years)

### Takeaway

The personal sites that engineers actually remember fall into two disjoint families: **(a) the site IS a working system** (an OS in the browser, a CSS feat, a custom-coded simulator), and **(b) the site is a body of exceptional writing** that happens to be interactive. Both families share one property — the hook and the substance are the *same object*. The sites that are remembered as gimmicks are the ones where a visual hook wraps an unrelated résumé.

### Cited Findings

**Family (a): the site is the system**

- **daedalOS / dustinbrett.com** — Dustin Brett's personal site is a full desktop environment in the browser (file system with drag-and-drop, code editors, emulators, Winamp with skins, bootable OSes, multiple Doom builds, a taskbar with search). **12,000+ GitHub stars.** It has reached Hacker News repeatedly across five years — [HN 29779753](https://news.ycombinator.com/item?id=29779753) (2021), [HN 30939970](https://news.ycombinator.com/item?id=30939970) (2022), [HN 34548365](https://news.ycombinator.com/item?id=34548365) (2023), [HN 38830132](https://news.ycombinator.com/item?id=38830132) (2023), [Show HN 44088777](https://news.ycombinator.com/item?id=44088777) (2025) — [GitHub](https://github.com/DustinBrett/daedalOS)
  - What the hook was: "the experience as if they had remotely connected to a personal machine."
  - What the substance was: real Emscripten/WebAssembly compilation, a real VFS, and — repeatedly cited in comments — it "runs oh-so smooth, even on mobile" (**nichol4s**). Commenter **benrutter** was amazed at running Vim, calling it "insanely powerful" once he understood the WASM compilation.
  - Honest counterweight from the same thread: **alok-g** asked bluntly "why would such things be useful?"; **bitwize** called it "perfectly useless" while loving it; **tamat** wanted real use cases (SSH, server mounts); **1bpp** flagged IP concerns over using real company icons. **Lerc** (89 points) noted the author did well to avoid discouragement because "most of the feedback I received was negative." — [Show HN 44088777](https://news.ycombinator.com/item?id=44088777)
- **lynnandtonic.com** — Lynn Fisher redesigns her personal site annually as a CSS feat. The 2023 refresh contained **21 distinct designs** revealed one at a time as you resize the browser window. Her stated audience: "overwhelmingly web designers, developers, and tech recruiters — people who know how websites are built and might take an extra minute to inspect things." Her stated design question: "could I surprise them by taking these concepts to an absurd extreme?" — [CSS-Tricks case study](https://css-tricks.com/case-study-lynnandtonic-com-2019-refresh/); [2023 case study](https://lynnandtonic.com/thoughts/entries/case-study-2023-refresh/); [2025 refresh](https://fantinel.dev/cool-links/case-study-lynnandtoniccom-2025-refresh)
  - Key detail: she notes that through CSS experimentation "you can achieve a lot without needing to sacrifice clean markup" — the feat and the craft standard are the same claim.
- **strml.net** — Samuel Reed's site, which types itself into existence in an editor pane while the rendered page updates live. Persistently cited in HN personal-site threads as the canonical example — [HN 15228025](https://news.ycombinator.com/item?id=15228025)
- From a 2026 HN "share your personal website" thread: **simonsarris.com** (hand-coded HTML Canvas animations, a garden-designer tool), **nicksmith.software** (macOS Tiger–themed OS simulator), **laurikarjalainen.com** (Angular + 98.css retro Windows). Commenter **guax** on daedalOS captured why these land: "It felt like using someone else's computer and exploring their bedroom" — [HN 46618714](https://news.ycombinator.com/item?id=46618714)

**Family (b): the site is a body of interactive writing**

- **ciechanow.ski** — Bartosz Ciechanowski's interactive explainers (cameras and lenses, internal combustion engines, gears, colour spaces, mechanical watches). Picked up by [FlowingData](https://flowingdata.com/2020/12/08/interactive-explainer-for-how-cameras-and-lenses-work/), [PetaPixel](https://petapixel.com/2020/12/23/this-page-is-a-fantastic-primer-on-how-cameras-and-lenses-work/), and [CSS-Tricks](https://css-tricks.com/bartosz-ciechanowskis-interactive-blog-posts/). His method: build from first principles, "custom-coded interactive elements without relying on external frameworks," and let the reader adjust tunable parameters to see mechanics change — [ciechanow.ski](https://ciechanow.ski/)
  - Effect reported by readers, and this is the bar: people "feel like they pretty much get how engines work because of that blog post" — [Eric Holscher](https://ericholscher.com/blog/2025/jan/7/everything-bartosz-ciechanowski-makes/)
- **wattenberger.com** — Amelia Wattenberger. Career trajectory is itself the evidence: interactive-graphics work → The Pudding → principal research engineer at GitHub Next (Code Atlas, Copilot for Docs, Code Brushes, GitHub Blocks) → leading product for Intent at Augment Code and partner at Sutter Hill Ventures — [ai.engineer speaker bio](https://ai.engineer/speakers/amelia-wattenberger); [wattenberger.com](https://wattenberger.com/)
- **jvns.ca / Wizard Zines** — Julia Evans built a large audience and eventually a business out of explaining systems topics (strace, bash, git, networking, containers) from the position of someone learning them. Her stated origin: she had a job where she "needed to quickly learn a lot just to keep up... and often she couldn't find great resources" — [Sustain podcast ep. 238](https://podcast.sustainoss.org/238); [jvns.ca](https://jvns.ca/)

**The award end, and what it actually bought**

- **bruno-simon.com** — Bruno Simon's drivable-car WebGL portfolio won **Awwwards Site of the Year 2019** and Site of the Month; **400,000+ visitors** — [Awwwards SOTM announcement](https://www.awwwards.com/bruno-simon-portfolio-wins-site-of-the-month-november.html); [case study](https://medium.com/@bruno_simon/bruno-simon-portfolio-case-study-960402cc259b); [visitor count](https://usepastel.com/blog/how-a-design-portfolio-got-the-attention-of-400-000-visitors)
- **What it converted into is the important part**: Bruno Simon did not become famous as a hire — he became the creator of **ThreeJS Journey**, a Three.js training course. The award-winning portfolio converted into a *business*, not a job — [Awwwards](https://www.awwwards.com/bruno.simon/submissions); [creativedevjobs roundup](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)

### Inferences

- Every durable example fails the "could this hook be swapped onto someone else's résumé?" test. daedalOS can't be lifted off Dustin Brett; the CSS feat can't be lifted off Lynn Fisher; the simulations can't be lifted off Ciechanowski. Templated 3D-hero portfolios can be lifted onto anyone, which is exactly why they don't register.
- The dominant failure mode in the HN commentary isn't "too creative" — it's "impressive but unexplained." daedalOS took real criticism precisely at the point where the *reason* for the artifact wasn't legible ("why would such things be useful?"). The fix isn't less ambition; it's an explicit, adjacent statement of what the artifact is evidence *of*.
- Bruno Simon is the cleanest evidence for the Q6 tension: the most award-decorated engineer portfolio in the last decade produced audience and authority, not a hiring funnel. If the goal is a job rather than a following, award-shaped maximalism is optimising the wrong objective.

### Gaps

- I could not confirm a specific 2024–2026 *engineer* (not designer) portfolio that reached the HN front page purely as a personal site and whose author publicly documented a hiring outcome from it. The HN traction I verified is for daedalOS, which is a project that doubles as a site.
- Awwwards Site-of-the-Day developer winners in 2026 (e.g. Léo Parpeix – Portfolio 2026, SOTD 15 Sep 2026; also Warm & Fuzzy, White Desert, Cerebrium, USAvionix in the same week) are listed but I did not verify their content or hiring outcomes — [Awwwards developer category](https://www.awwwards.com/websites/developer/). Treat Awwwards listings as evidence of *aesthetic* recognition only.
- No engagement data (time-on-site, return visits) is public for any of these sites.

---

## Q3: Interactive artifacts that prove engineering craft — what lands vs what's a gimmick

### Takeaway

There is a real research literature here, and it delivers one uncomfortable, highly actionable number: **the large majority of readers never interact at all.** The design rule that follows is absolute — an interactive artifact must be fully legible and fully persuasive *without* the interaction, with the interaction serving as the deepening for the minority who engage. Artifacts that gate their point behind a click are gimmicks by construction, regardless of how good the code is.

### Cited Findings

**The interaction-rate problem**

- Archie Tse, then a graphics editor at the New York Times, gave a 2016 Malofiej talk titled "Why we are doing fewer interactives." The widely-reported figures: **readers interact with only about 10–15% of graphics**, i.e. roughly **85% of visitors ignore interactive infographics entirely.** Tse's stated reasons: users don't interact with UI elements — even simple buttons — and "people want to scroll without doing anything else"; interactives are expensive because they must work across trackpads and fingers; and they are error-prone and can damage the publication's reputation — as reported in [Fast Company, "The Problem With Interactive Graphics"](https://www.fastcompany.com/3069008/the-problem-with-interactive-graphics) and [Dominikus Baur, "The death of interactive infographics?"](https://medium.com/@dominikus/the-end-of-interactive-visualizations-52c585dcafcb)
  - ⚠️ Both of those URLs returned HTTP 403 to my fetcher; I am reporting the figures from search-index summaries of them. The underlying claim is independently corroborated below by Distill, which I read in full.
- Peer-reviewed corroboration: the New York Times reported that "**only a fraction of readers interact with non-static content**," a finding that "discouraged adoption industry-wide." But the same paper notes the picture is contested — "other research found that many readers, even those on mobile devices, are interested in utilizing interactivity **when it is a core part of the article's message**" — [Distill, "Communicating with Interactive Articles" (2020)](https://distill.pub/2020/communicating-with-interactive-articles/)
- Contradicting evidence on layout: McKenna et al. found participants *preferred* step/scroll-based content over static articles but "did not find a significant difference in engagement between the two layouts" — cited in [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)
- Counter-data point: "some of the New York Times' and Washington Post's most read articles are interactive stories" — high-performing outliers exist — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)

**The named pattern catalogue (this is the toolkit)**

Distill's taxonomy of what interactivity can *do*, which is the most useful frame I found for deciding whether a proposed artifact is substantive:

1. **Connecting people and data** — animations, unit visualisations, games
2. **Making systems playful** — sandboxed simulations, parameter exploration
3. **Prompting self-reflection** — prediction prompts, quizzes, spaced repetition
4. **Personalizing reading** — location-based content, non-linear stories, reader segmentation
5. **Reducing cognitive load** — details-on-demand across visualisation, illustration, math, and text

Specific named patterns: **scrollytelling** (vs. slideshows), **"You Draw It"** visualisations, tooltip interactions, **explorable explanations**, newsgames, interactive textbooks — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)

- "Explorable explanations" as a term was popularised by **Bret Victor**, for using interactive models when communicating about science — [Wikipedia: Bret Victor](https://en.wikipedia.org/wiki/Bret_Victor)
- **Scrollytelling mechanics** reduce to three: scroll-triggered reveals, pinned/sticky sections, and progress-linked animation that plays forward *and backward* with scroll distance. The Pudding's stories "lean almost entirely on pinned sections paired with progress-linked charts: a visualization stays fixed while explanatory text scrolls past it, and the chart itself redraws in sync with how far you've scrolled" — [The Plus Addons, scrollytelling techniques](https://theplusaddons.com/blog/scrollytelling/); [The Pudding resources](https://pudding.cool/resources/)

**Evidence that interaction can genuinely aid comprehension**

- Kim et al.: "using visualizations as a prompt is an effective way to encourage readers to engage in self explanation and **improve their recall of the information**" — cited in [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)
- The testing effect: "prompting readers to remember previously presented material... can be an effective way to improve their ability to recall it in the future" — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)
- Animation is effective **specifically** for communicating state transitions, uncertainty, causality, and constructing narratives — not for decoration — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)
- Distill's own honesty caveat: "there is limited empirical evaluation of the effectiveness of interactive articles," and laboratory studies may not generalise to real-world reading — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)

**The cost side, stated plainly by the people who do it**

- "Creating interactive articles today is difficult... closer to building a website than writing a blog post, often taking significantly more time and effort." Named barriers: diverse skillsets required (editorial + design + programming), immature tooling, **web archival risk** ("Will an article's code still run a year from now? Ten years from now?"), mobile/responsive complexity, and accessibility for disabled users — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)

### Inferences

- The 10–15% interaction rate is not an argument against interactive artifacts — it's a specification. It says: **build for two readings.** The server-rendered, zero-interaction reading must carry the full claim (numbers, labels, annotation, the before/after already visible). The interaction is a second layer that rewards the engineer who leans in. This maps precisely onto a Next.js server-first architecture with a small client island, and it is also the accessibility and reduced-motion answer for free.
- Distill's affordance list gives a usable gimmick test: **which of the five affordances is this artifact using, and could the same point be made in a sentence?** If the answer is "none / yes," it's decoration. "Making systems playful" (sandboxed simulation of a system you actually built) and "prompting self-reflection" (predict-then-reveal on a number you actually achieved) are the two affordances with the highest proof-density per kilobyte for an engineer, because both require the *real system* and the *real number* as inputs.
- The archival-risk caveat argues for zero-dependency, hand-written artifacts (the Ciechanowski method) over framework-heavy ones — which also happens to be the only way to fit a ~190 KB gzipped JS budget.

### Gaps

- No study measures interaction rates on *personal/portfolio* sites specifically. All interaction-rate data comes from news publishing, where the audience is general-public. An engineer-portfolio audience is self-selected and technical, and plausibly interacts at a higher rate — but **I found no data confirming that**, and it should be stated as an assumption, not a finding.
- I could not verify the Tse figures from a primary source (his talk is not published as a paper; both secondary sources 403'd my fetcher).

---

## Q4: Metrics and numbers as content — how to show quantified impact without résumé-bullet voice

### Takeaway

The technique with the strongest research backing is **predict-and-reveal** (the NYT "You Draw It" pattern): ask the reader to commit to a guess before showing the real number. It converts a passive claim into a personal surprise, and it has published evidence for improved recall. The second technique is **showing the artifact the number came from** — the trace, the log, the query plan — which works because of Marlow & Dabbish's "easy to verify quickly" mechanism: a number you can see the provenance of reads as a different class of claim than a number asserted.

### Cited Findings

- **"You Draw It" pattern, defined**: the reader "is presented with a partly-drawn chart while inviting them to draw the rest of the chart to show how much they know (or can guess) about a key statistic." Readers "generate an explanation based on their current beliefs for why they think the trend may move in a certain direction. Only after readers make their prediction are they shown the actual data." — [Cornell INFO 3312/5312 course notes](https://info3312.infosci.cornell.edu/notes/interactivity.html)
- It is formally an adaptation of **belief elicitation** into a "*predict-and-reveal*" pattern: "the audience is first asked to draw what they think data will look like and then the true data are revealed on the same chart" — [Cornell INFO 3312/5312](https://info3312.infosci.cornell.edu/notes/interactivity.html)
- Research support: Kim et al. showed prediction prompts encourage self-explanation and **improve recall**; the pattern "improves memorability of data through active engagement" — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/); [Cornell](https://info3312.infosci.cornell.edu/notes/interactivity.html)
- An open-source toolkit exists for implementing it — **They Draw It**, from Northwestern's MU Collective — [mucollective.co/theydrawit](https://mucollective.co/theydrawit/)
- The Pudding's editorial approach that makes numbers readable: articles are "visual essays emphasizing data visualizations and **using fewer words** than conventional journalism" — [Wikipedia: The Pudding](https://en.wikipedia.org/wiki/The_Pudding); [The Pudding resources](https://pudding.cool/resources/)
- Worked example of a Pudding piece that *shows its own method* rather than asserting a result: their colorism-in-high-fashion piece "uses scrollytelling to take readers through **how they programmatically classified model skin tones**" across 19 years of Vogue — i.e. the methodology is the narrative — [The Plus Addons](https://theplusaddons.com/blog/scrollytelling/)
- On résumé-voice metrics specifically, the mainstream portfolio advice converges on impact bullets like "Led migration from Rails monolith to Go services — cut checkout latency 40%, eliminated three recurring on-call issues" — useful as the *baseline* a portfolio should beat, not as the target — [showproof.io checklist](https://showproof.io/guides/what-to-include-in-developer-portfolio/)
- The verification mechanism that makes shown-provenance work: employers treat traces as reliable signals specifically because of "the transparency of work actions... and relative difficulty of manipulating behavior traces," and they only use traces that are **easy to verify quickly** — [Marlow & Dabbish, CSCW '13](https://dl.acm.org/doi/10.1145/2441776.2441794)

### Inferences

- A number in a résumé bullet and the same number in a predict-and-reveal are epistemically different objects. The bullet asks for belief; the prediction makes the reader *produce* a competing estimate and then feel the gap. For a number like "17 hours to 3 minutes," the reader's own guess will almost certainly be conservative (people guess 2×, 5×, maybe 10×; the real answer is ~340×) — which means the reveal does the persuading, and the author never has to sound boastful. This is the single highest-leverage technique available for Thien's specific facts.
- "Show the measurement" and "show the method" are distinct and both useful. The measurement (a real timing, a real failure-rate curve) proves the outcome; the method (the actual API call replacing the actual HTML parse; the actual edit-distance matrix) proves the *competence*. Résumé bullets can carry the first and never the second — which is exactly the gap a personal site exists to fill.
- The Pudding's "fewer words" discipline aligns with this project's existing margin-rail rule (facts already true in the content layer, never a restatement of the prose). The artifact carries the number; the prose does not repeat it.

### Gaps

- I found no study measuring whether predict-and-reveal specifically improves *credibility* judgements (as opposed to recall). The recall evidence is solid; the persuasion claim is my inference.
- No published examples of an *engineer's personal site* using predict-and-reveal on their own work metrics. The pattern is established in journalism and education; applying it to a portfolio appears to be genuinely uncommon — which is the opportunity, and also means there is no proof it converts.

---

## Q5: The specific subject — strongest interactive artifact ideas for Thien Le

### Takeaway

Four of Thien's facts are unusually well-suited to interactive treatment because they are *mechanism* facts, not just outcome facts: he knows why the number changed. Ranked by proof-per-kilobyte, the strongest are (1) the 17h→3min predict-and-reveal, (2) the Damerau-Levenshtein matcher you can type into, (3) the prioritised BFS crawl frontier, and (4) the fault-injectable SKU governance pipeline. The origin arc (Kiên Giang → US) should be the *spine* that sequences these, not itself an artifact — and specifically should not be a 3D globe.

### Design constraint that governs all five ideas

From Q3: **every artifact must be fully persuasive with JavaScript disabled.** Server-render the final state — the numbers, the labels, the annotated before/after — and let the client island add the exploration. Given the 10–15% interaction rate, the static reading is the one that does the work for most visitors; the interaction is what earns the engineer's respect in the 15% case. This also satisfies WCAG 2.2 AA, `prefers-reduced-motion`, and the Lighthouse targets without a separate effort.

### Artifact 1 — "Guess how much faster." (the retailer catalog re-engineering)

*Rank: build this first. Highest return, lowest cost, and it is the site's single best fact.*

- **Pattern**: NYT predict-and-reveal / "You Draw It" ([Cornell](https://info3312.infosci.cornell.edu/notes/interactivity.html)), followed by a time-compressed two-lane race.
- **The interaction**: a slider or draggable bar — "The old HTML-crawling version took 17 hours. Drag to guess how long the rewrite takes." The reader commits; the reveal drops the marker to 3 minutes and labels it **340×**. Then two lanes run at a compressed clock (e.g. 1s = 10 min): the API lane finishes almost immediately, the HTML lane is still crawling when the reader scrolls away — which is the point, and works even if they never scroll back.
- **The non-obvious second beat, which is what makes it not a brag**: the faster version is also the *more complete* one. Coverage 654 → 1,529 products (+134%) and failure rate 3.9% → 0. Most readers assume speed is bought with coverage. Show all three axes moving the right way together and then explain why (direct API = paginated completeness, no DOM flakiness).
- **Data needed**: the four numbers he already has, plus — for the "show the method" layer — one real, redacted before/after pair: the HTML selector chain he was parsing vs. the API request/response shape that replaced it. That pair is the credibility anchor.
- **Cost**: **small.** One client component, ~150–250 lines of TS, `requestAnimationFrame`-driven, no library. Well under 5 KB gzipped. Static content file holds all numbers.
- **Backend**: none.
- **Risk**: naming the retailer may be an NDA problem — "a national retailer's catalog" is sufficient and costs nothing.

### Artifact 2 — A Damerau-Levenshtein matcher you can type into (Schaeffler)

*Rank: build this second. Best proof-per-byte on the whole list.*

- **Pattern**: explorable explanation / details-on-demand ([Distill](https://distill.pub/2020/communicating-with-interactive-articles/)).
- **The interaction**: show a real (anonymised) legacy machine identifier from the 1M+ record migration. The reader types a mangled version — or picks from three pre-set real failure modes (a **transposition**, a substitution, an abbreviation) — and the DP matrix fills in live, with the matched/unmatched decision resolving against his actual threshold.
- **Why it proves craft**: it demonstrates *why Damerau and not plain Levenshtein* — transposition is the characteristic human data-entry error, and a plain Levenshtein charges 2 for it. An engineer reading this immediately knows he chose the algorithm for a reason rather than reaching for the first string-distance function. That judgement is invisible in a résumé bullet and unmistakable here.
- **Data needed**: the distance threshold he actually used; 3–6 representative record pairs (anonymised); and the definition behind "99.9% reconciliation accuracy" (reconciled against what, measured how). That definition matters — an unexplained 99.9% is a weaker claim than an explained 99.5%.
- **Cost**: **small.** ~100 lines for the algorithm, ~100 for the matrix render. Under 3 KB gzipped.
- **Backend**: none.

### Artifact 3 — The crawl frontier, replayed on the real graph (USC)

*Rank: the most distinctive artifact on the list — the interaction literally runs his algorithm.*

- **Pattern**: "making systems playful" — sandboxed simulation with parameter exploration ([Distill](https://distill.pub/2020/communicating-with-interactive-articles/)).
- **The interaction**: a small, real sub-graph of the seller↔product network (a few hundred nodes, anonymised). The reader picks the frontier priority function — **rating**, **review volume**, **product count**, or naive FIFO — and watches BFS expand, with a live counter of "useful records collected after N requests." His actual prioritisation pulls ahead of FIFO on that counter within the first few hundred steps. The reader discovers the result rather than being told it.
- **Why it lands**: this is the one artifact where the visitor is operating the thing he built. It also carries the 3M+ records / 99.9% success / months-long crawl facts as the scoreboard context, without those becoming bullets.
- **Data needed**: an exported sub-graph — nodes, edges, and the three priority attributes — pre-laid-out. **Precompute the layout offline and ship coordinates**; do not ship a force-layout library and run it at runtime. If the Amazon/Kroger data is restricted, a structurally faithful anonymised sample with an explicit note ("shape preserved, identities removed") is honest and sufficient.
- **Cost**: **medium–high.** ~400–600 lines. The real risk is payload, not code: cap at a few hundred nodes and encode as compact typed arrays rather than verbose JSON. Budget ~30–60 KB for the data, and hold the code under ~8 KB gzipped.
- **Backend**: none, *provided* the graph is precomputed and static. ⚠️ If it grows past a few thousand nodes it needs streaming or a route handler — at that point, cut it back rather than adding a backend.

### Artifact 4 — Break the pipeline (DoorDash SKU governance)

*Rank: highest ceiling, highest NDA risk. Build only if the stage names and gate rules can be published.*

- **Pattern**: "making systems playful" — fault injection into a sandboxed model ([Distill](https://distill.pub/2020/communicating-with-interactive-articles/)).
- **The interaction**: the eight-stage governance pipeline drawn as eight real stages. The reader injects a fault — *merchant changes their DOM*, *API rate-limits*, *SKU arrives with no price*, *store goes offline* — and watches which deterministic validation gate catches it, what it does (quarantine, retry, escalate), and what would have reached production without that gate. The $2.8M figure attaches to the *last* gate as "what this one is protecting," rather than floating as a headline number.
- **Why it's the most representative artifact**: speed facts prove optimisation; this proves **systems design under adversarial input**, which is the actual job — 40+ merchants, millions of SKU-location records, 20+ live integrations, all of which break constantly and none of which he controls. It also quietly explains the 30-scrapers-in-a-week fact: you only get that number if the *platform* absorbs per-merchant variation.
- **Data needed**: the real eight stage names; the real gate conditions (or generalised versions); and ideally a real failure taxonomy with relative frequencies. Deterministic, seeded, reproducible.
- **Cost**: **medium.** A state machine in a static TS content file plus a deterministic simulator, ~300–400 lines. ~6–10 KB gzipped.
- **Backend**: none.
- **Risk**: ⚠️ This is current-employer internal architecture. Clear it, or ship a deliberately generalised version and say so on the page — "stage names generalised" is a credibility gain, not a loss.

### Artifact 5 — The origin arc: make it carry data, or don't make it

*Rank: use as the site's spine; do not build it as a 3D globe.*

- The Kiên Giang → United States arc is the narrative sequencer — it is what makes the other four artifacts a story rather than a portfolio grid. But as a standalone visual it is the highest-risk idea on the list, because "map with an animated arc" is the single most templated move in the genre and is exactly the "hook that could be swapped onto anyone's résumé" failure from Q2.
- **The version that earns its place**: one map, two layers. Layer one is biography (Kiên Giang → Columbia, SC → now), each point carrying a *fact that exists nowhere else on the page*. Layer two is where his code runs — the nationwide store-data audits across 20+ live integrations, the 40+ merchants, at whatever granularity is publishable (state-level counts, never addresses). The arc then means something specific: the distance between where he started and where his software now operates, measured rather than gestured at. That follows this project's existing margin-rail rule exactly.
- **Cost**: ⚠️ **High, and a direct budget threat if done in 3D.** Three.js core alone is commonly on the order of 150 KB+ gzipped — **verify against the current release before committing**, but on that order it consumes nearly the entire ~190 KB budget for one decorative element. **Strong recommendation: projected 2D SVG or canvas with an offline-precomputed projection** (~10–20 KB, server-renderable as static SVG, works with JS off, works with reduced motion, and passes contrast checks). If a 3D globe is non-negotiable, it must be a separate route with its own budget, not part of the single-page payload.

### Ranking and what to cut

1. **Artifact 1 (17h→3min)** — build first. Cheapest, strongest fact, best pattern fit.
2. **Artifact 2 (Damerau-Levenshtein)** — build second. Tiny, and it proves judgement rather than outcome.
3. **Artifact 4 (pipeline fault injection)** — build third if publishable. Most representative of the actual job.
4. **Artifact 3 (BFS frontier)** — build fourth. Most distinctive, but the most code and the most payload.
5. **Artifact 5 (origin arc)** — as a 2D spine, yes; as a WebGL globe, no.
- **Cut entirely**: the Wordification speech-QA loop and the LLM reviewer classification project as *interactive* artifacts. Both are real work but neither has a mechanism that becomes legible through interaction — the 99.9% audio accuracy claim is better served by one annotated artifact (a real transcript diff showing a regeneration trigger firing) than by a widget. Four strong artifacts beat six, and each extra one costs budget the first four need.

### Gaps

- I have no evidence on whether interactive artifacts of this kind convert to interviews — no one appears to have published that experiment. Every cost estimate above is my engineering judgement, not a cited figure.
- The three.js payload figure should be verified against the current release rather than taken from me.
- Several artifacts depend on data Thien may not be able to publish (DoorDash gate rules, USC dataset). Those clearances should be resolved before any of these enter a build plan.

---

## Q6: The tension — "wins design awards" vs "gets the engineer hired"

### Takeaway

The evidence genuinely cuts both ways, but not symmetrically. Creative maximalism has strong evidence for producing **audience, authority and reach**, and essentially no published evidence for producing **hires** — while the plain-and-scannable camp has the only direct hiring-manager survey on its side, plus the specific named risk that bad visual execution actively damages an engineer. Company-type differences are widely asserted and poorly evidenced.

### Cited Findings

**For "plain, fast, scannable"**

- The 60+ hiring-manager survey's headline: hiring managers look at the site but the impact on hiring chances clusters at 0–2 out of 5 — [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- The explicit downside risk, from a respondent: "Most developers aren't born designers... **a bad design can make you look incompetent**" — Krishna Glick, Team Lead — [same](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- The maintenance risk: "Websites have to be maintained. Broken links in portfolios were only a few weeks old" — Louis H., Recruiter — [same](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- The redundancy argument, twice: "All of this can be found in GitHub projects as well" (Renato Sinohara); "Your code speaks for itself" (Sam L.) — [same](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- HN commenter **gt2**: "A simple list of skills, previous projects, basic mission statement, and method to contact you is all you need." — [HN 15228025](https://news.ycombinator.com/item?id=15228025)
- Scanning-behaviour evidence (résumés, with the caveats in Q1): the layouts that held recruiter attention were "simple layouts, with clear sections and heading titles" — [TheLadders 2018](https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf)
- Attention-window evidence: you have roughly 10 seconds to communicate a value proposition or the visit ends — [NN/g](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/)
- Practitioner assertion (⚠️ **unsourced** — the author cites no data): "clean, fast-loading static sites outperform animated ones in engineering-flavored audiences"; sites that "animate aggressively, scroll-jack, or use heavy hero videos take time to build, hurt performance, and rarely improve hire rates" — [techinterview.org](https://www.techinterview.org/post/3233474627/personal-website-portfolio-engineers/) and [fonzi.ai](https://fonzi.ai/blog/software-engineer-personal-website)
- Practitioner assertion (⚠️ **unsourced**): junior engineers often get "too unique to the point where the information hiring managers want becomes buried under CSS experimentation," and should "save the flashiness for after your first job" — [northeasternise.substack.com](https://northeasternise.substack.com/p/hiring-managers-look-at-three-things)

**For "highly creative"**

- Bruno Simon: Awwwards **Site of the Year 2019**, **400,000+ visitors** — measurable, enormous reach from a creative portfolio — [Awwwards](https://www.awwwards.com/bruno-simon-portfolio-wins-site-of-the-month-november.html); [400k figure](https://usepastel.com/blog/how-a-design-portfolio-got-the-attention-of-400-000-visitors)
- Lynn Fisher's explicit audience model — designers, developers, **and tech recruiters**, "people who know how websites are built and might take an extra minute to inspect things" — is direct evidence that a technical audience *does* inspect, which is the precondition for creative work paying off — [CSS-Tricks](https://css-tricks.com/case-study-lynnandtonic-com-2019-refresh/)
- daedalOS reached the HN front page repeatedly over five years and accumulated **12,000+ GitHub stars** — sustained technical-audience attention that no plain résumé site achieves — [GitHub](https://github.com/DustinBrett/daedalOS); [Show HN 44088777](https://news.ycombinator.com/item?id=44088777)
- The pro-portfolio minority view from the survey itself: "Character is important to fit into the team. Creativity is crucial for solving problems" — Jason M., Team Lead — [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- Distill's counterweight to the 85%-ignore finding: readers **do** use interactivity "when it is a core part of the article's message," and some of the NYT's and WaPo's most-read articles are interactive — [Distill](https://distill.pub/2020/communicating-with-interactive-articles/)
- Adjacent evidence that public artifacts are increasingly how senior engineers get evaluated — GitHub repos, papers, personal sites used "to assess depth of expertise, communication clarity, and problem selection before scheduling interviews" (⚠️ unsourced SEO page; directionally consistent with Marlow & Dabbish but not independently verified) — [fonzi.ai](https://fonzi.ai/blog/software-engineer-personal-website)

**Company type — asserted, not evidenced**

- The claimed split: startups "value learning multiple tech stacks, owning projects, shipping fast, and showing direct business impact," while big tech "emphasizes mastering CS fundamentals and system design"; startups typically skip the DSA round that big tech runs — [Medium: Big Tech vs Startups](https://medium.com/@gurukishoregn/big-tech-vs-startups-two-hiring-systems-one-software-industry-eab71d272069)
- Related practitioner argument that startups *should* evaluate differently because "a misaligned engineering hire at a startup can cost three to six months of lost momentum" — [Engineering Leadership newsletter](https://newsletter.eng-leadership.com/p/startups-should-evaluate-engineers)
- ⚠️ **None of these sources present data on portfolio sites by company type.** They are structural arguments about interview processes, from which a portfolio inference is being drawn — by the authors and by me. Treat as a plausible hypothesis, not a finding.

### Inferences

- The two sides are measuring different outcomes and therefore don't actually conflict. Creative maximalism reliably produces **reach** (Simon: 400k visitors; Brett: 12k stars; both verified). Nobody has shown it produces **hires**. Plain scannability reduces **downside risk** in a screen. A site can do both if the creativity is placed *after* the scannable layer rather than in front of it — which is an architectural claim, not a taste claim, and it is the same two-readings conclusion as Q3.
- Bruno Simon is the strongest single argument *against* optimising a portfolio for awards when the goal is employment: the most-decorated engineer portfolio of the era converted into a course business. If the objective is a role at a company, the award path is a different funnel with a different destination.
- The one unambiguous, non-contested finding on the plain side is the **execution-quality risk**: a hiring manager said in plain terms that bad design reads as incompetence. That risk scales with ambition. For a site built to WCAG 2.2 AA with a hard performance budget and a disciplined two-axis design system, the ambition is affordable precisely *because* the execution floor is enforced. For someone without that discipline it is not.
- My read on the company-type question, flagged as inference: the audience segmentation from Q1 probably matters more than the company type. Anywhere the first reader is an in-house engineer (startups, small teams, referral paths), an interactive artifact can reach its audience. Anywhere the first reader is a recruiter working a requisition queue (big-tech pipelines, agencies), only the scannable layer will ever be seen. Build for both; don't pick.

### Gaps

- **No study compares hiring outcomes between creative and plain engineer portfolios.** This is the central question of the brief and the evidence for it does not exist. Say so.
- No data on portfolio effectiveness segmented by company size or type. Every claim I found is an assertion.
- No evidence on whether a playful site *hurts* in a specific, measurable way beyond the "bad design reads as incompetent" quote — which is about execution quality, not playfulness.

---

## Q7: Restraint — what a personal site should NOT have

### Takeaway

The critique literature is unusually consistent, and it converges on a single principle: **cut anything that is a claim the reader cannot verify.** Skill percentage bars, logo walls, generic About-me prose, and empty testimonial sections all fail that test. Stale content is the one mistake that reviewers named unprompted as actively disqualifying.

### Cited Findings

**Skill percentage bars — the most universally condemned pattern**

- The core objection: "having your skills described using percentages or progress bars does not add any value, and **no one knows what it actually means**." Specific absurdities named — what does 99% CSS mean (the entire spec by rote?), how do you measure a 5% difference between JavaScript and TypeScript, how do you compare 80% in a design tool against a scripting language — [Scrimba: Common web developer portfolio mistakes](https://scrimba.com/articles/web-developer-portfolio-mistakes/)
- "Deciding your own abilities through percentages is not a viable metric, and it will only hurt your reputation rather than help it. Let your projects do all of the talking" — [Scrimba](https://scrimba.com/articles/web-developer-portfolio-mistakes/)
- The prescribed replacement: "cut the visual, keep the skill as a word, and prove the level in your experience" — [Hiration](https://www.hiration.com/blog/skill-bars-resume/)
- Corroborated independently: "skill bars with percentages like 'JavaScript 87%' are ineffective because **no one believes made-up percentages**" — [showproof.io](https://showproof.io/guides/what-to-include-in-developer-portfolio/)

**Tech-logo walls**

- "Large grids of 40+ logos showing every tool you've ever touched are outdated." Prescribed replacement: group by domain (Backend / Infra / Frontend) with honest levels — "Primary," "Secondary," "Learning" — and prefer badges "backed by real data like stack usage or OSS contributions rather than decorative logos" — [showproof.io](https://showproof.io/guides/what-to-include-in-developer-portfolio/)

**Generic About-me prose and mission statements**

- "Recruiters don't read mission statements; replace with specific work descriptions" — [fonzi.ai](https://fonzi.ai/blog/software-engineer-personal-website)
- Prescribed replacement: two to four roles mapped to what you want next, each with one impact bullet — e.g. "Led migration from Rails monolith to Go services — cut checkout latency 40%, eliminated three recurring on-call issues." And: "if a role isn't relevant to what you want next, shorten it aggressively or omit it entirely" — [showproof.io](https://showproof.io/guides/what-to-include-in-developer-portfolio/)
- The counter-value that survives the cut, from a reviewer: "I want to see honesty. And readability... **It needs to be 'you'**" — warrenm, [HN 15228025](https://news.ycombinator.com/item?id=15228025). Personality is not the problem; *generic* personality is.

**Staleness — the mistake reviewers volunteered**

- "Websites have to be maintained. Broken links in portfolios were only a few weeks old" — Louis H., Recruiter — [Profy.dev / DEV.to](https://dev.to/profydev/this-survey-among-60-hiring-managers-reveals-don-t-waste-your-time-on-a-react-portfolio-website-17ge)
- "A blog with three posts from 2021 and nothing since reads as abandoned. If you're not maintaining the writing, **omit the section rather than displaying staleness**" — [fonzi.ai](https://fonzi.ai/blog/software-engineer-personal-website)
- The strongest version of this: "the bigger trap than not having a site is having an outdated one... a personal site with outdated projects and abandoned blog sections signals you've abandoned the site, which is worse than not having one" — [techinterview.org](https://www.techinterview.org/post/3233474627/personal-website-portfolio-engineers/) (⚠️ unsourced opinion, but it corroborates the recruiter quote above)

**Tutorial projects and padding**

- "Adding tutorial projects that are not uniquely your own" is named as a top-tier mistake; also "being boastful of your abilities" — [Scrimba](https://scrimba.com/articles/web-developer-portfolio-mistakes/)
- "One genuinely strong project beats five tutorial reproductions" — [northeasternise.substack.com](https://northeasternise.substack.com/p/hiring-managers-look-at-three-things) (⚠️ unsourced but widely echoed)

**Technical anti-patterns named by engineers themselves**

From a 2026 HN personal-site thread, unprompted complaints about sites people were trying to enjoy:
- "page jump on load" as distracting (**Crowz4k**)
- JS-heavy SPAs hurting SEO "through broken OpenGraph metadata" (**potluri**)
- — [HN 46618714](https://news.ycombinator.com/item?id=46618714)
- Also from that thread: the maintainer had to add moderation because of "newly created accounts with single-site submissions and 'AI slop' characteristics" (**metadat**) — a note on the 2026 environment: generic AI-generated portfolio content is now a recognised category that a reader may be actively filtering for.

### Inferences

- Every condemned pattern shares one structural property: it is an **unfalsifiable self-assessment**. "JavaScript 87%," a wall of logos, "passionate about clean code," an empty testimonials heading — none can be checked. Every recommended replacement is a **checkable artifact**: a named project, a measured outcome, a link that resolves. This maps exactly onto Marlow & Dabbish's finding that reviewers trust traces they can verify quickly ([CSCW '13](https://dl.acm.org/doi/10.1145/2441776.2441794)). It is the same rule the whole brief keeps arriving at from different directions.
- Staleness is the only failure mode with *negative* expected value rather than merely zero — a missing section costs nothing, an abandoned one costs credibility. For a single-page site with no CMS, that argues for content that does not require upkeep to stay true: measured facts about completed work age well; a "currently reading" list or a blog teaser does not.
- The "AI slop" filtering behaviour observed in 2026 raises the value of anything that is obviously expensive to fake. A hand-built interactive artifact driven by real numbers from real work is close to unfakeable; generic polished prose is now a *negative* signal in a way it was not three years ago. I found this stated once, by one commenter, so treat it as a weak signal — but it points the same direction as everything else here.

### Gaps

- Most of the restraint critique is practitioner opinion on developer-education sites, not research. I found no study measuring the effect of skill bars, logo walls, or stale content on hiring outcomes. The consistency across independent sources is the strength of the evidence; there is no quantification behind it.
- Testimonial sections specifically: the brief asked about "testimonial sections with no testimonials." I found extensive critique of portfolio testimonials in the *design* portfolio context ([Dribbble](https://dribbble.com/stories/2021/05/18/5-design-portfolio-mistakes-that-ll-send-clients-running-in-the-wrong-direction)) but **nothing specifically addressing empty/placeholder testimonial sections on engineer portfolios.** Note as unsupported if the final brief wants to make that point.
