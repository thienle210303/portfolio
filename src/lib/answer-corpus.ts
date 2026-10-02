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
   * Where on the page this text is rendered, so an answer's "Read it in …"
   * link is truthful. **Both or neither**, and omitted for a document whose
   * text is rendered nowhere on the page (today, only the skills evidence
   * lines — see the skills loop below). A document with no section is still
   * retrieved and quoted; it just has nowhere to send the reader.
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
  // "Read it in About" link on an answer truthful.
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
  // rendered live in three places — the hero's rail, the business card, the
  // career tree's plinth — so the document stays and is re-tagged to About,
  // the hero's own section id (Hero.tsx renders `id="about"`), rather than
  // being dropped with the rest of the section's corpus.
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
  // their original section so an answer's "Read it in Worlds →" link lands
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
  // change retrieval, not just where "Read it in …" lands.
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
        sectionId: "journey",
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
        sectionId: "journey",
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
        sectionId: "journey",
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
      sectionId: "journey",
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
  // nowhere on the page: `/resume` shows each category's label and skill names
  // but not the evidence line, and the Journey draws the categories only as
  // decorative `aria-hidden` root paths with no text. So these documents carry
  // NO section: a "Read it in Journey" link would send the reader to a section
  // that contains neither the sentence nor the category, which is the same
  // defect `profile.positioning` had (indexed, rendered nowhere, citation lying
  // about where to find it). They stay indexed — retrieval is unchanged, and
  // `label("skills", …)` keeps selecting the skills vocabulary.
  //
  // TODO(round 18, Task 13): choose the permanent home for these evidence
  // lines (render them somewhere, then cite it) against the retrieval eval.
  // Until then they are honest rather than linked.
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
