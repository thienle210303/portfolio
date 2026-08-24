import { sectionExpansions, subjectExpansions } from "@/content/answer-expansion";
import { origin, philosophyIntro, principles, problemSolvingLoop } from "@/content/portfolio";
import {
  careerIndexable,
  education,
  experimentsIndexable,
  profile,
  projectsIndexable,
  skillsIndexable,
} from "@/lib/answer-sources";

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
  readonly sectionId: string;
  readonly sectionLabel: string;
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

  docs.push({
    text: profile.philosophy,
    source: "The idea the whole site hangs from",
    sectionId: "philosophy",
    sectionLabel: "Philosophy",
    label: label("philosophy", undefined, "believe", "thinks"),
  });

  // The two paragraphs that actually open the Philosophy section — present on
  // the page since it was built, but never reachable through this box until
  // now. "Impossible" is exactly the kind of word a visitor types that these
  // two paragraphs, and nothing else on the page, answer.
  for (const paragraph of philosophyIntro) {
    docs.push({
      text: paragraph,
      source: "Philosophy, in his own words",
      sectionId: "philosophy",
      sectionLabel: "Philosophy",
      label: label("philosophy", undefined, "impossible", "possible", "unsolved", "unsolvable"),
    });
  }

  for (const principle of principles) {
    const shared = [principle.title, "principle"];

    docs.push({
      text: principle.summary,
      source: `Philosophy — ${principle.title}`,
      sectionId: "philosophy",
      sectionLabel: "Philosophy",
      label: label("philosophy", principle.id, ...shared, "summary"),
    });

    docs.push({
      text: principle.detail,
      source: `Philosophy — ${principle.title}`,
      sectionId: "philosophy",
      sectionLabel: "Philosophy",
      label: label("philosophy", principle.id, ...shared, "explain reasoning why how"),
    });

    if (principle.evidence) {
      docs.push({
        text: principle.evidence.body,
        source: `Philosophy — ${principle.title}, in practice (${principle.evidence.context})`,
        sectionId: "philosophy",
        sectionLabel: "Philosophy",
        label: label(
          "philosophy",
          principle.id,
          ...shared,
          "example evidence practice applied",
          principle.evidence.context,
        ),
      });
    }
  }

  // The nine-step loop is the philosophy's own working process, stated as
  // steps rather than as belief -- "what do you actually do" is a different
  // question from "what do you believe", and until now only the second had
  // an answer in this index.
  for (const step of problemSolvingLoop) {
    docs.push({
      text: step.detail,
      source: `Philosophy — problem-solving loop, ${step.label}`,
      sectionId: "philosophy",
      sectionLabel: "Philosophy",
      label: label("philosophy", `loop-${step.id}`, step.label, "step", "process", "approach"),
    });
  }

  for (const project of projectsIndexable) {
    const where = project.organization ? `${project.title} — ${project.organization}` : project.title;

    docs.push({
      text: project.problem,
      source: `${where}, the problem`,
      sectionId: "work",
      sectionLabel: "Selected work",
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
      sectionId: "work",
      sectionLabel: "Selected work",
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
        sectionId: "work",
        sectionLabel: "Selected work",
        label: label("work", project.id, project.title, "result impact outcome proof evidence"),
      });
    }

    for (const metric of project.metrics) {
      docs.push({
        text: `${metric.label}: ${metric.before} → ${metric.after}.`,
        source: metric.source,
        sectionId: "work",
        sectionLabel: "Selected work",
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

  for (const experiment of experimentsIndexable) {
    docs.push({
      text: experiment.question,
      source: `AI Workflow Lab — ${experiment.title} (${experiment.status})`,
      sectionId: "lab",
      sectionLabel: "AI Workflow Lab",
      label: label(
        "lab",
        experiment.id,
        experiment.title,
        experiment.status,
        "agent workflow question exploring trying",
      ),
    });

    for (const finding of experiment.verification) {
      docs.push({
        text: finding,
        source: `AI Workflow Lab — ${experiment.title}, verified`,
        sectionId: "lab",
        sectionLabel: "AI Workflow Lab",
        label: label("lab", experiment.id, experiment.title, "result verified finding measured"),
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
  for (const category of skillsIndexable) {
    docs.push({
      text: category.evidence,
      source: `Skills — ${category.label}`,
      sectionId: "skills",
      sectionLabel: "Skills",
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
