# Plan B — controller rulings (binding on every task; read with preflight.md)

R1 (T1) Code excerpts must be VERBATIM slices of real repo files (byte-identical incl. comments); add a unit
   test that every excerpt with a repo-local `source` is a substring of that file (fs.readFileSync). The
   plan's `project()` and worlds-test excerpts are fabricated — replace with the real globe.ts:93-101 and
   worlds.test.ts:116-126 (or whatever the real current lines are). No new prose about the owner.
R2 (T1) Chess tab: the engine.py source is not on disk — swap it for a third in-repo excerpt (e.g.
   `concurrentWith` in src/lib/knowledge-tree.ts); any caption uses authored phrasing only.
R3 Order: 1 → 3 → 4 → 5 → 6 → 7 → 2. T7 owns deleting/moving AskThienHeroTab and the live-mode read; T2 does not.
R4 (T7) Keep a LAZY boundary for the chat: git mv AskThienHeroTab → src/sections/Contact/AskLoader.tsx (or similar),
   move answer-code.ts + scoring-excerpt.ts with AskThisSite; Contact renders the loader (load on first
   visibility or an explicit button). Record a `pnpm perf` row before/after; initial JS must not grow > ~1 KB.
R5 Server-only values (`askLiveModeConfigured`, `bookingUrl`, `emailDeliveryConfigured`) are read in page.tsx
   and passed to Contact as props; `bookingUrl` must start with "https://" or nothing renders.
R6 (T2) Location/availability appear ONCE: if the rail gains them, delete HeroIdentity's <dl> meta row; tests scope with within(rail).
R7 (T2) Keep `profile.positioning` rendered in #about; render `profile.focus` as a rail note OR drop its corpus
   doc's sectionId — whichever keeps answer-corpus's promise true (corpus test must stay green, floors untouched).
R8 (T2) Demote the hero's "Explore my work" from primary (blue) to a secondary/quiet style — spec §4: the only blue
   primary control is Contact's "Send it as written".
R9 (T2) If buildKnowledgeTree goes: delete TreeRoot, its legacy tests, and resumeLenses if then unused; update the
   CLAUDE.md and docs/editing.md lines that describe it (a false doc is a defect — implementer edits exactly those lines).
R10 (T4/T5/T7) QuickConnect is REMOVED (spec §7: intents + finished drafts replace it). T7's one-primary test selects an
   intent first and matches `\bbg-accent\b`. BusinessCard stays the first and only <aside> in #contact (companion perch).
   The Ask block is a wrapper with id="ask" containing an <h3>.
R11 (T5) DirectLinks carries only what BusinessCard lacks (résumé PDF + booking if configured); use ExternalLink. No duplicated facts.
R12 (T4) Name stays REQUIRED (API min(1)). Preserve #contact-name, data-cat-secret, portfolio:contact-sent, the honeypot,
   the case-study referral (its own paragraph before "Best,"). Draft renders one <p> per paragraph, fully visible (no
   collapsed disclosure). mailto href < 2000 chars for every intent. Define the no-intent path.
R13 New unit tests go in tests/sections/ (repo convention), not tests/ui/.
R14 e2e ownership: T4 → e2e/contact.spec.ts (+ companion secret-form selectors stay green); T7 → e2e/ask.spec.ts
   (openHeroChat → #ask), e2e/axe.spec.ts, e2e/sections.spec.ts, scripts/screenshots.mjs; T1 → e2e/responsive.spec.ts and
   ask.spec.ts "builder.ts" regions. Each task's e2e must pass at --workers=2 on a production build.
R15 (T5) OWNER APPROVED (2026-10-04, "use the Downloads resume PDF"): replace public/thien-le-resume.pdf with
   C:/Users/thien/Downloads/Thien_Le_Software_Engineering_Resume.pdf. Before committing, verify: it contains "2.8M"
   (pdftotext or equivalent), contains NO phone number, and report its page count and size.
R16 CLAUDE.md: implementers may correct ONLY lines their task makes false (About description, buildKnowledgeTree note,
   chat location), nothing else.
