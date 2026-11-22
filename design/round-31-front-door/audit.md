# Round 31 audit — the showcase, not the page

Captured 2026-11-21. Thien asked how to make the site "a more outstanding
personal portfolio showcase". Rounds 28 and 29 had already audited the craft
and found it finished, and round 30 put "now" on the first screen, so this
audit read the site the way it is met: by a hiring manager, a recruiter on a
phone, or an engineer arriving from GitHub or a LinkedIn post, before and
after they click.

Evidence: `pnpm shots r30-built` (nine widths, both themes), production at
thienle.vercel.app (round 30 live, Resend sending), `src/content/portfolio.ts`,
every outbound link, the production share image, and the repo's and the GitHub
profile's metadata (`gh`). Not available: visitor analytics.

## The verdict first

As an object the page is already outstanding: one world, real objects carrying
the content, one voice, measured numbers, both themes, AA. The gaps are all in
the showcase layer, and mostly off the page: what a link looks like before
anyone clicks it, and where an engineer lands from GitHub.

## Findings, in order

| # | Where | What | Round 31 |
|---|---|---|---|
| 1 | The content layer | **Four full case studies are written and render nowhere.** `projects` holds, for DoorDash ×2, USC research and Schaeffler: problem, the assumption broken, constraints, decisions, paths tried, what failed, the lesson, a before/after, sourced metrics, the next question. A visitor gets chat snippets and three or four Diary bullets; nothing is linkable. | Deferred (Thien). If they come back, both DoorDash ones may be public pages. |
| 2 | Every link preview | **The share card is the last stock thing.** A black card in a grey system sans, from the pre-round-21 direction; its own comment still says it matches the site. It is what LinkedIn, Slack and iMessage show before anyone clicks. | **Built** |
| 3 | The repo | **The front door is a login wall.** The repo is public and is itself proof (30 rounds of boards, e2e at nine widths, a contrast gate, a retrieval eval), but its homepage field is a protected deployment that redirects to a Vercel login; no description, no topics; the README opens in the third person, describes the HTML résumé retired in round 23, and quotes a positioning line the site no longer uses. | **Built** |
| 4 | The GitHub profile | **It contradicts the site.** An emoji template ("Pioneer · Developer · Engineer") with no link to the site, LinkedIn or email, and one figure the record does not hold ("30+ integrations in a week"; the record says 30+ production scrapers in a week and 20+ live integrations). Bio empty. The pins are a chess game built from a video, two class repos and a design-patterns repo; the portfolio is not pinned. Seven of sixteen public repos are starter or tutorial forks. | **Built** (texts); pins and forks are Thien's, in the GitHub UI |
| 5 | DoorDash, everywhere | **The AI agent work is filed under "scraping".** The record has an agentic platform and an agent workflow that took onboarding from 2 to 25 merchants a month; the page says "retail data". | The card and both READMEs carry it; on-site copy unchanged |
| 6 | The capstone | Its demo (`fat-tabby-cat.azurewebsites.net`) times out. Nothing renders it today. | Noted |

## Considered and left alone

- **The visual craft**: rounds 28–29 found it done; today's shots agree.
- **The h1**: locked by Thien's ruling of 2026-10-28.
- **A number on the first screen**: "See what I've built" lands on six of them one scroll down; one more on the hero would compete with the h1 and the field tag.
- **The four class-project recordings** (chess, Conscea, DegreeWorks, toys): rendered nowhere, and next to DoorDash they would lower the average.
- **Live mode for the chat**: built and off; it stays retrieval-only (Thien).
- **Performance**: LCP about 1.2 s, CLS 0, 213 KB of JS at load (round 30's row).

## Thien's answers (2026-11-21)

- Audience: software engineering and AI agent work.
- This round: the share card and the GitHub front door only.

## Not covered

Visitor analytics (the Vercel connection used for the audit saw no projects),
Safari and Firefox, real devices.
