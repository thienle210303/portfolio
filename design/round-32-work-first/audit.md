# Round 32 audit — the work, first

Captured 2026-11-22. Thien pasted an outside audit of thienle.vercel.app ("Deep
portfolio audit", same day; it read the live site's text, the public source
and the résumé, and says itself that it took no pixel-level captures and ran
no performance tests). Its thesis: the personality is worth keeping, but
someone judging me as an engineer meets the life story before the
engineering. Its first fix is round 31's finding 1
([../round-31-front-door/audit.md](../round-31-front-door/audit.md)): four
full case studies are written in `projects` and render nowhere.

Each finding was checked against the code and the round 30 captures
(`design/.shots/r30-built`) before anything was planned.

## Findings, checked

| # | The audit says | Verdict | Evidence |
|---|---|---|---|
| 1 | Name and specialty are not prominent on the first screen (P0) | **Act** | My name is in the field tag's Name row and the "TL" tag, nowhere larger; the lead says "retail data", the agent work is not on the page (round 31 finding 5 left on-site copy alone) |
| 2 | The case studies exist in code but are not shown (P0) | **Act** | `projects`: four `featured: true`, each problem → constraints → decisions → paths tried → built → proof (sourced metrics) → lesson; `docs/editing.md`: "Case studies are not on the page" |
| 3 | Work is found by exploring the oak and the Diary (P0) | **Act** | The oak's tags hold the numbers but link to Diary pages; nav has no "Work" |
| 4 | Achievements share one text-and-number pattern (P1) | Partly | The oak's tags are deliberately brief and varied (`TAG_LOOKS`); what is missing is the how, which the case studies carry |
| 5 | TradeCorps and 3D printing lack showcases (P1) | Not this round | No facts or pictures exist beyond the receipt's two lines |
| 6 | "Fun fact" on almost every page (P1) | **Act** | 16 `diary.funFact`s; some are a metric or a restated fact, one says the scrapers were built "to avoid detection" |
| 7 | No message field; the résumé is near the bottom (P1) | **Act** (Thien reverses the "no message" rule) | CLAUDE.md non-negotiable; the desktop header has no Résumé link (only the phone menu and the business card do) |
| 8 | Measure performance (P1) | Already measured | Round 30/31: LCP ≈ 1.2 s, CLS 0, 213 KB JS at load (`docs/feedback-tracker.md`) |
| 9 | Playwright runs Chromium only (P2) | **Act**, locally | `playwright.config.ts`: seven `chromium-*` projects; and about ten specs run once in `chromium-1440`, the Diary's among them |
| 10 | "Practice makes AI." and "AI-ing" read as generated | Split | "Practice makes AI." is my own line (round 20) and stays; the receipt's two "AI-ing" statuses go |
| 11 | The Diary needs an index and a plain reading fallback | Already true | Contents page (p. 2), the tabs, the no-JS and reduced-motion scroll-snap track |
| 12 | Watch it grow should be optional; the Ask secondary | Already true | A button; the grown oak is the default. The Ask sits under the postcard |
| 13 | Make the cats an opt-in Easter egg | Declined | Part of the site; they already step aside over controls; perf is measured fine |
| 14 | Refactor globals.css; simplify the companion | Declined | No visitor-facing gain (design/README: no unnecessary rewrites) |
| 15 | Firefox and WebKit in CI | Declined as CI | No CI (2026-11-06); the browsers run locally |
| 16 | Curate the GitHub pins | Mine, in GitHub | Round 31 already listed it |
| 17 | Check the DoorDash title and that the figures are public | Mine | Round 31 cleared both DoorDash case studies for public pages; only I know whether the title should name a vendor |

## Thien's answers (2026-11-22)

- The case studies: **a Work section right after About**, each at rest as its
  problem, one decision and its proof, the whole story on its own page
  (`/work/<id>`), and the oak's tags that have one link to it. Nav: About ·
  Work · Journey · Diary · Contact.
- Which: **all four written** (DoorDash feasibility agent, DoorDash scraper
  platform, USC research collection, Schaeffler setup sheets).
- The first screen: **a name line over the unchanged h1**, in the words the
  round 31 README uses.
- Also: **Résumé in the desktop header**, **copy cleanup** (fun facts, the
  two "AI-ing"), **an optional message on the postcard**, **Safari and
  Firefox test runs**.

## Not covered

Real devices, visitor analytics, the live site's field Core Web Vitals.
