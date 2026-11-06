# Pre-flight — Round 18 Plan B (About and Contact)

Scanned 2026-10-04 against worktree `plan-b` at `d1ae75b` (= main HEAD). Read-only scan; this file is the only output.
Plan: `docs/superpowers/plans/2026-09-30-round-18-plan-b-about-and-contact.md`. Spec §4/§7/§10.

Legend: **T** true · **F** false · **M** moved/different (real location given) · **?** cannot verify locally.

---

## 1. Premises, per task

### Task 1 — real code in the hero artifact

| Premise | Status | Evidence |
|---|---|---|
| `codeTabs` in `src/content/portfolio.ts` holds three fabricated literals (`mindset`, "always learning") | T | portfolio.ts:198-247 (`profile`/`builder.ts`, `principles`/`principles.ts`, `exploring`/`exploring.ts`); `mindset` at :208 |
| `CodeTab` type in `src/types/portfolio.ts` has no `source` | T | types/portfolio.ts:369-376 (`id,label,filename,summary,code`) |
| Excerpt 1 = `project(point: GeoPoint, view: View): Screen \| null` in `src/lib/globe.ts` | **F** | Real: globe.ts:93 `export function project(v: Vec3, spin: number, tilt: number, view: Viewport): Projected` — rotates then returns `{x,y,front,depth}`; no `cosC`, no `null`, no `GeoPoint` arg, no `View`/`Screen` types. The plan's excerpt is a fabrication with a real filename on it. Real candidates ≤14 lines: `project` (:93-101, 9 lines), `toVector` (:44-49), `rotate` (:65-74). |
| Excerpt 3 = test in `tests/lib/worlds.test.ts` using `expect(AUTHORED).toContain(plaque.text)` with comment "A member of the set…" | **F** | Real: worlds.test.ts:116-126, name `"renders every field plaque verbatim from the content layer"`, body `expect(AUTHORED.has(plaque.text), \`${world.id}: …\`).toBe(true)`; `AUTHORED` is a `Set` (:25). The comment line in the plan does not exist. |
| Excerpt 2 = `Chess/engine.py` `minmax()` from github.com/thienle210303/Chess | **?** | Repo not on disk. `D:\Project\Portfolio-v2\src\assets\experience\` has only `chess.exe`, `chess.mp4`. Content layer names the repo (portfolio.ts:1163-1187, project `chess-minmax`). Must be fetched from GitHub or supplied by owner; the filename `engine.py` is unverified. |
| Source line "built for no reason at all" | **F-risk** | Authored tagline is "A chess game and a min-max bot, built from a YouTube video — no class, no client, no résumé line." (portfolio.ts:1166). "no reason at all" is new prose about him. |
| `HeroCodeArtifact.tsx` exists, renders `codeTabs` | T | HeroCodeArtifact.tsx:25,38 |
| `--step--2`, `text-fg-subtle` exist | T | globals.css:149; `--color-fg-subtle` :93 |
| Highlighter handles Python | **F-ish** | `src/lib/highlight.ts` is a TS/JS tokenizer; round-trip test (highlight.test.ts:52-58) will still pass, but `#` comments / `def` won't be styled as such. |
| `tests/lib/highlight.test.ts`, `e2e/sections.spec.ts` reference `codeTabs` | T | highlight.test.ts:3,53,105; sections.spec.ts:2,89,102,111 |
| Missed consumers | — | `e2e/responsive.spec.ts:114` ("builder.ts"), `e2e/ask.spec.ts:409,433,449` (region "builder.ts"), `tests/sections/HeroCodeArtifact.test.tsx:27-40` (tab labels `Profile/Principles/Currently exploring`) |
| Test location `tests/lib/content.test.ts` | T | exists; imports at top lack `codeTabs`/`contactIntents` (add). |

### Task 2 — one fold, two columns

| Premise | Status | Evidence |
|---|---|---|
| `Hero.tsx` renders `<HeroAbout />` after fold wrapper | T | Hero.tsx:36,137 |
| Fold wrapper `min-h-[calc(100svh-…)]`, `min-[1360px]` split `5.25fr/1px/6.75fr` | T | Hero.tsx:80,98 |
| `Scroll` row carries `data-cat-perch` | T | Hero.tsx:127-134 |
| Current rail = Now/Holds/Reach me | T | Hero.tsx:47-53 |
| `profile.about` has 3 paragraphs incl. "Kiên Giang"; `location`, `availability` set | T | portfolio.ts:80-84, 92-93 |
| HeroIdentity already renders location/availability | **T (plan ignores it)** | HeroIdentity.tsx:46-48, 75-94 (`<dl>` "Location"/"Availability"). Adding them to the rail without deleting this row restates a fact beside itself (rail rule) **and** makes the plan's own test `getByText(/Taylors, South Carolina/)` throw on multiple matches (about ¶1 + meta row + rail). Same for `/Open to remote/`. |
| `buildKnowledgeTree()` only consumed by HeroAbout | T (src) | src: HeroAbout.tsx:46,51 only. But tests/lib/knowledge-tree.test.ts:205-240 **and :304-309** ("carries the same overlaps on the legacy lens-grouped branches") use it. Deleting it also orphans `resumeLenses` (portfolio.ts:1284; only importer is knowledge-tree.ts:1). CLAUDE.md:161-163 and docs/editing.md:105 document it. |
| `TreeRoot` exists | T | knowledge-tree.ts:175 |
| "Journey's own rail already counts branches and leaves" | not verified; irrelevant to code |
| Interfaces says consumes `.positioning`, `.intro` | T fields exist (:70,78) — but steps never say where `positioning` renders after HeroAbout is deleted (it is HeroAbout's lead, HeroAbout.tsx:93-95). |
| Test file `tests/ui/Hero.test.tsx` | M | Section tests live in `tests/sections/` (HeroCodeArtifact.test.tsx, AskThisSite.test.tsx…). `tests/ui/` holds primitives. vitest include `tests/**/*.test.{ts,tsx}` so either runs. |
| Hero renders in jsdom | T-likely | HeroCodeArtifact.test.tsx renders the subtree; Hero itself calls `askLiveModeConfigured()` (process.env only). |
| Deletes `AskThienHeroTab.tsx` (Files list) | **conflict** | HeroCodeArtifact.tsx:28,46 imports it; deleting in Task 2 breaks compile until Task 7. Task 2's steps never actually delete it; Task 7 does. |
| Primary action: spec §4 "About does not ask for anything… one quiet link into the World; only blue button is in Contact" | **not in plan** | HeroIdentity.tsx:96-104 renders `<Button href="#tree">Explore my work</Button>` (variant `primary` default → blue fill, Button.tsx:101-102) + "Open résumé" + "Contact me". Plan Task 2 leaves it. |

### Task 3 — an intent produces a whole message

| Premise | Status | Evidence |
|---|---|---|
| `ContactIntent.messageStarter` | T | types/portfolio.ts:347-353 |
| `contactIntents` four entries `opportunity/crazy-idea/hello/secret` | T | portfolio.ts:1499-1532 (`messageStarter` at :1506,1514,1522,1530) |
| Consumers of `messageStarter` | T + missed | ContactForm.tsx:122-125 (`buildMessage`, also the **case-study referral** concat), e2e/contact.spec.ts:23,26 (textarea value) |
| mailto length test models real href | **partial** | Real `buildMailtoHref` (ContactForm.tsx:135-147) uses `state.reason` as subject and appends `—/Name/Email/Company` lines. Plan's test only encodes subject+draft. Still far under 2000 for ~250-char drafts. |
| Review Focus 2 says "Task 4 asserts" mailto length | F | The test is in Task 3. |

### Task 4 — the form hands over a finished message

| Premise | Status | Evidence |
|---|---|---|
| `ContactForm.tsx`, `IntentChooser.tsx` exist | T | 599 / 71 lines |
| `emailDeliveryConfigured` prop | T | ContactForm.tsx:195-199; computed in **page.tsx:13-15**, passed via Contact.tsx:52,78 |
| Current form shape (plan's snippet is "the part this task adds") | — | Existing: name (required), email (required), company (opt), reason `<select>`, message textarea (min 10), honeypot `website`, inline FieldError/aria-invalid, focus-first-invalid, three status kinds, `noValidate`. Plan doesn't say which of these survive. |
| "Name is optional" | **F vs API** | `src/app/api/contact/route.ts:55-59` `name: z.string().min(1, "Enter your name.")`; client `validateField("name")` :85-88. Optional name → every Resend submit with blank name returns `invalid`. |
| Radio name `/career opportunity/i` | T | label "I have a career opportunity" (portfolio.ts:1502) inside wrapping `<label>` (IntentChooser.tsx:46-66) |
| Test 1 `getByText(draft.split("\n\n")[1])` passes against snippet | **F** | Snippet renders whole draft in ONE `<p className="whitespace-pre-line">`; getByText matches an element's full normalized text, so a middle paragraph never matches. Either render one `<p>` per paragraph or change the matcher. |
| Test 3 `findByText(/where to reply/i)` proves validation | weak | Label text "Where to reply" is always present → passes without any validation firing. |
| Primary button class `bg-accent` | T | QuickConnect.tsx:133 uses `bg-accent`; `Button` primary uses `bg-[color:var(--accent)]` (Button.tsx:101). |
| Companion contracts the form must keep | not in plan | `data-cat-secret` on the form (ContactForm.tsx:415), `#contact-name` id (companion.spec.ts:3740,3808; contact.spec.ts:38), `portfolio:contact-sent` event (:343), case-study referral listener (:227-238, CaseStudy.tsx:339-355 "Discuss this project"). |
| Test file `tests/ui/ContactForm.test.tsx` | M | prefer `tests/sections/`. `@testing-library/user-event` is installed (package.json). |
| No-intent path | **gap** | Snippet is `{selected ? … : null}` — with no intent chosen there is no send path at all. IntentChooser legend still says "(optional starting point)" (IntentChooser.tsx:40). |

### Task 5 — four ways out with no form

| Premise | Status | Evidence |
|---|---|---|
| `profile.resumePdf` = `/thien-le-resume.pdf`; `resumePdfLabel` | T | portfolio.ts:94-95; types :69-70 (`resumePdfLabel: string`, not `Maybe` — `resolved()` is harmless but unneeded) |
| `public/thien-le-resume.pdf` exists | T (stale) | 150,401 B, committed in 9f009d0; `pdftotext … \| grep -c 2.8M` → **0** |
| `C:\Users\thien\Downloads\Thien_Le_Software_Engineering_Resume.pdf` is current | T | exists, 135,813 B, Sep 20; grep `2.8M` → **2**; lists DoorDash Oct 2025–Present |
| `pdftotext` available | T | `/mingw64/bin/pdftotext` (Git Bash) |
| `socialLinks` with `id,label,handle,href,external` | T | portfolio.ts:152-177; type :146-154 |
| "path cannot drift from the one the hero's download link uses" | **F** | Hero links `/resume` (HeroIdentity.tsx:98), not the PDF. The PDF is linked from `src/app/resume/page.tsx:74`. |
| Links not already present in Contact | **F** | BusinessCard (`<aside>`, BusinessCard.tsx:223-329) already renders mailto + CopyButton, GitHub, LinkedIn. DirectLinks duplicates three of four. Spec §7 says "copy the email" — the copy affordance lives on the card. |
| `ExternalLink` primitive | exists | src/components/ui/ExternalLink.tsx:27 — plan hand-rolls target/rel instead. |
| `e2e/contact.spec.ts` "quick connect" expectations | conflict risk | :218-235 uses `.first()` on mailto/GitHub/LinkedIn links — duplicates don't fail it, but placement before the card changes which one is first. |

### Task 6 — book twenty minutes, or nothing

| Premise | Status | Evidence |
|---|---|---|
| `BOOKING_URL` read in `Contact.tsx` (Server Component) "same shape as emailDeliveryConfigured" | **M** | `emailDeliveryConfigured` is read in `src/app/page.tsx:8-15`, not Contact.tsx; Contact.tsx reads no env. Task 7's test passes `bookingUrl` **as a prop to Contact**, contradicting "read in Contact.tsx". |
| `.env.example` exists | T | sections: SITE_URL, Resend, ASK_LLM_*; no BOOKING_URL |
| Renders nothing without URL | T by snippet (`if (!bookingUrl) return null`) |
| Test file lacks imports | F | Step 1 snippet has no `import` lines (render, screen, BookACall). |
| URL scheme | gap | No check that it is `https://` — an env typo like `cal.com/…` renders a relative link. |

### Task 7 — Ask moves to Contact

| Premise | Status | Evidence |
|---|---|---|
| `src/sections/Hero/AskThisSite.tsx` exists | T | 909 lines; default export :582 |
| It is self-contained | **F** | imports `./answer-code` (:10-16) and `./scoring-excerpt` (:17-22), both in `src/sections/Hero/`. `tests/lib/scoring-excerpt.test.ts:7` imports `@/sections/Hero/scoring-excerpt`; `src/lib/answer-corpus.ts:22,477-478` names them. Move all three or fix the relative imports. |
| Delete `AskThienHeroTab.tsx` and render `<AskThisSite>` in Contact | **F — perf regression** | AskThienHeroTab.tsx is the *only* thing keeping the chat out of initial JS: it `import()`s AskThisSite (:46) which statically imports `@/lib/answers` (whole lexical index built at module load). A static `<AskThisSite>` under the server-rendered Contact puts the engine + corpus into the initial bundle. Needs a lazy boundary (relocated, not deleted) and a `pnpm perf` row. |
| `askLiveModeConfigured()` "still read server-side in Contact.tsx" | **M** | Read in `Hero.tsx:33,59` today. Comments to update: AskThisSite.tsx:42,123-124 ("computed … in Hero.tsx"), ask-live-config.ts:11, `.env.example` ASK block ("read … in src/sections/Hero/Hero.tsx"). |
| `#ask` "may be linked from elsewhere" (Review Focus 4) | **F** | No `id="ask"` exists anywhere; only Tabs id `"ask"` (HeroCodeArtifact.tsx:44 → `hero-code-…`). New id, no legacy obligation. |
| Test 3 "exactly one `bg-accent` button" | **F as written** | (a) Send button only renders after an intent is selected → 0 at first render; (b) QuickConnect's submit has `bg-accent` (QuickConnect.tsx:133) → 1 already before any change; (c) `hover:bg-accent-strong` substring also matches. |
| Heading "Ask about my work" level | unspecified | Contact's h2 is SectionHeading (Contact.tsx:55-60) → must be h3. AskThisSite has no h2-h4 of its own. |
| `HeroCodeArtifact` "goes back to three tabs" | T after edit | prop `liveModeConfigured` then unused → remove prop from Hero.tsx:123 and HeroCodeArtifact props. |
| Tests to update (not listed in plan) | — | `tests/sections/AskThienHeroTab.test.tsx` (whole file), `tests/sections/AskThisSite.test.tsx:4` import path, `tests/sections/HeroCodeArtifact.test.tsx:15-23,25-70` (mock + 4-tab assertions), `tests/lib/scoring-excerpt.test.ts:7`, `e2e/ask.spec.ts:32-42 openHeroChat`, `:380`, `:386-520` (whole "hero code artifact — Ask Thien tab" block), `e2e/axe.spec.ts:214-223`, `e2e/sections.spec.ts:86-111`, `scripts/screenshots.mjs:54,175-182`. |

---

## 2. Cross-task table

| Pair | Shared file / interface | Producer → consumer | Conflict |
|---|---|---|---|
| 1 ↔ 2 | `codeTabs`, `HeroCodeArtifact` | T1 authors tabs + `source`; T2 renders unchanged | none if T1 lands first |
| 1 ↔ 7 | `HeroCodeArtifact.tsx` | T1 adds provenance line; T7 removes Ask tab + prop | sequential edits, same file; T1 must not re-break HeroCodeArtifact.test's tab list (T7 rewrites it) |
| 2 ↔ 7 | `AskThienHeroTab.tsx`, `Hero.test` "no Ask tab" | T2 Files says delete; T7 actually deletes | **Double ownership.** T2 deleting breaks compile; T2 test can't pass until T7. |
| 2 ↔ 7 | `askLiveModeConfigured()` in Hero.tsx | T2 rewrites Hero.tsx; T7 moves the read to Contact/page | T2 must leave the read until T7, or T7 runs first |
| 2 ↔ corpus | `profile.positioning`, `profile.focus` docs `sectionId:"about"` (answer-corpus.ts:132-150) | HeroAbout renders them; T2 deletes HeroAbout ("keep nothing") | **Breaks the `Document.sectionId` promise** the corpus comment (:133-136) says HeroAbout makes true. Not in plan. |
| 3 ↔ 4 | `ContactIntent.messageDraft` | T3 renames + minimal ContactForm fix; T4 renders draft | T3 must keep ContactForm compiling (buildMessage + referral concat) — T4 then replaces. e2e/contact.spec.ts:23,26 breaks at T3 and again at T4. |
| 3 ↔ 4 | mailto length | T3 tests subject+draft only; T4's real href adds reason + signature lines | Review Focus 2 attributes it to T4. Low risk. |
| 4 ↔ 7 | "one primary per screen" | T4 adds Send (bg-accent); T7 asserts exactly one | QuickConnect bg-accent + selection-gated Send → T7 test cannot pass without a ruling on QuickConnect and on the test's selection step. |
| 4 ↔ companion | form `data-cat-secret`, `#contact-name`, `portfolio:contact-sent` | companion.spec.ts:3722-3810, Companion.tsx:2065 | T4 must preserve all three. |
| 5 ↔ 6 ↔ 7 | `Contact.tsx` | all three add children | "the new arrangement" is never specified in any task; QuickConnect's fate unspecified; BusinessCard `<aside>` must remain the **first** `<aside>` in `#contact` (companion-moods.ts:232; companion.spec.ts:2101,3639). |
| 5 ↔ BusinessCard | email/GitHub/LinkedIn | both render | duplicate facts in one section |
| 6 ↔ 7 | `Contact` props | T6 says read env in Contact; T7 test passes `bookingUrl` prop | pick one (recommend page.tsx → prop, matching email). |
| 7 ↔ perf | initial JS | removing lazy boundary | needs `pnpm perf` row per CLAUDE.md spirit |

---

## 3. Self-consistency, per task

- **T1** — Excerpts 1 and 3 contradict the plan's own instruction "check against the real file"; they will fail that check. Test "no `Unsolved is not the same as unsolvable`" is fine (philosophy stays in the rail). Step 6 lists two consumers; at least four more exist (§1).
- **T2** — Files says delete AskThienHeroTab; steps don't. Interfaces consumes `positioning`; steps drop it. Test "location in rail" uses `getByText` that will hit 3 elements. Step 5 claims "hero is one screen" while Step 3 adds three paragraphs to the identity column — unverified; the fold is `min-h`, so it simply grows and pushes the `Scroll` perch down. Step 3 deletes `buildKnowledgeTree` but only mentions updating knowledge-tree.test's legacy block; :304-309 also uses it.
- **T3** — consistent; Step 4 grep will find e2e/contact.spec.ts, whose assertion (textarea value === starter) T4 then invalidates again.
- **T4** — Test 1 cannot pass against the given snippet (single `<p>`). "Name optional" contradicts API schema. Snippet doesn't say whether company/reason/message fields, FieldError, honeypot, status messages survive. "Modify IntentChooser.tsx" with no change described. No e2e updates listed though contact.spec.ts:15-101 assert the old form.
- **T5** — Comment claims parity with "the hero's download link" (false). Commit message says "Copy the email" (component uses mailto).
- **T6** — Step 3 says read env in Contact.tsx; T7's test API says it's a prop. Test snippet missing imports.
- **T7** — Test 3 fails for structural reasons (§1). Step 3 forgets `answer-code.ts` / `scoring-excerpt.ts`. "git rm AskThienHeroTab" removes the lazy boundary. Step 7 e2e expectation "PASS" is unattainable without rewriting ask.spec/axe.spec/sections.spec, none listed.

---

## 4. Collisions with work shipped after the plan

**Hero layout (Task 2):**
- `[data-cat-perch]` — Hero.tsx:128, read by companion-moods.ts:196 (`heroMood`) for section `about` (:284) and by the tour's first stop (companion-tour.test.ts:74, Companion.tsx:2211-2214). Plan keeps it. Risk: taller fold moves it below the 1440×900 fold; companion.spec.ts:1306-1320 documents assumptions about the hero's halves at 1440×900 ("between 39% and 61% of each half of the hero clears the head band").
- companion.spec.ts:1950-1956 parks the pointer on `#main p` first paragraph (currently the hero intro) — layout-dependent, not content-dependent.
- legacy-anchors.spec.ts:181 needs `#about` in viewport at load — unaffected.
- e2e/accessibility heading order: Hero must keep zero h2/h3 (HeroAbout.tsx:38-43 explains why). Plan's test asserts no h2; fine.
- Corpus: `profile.positioning` + `profile.focus` documents cite `#about` because HeroAbout renders them (answer-corpus.ts:132-150). `tests/lib/answers.test.ts:26-27` lists both in the authored set; :302 expects identity answers to cite `about`. Deleting their render makes "More on this in About →" partially untrue for those two documents.
- `globals.css:710` comment references HeroAbout's "Since {year}" line (stale after delete). `types/portfolio.ts:51,63` doc comments name HeroAbout.

**Ask → Contact (Task 7):**
- Citations: corpus `sectionId`s are `about` / `worlds` / `tree` only — none cite `contact`, so links from an answer in Contact go *up* the page; ask.spec.ts:98-107 regex derives from `navItems` and still holds. NOTHING_FOUND copy "sections above" (AskThisSite.tsx:111-112) becomes literally true in Contact.
- Every e2e entry point to the chat is the hero tab "Ask Thien": ask.spec.ts:38-42 (`openHeroChat`), :380, :386-520; axe.spec.ts:214-223; screenshots.mjs:175-182.
- Companion contact mood: `document.querySelector("#contact aside")` (companion-moods.ts:232) — first `<aside>` in Contact. BusinessCard is the only one today (BusinessCard.tsx:223). Do not wrap Ask or DirectLinks in `<aside>`, and keep the card where the perch probe ([300,500] scroll window, companion.spec.ts:2101,3639) can find it.
- companion-play.ts:917 reads the first `h2` in a section for scenes — Ask's heading must not be an h2 placed above SectionHeading.
- Perf: AskThienHeroTab's lazy `import()` is what keeps `@/lib/answers` (index built at module load) out of initial JS. Static render in Contact = regression.

**Contact form (Tasks 3-4):** companion `data-cat-secret` (ContactForm.tsx:415; companion.spec.ts:3722-3810; contact.spec.ts:34-49) and `portfolio:contact-sent` (ContactForm.tsx:343) must survive; companion and contact specs locate the full form via `form:has(#contact-name)`.

**Docs:** CLAUDE.md:96-97 ("About (`#about` — the hero, its chat and the About band)") and CLAUDE.md:161-163 (`buildKnowledgeTree` survives for the About band) go stale; docs/editing.md:105 too. Env comments for ASK_LLM_* name Hero.tsx.

---

## 5. Owner blockers

1. **Cal.com URL** — not supplied. Task 6 as specified renders `null` without it; nothing to block. Env is new (`BOOKING_URL` absent from `.env.example`). Note: `page.tsx` reads env in a Server Component of a statically rendered page, so it bakes in at build — setting it later needs a redeploy (same as Resend today).
2. **Résumé PDF** —
   - In repo: `public/thien-le-resume.pdf` (150,401 B, from commit 9f009d0, **no `2.8M`**, stale).
   - Current: `C:\Users\thien\Downloads\Thien_Le_Software_Engineering_Resume.pdf` (135,813 B, 2026-09-20, `2.8M` ×2, DoorDash Oct 2025–Present) — matches the plan's named source.
   - Older, do not use: `C:\Users\thien\Downloads\resume.pdf` (Feb 2025), `D:\Project\Portfolio-v2\src\assets\resume.pdf` (May 2025), `D:\Project\Portfolio-v2\src\assets\software_engineering_resume.pdf` (Feb 2025).
   - The copy target is outside the worktree source; the implementer must copy from Downloads (permission/owner nod for publishing the file — it contains contact details; confirm no phone number, spec §11).
3. **Chess excerpt** — source not on disk; needs GitHub fetch of thienle210303/Chess or owner-supplied file; "built for no reason at all" is new prose about him.
4. **Contact drafts** — owner delegated ("Do your"), so no block; but they ship words over the visitor's name — controller may want owner sight before merge.
5. **QuickConnect ("leave a number")** — spec §7 lists five items and does not include it; plan never mentions it. Keeping or removing it is a product call (it is also the second blue button).
6. **Hero primary "Explore my work"** — spec §4 says About asks for nothing and the page's only blue button is in Contact; removing/demoting it is visible to the owner.
7. **Name optional vs required** — changes the server contract (`route.ts:55-59`).

---

## 6. Recommended rulings (decide before dispatch)

1. **T1: replace excerpts 1 and 3 with verbatim slices of the real files** (globe.ts:93-101 `project`, worlds.test.ts:116-126), byte-identical including comments; add a unit test that each excerpt with a repo-local `source` is a substring of that file's text (`fs.readFileSync`). *Reason:* the plan's versions are fabricated — the exact failure the round exists to remove.
2. **T1 chess tab: fetch the real file or swap it.** If GitHub source can't be read, use a third in-repo excerpt (e.g. `toVector`, or `concurrentWith` in knowledge-tree.ts) and keep `source` to authored phrasing (the `chess-minmax` tagline). *Reason:* unverifiable code + new prose about him.
3. **Order: 1 → 3 → 4 → 5 → 6 → 7 → 2** (or 7 immediately before 2). T2 does **not** delete AskThienHeroTab or move the live-mode read; T7 owns both. *Reason:* removes the double-delete and the `it.todo` dance.
4. **T7: keep a lazy boundary.** `git mv` AskThienHeroTab → `src/sections/Contact/AskLoader.tsx` (or similar) and move `answer-code.ts` + `scoring-excerpt.ts` with AskThisSite; Contact renders the loader (trigger on first visibility or an explicit "Ask about my work" button). Run `pnpm perf` before/after and record the row. *Reason:* static import ships the whole index in initial JS.
5. **Liveness/booking booleans: read in `page.tsx`, pass as props** (`askLiveModeConfigured`, `bookingUrl`) to Contact — matches `emailDeliveryConfigured` and T7's test signature. Validate `bookingUrl` starts with `https://`. *Reason:* resolves T6/T7 contradiction.
6. **T2: rail gains Based/Open to only if HeroIdentity's `<dl>` meta row (HeroIdentity.tsx:75-94) is deleted**; fix the test to scope to the rail (`within(rail)`). *Reason:* one fact, one place; otherwise test throws on duplicates.
7. **T2: keep `profile.positioning` rendered in #about** (as the identity lead or replacing `intro`) and decide `profile.focus`: render it (e.g. a rail "Focus" note) or drop that corpus doc's `sectionId`. *Reason:* answer-corpus.ts:132-150 promises both render in About.
8. **T2: demote "Explore my work" from `primary`** (secondary/quiet) per spec §4, or rule it out of scope explicitly. *Reason:* spec says the only blue button is in Contact; T7's one-primary test measures only Contact.
9. **T2 `buildKnowledgeTree` deletion:** delete it, `TreeRoot`, the legacy describe **and** the overlap test at knowledge-tree.test.ts:304-309, and decide whether `resumeLenses` (now unused) goes too; update CLAUDE.md:161-163 and docs/editing.md:105. *Reason:* otherwise orphaned content + stale docs.
10. **Contact arrangement (T4/T5/T7): rule on QuickConnect now** (spec implies remove). If kept, T7's test must count it. Fix T7 test 3 to select an intent first and match `\bbg-accent\b` (not `hover:bg-accent-strong`). Keep BusinessCard as the first and only `<aside>`; Ask heading is `<h3 id=…>` inside a wrapper with `id="ask"`. *Reason:* test is unsatisfiable as written; companion perch depends on the aside.
11. **T5: DirectLinks vs BusinessCard duplication** — either DirectLinks carries only what the card lacks (résumé PDF, booking) or the card drops its link rows. Use `ExternalLink`. Correct the false "hero's download link" comment. *Reason:* duplicate facts in one section.
12. **T4: name stays required** (API `min(1)`), or change route.ts + client validation + tests together. Preserve `#contact-name`, `data-cat-secret`, `portfolio:contact-sent`, honeypot, case-study referral (append the referral as its own paragraph *before* "Best,"). Define the no-intent path. Render the draft as one `<p>` per paragraph so the plan's test 1 works. *Reason:* server contract + companion contracts + unpassable test.
13. **Tests go in `tests/sections/`**, not `tests/ui/`. *Reason:* repo convention.
14. **e2e rewrite budget:** T4 owns `e2e/contact.spec.ts` (and companion secret-form selectors staying green); T7 owns `e2e/ask.spec.ts` (`openHeroChat` → scroll to `#ask`), `e2e/axe.spec.ts:214-223`, `e2e/sections.spec.ts:86-111`, `scripts/screenshots.mjs:175-182`; T1 owns `e2e/responsive.spec.ts:114` and ask.spec.ts's "builder.ts" regions. *Reason:* none are listed; Step 7's "PASS" is otherwise impossible.
15. **T5 PDF:** copy from Downloads only after owner confirms that file is the one to publish; verify with `pdftotext -layout public/thien-le-resume.pdf - | grep -c '2\.8M'` ≥ 1 and that no phone number appears. *Reason:* publishing personal data; spec §11.
16. **CLAUDE.md edits** (About description, buildKnowledgeTree note, chat location) — controller/owner decision, not implementer initiative. *Reason:* project instruction file.
