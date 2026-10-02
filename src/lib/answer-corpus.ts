import { sectionExpansions, subjectExpansions } from "@/content/answer-expansion";
import { origin } from "@/content/portfolio";
import {
  careerIndexable,
  education,
  profile,
  projectsIndexable,
  skillsIndexable,
} from "@/lib/answer-sources";
import { resolveWorlds } from "@/lib/worlds";

/**
 * The retrieval corpus for "Ask this site" — every document `src/lib/answers.ts`
 * ranks, built once from the content layer and nothing else.
 *
 * This used to live inside `answers.ts` itself. It moved out because the two
 * halves of that file had genuinely different jobs and different reasons to
 * change: this module answers "what can be asked about", and `answers.ts`
 * answers "given a question, which of those documents is the best match". A
 * corpus expansion — a new career fact, a new philosophy passage — never has
 * to touch the ranking engine, and a ranking change never has to touch this
 * file. `tests/lib/scoring-excerpt.test.ts` pins the engine half verbatim,
 * which is a second, concrete reason the two should not share a file: it
 * would otherwise be pinning lines that have nothing to do with what it's
 * protecting.
 *
 * ## What counts as a document here
 *
 * Every `text` below is either a verbatim string from `src/content` or a
 * mechanical join of a handful of its fields (`"${a}: ${b} → ${c}."`, the same
 * pattern the original metric and education documents already used). Nothing
 * here is composed prose invented for search — see `tests/lib/answers.test.ts`,
 * which asserts every returned answer is a member of the exact set of strings
 * the content layer can produce.
 */

export interface Document {
  readonly text: string;
  readonly source: string;
  /**
   * Where to send a reader who wants to see this in context — the `id` of one
   * of the page's four sections, which `AskThisSite` turns into `#<sectionId>`.
   * **Both or neither.**
   *
   * ## What this promises, precisely
   *
   * That the named section renders **the subject this text belongs to**: the
   * career entry, the project, the plaque, the About prose. It does *not*
   * promise the sentence itself is printed there, and for a good number of
   * documents it is not — measured at round 18, 38 of the 54 career and
   * education documents quote a field the page does not render. An entry's
   * `learned` line is rendered nowhere on the Journey (exactly one of them,
   * `usc-scraping`'s, is quoted by a globe plaque and so is on the page, in
   * `#worlds`); an entry's `context` is rendered only by `/resume`, and only for
   * the work entries; and the nine demoted entries' `context` and `impact` lines
   * are named by nothing — the credentials strip is their role, organisation and
   * repository link, one line each. A reader who follows "More on this in Journey →" from one of those lands
   * on the entry's branch, its technologies, its impact leaves and its case
   * study — which is where to read about it, and is not nothing, but is not the
   * sentence.
   *
   * That is a known gap rather than a settled design, and the fix the plan
   * prefers is to render the sentence rather than to re-point the link (the
   * precedent is `profile.positioning`, two paragraphs down). Doing it means
   * putting `learned` into the branch panels and the demoted entries' one-liners
   * onto the strip, which is a change to what the Journey *says* and belongs to
   * whoever owns that.
   *
   * ## Omitted entirely for the skills evidence lines
   *
   * Those six sentences are the one case where the weaker promise above also
   * fails: nothing anywhere on the page renders a skill category — `/resume`
   * prints each category's label and skill names but not its evidence line, and
   * the Journey draws the categories as `aria-hidden` decorative root paths with
   * no text — so there is no subject to send a reader to, never mind a sentence.
   * They carry no section rather than a link that lies. See the skills loop at
   * the bottom of this file for why that was chosen over the alternatives.
   *
   * A document with no section is still retrieved and quoted; it just has
   * nowhere to send the reader.
   *
   * ## Never a compatibility anchor
   *
   * `#journey`, `#work`, `#skills` and `#workshop` all resolve — they are the
   * zero-size spans `CareerTree.tsx` renders for inbound links it does not
   * control — and no document may cite one. The career documents cited
   * `journey` until round 18's Task 13; they cite `tree`, the section that
   * actually exists, so that the compatibility anchors can be deleted the day
   * the bookmarks stop arriving without taking the chat's citations with them.
   * `tests/lib/answers.test.ts` holds that line.
   */
  readonly sectionId?: string;
  readonly sectionLabel?: string;
  /** Extra terms — a title, an employer — that should match without being
   *  part of the quoted answer itself. */
  readonly label: string;
}

/**
 * Assembles a document's search surface: the section's aliases, the subject's
 * aliases, and whatever is specific to this one field.
 *
 * The split matters. Section and subject aliases are inherited by every document
 * beneath them, so they have to describe the section or the subject. Words that
 * describe *this field* — "mistake" for a lesson, "metric" for a number — are
 * passed in here, because a subject-level alias would spread them across all of
 * that subject's passages and let the wrong one win. See the scope rule in
 * `src/content/answer-expansion.ts`.
 */
function label(sectionId: string, subjectId: string | undefined, ...local: string[]): string {
  return [
    ...(sectionExpansions[sectionId] ?? []),
    ...(subjectId ? subjectExpansions[subjectId] ?? [] : []),
    ...local,
  ].join(" ");
}

export function buildDocuments(): Document[] {
  const docs: Document[] = [];

  for (const paragraph of profile.about) {
    docs.push({
      text: paragraph,
      source: "About, in his own words",
      sectionId: "about",
      sectionLabel: "About",
      label: label("about", undefined, profile.name, profile.title),
    });
  }

  // The site's one-line positioning, rendered as the lead of #about by
  // HeroAbout. It was the last sentence of `about` before round 18 and so was
  // indexed with it; it is rendered there again, which is what makes the
  // "More on this in About" link on an answer truthful.
  docs.push({
    text: profile.positioning,
    source: "About, in his own words",
    sectionId: "about",
    sectionLabel: "About",
    label: label("about", undefined, profile.name, profile.title),
  });

  docs.push({
    text: profile.focus,
    source: "About, in his own words",
    sectionId: "about",
    sectionLabel: "About",
    label: label("about", undefined, "focus", "areas", "specialism"),
  });

  // The flight itself: the one geographic fact the site makes, and the
  // question a visitor asks about almost anyone's background before they ask
  // anything else. `origin` (src/content/portfolio.ts) is a small typed
  // record, not a sentence — the fields are joined the same mechanical way
  // an education entry or a metric already is, never invented.
  docs.push({
    text: `${origin.from} to ${origin.to}, arrived ${origin.arrived}.`,
    source: "Origin story",
    sectionId: "about",
    sectionLabel: "About",
    label: label(
      "about",
      "origin",
      "origin",
      "originally",
      "from",
      "hometown",
      "immigrant",
      "immigrated",
      "moved",
      "vietnam",
      "vietnamese",
      origin.from,
      origin.to,
    ),
  });

  // Philosophy the section is gone (round 16), but this line is still
  // rendered live in two places — the hero's rail and the business card — so
  // the document stays and is tagged to About, the hero's own section id
  // (Hero.tsx renders `id="about"`), rather than being dropped with the rest of
  // the section's corpus. The third place it used to be rendered was the career
  // tree's plinth, in `KnowledgeTree.tsx`, which round 18 left without an
  // importer; the rail is what keeps the About citation true.
  //
  // The words below used to live on `sectionExpansions.philosophy`, spread
  // across every document the old section contributed. With only this one
  // line left, they belong here instead, field-specific rather than
  // section-wide — the same scope rule this file's own banner states.
  docs.push({
    text: profile.philosophy,
    source: "The idea the whole site hangs from",
    sectionId: "about",
    sectionLabel: "About",
    label: label(
      "about",
      undefined,
      "believe",
      "thinks",
      "philosophy",
      "value",
      "belief",
      "believes",
      "principle",
      "mindset",
      "approach",
      "decide",
      "decision",
      "choose",
      "judgement",
    ),
  });

  // Round 16. Every plaque on the globe is already a verbatim authored field,
  // which makes the whole set exactly the shape this corpus wants: a quoted
  // string with a named source. They are indexed under `worlds` rather than
  // their original section so an answer's "More on this in Worlds →" link lands
  // where the visitor can actually see the plaque.
  for (const world of resolveWorlds()) {
    for (const plaque of world.plaques) {
      docs.push({
        text: plaque.text,
        source: `${world.name} — ${plaque.source}`,
        sectionId: "worlds",
        sectionLabel: "Worlds",
        label: label("worlds", undefined, world.name, plaque.source),
      });
    }
  }

  // Round 18: Selected Work is gone and its case studies render inside the
  // Journey's branches, so these documents link to `#tree`. The `label()`
  // calls below still pass "work" as their first argument on purpose: that
  // argument picks the vocabulary in `sectionExpansions`, which is what a
  // query matches against, and is not the link target. Re-keying it would
  // change retrieval, not just where "More on this in …" lands.
  for (const project of projectsIndexable) {
    const where = project.organization ? `${project.title} — ${project.organization}` : project.title;

    docs.push({
      text: project.problem,
      source: `${where}, the problem`,
      sectionId: "tree",
      sectionLabel: "Journey",
      label: label(
        "work",
        project.id,
        project.title,
        project.organization ?? "",
        project.technologies.join(" "),
        "problem",
        "challenge",
      ),
    });

    docs.push({
      text: project.learned,
      source: `${where}, what it taught him`,
      sectionId: "tree",
      sectionLabel: "Journey",
      // "wrong", "mistake" and "hindsight" belong here rather than on the
      // project: this is the one passage per project that actually answers
      // "did anything go wrong", and at subject level the words would land on
      // the problem statement too and outrank it.
      label: label(
        "work",
        project.id,
        project.title,
        "learn lesson learned learning takeaway wrong mistake failed failure hindsight differently again",
      ),
    });

    for (const claim of project.proof) {
      docs.push({
        text: claim,
        source: `${where}, evidence`,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label("work", project.id, project.title, "result impact outcome proof evidence"),
      });
    }

    // Two of the five deep-dive fields `CaseStudy.tsx` renders and nothing
    // indexed. Their only path into the corpus was the agent-station documents
    // round 18 deleted with the Workshop, which left a visitor able to read
    // them on the page and unable to find them by asking. Each carries
    // field-specific vocabulary rather than subject-level aliases, for the
    // reason the banner above gives: at subject level "assumed" would land on
    // the problem statement too.
    //
    // **Two, not five, and the other three were measured rather than argued
    // about.** Against `tests/lib/answers-retrieval.test.ts` at 30 cases
    // (baseline recall@1 73.3% / recall@3 93.3% / recall@5 96.7% / MRR 0.823):
    //
    //   assumption          73.3 / 93.3 / 96.7 / 0.823   byte-identical
    //   pathsExplored       73.3 / 93.3 / 96.7 / 0.822   one case 6 -> 8
    //   nextQuestion        63.3 / 93.3 / 93.3 / 0.772   three cases 1 -> 2
    //   constraints         66.7 / 93.3 / 93.3 / 0.782   three cases 1 -> 2
    //   decisions           66.7 / 93.3 / 96.7 / 0.784   two cases 1 -> 2
    //   all five together   56.7 / 93.3 / 93.3 / 0.713
    //
    // Each rejected set pushes documents that were already rank 1 down by
    // exactly one place, and the scores say why — two different mechanisms, one
    // benign and one not. Measured on `constraints`:
    //
    //   "mendix"  the Schaeffler constraint line ties the gold skills-evidence
    //             line to four decimals (4.0604 both) and wins the tie on
    //             corpus insertion order, because these blocks are pushed
    //             before the metrics. Same shape for "azure" (3.5610 three
    //             ways). Nothing was out-reasoned; the order changed.
    //   "did anything go wrong on the projects"  the DoorDash constraint line
    //             *outscores* the three lesson lines that answer the question,
    //             3.5304 against 2.3720. That one is a wrong answer winning.
    //
    // The second mechanism is the `watchFor` finding again in a milder form:
    // text whose vocabulary the corpus already has costs ranking where it is
    // not the answer and earns recall nowhere the eval can see. The floors are
    // not the thing to move — see the note at the top of the retrieval test —
    // so these three stay rendered-but-unindexed, which is the honest state and
    // is recorded here rather than left to be rediscovered.
    if (project.assumption) {
      docs.push({
        text: project.assumption,
        source: `${where}, the assumption it rested on`,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label(
          "work",
          project.id,
          project.title,
          "assumption assumed assume believed guess bet premise riskiest",
        ),
      });
    }

    // No rejection vocabulary here, deliberately. The label used to carry
    // "rejected ruled out", and the **last element of every `pathsExplored`
    // array is the path that worked** — "this is what worked", "this is what
    // held up over months". So "what alternatives did he rule out" was
    // retrieving the accepted approach under a rejection label; the `source`
    // stayed honest, so no answer was false, but the match was.
    //
    // The alternative was to label by index — rejection terms on all but the
    // last element — and it is not taken, because "the last one is the one that
    // worked" is an authoring convention these four arrays happen to follow, not
    // something the type enforces. A fifth project that ordered its paths
    // differently would get the wrong label with nothing to notice. Words that
    // are true of every element of the array are the version that cannot drift.
    for (const path of project.pathsExplored) {
      docs.push({
        text: path,
        source: `${where}, the paths explored`,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label(
          "work",
          project.id,
          project.title,
          "alternative option considered weighed explored tried approach other way",
        ),
      });
    }

    for (const metric of project.metrics) {
      docs.push({
        text: `${metric.label}: ${metric.before} → ${metric.after}.`,
        source: metric.source,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label(
          "work",
          project.id,
          project.title,
          metric.label,
          "metric number measured before after improvement",
          // Every metric cites "Résumé — …" as its provenance, and "resume" is
          // about as likely a query as exists on a portfolio. Spelled without
          // accents on purpose: the tokenizer folds the content's "Résumé" onto
          // this, so both spellings land on the same term.
          "resume cv curriculum vitae",
        ),
      });
    }
  }

  for (const entry of careerIndexable) {
    const where = `${entry.role}, ${entry.organization} · ${entry.dateRange}`;
    const shared = [entry.role, entry.organization, entry.type];

    if (entry.summary) {
      docs.push({
        text: entry.summary,
        source: where,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label("journey", entry.id, ...shared, "did does responsibility"),
      });
    }

    // The impact lines were reachable from `answer-sources` but never indexed,
    // which meant "what has he actually delivered at DoorDash" could only be
    // answered by the one-line context blurb. They are the most concrete
    // statements on the timeline, so they are also the most answerable.
    for (const claim of entry.impact) {
      docs.push({
        text: claim,
        source: `${where} — impact`,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label(
          "journey",
          entry.id,
          ...shared,
          "impact result achievement delivered accomplished",
        ),
      });
    }

    if (entry.learned) {
      docs.push({
        text: entry.learned,
        source: `${where} — what it taught him`,
        sectionId: "tree",
        sectionLabel: "Journey",
        label: label("journey", entry.id, ...shared, "learn lesson learned learning takeaway realised"),
      });
    }
  }

  for (const school of education) {
    docs.push({
      text: `${school.credential}, ${school.institution} (${school.dateRange}).`,
      // Education is a timeline entry, and #resume is no longer a section on
      // the page — linking there would be a dead anchor.
      source: "Education",
      sectionId: "tree",
      sectionLabel: "Journey",
      label: label(
        "journey",
        "usc-degree",
        school.institution,
        school.credential,
        "education degree study university school studied graduated",
      ),
    });
  }

  // Skills were not indexed at all, so "what languages does he know" — about as
  // ordinary as a portfolio question gets — returned nothing. The evidence line
  // is the document rather than the skill list, because a bare list of names is
  // a fact about the page and the evidence is an actual answer; the names still
  // reach the index through the label.
  //
  // Round 18: the Skills section is gone, and `category.evidence` is rendered
  // nowhere on the site: `/resume` shows each category's label and skill names
  // but not the evidence line, and the Journey draws the categories only as
  // decorative `aria-hidden` root paths with no text. So these documents carry
  // NO section: a "More on this in Journey" link would send the reader to a section
  // that contains neither the sentence nor the category, which is the same
  // defect `profile.positioning` had (indexed, rendered nowhere, citation lying
  // about where to find it). They stay indexed — retrieval is unchanged, and
  // `label("skills", …)` keeps selecting the skills vocabulary.
  //
  // **Settled in round 18's Task 13: section-less is the answer, not a
  // placeholder.** Three options were on the table and the retrieval eval
  // cannot choose between them — `sectionId` is not part of a document's search
  // surface, so recall@1/3/5 and MRR are byte-identical whichever is picked
  // (73.3% / 93.3% / 96.7% / 0.823 over 30 cases, before and after). So it was
  // decided on cost and on honesty instead:
  //
  //  - *Render the evidence on `/resume` and cite the route.* The precedent fix,
  //    and rejected here on blast radius: `sectionId` means "a section of the
  //    single page" to five more places than this file — `answers.ts`'s
  //    `Answer`, `AskThisSite.tsx` twice, `answer-code.ts` twice, the
  //    `/api/ask` route, plus `scoring-excerpt.ts`, whose text a test pins —
  //    and a route destination is a second *kind* of citation that every one of
  //    them would have to learn, for six documents out of 132. It also sends a
  //    reader mid-conversation off the page they are reading, which no other
  //    citation does.
  //  - *Re-home the evidence into the Journey.* The better answer, and not a
  //    refactor's to make: it changes what the section says. Left to the owner,
  //    along with the wider gap described on `Document.sectionId` above.
  //  - *Leave them section-less.* What is shipped. A document that is retrieved,
  //    quoted and attributed with no "More on this in …" link is the one option that
  //    states exactly what is true.
  for (const category of skillsIndexable) {
    docs.push({
      text: category.evidence,
      source: `Skill category — ${category.label}`,
      label: label(
        "skills",
        category.id,
        category.label,
        category.skills.join(" "),
        "know knows used uses familiar",
      ),
    });
  }

  return docs;
}
