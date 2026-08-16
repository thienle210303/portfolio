# Updating the site

Everything factual lives in two files. You should almost never need to open a
component to change what the site says.

| What you want to change | File |
|---|---|
| Roles, projects, metrics, skills, education, contact details | `src/content/portfolio.ts` |
| AI experiments, workflow stages, the learning log | `src/content/ai-experiments.ts` |

After any edit, run `pnpm verify`. It typechecks, lints, re-measures colour
contrast, runs the unit tests and builds. If a number you removed was being
counted somewhere, or a required field went missing, that is where you find
out — not in production.

---

## Change a metric

Metrics are the numbers shown large and blue at the top of each case study.
Find the project in `projects` and edit its `metrics` array:

```ts
metrics: [
  {
    label: "Legacy scraper runtime",   // what was measured
    before: "Baseline",                // the state it started from
    after: "99% reduction",            // the headline figure
    source: "Résumé — DoorDash, Software Engineer",  // required
  },
],
```

That one object drives **four** places at once, which is why there is nowhere
else to update:

- the big figure in the case-study summary (`MetricHighlights`)
- the full before/after table inside the case study (`MetricTable`)
- the "Sourced figures" count in the Selected Work margin rail
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

- the **Journey** timeline
- the **Résumé** explorer
- the **knowledge tree** ("How it maps together")
- "Ask this site"
- the hero's "Now" line, which reads the most recent `type: "work"` entry — so
  changing jobs is one edit, not a hunt

The two fields that decide where it shows up:

```ts
lenses: ["engineering", "automation"],   // which branches of the tree it hangs under
technologies: ["Python", "Playwright"],  // the leaves under it
```

`lenses` come from `resumeLenses` in the same file. An entry with no lenses is
still on the timeline; it just does not appear in the tree.

To attach a case study to a role, set the project's `careerEntryId` to that
entry's `id`. That is also what supplies the employer and dates shown under the
case-study title, so those can never drift apart from the timeline.

## A note on the knowledge tree

The tree draws **only relationships you have written down**. It hangs roles
under a lens because you tagged that lens, and technologies under a role
because you listed them there.

It deliberately does *not* try to match `skillCategories.skills` against
`technologies`. Those are two different vocabularies — of 38 skills, 17 match a
technology string exactly, and the rest are near-misses like "React" against
"JavaScript/React". Matching them loosely would draw lines you never drew;
matching them strictly would claim "React — used nowhere", which is false. So
if you want a skill to appear in the tree, list it in a role's `technologies`
using the same spelling you use elsewhere.

`tests/lib/knowledge-tree.test.ts` fails if anyone reintroduces guessing.

## Contact delivery

The contact form and the one-field "ask me to reach out" both post to
`/api/contact`, which needs three environment variables:

```
RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL
```

With any of them missing, both fall back to opening the visitor's own mail app
with the message prefilled. That fallback is deliberate — it means the site
never claims to have sent something it did not. See `.env.example`.

## Changing colours

Edit the `@theme` block in `src/app/globals.css`, then run `pnpm contrast`. It
regenerates `docs/contrast.md` and **fails if any pairing drops below 4.5:1**.
Check tertiary tones against `--color-paper-deep`, not `--color-paper` — the
half-step-darker ground is where they fail first.

## Before you publish

```
pnpm verify      # typecheck → lint → contrast → test → build
pnpm test:e2e    # both themes, six viewports, keyboard, print, accessibility
```
