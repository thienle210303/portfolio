import { buildDocuments, type Document } from "@/lib/answer-corpus";

/**
 * A grounded question-answering index over the site's own content.
 *
 * The defining property, and the reason it works this way rather than as a
 * language model: **it cannot fabricate.** Every answer it returns is a
 * verbatim string from `src/content`, carried with the source that string
 * already had and a link to the section it lives in. There is no generation
 * step, so there is nothing to hallucinate with. When nothing matches well
 * enough, it says so rather than reaching.
 *
 * That is not a consolation prize for a model. On a site whose whole claim is
 * that every figure names its origin, an extractive answer with a citation is
 * strictly more useful than a fluent paraphrase that might be wrong — and it
 * is instant, works offline, costs no download, and runs on any device.
 *
 * Ranking is deliberately simple: IDF-weighted term overlap with a small bonus
 * for matches in an entry's own label. It is a few hundred short documents, so
 * anything cleverer would be unmeasurable and harder to reason about.
 *
 * ## Why there is no embedding model here
 *
 * There was going to be one. The plan was to add a MiniLM sentence encoder as an
 * opt-in second tier, on the assumption that lexical matching had hit its
 * ceiling. Building the eval set that was meant to justify the model
 * (`tests/fixtures/answers-eval.ts`) is what showed the ceiling was not the
 * matcher's design but three specific defects in it, all cheap to fix:
 *
 *  - **No diacritic folding.** The site writes "Résumé" and a visitor types
 *    "resume", so the likeliest query on a portfolio matched nothing.
 *  - **No stemming.** "projects" never matched "project", "languages" never
 *    matched "language".
 *  - **"who" was a stop word.** "Who is he" tokenised to nothing at all, and
 *    the panel answered the most basic question about a person with silence.
 *
 * Once those were fixed and the index was expanded with the checked-in aliases
 * in `src/content/answer-expansion.ts`, retrieval scored well enough on the eval
 * that a ~25 MB download had nothing measurable left to add. The numbers, and
 * what they do and do not prove, are recorded in
 * `tests/lib/answers-retrieval.test.ts`.
 */

export interface Answer {
  /** Verbatim from the content layer. Never rewritten, never summarised. */
  readonly text: string;
  /** Where the claim came from — an employer, a résumé line, a benchmark. */
  readonly source: string;
  /**
   * Section anchor, so the reader can go to where this passage's **subject** is
   * rendered — the role, the project, the plaque, the About prose. Not a promise
   * that the quoted sentence is printed in that section: for 38 of the 54 career
   * and education documents it is not, which is why `AskThisSite` labels the link
   * "More on this in …" rather than "Read it in …". The full contract, with the
   * measurement, is on `Document.sectionId` in `answer-corpus.ts`.
   *
   * Absent, along with `sectionLabel`, when **no subject** of this passage is
   * rendered anywhere — today the six skills evidence lines, because nothing on
   * the site renders a skill category. Callers must not build a link then.
   * **Both or neither.**
   */
  readonly sectionId?: string;
  /** Human label for the section, for the "More on this in …" link. */
  readonly sectionLabel?: string;
  readonly score: number;
}

/**
 * An `Answer` without its ranking score — what a retrieved passage still is
 * once it has left the ranking step and become a citation instead: a live
 * chat completion's grounding (`src/app/api/ask/route.ts`), and the
 * corresponding shape in the chat UI (`AskThisSite.tsx`,
 * `answer-code.ts`'s live literal). `score` only ever meant something as an
 * ordering signal inside `answer()` itself; nothing downstream of it reads
 * the number.
 */
export type Citation = Omit<Answer, "score">;

/**
 * Function words, dropped from both the index and the query.
 *
 * Note what is *not* here: "who". It was, and the cost was absurd — "who is he"
 * reduced to zero terms, so the most basic question anyone asks about a person
 * returned "nothing on this page answers that". It earns its keep as a real term
 * because `sectionExpansions.about` lists it as an alias, which is exactly what
 * the alias table is for: "who" is not a fact about the About section, but it is
 * a reliable signal that the visitor wants it.
 *
 * The second group is filler, and it is here for a reason specific to how this
 * index is scored.
 *
 * IDF assumes a term's rarity tracks how informative it is. In a corpus this
 * small and this narrow that assumption inverts for filler words: "anyone",
 * "actually" and "good" appear in almost no document, so IDF hands them the
 * *highest* weights in the vocabulary. The measured effect was that the one
 * About paragraph containing "anyone has actually looked at it recently" was the
 * top answer for both "has he taught anyone" and "what has he actually
 * measured", purely on the filler. Rarity was doing the opposite of its job, and
 * a stop list is the only place to fix that.
 */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "do", "does", "for", "from",
  "has", "have", "he", "how", "i", "in", "is", "it", "its", "of", "on", "or", "that", "the",
  "their", "there", "they", "this", "to", "was", "were", "what", "when", "where", "which",
  "why", "will", "with", "you", "your", "me", "my", "his",

  "about", "actually", "again", "all", "also", "am", "any", "anyone", "anything", "been",
  "big",
  "before", "being", "both", "can", "could", "did", "even", "ever", "every", "get", "give",
  "good", "got", "had", "here", "him", "himself", "if", "into", "just", "kind", "like",
  "lot", "made", "make", "makes", "making", "many", "may", "might", "more", "most", "much",
  "must", "no", "not", "now", "one", "only", "other", "out", "over", "own", "really",
  "same", "see", "should", "so", "some", "something", "still", "such", "take", "tell",
  "than", "then", "thing", "those", "through", "too", "very", "want", "way", "we", "well",
  "while", "worth", "would",
]);

/**
 * Collapses plurals onto their singular so the query and the index agree.
 *
 * Deliberately *not* an "-es" rule. English cannot tell "buses" → "bus" from
 * "languages" → "language" by suffix alone, and adding one broke the second:
 * "languages" folded to "languag" while the index held "language", silently
 * killing "what languages does he know". A trailing "s" is the only safe cut.
 *
 * It does not matter that some outputs are not words — "process" folds to
 * something unpronounceable. Nothing ever reads these tokens; they are only
 * compared with each other, and both sides fold through this one function.
 */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(input: string): string[] {
  return (
    input
      .toLowerCase()
      // NFD splits an accented character into its base letter plus a combining
      // mark, and `\p{Mn}` then removes the mark — so "résumé" becomes "resume".
      // This is the single most consequential line in the file: without it the
      // likeliest query on a portfolio site matches nothing, because the content
      // writes "Résumé" everywhere and nobody types the accents.
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .replace(/[^\p{L}\p{N}\s%+.-]/gu, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
      .map(stem)
  );
}

/* -------------------------------------------------------------------------- */
/* The index                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The corpus itself — what can be asked about — lives in
 * `src/lib/answer-corpus.ts`. This file is the engine: tokenising, weighting
 * and ranking, over whatever documents that module builds. See that file's
 * header for why the two are split.
 */
const DOCUMENTS = buildDocuments();

interface IndexedDocument {
  readonly doc: Document;
  readonly text: ReadonlySet<string>;
  readonly label: ReadonlySet<string>;
}

/**
 * Every document, tokenised once.
 *
 * This used to happen inside `answer()`, which re-tokenised all ~180 documents
 * on every question asked. Hoisting it costs one pass at module load and makes
 * each query a set lookup.
 *
 * `source` is deliberately *not* part of the surface, though it was for a while.
 * Folding it in looked free — it is already rendered under every answer, so it
 * adds no claim — but half of each source string is connective text this file
 * writes itself: ", what it taught him", " — impact", ", evidence". Indexing that
 * put the word "taught" on every project's lesson, so "has he taught anyone"
 * returned a five-way tie between passages about scrapers and none of the
 * teaching-assistant ones. Generated boilerplate is not evidence about content.
 *
 * The one genuinely useful thing source carried — that every metric is cited
 * from the résumé — is now an explicit alias on the metric documents instead,
 * where it can be seen and reviewed.
 */
const INDEX: readonly IndexedDocument[] = DOCUMENTS.map((doc) => ({
  doc,
  text: new Set(tokenize(doc.text)),
  label: new Set(tokenize(doc.label)),
}));

/** Inverse document frequency, so a term like "scraper" outweighs "system". */
const IDF = (() => {
  const counts = new Map<string, number>();
  for (const entry of INDEX) {
    for (const term of new Set([...entry.text, ...entry.label])) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of counts) {
    idf.set(term, Math.log(1 + DOCUMENTS.length / count));
  }
  return idf;
})();

/**
 * Below this, a "match" is one incidental word in common and the honest
 * response is that the site does not answer the question. Tuned against the
 * cases in tests/lib/answers.test.ts — raise it and real questions start
 * returning nothing; lower it and unrelated questions start returning prose.
 */
const MIN_SCORE = 0.8;

/**
 * How many distinct query terms a document must match to be admissible at all.
 *
 * This is the gate that `MIN_SCORE` alone could not be, and separating the two
 * is what fixed the last of the ranking bugs: **coverage decides admission,
 * score decides order.**
 *
 * A single absolute score threshold has to answer two incompatible questions at
 * once. Set it high enough to reject "kubernetes helm operator" — which matched
 * "Deployed to shop-floor operators" on the word "operator" alone and scored
 * 2.68 — and it also rejects "what has he actually measured", where the only
 * signal is one low-IDF label term worth 0.9. That question is one of the
 * site's own one-tap suggestions, so it cannot be allowed to return nothing.
 *
 * Counting matched terms separates them cleanly. One incidental word out of
 * three is a coincidence no matter how rare the word is; one word out of one is
 * all the visitor gave you. So `MIN_SCORE` drops to a floor that only excludes
 * noise, and this carries the precision.
 */
function requiredMatches(termCount: number): number {
  return termCount <= 2 ? 1 : 2;
}

/**
 * Terms that are evidence of *what is being asked* and never of what a passage
 * says, so they are matched against a document's label (its aliases) and not
 * against its text.
 *
 * "who" is the one member. As a query word it is the visitor asking about a
 * person, which is what `sectionExpansions.about` aliases it for. Inside a
 * passage it is a relative pronoun ("someone who isn't a CS major", "people who
 * did not choose this subject") and says nothing about the passage's subject.
 * Letting that match count meant an unrelated teaching-assistant line, with the
 * word in its prose, outranked every About document, which carry it only as an
 * alias, for the question "who is he". This holds whatever the scores are: a
 * relative pronoun is not an answer to an identity question.
 */
const ALIAS_ONLY_TERMS: ReadonlySet<string> = new Set(["who"]);

export function answer(question: string, limit = 3): readonly Answer[] {
  const terms = tokenize(question);
  if (terms.length === 0) return [];

  const scored: Answer[] = [];

  const unique = new Set(terms);
  const needed = requiredMatches(unique.size);

  for (const { doc, text, label } of INDEX) {
    let score = 0;
    let matched = 0;
    for (const term of unique) {
      const weight = IDF.get(term) ?? 0;
      if (!ALIAS_ONLY_TERMS.has(term) && text.has(term)) {
        score += weight;
        matched += 1;
      } else if (label.has(term)) {
        // A title match is evidence about *which* thing is being asked about,
        // so it counts — but less than the answer text actually containing it.
        score += weight * 0.6;
        matched += 1;
      }
    }

    if (matched >= needed && score >= MIN_SCORE) {
      scored.push({
        text: doc.text,
        source: doc.source,
        sectionId: doc.sectionId,
        sectionLabel: doc.sectionLabel,
        score,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((entry, index, all) => all.findIndex((other) => other.text === entry.text) === index)
    .slice(0, limit);
}

/** Questions worth offering as one-tap buttons, so the common case needs no
 *  typing at all. Each is checked by a test to actually return something. */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "What does he do at DoorDash?",
  "What has he actually measured?",
  "What did he learn from work that failed?",
  "How does he use AI agents?",
  "Where did he study?",
  "Where is he originally from?",
  "How does he approach a problem?",
];
