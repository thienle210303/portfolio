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

Metrics are the before/after figures of a project (a case study the page no
longer draws: round 23's Diary has none). Find the project in `projects` and
edit its `metrics` array:

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

That one object drives **two** places, which is why there is nowhere else to
update:

- the project's line on `/resume`
- the answers behind "Ask this site"

A figure that should be on the Diary is an entry's own `diary` notes (below),
drawn from the entry's `impact`, not from a project's metrics.

Two things worth knowing:

- **`source` is not optional, by design.** The site's whole claim is that every
  figure names where it came from. TypeScript will refuse a metric without one.
- **`after` does not have to be a number.** "Under 1 hour, end to end" works.

To remove metrics entirely from a project, delete the `metrics` key.

## Add a role, a project or a milestone

Add an entry to `careerEntries`. One entry feeds all of:

- the **Journey** (`#tree`, `src/sections/CareerTree/`) — a tag on the oak
  only if one of its `highlights` is picked (see "The Journey's tags" below); its
  start year is a beat of "Watch it grow" either way
- the **Diary** (`#record`, `src/sections/Record/`) — a dot and a wider ring on
  the tree slice, a line in the contents, and a page (or a block on a shared
  page) in the book (every entry, demoted or not)
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
  these months inclusively, so a guessed month can invent an overlap — say so
  in a comment beside it.

The fields the rest of the site reads (`sortKey` decides its Diary chapter):

```ts
technologies: ["Python", "Playwright"],  // counted by the cats, listed on /resume
impact: ["One sentence of what changed."],  // the chat answers from it; diary figures draw on it
headline: "Result in 12 words or fewer.",  // the hero's tags, the oak's tickets
```

### Write a headline

Every entry outside `DEMOTED_ENTRY_IDS` needs a `headline`: the Journey's
one-line result, also used on the hero's tags. Keep it to 12 words or fewer,
phrased as a result, with every figure taken from the same entry's own
`impact`, `context` or `built`. It is never indexed for the chat.
`tests/lib/voice.test.ts` fails on a missing or over-long headline, a figure
the entry doesn't contain, or an indexed headline. Rules and examples:
[docs/voice.md](voice.md).

### Give an entry a Diary page

An entry with nothing under `diary` shares a page with the others in its
chapter that have little to say (three at most). Give it `diary.bullets` (two
to four short lines) and it has a page of its own:

```ts
diary: {
  bullets: ["Short line.", "Another short line."],
  highlight: { value: "3.8", label: "GPA" },  // only when the oak hangs no tag for it
  figure: { kind: "before-after", caption: "…", before: { label: "17 hours", value: 1020 }, after: { label: "3 minutes", value: 3 } },
  // DRAFT 2026-11-01 — awaiting Thien's approval
  funFact: "One sentence, from facts this entry already holds.",
},
```

- Every figure in a bullet, the highlight, or a chart's labels and caption must
  also be in the entry's own `impact`, `context` or `headline`
  (`tests/lib/record.test.ts`). A fun fact may use anything the entry says
  about itself; draft it, mark it, and list it for the owner to approve.
- `figure` is one of three: `before-after` (two bars; `value` is only the
  bar's length, the label carries the figure), `count` (dots when `per` is set
  or there are twelve or fewer, otherwise tally gates of five), or `drawing`
  (a committed ink drawing from `public/scenery/`, `diary-*`).
- The highlight is the oak's own (`highlights`) when it hangs a tag for the
  entry, else `diary.highlight`.
- `diary.blurb` replaces the entry's `context` as the page's one or two
  sentences. None of `diary` is indexed by the chat.
- 2018, 2019 and 2020 are one chapter (`2018 – 2020`), told in order; every
  other year is a chapter of its own, newest first. Each year is still a ring
  on the slice and a fragment (`#record-2019`).

Case studies are not on the page. A project's `careerEntryId` still names the
entry it was built in: the chat answers from it, `/resume` lists it, and its
`work-<projectId>` id is a zero-height anchor on that entry's page, so an old
link still lands.

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

The Journey draws one tree, the oak, and only the tags you pick hang on it
(below). Round 22 retired the drawn career tree that used to grow in a box
under it: every entry's page in the Diary already said what it did.

Its rules still live in `src/lib/knowledge-tree.ts`, tested by
`tests/lib/knowledge-tree.test.ts`, for the day a drawing of entries comes
back: a branch is one career entry, its leaves that entry's own
`technologies`, never inferred by matching `skillCategories.skills` against
them (of 38 skills, 17 match a technology string exactly; loose matching would
draw lines you never drew, strict matching would claim real skills were never
used).

## Contact delivery

The postcard's lead form (a name, plus an email or phone) posts to
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
| "Read this part" | the tag's career entry page in the Diary (Kiên Giang: the Journey itself) |
| The hint under the line | `hero.hint` |
| The hint's first sentence (from 1024 only, where the line runs from bamboo to pine) | `hero.hintLine` |
| Field tag rows | Name `profile.name`; Native to `origin.from`; Transplanted `origin.to`; Companions `hero.fieldTag.companionsLead` plus every `companions` name; the rest `hero.fieldTag` |
| The stamp | `profile.motto` |
| The QR's link | the `linkedin` entry in `socialLinks`. The QR drawing is `QR_PATH` in `src/sections/Hero/LinkedInQr.tsx`, generated by hand offline: regenerate it if the URL changes |
| The vignette captions | `hero.vignette.morning` / `.evening` |

A tag's drawing (and every other piece of scenery) is drawn by
`scripts/draw-scenery.mjs`. After changing a drawing, run `pnpm draw:scenery`
and commit the regenerated files in `public/scenery/`;
`tests/lib/scenery.test.ts` fails until they match. Keep the words in first
person (see [voice.md](voice.md)), and check a longer line at 320px: the e2e
suite fails if a tag's text overflows its paper.

## The Journey's tags

The tags on the oak are `highlights` in `src/content/portfolio.ts`, in board
order; `buildTickets()` in `src/lib/highlights.ts` assembles them and
`HangingTags.tsx` only renders.

- A highlight's `name` is the tag's short name (the first word must be a word
  of the entry's `organization`, or its initials); `value` the big figure;
  `measure` an optional mono line under it; `label` one short line; `year`
  only when the figure belongs to a later year than the entry's start (it must
  fall inside the entry's dates).
- Consecutive highlights of one entry hang as one ticket, joined at a
  perforation (DoorDash's 2026 stub). `projectId` sends that half to the case
  study instead of the row.
- Every figure in `value`, `measure` or `label` must also be in the entry's
  `headline` or `impact`; `tests/lib/highlights.test.ts` fails otherwise.
- Where each tag hangs from 1280 is `TAG_SPOTS` in `HangingTags.tsx`, held to
  the board's limb by `journeySpots()` in `scripts/draw-scenery.mjs`. A sixth
  tag needs a spot on the limb, not just a row here.
- The heading, my line, "Watch it grow" (and its "Skip") and the vignette
  captions are `journey`. A tag drops in on its first half's year when the
  oak grows. They are not indexed by the chat.
- Bé Nhi's name and her five moods (`says`, her line over her head; `is`, the
  caption under the swing) are `journey.swing`. A new mood needs a face in
  `MiniNhi.tsx` and a name in `NhiMood` (`src/types/portfolio.ts`); the type
  makes the content name it too.
- After changing a drawing, run `pnpm draw:scenery` and commit
  `public/scenery/`.

## The Diary

The book is `src/sections/Record/`; its numbers, pages and the tree slice are
computed in `src/lib/record.ts`, so a new entry re-cuts the slice, the contents
and the page numbers by itself.

| On the page | Where it comes from |
|---|---|
| A ring per year, its width | every start year from the first to the last; `4.5 + 3.6 ×` the entries that started that year (`sortKey`) |
| A dot per entry, its colour and shape | the entry's `type` (`--kind-*`: work a circle, study a square, milestone a diamond) |
| The five taped cards | `featured: true` on the entry, an editorial call (`tests/lib/record.test.ts` holds the five). Newest year first; a sixth needs a slot in `CARD_SLOTS` |
| The chapters | the start years: one per year from 2021 (`CHAPTER_FROM_YEAR`), 2018 – 2020 as one |
| A page of its own, or a shared page | `diary.bullets` on the entry; the rest share, three to a page (`SHARED_PAGE_MAX`), after the chapter's own pages (the early chapter keeps its order) |
| A page's title | the entry's `role`, with " — " read as ", " |
| A page's sentences, figure, bullets, chart, sticky note | `diary.blurb` or `context`; `highlights` or `diary.highlight`; `diary.bullets`, `diary.figure`, `diary.funFact` |
| The tabs' counts | the entries' `type`s |
| The contents | every entry, with the page it is on (the tab recounts them) |
| A stamp | a `certifications` entry with a `stamp` (`short`, `drawing`, `image`). `drawing` is `bank`, `card`, `code` or `cart`; one without a stamp (AT&T) gets none, and stays on `/resume` |
| An award button on a page | the entry's `award` image |
| A recording | the entry's `recording` (loaded only when pressed) |
| The page's words | `record` (not indexed by the chat) |

Certificate and award images live in `public/media/certificates/`, at most
~200 KB each (`tests/lib/record.test.ts`); set `width`/`height` to the file's
own. Write `alt` from what the image says. Nothing is fetched until its dialog
opens: `next/image` is loaded on the first open.

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
