# Luxury / premium design language — concrete craft decisions

**Research date: 2026-09-28.** Where a source predates 2026 it is flagged inline.

**Source-quality warning, read this first.** The phrase "what makes a website look
expensive" is an SEO honeypot. A large fraction of what surfaces for it is agency
marketing content with no measurement behind it — no eye-tracking, no A/B data, no
audited examples. In the notes below I have split sources into three tiers and
labelled them, because the report writer should not treat them as equivalent:

- **[PRIMARY]** — design-system specs, practitioner essays by named authors with
  implementation authority, or research institutions. Fetched in full.
- **[SNIPPET]** — real source, but I only have the search-engine summary, not the
  fetched page. Numbers from these should be treated as "reported" not "verified".
- **[WEAK]** — agency/SEO blog consensus. Useful only as evidence of what the
  practitioner folk-wisdom is, never as a measured fact.

Several pages I wanted refused to render to text: `m3.material.io` (JS-only),
`carbondesignsystem.com` (JS-only), `nngroup.com/articles/luxury-terrible-ecommerce`
(504), `npmjs.com/package/@carbon/motion` (403), `designmd.co` (429). Where I have
only snippet-level evidence for a number, I say so. I did not fill those holes with
recalled values.

---

## Q1. Typography: what typographic decisions read as luxury?

### Takeaway

The measurable, transferable signals are **restraint in family count (one display +
one text, and nothing else)**, **a large scale-jump rather than a weight-jump for
hierarchy**, **negative tracking at display sizes and positive tracking only at small
caps / label sizes**, and **body text held at 45–90 characters with 120–145% leading**.
Almost nothing in the "luxury typography" literature is measured; the only genuinely
authoritative numbers I found are Butterick's, and they are about competence, not
luxury — which is itself the finding: expensive-looking type is mostly the absence of
the common errors, applied consistently.

### Cited Findings

- **[PRIMARY] Butterick's four body-text variables and their ranges.** Point size:
  10–12pt in print, **15–25px on the web**. Line spacing: **120–145% of point size**,
  set as a unitless CSS value (e.g. `1.3`). Line length: **45–90 characters average**,
  or "2–3 lowercase alphabets". Butterick names these four — size, line spacing, line
  length, font choice — as the variables that "determine" whether body text looks
  considered or cheap. He gives **no** numeric recommendation for tracking, caps, or a
  family-count limit. — [Practical Typography, "Typography in ten minutes"](https://practicaltypography.com/typography-in-ten-minutes.html)
  (Butterick's text is long-standing, predates 2026; the ranges have been stable for a decade.)
- **[WEAK] The one-display-one-text rule is the stated norm across the practitioner
  literature.** "One display typeface for impact, one body typeface for readability —
  that is the entire system," is given as the rule "that separates editorial brands
  from amateur ones". — [Techelix, "The Art of Editorial UI"](https://studio.techelix.co/the-art-of-editorial-ui-leveraging-typography-and-whitespace-for-luxury-brands-ui/)
- **[WEAK] Family count is named as a primary premium signal.** "The brands that look
  most expensive online in 2026 are the ones with the most whitespace, **the fewest
  font families**, and the discipline to let one strong visual per section do the work
  that cluttered layouts try to accomplish with twelve." — [Evoke Studio](https://madebyevoke.com/blog/what-makes-a-website-look-expensive)
- **[WEAK] Typography is claimed to dominate the expensive/cheap judgement.** "The
  choice of typeface, the font sizes, the line height, the letter spacing, and the
  contrast between heading and body styles account for more of the 'expensive' or
  'cheap' impression than almost any other single factor." Same cluster: "A beautiful
  typeface on a plain white background looks more premium than a mediocre typeface
  surrounded by elaborate design." — [Evoke Studio](https://madebyevoke.com/blog/what-makes-a-website-look-expensive);
  [Hooman](https://hooman.com/blogs/what-make-websites-expensive)
- **[WEAK] Line-height specifically is called the tell.** "The line-height in your text
  is going to immediately denote whether you created a design on the cheap or put more
  thought into it." — [NP Group](https://www.npgroup.net/blog/how-to-avoid-making-your-web-design-look-cheap-attention-to-the-details/)
- **[SNIPPET] The 2026 luxury display trend is Didone, and it is now a cliché.**
  "The Didone revival continues to be one of the strongest trends in display
  typography, with fonts like Editorial New, Romana, and the classic Didot appearing
  everywhere in fashion, beauty, and editorial design." Editorial New (Pangram Pangram)
  is described as "one of the most referenced fonts on Typewolf". — reported via search
  of [Typewolf](https://www.typewolf.com/recommendations) and
  [Koplexs](https://koplexs.com/fashion-typeface/). I could not verify the "most
  referenced" claim against Typewolf's own pages.
- **[WEAK] The named luxury pairing convention.** High-contrast Didone display
  (Didot, Bodoni, Canela) + neutral grotesque text (Avenir, Helvetica Neue, Neue Haas
  Grotesk); or Playfair + Open Sans/Lato at the budget end. Heritage houses skew
  Didone/Garamond; modern luxury skews Futura/Helvetica/Optima. Characterised as
  "fine stroke contrast, generous letter-spacing, clean geometry, and thin weight
  variants". — [Fontfabric, "Elevating Elegance"](https://www.fontfabric.com/blog/fonts-for-luxury-branding/);
  [DiverseKit](https://diversekit.com/blog/best-fonts-for-luxury-brands)
- **[PRIMARY] Font-weight budget: subsetting is where the money is.** Subsetting a
  variable WOFF2 to Latin typically takes it from ~160 KB to 40–60 KB with all axes
  intact; Inter drops from 303 KB to 22 KB (93%) with a Latin-only subset. `unicode-range`
  **does not subset the file** — it only controls which already-subset file the browser
  downloads, so you must do both. Variable fonts also support **axis pinning**: if you
  only use weights 400–700 of a 100–900 font, the unused range can be trimmed out.
  For variable fonts you only need WOFF2 — browsers without WOFF2 don't support variable
  fonts either. — [web.dev, "Reduce web font size"](https://web.dev/articles/reduce-webfont-size);
  [Richard Rutter, "How to subset a variable font"](https://clagnut.com/blog/2418);
  [Clearleft](https://clearleft.com/thinking/how-to-use-variable-fonts-in-the-real-world);
  [FontSubset](https://fontsubset.com/) (the 303→22 KB and 160→40-60 KB figures are
  [SNIPPET]-level — reported in the search summary of these pages, not individually
  re-measured).

### Inferences

- **The project's 143.6 KB Newsreader italic axis used in two places is indefensible as
  shipped, and the fix is subsetting, not deletion.** On the numbers above, a Latin-only
  subset with the weight axis pinned to the two weights actually used should land in the
  20–50 KB band — a plausible 90–130 KB saving without losing the italic. If the two
  usages are short (pull-quote, a single lede), a *static* instance at one optical size
  and one weight would be smaller still. The cost note that should accompany any
  recommendation: **one extra family ≈ 20–60 KB subset, ≈ 150–300 KB unsubset**, so the
  "one display + one text" rule is a performance rule as much as a taste rule.
- **The Didone move is now the cheap signal, not the expensive one.** The same search
  that surfaces Didot/Editorial New as *the* luxury display face also describes it as
  "appearing everywhere". A face that is everywhere cannot signal exclusivity; it signals
  that the designer read the same listicle. For a blueprint-aesthetic site, a Didone
  would in any case be a category error — Didones are fashion-plate faces, not drawing-
  office faces.
- **Hierarchy by scale-jump beats hierarchy by weight-jump in a restrained system.** This
  is an inference, not a cited finding: if you only ship two families and few weights
  (which the font budget forces), you have no weight ladder to spend, so the hierarchy
  has to come from size and from space. A ~1.25 (major third) to ~1.333 (perfect fourth)
  ratio is the conventional editorial range; I could **not** find a primary source
  measuring luxury sites' actual ratios (see Gaps).
- **Tracking rule that follows from the sources rather than being stated by them:**
  optical sizing means display type is drawn tighter than text type, so large sizes need
  *negative* tracking (roughly −0.01em to −0.03em at 48px+) and small caps / rail labels
  need *positive* tracking (roughly +0.06em to +0.12em) to stay legible. The "generous
  letter-spacing" that luxury sources praise is almost always referring to the *small*
  end — brand wordmarks and labels — not to running text. Applying it to body copy is
  one of the commonest ways a site meant to read expensive reads amateur instead.

### Gaps

- **No primary source measured tracking values on actual luxury sites.** Every tracking
  claim I found is qualitative ("generous letter-spacing"). The numbers I give above are
  inference from optical-sizing convention, and should be labelled as such in the report.
- **No primary source gave a type-scale ratio for luxury/editorial sites.** The
  1.25/1.333 ratios are widely used but I could not cite a measurement of luxury sites
  specifically.
- **Nothing found on oldstyle vs lining figures or small-caps usage in luxury web
  practice.** This is a real hole — it is a genuine craft lever (oldstyle figures in
  running prose, lining/tabular in a data rail) and I found no source discussing it in a
  web context. Do not let the report invent one.
- **No fetched evidence about optical-size axes (`opsz`) in luxury web use.** Newsreader
  has an `opsz` axis; whether luxury sites actually exploit optical sizing on the web is
  unverified.

---

## Q2. Space and proportion

### Takeaway

The only defensible numeric anchors I found are Butterick's measure (45–90 characters)
and leading (120–145%). Everything else about whitespace in the luxury literature is
qualitative and repeats one idea: **emptiness is read as confidence because it is read
as an editing decision** — it signals that someone was allowed to remove things. There
is no measured consensus on margin-to-measure ratios that I could source.

### Cited Findings

- **[PRIMARY] Measure: 45–90 characters, i.e. "2–3 lowercase alphabets"; leading
  120–145%.** — [Practical Typography](https://practicaltypography.com/typography-in-ten-minutes.html)
- **[WEAK] Whitespace is the single most-cited premium signal after typography, and it
  is explicitly framed as editing.** "Thoughtfully edited to include only what truly
  matters, with every element on the page having a clear purpose"; "let one strong
  visual per section do the work that cluttered layouts try to accomplish with twelve".
  — [Soley Creative](https://www.soleycreative.com/studio-notes/what-makes-a-website-luxury-design-principles-that-sell-premium-products);
  [Evoke Studio](https://madebyevoke.com/blog/what-makes-a-website-look-expensive)
- **[PRIMARY] There is a real, cited cost to prioritising the "reflective" layer over
  the behavioural one.** NN/g: "The value of luxury products is firmly rooted in
  reflective emotional appeal… However, companies that focus on this reflective level
  sometimes neglect usability, which is at the behavioral level." They find luxury
  brands specifically fail shoppers during the *consider* phase of the journey, and
  advise "balancing visual design with other priorities" and "avoiding interruptions
  that risk cheapening the brand". — [NN/g, "Why So Many Luxury Brands Are Terrible at
  Ecommerce"](https://www.nngroup.com/articles/luxury-terrible-ecommerce/) (accessed via
  search summary — the page itself returned 504 on fetch, so this is [SNIPPET]-level
  quotation of an otherwise [PRIMARY] institution.)
- **[PRIMARY] The aesthetic–usability effect is real but is a *perception* effect, not a
  usability effect.** Kurosu & Kashimura (Hitachi Design Center, 1995) tested 26 ATM UI
  variations with 252 participants and found the correlation between rated aesthetic
  appeal and *perceived* ease of use was stronger than between aesthetic appeal and
  *actual* ease of use. A positive emotional response makes users more tolerant of minor
  usability problems. — [NN/g, "The Aesthetic-Usability Effect"](https://www.nngroup.com/articles/aesthetic-usability-effect/);
  [Laws of UX](https://lawsofux.com/aesthetic-usability-effect/) (1995 study; NN/g
  article is older than 2026 but is the standard citation.)

### Inferences

- **The aesthetic–usability finding is the strongest available argument for this whole
  brief, and also its limit.** It is citable evidence that visual refinement buys
  measured tolerance for friction. It is *not* evidence that refinement substitutes for
  working — NN/g's own framing is that aesthetics buy forgiveness for *minor* issues.
  For a portfolio, the relevant reading is: polish raises the perceived competence of the
  engineering, which is exactly the claim the site is making.
- **Emptiness conflicts with density only if the empty space is undifferentiated.** A
  margin rail resolves the conflict structurally rather than stylistically: the wide
  outer margin that reads as luxury *is* the rail, and it carries computed facts, so the
  space is simultaneously generous and load-bearing. This is the single strongest thing
  the existing design system has going for it and the report should say so.
- **Practical proportion rules that follow from the cited measure, not from a source:**
  hold the text column at 60–68ch (inside Butterick's 45–90, near the middle where the
  eye's return sweep is reliable); make the rail roughly a third to a half of the text
  column's width so it reads as a deliberate second column rather than a leftover
  gutter; and let the section's vertical rhythm derive from the body leading, so all
  vertical space is an integer multiple of one line. Asymmetry then comes free — a
  60ch column plus a 22ch rail inside a wide viewport is inherently off-centre, which
  is more interesting than a centred column and costs nothing.

### Gaps

- **No source gave a measured margin-to-measure ratio, a golden-ratio claim with
  evidence, or a grid-column count convention for luxury sites.** I found assertions
  that luxury sites "use grids" but nothing quantified. Do not let the report state a
  ratio as if it were measured.
- **No source quantified "generous" whitespace** (e.g. section padding as a multiple of
  the body line-height). This appears not to exist as published measurement.

---

## Q3. Colour

### Takeaway

Consensus across every tier of source: **two or three colours maximum, one accent,
used for meaning rather than decoration.** The specific critique of dark-mode-plus-glow
is real and is mostly a *contrast and halation* argument, not a taste argument — which
is good news, because it means it is testable. The classic "elegant grey" failure mode
is an accessibility failure and this project's `pnpm contrast` gate will catch it.

### Cited Findings

- **[WEAK, but unanimous] Two to three colours, plus a tightly selected accent.** "A
  primary palette of two to three colors complemented by carefully selected accent
  colors, creating visual coherence and preventing the chaotic feeling that comes from
  excessive color variation… most premium sites limit palettes to two or three colors
  maximum." — [Soley Creative](https://www.soleycreative.com/studio-notes/what-makes-a-website-luxury-design-principles-that-sell-premium-products);
  echoed by [Sophisticated Cloud](https://www.sophisticatedcloud.com/all-blogs/8-web-design-practices-that-make-brands-look-premium)
- **[SNIPPET] The dark-mode-glow critique is specific and mechanical.** "Without the
  right contrast and accent balance, dark mode quickly becomes unreadable,
  uncomfortable, or cheap-looking. The difference between premium dark mode and poor
  dark mode comes down to understanding how colors behave differently on dark
  backgrounds — contrast requirements increase, accent colors need more saturation, and
  spacing needs adjustment." And: "Overly bright or saturated glow effects can fatigue
  the eye or cheapen the aesthetic. Effective luminosity requires restraint. The most
  impactful designs use light sparingly — highlighting calls to action, active elements,
  or moments of delight." — [Request.lv, "Designing With Light"](https://request.lv/designing-with-light-dark-mode-glow-and-adaptive-luminosity/);
  [Colorhero](https://colorhero.io/blog/dark-mode-color-palettes-2025)
- **[SNIPPET] Halation is the named physical mechanism.** "Bright colors against dark
  backgrounds can create a visual 'bleeding' effect called halation, where bright
  elements appear to glow and blur, causing eye strain." — [ColorContrast, "Dark Mode
  Contrast: The Complete Guide to WCAG-Compliant Dark UI (2026)"](https://www.colorcontrast.org/blog/dark-mode-contrast-accessibility-guide/)
- **[SNIPPET] Glow-opacity discipline is quantified in one place.** "Raise the halo
  opacity only a few percent at a time — the whole point is restraint." —
  [Request.lv](https://request.lv/designing-with-light-dark-mode-glow-and-adaptive-luminosity/)
- **[SNIPPET] Aesop is the canonical counter-example to gold-and-gradient luxury.**
  Aesop is "built on restraint: plain, ingredient-led products, amber pharmacy-style
  packaging, no conventional advertising"; its design ethos is "architectural restraint
  and modesty… quality is favoured over opulence and materials are applied in
  intelligent and unexpected ways, all guided by the principle of achieving the maximum
  effect with the minimal amount of materials." "The brand sells bottles, but what it
  really sells is a standard." — [Design Anthology, "Aesop by Design"](https://design-anthology.com/story/aesop-by-design);
  [Brandvelle](https://brandvelle.com/brands/aesop)

### Inferences

- **Why gold-on-black reads cheap, stated mechanically rather than as taste:** metallic
  gold is a *specular* effect — real gold reads as luxury because it changes with viewing
  angle. A screen cannot do specular; it can only render a flat yellow-brown, typically
  around #D4AF37, which as a flat fill is just a mid-saturation yellow. Against near-black
  it usually lands near 7–9:1 for large text but fails as a *body* colour at small sizes
  once it is darkened enough to sit on light grounds. So the move degenerates into either
  a contrast failure or a muddy yellow. **Testable prediction for the project: any
  gold-accent proposal will either fail `pnpm contrast` against `--color-paper-deep` or
  will have to be darkened until it stops reading as gold.**
- **The "elegant grey" failure is the one to flag hardest against WCAG 2.2 AA.** Thin,
  light-grey body type is the single most common way a design that was aiming at
  restraint fails an audit: `#999` on `#fff` is ≈2.85:1 and fails 4.5:1; `#767676` on
  `#fff` is ≈4.54:1 and is the practical lightest passing grey on pure white. On a
  *tinted* paper ground (which a paper-and-ink system will have), the passing threshold
  moves darker still — which is exactly why the project's rule to check tertiary tones
  against `--color-paper-deep` rather than `--color-paper` is correct. (Ratio arithmetic
  is my own computation from the WCAG formula, not a quoted source.)
- **Near-black over pure black, and warm over cool, both have mechanical justifications**
  rather than taste ones: pure `#000` on an OLED panel produces maximum halation against
  light text and maximum smear on scroll; and a neutral ink at ~#111–#1A1A1A leaves
  headroom for a *darker* rule or shadow to exist, which pure black does not. A warm
  neutral is what paper actually is — uncoated stock is warm — so a paper-and-ink system
  that uses cool greys is contradicting its own metaphor. I found **no** source that
  measures either claim; both are stated here as reasoning, and the report should label
  them as such.
- **Single-accent discipline is already stronger in this project than in the luxury
  literature.** The literature says "limit to one accent"; this project says the accent
  is *reserved for annotation, links, measured values and one primary control*. That is
  a semantic rule, not a quota, and it is a better rule, because a quota can still be
  spent on decoration.

### Gaps

- **I found no rigorous critique essay of the "dark mode + gradient + glow" aesthetic**
  from a named design critic. What exists is trade-blog advice that glow should be
  restrained. The sharpest available framing is the halation/contrast one above. If the
  report wants a named critic, that source does not appear to exist in accessible search
  results and should not be invented.
- **No sourced numbers for warm vs cool neutral preference in luxury palettes.**
- **No measured data on near-black values used by luxury sites** (e.g. a survey of hex
  values). The "never pure black" rule is widely practised but I could not source a
  measurement.

---

## Q4. Motion

### Takeaway

This is the best-sourced section by a wide margin, and the numbers converge tightly:
**almost everything should be under 300ms; use ease-out for anything the user
initiated; never use ease-in on UI; animate only `transform` and `opacity`; exit ~20%
faster than entrance; keep spring bounce at 0.1–0.3.** "Cheap" motion has specific named
causes — bounce overshoot, `ease-in`, `linear`, animating layout properties, and
animating things that happen a hundred times a day.

### Cited Findings

- **[PRIMARY] Material 3 easing tokens, exact control points** (via a third-party mirror
  of the M3 spec — `m3.material.io` itself does not render to text; treat the mirror as
  faithful but unverified against the live spec):
  | Token | cubic-bezier | Direction |
  |---|---|---|
  | Emphasized Decelerate | `0.05, 0.7, 0.1, 1.0` | entering |
  | Emphasized Accelerate | `0.3, 0.0, 0.8, 0.15` | exiting |
  | Emphasized (both) | `0.2, 0.0, 0.0, 1.0` | both |
  | Standard Decelerate | `0.0, 0.0, 0.0, 1.0` | entering |
  | Standard Accelerate | `0.3, 0.0, 1.0, 1.0` | exiting |
  | Standard (both) | `0.2, 0.0, 0.0, 1.0` | both |
  | Legacy (deprecated) | `0.4, 0.0, 0.2, 1.0` | — |
  — [material3-motion.md mirror](https://github.com/aldefy/compose-skill/blob/master/skills/compose-expert/references/material3-motion.md);
  canonical page is [M3 easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- **[PRIMARY] Material 3 duration tokens, exact ms.** Short1 **50** (ripple, checkbox) ·
  Short2 **100** · Short3 **150** (icon transitions) · Short4 **200** (tooltip, chip) ·
  Medium1 **250** (card state change) · Medium2 **300** (dialog/drawer — "most common") ·
  Medium3 **350** · Medium4 **400** (page-level panels) · Long1 **450** · Long2 **500** ·
  Long3 **550** · Long4 **600** · ExtraLong1–4 **700 / 800 / 900 / 1000** (full-screen).
  Pairing rule: "Element arriving → Decelerate easing. Element departing → Accelerate
  easing. Never combine both directions with identical easing curves" — except for
  stateful transitions where the UI stays visible, which use the symmetric variant. —
  same mirror as above.
- **[PRIMARY] Vercel Labs' own motion skill, duration by interaction type.**
  Micro-interactions **100–150ms**; standard UI (tooltips, dropdowns) **150–250ms**;
  modals and drawers **200–300ms**; **maximum for UI animation 300ms**. **Exit animations
  run ~20% faster than entrance.** — [vercel-labs/open-agents, web-animation-design SKILL.md](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md)
- **[PRIMARY] The ease-out family, exact control points** (same Vercel Labs source):
  Quad `0.25, 0.46, 0.45, 0.94` · Cubic `0.215, 0.61, 0.355, 1` · Quart `0.165, 0.84, 0.44, 1` ·
  Quint `0.23, 1, 0.32, 1` · Expo `0.19, 1, 0.22, 1` · Circ `0.075, 0.82, 0.165, 1`.
  ease-in-out family: Quad `0.455, 0.03, 0.515, 0.955` · Cubic `0.645, 0.045, 0.355, 1` ·
  Quart `0.77, 0, 0.175, 1` · Quint `0.86, 0, 0.07, 1` · Expo `1, 0, 0, 1` ·
  Circ `0.785, 0.135, 0.15, 0.86`.
- **[PRIMARY] Spring discipline.** Apple's shape is `{ type: "spring", duration: 0.5,
  bounce: 0.2 }`; keep **bounce in 0.1–0.3** and subtle in most UI contexts. —
  [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md)
- **[PRIMARY] The named motion anti-patterns**, verbatim list from the same source:
  animating non-GPU properties (layout/paint, dropped frames); `ease-in` for UI
  ("sluggish, delayed feedback"); `linear` for interactive UI ("robotic and unnatural");
  mismatched timing between paired elements (a modal and its overlay must share duration
  and easing); missing `prefers-reduced-motion`; hover animation on touch without a
  `@media (hover: hover)` guard; animating from `scale(0)` instead of `scale(0.95)`;
  autoplay without user control. Plus a frequency rule: **an interaction performed 100+
  times a day should have its animation removed or drastically reduced.** Also: avoid
  `blur` filters over 20px, and avoid animating CSS variables in deep component trees.
- **[PRIMARY] Kowalski's reasoning for ease-out.** "`ease-out` starts fast and slows down
  at the end, which gives the impression of a quick response"; "`ease-out` at 200ms feels
  faster than `ease-in` at 200ms"; never `ease-in` on UI "since it starts slow, delaying
  the exact moment the user is watching". Animations should usually be **under 300ms**;
  button feedback **100–160ms**; modals **200–500ms**. Keyboard-initiated actions should
  generally **not** animate at all (a 500ms animation on a keyboard action is
  frustrating). Target **60 FPS**; animate **only `transform` and `opacity`**; prefer CSS
  or the Web Animations API because they are hardware-accelerated and unaffected by a busy
  main thread, where rAF-driven libraries are not. CSS transitions are **interruptible**
  mid-flight, which matters. Respect `prefers-reduced-motion` — substitute an opacity
  transition for a movement one rather than removing feedback entirely. — [Emil Kowalski,
  "Great animations"](https://emilkowal.ski/ui/great-animations) and the
  [best-practices skill](https://github.com/emilkowalski/skills)
- **[PRIMARY] Kowalski's list of what makes animation feel cheap:** instant changes with
  no transition; animations on frequently repeated actions; animations that don't serve a
  purpose; anything that drops below 60 FPS. — [emilkowal.ski](https://emilkowal.ski/ui/great-animations)
- **[SNIPPET] Linear vs Vercel, two documented houses styles.** Linear: "fast,
  spring-dominant, and physically grounded, with durations of **200ms for small
  interactions and up to 350ms for view transitions**, and **hover states at 100–150ms**.
  The signature easing is **ease-out-expo**." Vercel: "caps most transitions at **250ms**
  and uses **ease-out** — a gentler curve that starts moderately fast… more even and
  moves at a considered pace." The two systems are described as "almost opposites"
  despite looking similar, each tuned to say something about the product. — [DesignMD,
  "Linear vs Vercel: two approaches to minimal motion"](https://www.designmd.co/blog/linear-vs-vercel-motion)
  (fetch returned 429; these numbers are from the search summary and are **unverified**.)
- **[SNIPPET] IBM Carbon's productive standard curve is `cubic-bezier(0.2, 0, 0.38, 0.9)`.**
  Carbon splits motion into *productive* ("efficiency and responsiveness, while remaining
  subtle and out of the way") and *expressive* ("reserved for occasional, important
  moments… a rhythmic break"), with productive "significantly faster" than expressive.
  `@carbon/motion` ships standard, entrance and exit curves in both modes. — [Carbon
  Design System, Motion](https://carbondesignsystem.com/elements/motion/overview/);
  [@carbon/motion](https://www.npmjs.com/package/@carbon/motion). **I could not retrieve
  the remaining five curve values** — the docs site is JS-only, npm returned 403, and the
  package source file I fetched only re-exports from a tokens module I did not reach.

### Inferences

- **A defensible motion token set for this project, assembled from the cited numbers:**
  `--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1)` (ease-out-cubic) as the single
  workhorse; `--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1)` reserved for the one
  or two moments that should feel like Linear; `--dur-hover: 120ms`,
  `--dur-ui: 200ms`, `--dur-panel: 280ms`, and exits at 0.8× the entrance. That set is
  a straight synthesis of the Vercel Labs bands, Kowalski's 300ms ceiling, and the
  reported Linear hover band — it is not itself quoted from any one source.
- **Stagger: no source gave a number.** The only frequency-adjacent hard number I found
  is Material's 50ms micro-interaction floor. A stagger under ~40ms is imperceptible as
  sequence; over ~100ms × n items the tail of a long list becomes a wait. If the report
  wants a stagger figure, 50–80ms per item, capped at ~6 items, is a reasonable
  engineering default — but must be labelled as inference, because **I found no source
  for it.**
- **The frequency rule is the one that most portfolios violate and the one most relevant
  here.** "100+ interactions/day → no animation" is about app UI, but the portfolio
  analogue is: anything the visitor does repeatedly while *reading* — hovering links,
  scrolling past sections — should not animate, while the one or two genuinely singular
  moments (first paint of the hero, opening a case study) can afford 350–500ms.
- **`prefers-reduced-motion` is already a project e2e check, which converts an
  accessibility obligation into a free quality signal** — the reduced-motion path is
  itself a design, and opacity-only transitions at the same durations will look
  deliberate rather than broken.

### Gaps

- **Carbon's expressive curve values, entrance/exit values, and duration scale are
  unretrieved.** Do not let the report state them.
- **Apple HIG motion specifics were not retrieved.** The only Apple-derived number I have
  is the `duration: 0.5, bounce: 0.2` spring shape quoted second-hand by Vercel Labs.
- **No source quantified stagger intervals** (see inference above).
- **The Linear/Vercel numbers are single-source and unfetched.** Treat as indicative.

---

## Q5. Material and detail — texture, hairlines, shadow stacks

### Takeaway

Multi-layer shadows and procedurally-generated noise are the two techniques with real
technical substance here, and both are implementable with zero asset weight. The rule
for shadows is **two or three layers with blur and offset roughly doubling per layer and
opacity *decreasing* as elevation rises**; the rule for grain is **2–4% opacity for
subliminal, 5–8% for visible**, generated by an inline SVG `feTurbulence` data URI rather
than a tiling PNG.

### Cited Findings

- **[SNIPPET] Layered shadows, the stated rule.** "A single shadow rarely looks natural —
  real shadows are layered: a tight shadow near the object, and softer ones farther away.
  Layering 2–3 shadows at different blur radii and opacities produces the depth you see in
  professional design systems." The technique of "doubling the blur radius and offset at
  each layer while keeping opacity low is dramatically more realistic than a single shadow
  with the same total opacity." And: "opacity should usually decrease as elevation
  increases, otherwise shadows feel too heavy." — [Theo Soti, "Designing Better CSS Box
  Shadows"](https://theosoti.com/blog/designing-shadows/); [Ultimate Design Tools, "CSS Box
  Shadow: The Definitive Guide (2026)"](https://ultimatedesigntools.com/blog/css-box-shadow-guide/)
- **[SNIPPET] The Material three-part shadow anatomy.** Each Material elevation level
  (1dp–24dp) maps to **umbra** (darkest, tight contact shadow), **penumbra** (mid-range
  soft), and **ambient** (widest, faintest). — [Quasar, CSS Shadows (Elevation)](https://quasar.dev/style/shadows/)
- **[SNIPPET] Mode-aware shadow tokens are the current practice.** A six-level elevation
  ramp from a single light source, mapped to semantic tokens (`shadow-raised`,
  `shadow-dropdown`, `shadow-modal`) with "honest dark-mode values" — the same token
  resolving to a different recipe in dark mode. — [Depths](https://www.depths.studio/)
- **[SNIPPET] Grain: the generator, and the opacity bands.** The effect is produced by an
  SVG `feTurbulence` filter generating Perlin/fractal noise, emitted as a **data URI — no
  PNG request, no 200 KB tiling image**. Opacity guidance: **2–4% subtle/barely
  perceptible, 5–8% visible grain, 10–15% strong analog feel**; `mix-blend-mode: overlay`
  blends grain into a gradient naturally. — [ibelick, "Creating grainy backgrounds with
  CSS"](https://ibelick.com/blog/create-grainy-backgrounds-with-css); [Ultimate Design
  Tools, "CSS Noise Textures"](https://ultimatedesigntools.com/blog/css-noise-textures-guide/)
- **[SNIPPET] Paper fibre and letterpress, specifically.** "Real laid and cotton stocks
  have fibre that runs predominantly one way, and **anisotropic turbulence — a low
  `baseFrequency` on X and a high one on Y** — produces exactly that streaked, uneven
  tooth." Letterpress is described as three parts: "anisotropic fibre noise for the stock,
  a **two-value `text-shadow` for the impression**, and a deckle edge chewed by
  `feDisplacementMap`." — [CodeFronts, Paper Stock and Letterpress Press Effect](https://codefronts.com/design-styles/css-grain-texture/paper-stock-and-letterpress-press-effect/)

### Inferences

- **A blueprint/paper system should probably use a *hairline and tone* ramp instead of a
  shadow ramp, and steal the shadow *technique* only for the one or two places where
  something genuinely floats.** Technical drawings have no drop shadows; they have line
  weights. The transferable lesson from the shadow literature is the *principle* — that
  depth is several faint things rather than one strong thing — and the direct analogue in
  a drawing system is a **line-weight ladder** (e.g. 0.5px hairline for construction
  lines / grid, 1px for object rules, 1.5–2px for the single emphasised edge) rather than
  an elevation ladder. This is my synthesis; no source says it.
- **Hairlines at fractional device pixels:** on a 2× display a `1px` border is 2 device
  pixels and reads heavier than the draughtsman's hairline it is imitating. The
  device-pixel-honest version is `border-width: 1px` with a media query at
  `(min-resolution: 2dppx)` dropping to `0.5px`, or a `linear-gradient` background sized
  in `1px` on a scaled pseudo-element. **I found no source for this during this research
  pass** — it is standard practice but I am flagging it as uncited rather than dressing
  it up.
- **Grain has a real cost the sources do not mention: the `feTurbulence` filter is
  rasterised per-element at composite time.** A full-viewport fixed noise overlay is one
  rasterisation; noise applied to many scrolling elements is many. The safe pattern is a
  single `position: fixed; inset: 0; pointer-events: none` overlay at 2–4% with
  `mix-blend-mode`, generated once. This is an engineering inference, not a cited claim.
- **For a WCAG-AA system, grain must sit *behind* text, never over it.** Overlaying 5–8%
  noise on a text block reduces effective contrast — the measured ratio of the token pair
  no longer describes what is on screen. Keep the overlay on grounds only, or keep it at
  the 2–4% band where the perturbation is within rounding. (Inference; the contrast
  interaction is not discussed in any source I found.)

### Gaps

- **No source on fractional-device-pixel hairlines**, despite searching; the finding above
  is practice, not citation.
- **No source measuring the contrast cost of a noise overlay.** This is a real gap given
  the project's audit gate.
- **Nothing found on foil / emboss translated to screen** beyond the letterpress
  `text-shadow` trick. The "foil" question appears to have no substantive literature —
  what exists is gradient-animation tutorials, which are exactly the cheap-luxury move
  this brief is trying to avoid.

---

## Q6. The specific tension — draughtsman aesthetics elevated to luxury

### Takeaway

I found **weak direct evidence** here and want to be honest about it: the blueprint
aesthetic is currently documented as a *trend*, not as a luxury language, and the strongest
material I found is Aesop (restraint-as-luxury, no drawing) and Swiss cartography
(technical precision treated as art). The transferable principle from both is the same and
it is the one the project already has: **a technical language reads as luxurious when its
precision is visibly in excess of what the job requires.**

### Cited Findings

- **[SNIPPET] The blueprint aesthetic is a live 2026 trend with a named vocabulary.**
  "Blueprint graphic design originally emerged from engineering schematics and
  architectural drafts and is returning as a modern aesthetic. This aesthetic blends
  minimalism with technical precision, featuring **clean, instructional styling with
  deconstructed illustrations, thin-line connectors, monospaced typography, and two-color
  palettes** that feel calm, intentional, and instantly readable." It is appearing in
  food and beverage branding (deconstructed menus, ingredient posters) and in product
  packaging via **exploded-view illustrations** for electronics, skincare, candles and
  apparel. Historically the term refers to the cyanotype process, printed cyan and white.
  — [Kittl, "Blueprint graphic design: The utilitarian aesthetic returns in 2026"](https://www.kittl.com/blogs/blueprint-graphic-design-trend-stl/)
- **[SNIPPET] Swiss cartography as the canonical case of technical drawing treated as
  art.** Eduard Imhof, who founded the International Cartographic Association, "influenced
  generations of map makers with his effortless and painterly sense of depth and
  meta-realism"; Esri now ships an "Imhof-ish" styling approach so that "now everywhere can
  look like Switzerland". Swissinfo frames the tradition as "putting the art in
  cartography". Swisstopo cartographers have for decades hidden illustrations — a marmot in
  Alpine contour lines, a fish in the grooves of a French nature preserve — inside official
  maps, undetected for years. — [Esri ArcGIS Blog](https://www.esri.com/arcgis-blog/products/arcgis-pro/mapping/imhof-ish-cartography-now-everywhere-can-look-like-switzerland);
  [SWI swissinfo.ch](https://www.swissinfo.ch/eng/mapping-switzerland_putting-the-art-in-cartography/41830392);
  [AIGA Eye on Design](https://eyeondesign.aiga.org/for-decades-cartographers-have-been-hiding-covert-illustrations-inside-of-switzerlands-official-maps/);
  [My Modern Met](https://mymodernmet.com/hidden-swiss-map-illustrations/)
- **[SNIPPET] Aesop: "maximum effect with the minimal amount of materials".** Its stores
  have "a contemporary domestic quality… where quality is favoured over opulence and
  materials are applied in intelligent and unexpected ways". Nearly every store is by a
  different architect. — [Design Anthology](https://design-anthology.com/story/aesop-by-design);
  [Wallpaper\*](https://www.wallpaper.com/gallery/lifestyle/a-visual-history-of-aesops-best-designer-stores)

### Inferences

- **The Swisstopo hidden-marmot story is the single most useful thing in this section**,
  and it generalises into a rule: *a technical artefact becomes luxurious at the point
  where its maker has clearly spent effort no user asked for and few will notice.* The
  drawing is correct; the marmot is gratuitous; the gratuitousness is the luxury. The
  web analogue is not decoration — it is refinement invisible until looked for: correctly
  hung punctuation, a rail figure that is recomputed rather than hard-coded, rules that
  align across sections, tabular figures that keep columns from jittering, a focus ring
  drawn in the same hairline vocabulary as the rest of the system.
- **The Imhof lesson is that a technical system earns beauty through its *tonal* handling,
  not through ornament.** Imhof's reputation rests on relief shading — continuous tone
  applied to a line medium. The analogue for the project's `tone` axis (base | deep |
  contrast) is that tone should behave like Imhof's shading: a way of modelling depth
  across a page-long surface, not a per-component decoration. That is what the project's
  "tone repoints aliases, it does not paint anything itself" rule already encodes.
- **The blueprint trend being a trend is a risk the project should be told about.** Kittl's
  vocabulary — thin-line connectors, monospaced type, two-colour palettes, exploded views —
  is *exactly* the project's own description of itself. Being on-trend is not the same as
  being luxurious, and a trend's trailing edge is where "distinctive" becomes "template".
  The differentiators available are the ones a trend deck cannot copy: that the rail's
  facts are **computed from the content layer** and are therefore true, and that the tone
  axis is independent of the theme axis. Authenticity of the data is the moat.
- **Cyanotype is cyan-on-white, i.e. a *light* medium.** A blueprint system's "night"
  theme is therefore not historically grounded and has to earn itself on other terms —
  as a drawing-office lamp, a lightbox, a negative print. Worth naming explicitly so the
  night theme is designed as a distinct material rather than as an inverted day theme.

### Gaps

- **I found nothing usable on Hermès illustration, Bartholomew maps, or fine
  bookmaking/letterpress as *web* translations.** Searches returned stock-image sites and
  Pinterest. These are almost certainly researchable via books and museum sources but not
  via the search surface available here. **The report should not manufacture claims about
  Hermès's or Bartholomew's practice.**
- **No source directly argues "technical drawing = luxury".** The connection above is my
  synthesis of Aesop (restraint), Imhof/Swisstopo (excess precision), and the blueprint
  trend piece. Label it as such.
- **No high-end print-to-web translation case study found** (e.g. a publisher's account of
  translating a letterpress identity to screen).

---

## Q7. Counter-evidence: named anti-patterns in sites that tried for luxury

### Takeaway

Scrolljacking is the one anti-pattern with a genuine body of critique behind it, and the
critique is principled rather than stylistic: it overrides a standardised input. The
preloader/custom-cursor complex is contested rather than condemned in what I could find —
the sources split, and I am not going to report a consensus that does not exist.

### Cited Findings

- **[PRIMARY-ish, practitioner] Scrolljacking, the principled objection.** "Scrolljacking
  is a failure of the web designer's first objective as it attacks a standardized pattern
  and greedily assumes control over the user's input… users should set the pace of
  interaction." "Scroll hijacking goes against everything a user has learned to expect
  from their previous experiences with scrolling, both on the web and in most
  applications." The memorable framing: it is "similar to driving your car, pressing the
  horn but instead of honking, your wipers switch on." Mobile and tablet behaviour is
  called out as consistently worse. — [Robin Rendle, "Scrolljacking"](https://robinrendle.com/notes/scrolljacking/);
  [Envato Elements, "The Scroll Hijacking Usability Nightmare"](https://elements.envato.com/learn/scroll-hijacking);
  [Beamtic](https://beamtic.com/scrolljacking-a-ux-problem); [Keenan Payne](https://keenanpayne.com/scrolling/)
- **[WEAK, and genuinely contested] Preloaders and custom cursors.** "There has been
  controversy around simple cursors and animations in portfolio sites, with some arguing
  against their use. However, others believe that… preloaders shouldn't be avoided, as the
  portfolio should be treated as a canvas to showcase your work." The named feature set of
  the genre: "custom cursor systems, magnetic buttons, tilt-on-hover cards, scroll reveals
  and direction-aware marquees, as well as particle preloaders and custom ring cursors."
  — search summary across portfolio-inspiration sources including [DEV Community](https://dev.to/kerthin/10-examples-of-a-good-developer-portfolio-for-your-inspiration-2f88)
- **[SNIPPET, measured] The one hard performance number I found in this area.**
  Lazy-loaded LCP images: **p75 720ms vs 364ms preloaded — 2× slower, with 4× more "poor"
  experiences.** (Reported in the same search; the underlying measurement is
  Chrome/CrUX-derived but I did not reach the primary.) Relevant because the
  "entrance experience" that luxury portfolios build — preloader, fade-in hero — usually
  delays LCP by construction.
- **[PRIMARY] Motion anti-patterns restated here because they are the portfolio failure
  mode:** `ease-in` on UI; `linear` on interactive UI; animating from `scale(0)`;
  hover animation unguarded on touch; autoplay without user control; missing
  `prefers-reduced-motion`; mismatched timing between a modal and its overlay. —
  [vercel-labs/open-agents](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md)
- **[PRIMARY] NN/g's institutional version of the anti-pattern list for luxury:** luxury
  brands over-invest in the "reflective" emotional layer and under-invest in the
  behavioural one; they fail specifically at the *consider* stage; and they should avoid
  "interruptions that risk cheapening the brand." — [NN/g](https://www.nngroup.com/articles/luxury-terrible-ecommerce/) [SNIPPET-level quotation, page 504'd]

### Inferences

- **The anti-patterns share one root cause: they all spend the *visitor's* time to buy the
  *author's* impression.** Preloader, scroll-to-enter, cursor takeover, scrolljack,
  autoplay — each takes control of an input or a moment that belonged to the reader. That
  is the opposite of the Aesop/NN/g reading of luxury, where the brand's job is to defer
  to the customer. This gives a single testable rule: **if a device requires the visitor to
  wait, relearn an input, or watch something before they can read, it is cheap regardless
  of how well it is executed.**
- **Ultra-thin type is the anti-pattern the project's own contrast gate will catch, and
  the one the "luxury" literature actively encourages** (it recommends "thin weight
  variants"). Worth flagging as a direct conflict: the trade advice and WCAG 2.2 AA point
  in opposite directions here, and the gate wins.
- **The preloader debate is decidable on the LCP number rather than on taste.** A
  preloader that delays LCP is measurably worse on a metric the project already tracks
  (Lighthouse 90+/95+ targets), so this project does not need to take a position in the
  aesthetic argument.

### Gaps

- **I found no Hacker News thread, r/web_design critique thread, or named-critic teardown**
  of luxury-aspirational portfolio sites in accessible search results. Reddit and HN did
  not surface. The anti-pattern list above is therefore thinner and less adversarial than
  the assignment hoped for. **Do not have the report attribute anti-patterns to "HN
  consensus" — that evidence was not found.**
- **No measured data on bounce rate / conversion impact of preloaders or cursor takeover.**
- The `720ms vs 364ms` LCP figure is unverified at source.

---

## Q8. Images and photography — and what a site with almost none does instead

### Takeaway

**This is the weakest-evidenced question in the assignment and I want to say so plainly.**
I found no source that measures how luxury sites treat photography (aspect ratios, crop
conventions, colour grading, image-to-text ratio). What I can report is the one consistent
qualitative claim — one strong image per section, doing the work twelve small ones would
otherwise attempt — and the sourced techniques a photo-less site can substitute.

### Cited Findings

- **[WEAK] One image per section, not twelve.** Premium sites "let one strong visual per
  section do the work that cluttered layouts try to accomplish with twelve." — [Evoke
  Studio](https://madebyevoke.com/blog/what-makes-a-website-look-expensive)
- **[WEAK] Image quality is named as a cheapness tell, alongside typography.** The
  "attention to the details" framing puts image handling in the same tier as line-height
  as a signal of whether a design was done on the cheap. — [NP Group](https://www.npgroup.net/blog/how-to-avoid-making-your-web-design-look-cheap-attention-to-the-details/)
- **[SNIPPET] The no-photography substitution toolkit, sourced from the material section:**
  fractal noise as a data URI (no image request at all); anisotropic turbulence for paper
  fibre; two-value `text-shadow` for a letterpress impression; `feDisplacementMap` for a
  deckle edge; layered 2–3-stop shadows for physically plausible depth. — [ibelick](https://ibelick.com/blog/create-grainy-backgrounds-with-css);
  [CodeFronts letterpress](https://codefronts.com/design-styles/css-grain-texture/paper-stock-and-letterpress-press-effect/);
  [Theo Soti](https://theosoti.com/blog/designing-shadows/)
- **[SNIPPET] Exploded-view illustration is the blueprint trend's answer to the hero
  image** — it is what the aesthetic is actually being used for in packaging and product
  marketing right now. — [Kittl](https://www.kittl.com/blogs/blueprint-graphic-design-trend-stl/)
- **[SNIPPET] Aesop's answer to the same problem is instructive: no conventional
  advertising at all.** The brand's richness comes from packaging, architecture, writing
  and service rather than from imagery. — [Brandvelle](https://brandvelle.com/brands/aesop);
  [Brand Vision](https://www.brandvm.com/post/aesop-marketing-strategy)

### Inferences

- **A diagram-and-type site buys richness with *density of true information*, which is a
  currency photography cannot spend.** A photograph is one assertion; a correctly drawn,
  correctly labelled diagram whose labels are computed from the same data that renders the
  prose is many. The project's existing rule — the rail carries facts already true in the
  content layer, never restating the prose — is the mechanism that makes this work, and it
  is the substitute for the hero image.
- **What replaces the "one strong visual per section":** one *drawn* figure per section,
  at the same scale a hero image would have occupied, with the same discipline — no
  second figure competing, and enough surrounding space that it reads as plate rather
  than illustration. Exploded views, sectioned diagrams and the career tree are all plate
  candidates. (Inference.)
- **The photo-less site's equivalent of image quality is line quality.** Where a luxury
  site is judged on whether its photography is commissioned or stock, a drawing-based site
  is judged on whether its lines are consistent, whether they align across sections, and
  whether the hairline is a real hairline on the visitor's display. That is where the
  refinement budget should go.

### Gaps

- **No measured data whatsoever on luxury photography conventions** — no aspect ratios, no
  crop rules, no grading, no image-to-text ratios, no lazy-loading conventions. This is a
  genuine hole and the report should either drop the photography angle or state that it is
  unsourced.
- **No source on how illustration-led sites perform vs photography-led sites** on any
  metric.
- **No source on SVG illustration weight budgets** comparable to the font-budget numbers.

---

## Cross-cutting note for the report writer

The evidence base is **strongly asymmetric**. Motion has real, convergent, primary-sourced
numbers from three independent systems (Material 3, Vercel Labs, Kowalski) that agree with
each other. Typography has exactly one authoritative numeric source (Butterick) and it is
about competence rather than luxury. Colour, space, material and photography are dominated
by unmeasured trade opinion. The blueprint-as-luxury thesis is a synthesis I constructed,
not something any source argues.

The most defensible spine for the final brief, given what is actually citable:

1. **Motion, with numbers** — under 300ms, ease-out only, exits 20% faster, no bounce
   above 0.3, `transform`/`opacity` only, nothing animated that happens often.
2. **Measure and leading, with numbers** — 45–90ch (target 60–68), 120–145% leading.
3. **Family count as a performance decision** — one display + one text, subset, axis-pinned;
   quote the 303→22 KB and 160→40–60 KB figures for the cost argument.
4. **Aesthetic–usability as the *why*** — it is the one piece of actual research
   connecting visual refinement to a measured outcome, and its limit (only minor issues are
   forgiven) keeps the brief honest.
5. **Anti-patterns framed by the one root cause** — spending the visitor's time to buy the
   author's impression — with scrolljacking as the well-sourced exemplar.
6. **Everything about gold, glow, thin grey type framed as a contrast argument**, because
   that is the form in which it is testable against this project's existing audit gate.
