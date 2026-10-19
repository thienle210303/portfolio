# Updating the site

Everything factual lives in `src/content/`. You should almost never need to
open a component to change what the site says.

| What you want to change | File |
|---|---|
| Roles, projects, metrics, skills, education, contact details | `src/content/portfolio.ts` |

(Round 18 deleted `src/content/ai-experiments.ts` and `src/content/workshop.ts`
along with the Workshop section and the AI Workflow Lab's content. If you are
looking for either, it is in git history, not here.)

After any edit, run `pnpm verify`. It typechecks, lints, re-measures colour
contrast, runs the unit tests and builds. If a number you removed was being
counted somewhere, or a required field went missing, that is where you find
out — not in production.

---

## Change a metric

Metrics are the numbers shown large in the accent colour at the top of each case study.
Find the project in `projects` and edit its `metrics` array:

```ts
metrics: [
  {
    label: "Example — what was measured",
    before: "Example — the state it started from",
    after: "Example — the headline figure",
    source: "Example — where the figure came from",  // required
  },
],
```

(Every value above is a placeholder, deliberately shaped so nobody mistakes it
for one of the site's real figures.)

That one object drives **four** places at once, which is why there is nowhere
else to update:

- the big figure in the case-study summary (`MetricHighlights`)
- the full before/after table inside the case study (`MetricTable`)
- the project's line on `/resume`
- the answers behind "Ask this site"

Three things worth knowing:

- **`source` is not optional, by design.** The site's whole claim is that every
  figure names where it came from. TypeScript will refuse a metric without one.
- **Only the first three show as headline figures.** The rest still appear in
  the table. Put the most persuasive ones first.
- **`after` does not have to be a number.** "Under 1 hour, end to end" works;
  the figure just renders smaller as the string gets longer, so it stays on one
  or two lines.

To remove metrics entirely from a project, delete the `metrics` key. The
summary falls back to showing the first three `proof` sentences instead, so the
case study never ends up with no evidence in it.

## Add a role, a project or a milestone

Add an entry to `careerEntries`. One entry feeds all of:

- the **Journey** (`#tree`, `src/sections/CareerTree/`) — a branch on the
  drawing (>=1024px) and a row in the timeline, or one line on the credentials
  strip if it is one of the demoted entries (see below)
- the **résumé** at `/resume` — its Experience list shows `type: "work"`
  entries only
- "Ask this site"

`currentEntry()` (in `src/lib/content.ts`: the entry whose `dateRange` ends
in "Present") is no longer rendered in the hero. The hero names my employer
in authored prose, so changing jobs means editing `profile.positioning`, the
field tag's `hero.fieldTag.habitat`, and the DoorDash chapter tag (below).

Then one thing the entry cannot decide for itself:

- **When it ended.** Set `endSortKey` (`YYYY-MM`) on any role that has ended,
  and leave it off one that is still running. `concurrentWith()` compares
  these months inclusively to draw "Ran alongside", so a guessed month can
  invent an overlap — say so in a comment beside it.

The fields that decide what hangs off it in the tree (every entry is its own
branch, in date order — `sortKey` decides where on the trunk):

```ts
technologies: ["Python", "Playwright"],  // technology leaves on its branch
impact: ["One sentence of what changed."],  // shown verbatim in its timeline row
headline: "Result in 12 words or fewer.",  // shown with the branch and the row at rest
```

### Write a headline

Every drawn branch needs a `headline` on its career entry: the one line shown
with it at rest. Keep it to 12 words or fewer, phrased as a result, with every
figure taken from the same entry's own `impact`, `context` or `built`. It is
never indexed for the chat. `tests/lib/voice.test.ts` fails on a missing or
over-long headline, a figure the entry doesn't contain, or an indexed headline.
Rules and examples: [docs/voice.md](voice.md).

To attach a case study to a role, set the project's `careerEntryId` to that
entry's `id`. The case study then renders inside that role's timeline row on
the Journey, and the role supplies the employer and dates shown under the
case-study title, so the two can never drift apart. (A case study whose role is
demoted has no row to open from, so it renders after the timeline, full width —
`UnbranchedCaseStudies`.)

## Where the résumé lives

There is no résumé *section* on the home page. There was, and it was a
5,000px second telling of the page around it — the experience was the Journey
timeline, the projects were Selected Work, the education and every award were
already timeline entries. Only skills and certifications were unique to it.
Round 18 deleted the Skills section that briefly held them, so they now render
on `/resume` and nowhere else on the site.

So the résumé is `/resume`: a page to read, print, or download. It reads the
same `careerEntries`, `projects`, `skillCategories`, `education`,
`certifications` and `achievements` as the rest of the site, so it can never
disagree with the home page. Editing any of those updates both.

The downloadable PDF is a separate artefact at `public/thien-le-resume.pdf`,
pointed to by `profile.resumePdf`. **It does not regenerate itself** — if you
change a role or a metric, update the PDF too, or the download will contradict
the page. `Ctrl/Cmd+P` on `/resume` produces a clean copy to replace it with.

## A note on the Journey's tree

The tree draws **only relationships you have written down**. Each branch *is*
one career entry (chronological up the trunk, each exactly once), and its
leaves are that entry's own `technologies` — because you listed them there,
never because anything matched. Its `impact` lines are not leaves: they show
verbatim in the entry's timeline row, which the branch's label links to.

Nine entries — the degree and eight milestones —
are not drawn as branches. They are `DEMOTED_ENTRY_IDS` in
`src/lib/knowledge-tree.ts` and render as one credentials line below the
timeline instead. Nothing is drawn under the ground line: the skill groups that used to
label the roots are on `/resume` now, not on the tree.

It deliberately does *not* try to match `skillCategories.skills` against
`technologies`. Those are two different vocabularies — of 38 skills, 17 match a
technology string exactly, and the rest are near-misses like "React" against
"JavaScript/React". Matching them loosely would draw lines you never drew;
matching them strictly would claim "React — used nowhere", which is false. So
if you want a skill to appear in the tree, list it in a role's `technologies`
using the same spelling you use elsewhere.

`tests/lib/knowledge-tree.test.ts` fails if anyone reintroduces guessing.

## Contact delivery

The business card's lead form (a name, plus an email or phone) posts to
`/api/contact`, which needs three environment variables:

```
RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL
```

With any of them missing, it falls back to opening the visitor's own mail app
with a message to `profile.email` under the subject `Portfolio lead — <name>`,
carrying the name, email and phone. That fallback is deliberate — it means the site
never claims to have sent something it did not. See `.env.example`.

## The hero's tags and field tag

Each line lives in one place. `buildChapters()` and `buildFieldTag()` in
`src/lib/hero.ts` assemble them; the hero components only render.

| On the page | Where it comes from |
|---|---|
| Kiên Giang tag: year, place | `origin.born`, `origin.from` |
| Taylors tag: month, place | `origin.arrivedOn`, `origin.to` |
| USC tag: year, place | `usc-degree`'s `sortKey`, `organization` (three or more words shorten to initials) |
| DoorDash tag: year, place | `doordash`'s `sortKey`, `organization` |
| My line on the back of a tag | `hero.chapterLines`, except Taylors: `eastside-high`'s `headline` |
| "Read this part" | the tag's career entry row in the Journey (Kiên Giang: the Journey itself) |
| The hint under the line | `hero.hint` |
| Field tag rows | Name `profile.name`; Native to `origin.from`; Transplanted `origin.to`; Companions `hero.fieldTag.companionsLead` plus every `companions` name; the rest `hero.fieldTag` |
| The stamp | `profile.motto` |
| The QR and its link | the `linkedin` entry in `socialLinks` |
| The vignette captions | `hero.vignette.morning` / `.evening` |

A tag's drawing (and every other piece of scenery) is drawn by
`scripts/draw-scenery.mjs`. After changing a drawing, run `pnpm draw:scenery`
and commit the regenerated files in `public/scenery/`;
`tests/lib/scenery.test.ts` fails until they match. Keep the words in first
person (see [voice.md](voice.md)), and check a longer line at 320px: the e2e
suite fails if a tag's text overflows its paper.

## Changing colours

Edit the `@theme` block in `src/app/globals.css`, then run `pnpm contrast`. It
regenerates `docs/contrast.md` and **fails if any pairing drops below 4.5:1**.
Quiet sections sit on the sky, so text is checked against the top and bottom
stop of each theme's sky as well as the flat grounds; by day the top stop,
`--color-morning-high`, is the sky's darkest. See
CLAUDE.md's design-system section.

## Before you publish

```
pnpm verify      # typecheck → lint → contrast → test → build
pnpm test:e2e    # both themes, six viewports, keyboard, print, accessibility
```

And if your change could add JavaScript, re-measure and record the row:

```
pnpm build
PORT=3100 pnpm start      # in one terminal
pnpm perf                 # in another
```

Read **JS at load** first. A move of more than a kilobyte or two means
something has leaked into the initial bundle.

`pnpm perf` prints a skipped-response count and a `content-length`
cross-check beside its own totals. A run reporting any skipped responses is
under-reported — re-run it rather than recording the number. The table lives
in [feedback-tracker.md](feedback-tracker.md).
