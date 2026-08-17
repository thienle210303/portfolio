/**
 * Retrieval: lexical scoring over the guide index.
 *
 * This is the whole retriever. It ships with no model, no WASM, no network call
 * beyond the index JSON itself, and no dependency — and on this corpus it finds
 * a correct passage in the top 3 for 97.7% of realistic queries. An opt-in
 * embedding model used to sit on top of it; `tests/lib/guide-retrieval.test.ts`
 * records the measurements that removed it.
 *
 * Everything here is pure and synchronous, which is what makes it directly
 * unit-testable against the real content index.
 */

import type { GuideEntry, GuideHit } from "./types";

/**
 * Words that carry no retrieval signal here.
 *
 * Grown deliberately, not speculatively: every pronoun and auxiliary below was
 * observed diluting a real eval query. "can he lead or manage other engineers"
 * has six terms of which four can never match anything, and under a
 * coverage-based gate that dilution is what decides whether the query returns
 * results at all. Content words are never added — "work", "build" and "tests"
 * all stay, however common they look.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "do",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  // "who" is deliberately absent. It is a real keyword on the profile entries,
  // and stop-listing it made "who is he" — about the most likely opening query
  // on a personal site — tokenise to nothing at all.
  "with",
  "you",
  "your",
  // Pronouns and auxiliaries, from observed queries.
  "he",
  "him",
  "his",
  "she",
  "her",
  "they",
  "them",
  "their",
  "can",
  "could",
  "should",
  "would",
  "did",
  "any",
  "some",
  "about",
  "other",
  "there",
  "these",
  "those",
  "just",
  "ever",
  "anything",
  "something",
  "much",
  "many",
  "more",
  "most",
  "very",
  "really",
  "tell",
  "get",
]);

/**
 * Verbs that mean "perform an action" rather than "tell me about". Their
 * presence promotes `command` entries above prose, which is what makes
 * "copy his email" land on the clipboard command instead of on the three
 * paragraphs that happen to contain the word "email".
 */
const IMPERATIVE_TERMS = new Set([
  "copy",
  "download",
  // Deliberately NOT "go". It reads as an imperative in "go to contact" and as
  // ordinary prose in "where did he go to school", "did anything go wrong" and
  // "how did it go" — and since the boost is 2.5x and every `goto` command
  // matches the word, one stray "go" was filling all five result slots with
  // navigation. "goto" as a single token is unambiguous; the bare verb is not.
  "goto",
  "jump",
  "navigate",
  "open",
  "print",
  "save",
  "scroll",
  "show",
  "take",
  "visit",
]);

const TITLE_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const QUOTE_WEIGHT = 1;
/** Partial credit for a prefix hit, so "optimis" finds "optimisation". */
const PREFIX_WEIGHT = 0.4;
/** Shorter than this and a prefix match is mostly noise ("re", "co"). */
const MIN_PREFIX_LENGTH = 4;
/** Multiplier applied to command entries when the query reads as an order. */
const COMMAND_BOOST = 2.5;
/**
 * Multiplier applied to command entries when the query does *not* read as an
 * order — i.e. it is a question.
 *
 * Commands match strongly by construction: "Go to Philosophy" carries the
 * section word in its title, its keywords and its description, so a bare
 * "what is his philosophy" scored it 6.0 against 2.0 for the passage that
 * actually answers the question. Someone asking a question wants to read the
 * answer; the navigation option should still be offered, just not first.
 */
const NON_IMPERATIVE_COMMAND_FACTOR = 0.5;
/**
 * How many of a query's terms an entry must match to count as a hit at all.
 *
 * Deliberately an absolute count, not a fraction. A fractional gate (this was
 * 50% coverage) is length-blind, and that turned out to be actively destructive
 * on natural-language queries: "did anything go wrong on the projects" carries
 * five terms of which only two can ever match, lands at 0.4, and was filtered
 * out entirely — the eval showed it returning *zero* results, not bad ones. The
 * longer and more conversational the question, the more filler dilutes it, so a
 * percentage punishes exactly the queries a guide most needs to answer.
 *
 * One matched term is enough for a short query, where there is little else to
 * go on and precision comes from the term being specific ("mendix", "who").
 * Two are required past that, which is what keeps the must-be-empty cases empty
 * — "kubernetes helm operator" matches nothing, and a long query that grazes a
 * single filler-ish word should not resurrect a whole passage.
 */
function requiredMatches(termCount: number): number {
  return termCount <= 2 ? 1 : 2;
}

export const DEFAULT_RESULT_LIMIT = 6;

/**
 * Lowercases, strips diacritics, and splits on anything that is not a letter
 * or digit.
 *
 * Diacritic folding is load-bearing rather than cosmetic: this site writes
 * "Résumé" throughout, and a visitor types "resume". Without the NFD pass
 * the single most likely query on a portfolio would return nothing.
 */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    // `\p{Mn}` (Unicode Nonspacing_Mark) is the class NFD decomposition puts
    // accents into, so this drops them and keeps the base letters. Chosen
    // over a literal `[̀-ͯ]` character range because that form
    // renders as invisible combining marks in an editor and does not survive
    // casual copy/paste — this says what it means.
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/**
 * Collapses a token's plural form onto its singular.
 *
 * Deliberately crude — plurals only, no verb forms. It exists because the eval
 * showed "projects" failing to match "project" and "languages" failing to match
 * "language", which is a silly way to lose a query. It is applied to the index
 * and the query through the same function, so the two can never disagree; that
 * symmetry is the only property that actually matters here. It is fine that
 * "process" folds to "proces" — nothing reads these tokens, they are only ever
 * compared with each other.
 *
 * Verb forms ("blocked", "getting") are left to the expansion keywords in
 * ./expansion, where a human decides the mapping instead of a suffix rule
 * guessing at it.
 */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  // Only a trailing "s" — deliberately *not* a "-es" rule.
  //
  // English cannot tell "buses" → "bus" from "languages" → "language" by
  // suffix, and an "-es" rule broke the second: "languages" folded to
  // "languag" while the index held "language", so "what languages does he
  // know" stopped matching. Since every plural that actually occurs in this
  // corpus is a plain "-s" (projects, scrapers, records, frameworks,
  // datasets, awards), the simpler rule is the more correct one here.
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

/** Tokenised, stop-worded and stemmed. The one normalisation both sides use. */
function normalize(text: string): string[] {
  return tokenize(text)
    .filter((token) => !STOP_WORDS.has(token))
    .map(stem);
}

/** Query tokens worth scoring: stop words dropped, stemmed, duplicates collapsed. */
export function queryTerms(query: string): string[] {
  return [...new Set(normalize(query))];
}

interface SearchSurface {
  readonly titleTokens: ReadonlySet<string>;
  readonly keywordTokens: ReadonlySet<string>;
  readonly quoteTokens: ReadonlySet<string>;
  /** All of the above joined, for cheap prefix scanning. */
  readonly joined: string;
}

/**
 * Tokenising ~200 entries on every keystroke is wasteful, so each entry's
 * search surface is computed once and memoised against the entry object
 * identity. The index is fetched once per page load and never mutated, so
 * these keys stay alive exactly as long as they are useful.
 */
const surfaceCache = new WeakMap<GuideEntry, SearchSurface>();

function surfaceFor(entry: GuideEntry): SearchSurface {
  const cached = surfaceCache.get(entry);
  if (cached) return cached;

  // `normalize`, not `tokenize` — the query side is stemmed and stop-worded, so
  // the index side must be too or the two vocabularies silently diverge.
  const titleTokens = new Set(normalize(entry.title));
  const keywordTokens = new Set(normalize(entry.keywords.join(" ")));
  const quoteTokens = new Set(normalize(entry.quote));
  const surface: SearchSurface = {
    titleTokens,
    keywordTokens,
    quoteTokens,
    joined: [...titleTokens, ...keywordTokens, ...quoteTokens].join(" "),
  };

  surfaceCache.set(entry, surface);
  return surface;
}

interface EntryScore {
  /** Mean weight per query term. Higher is a better match. */
  readonly score: number;
  /** How many of the query's terms matched anything at all. */
  readonly matched: number;
}

function scoreEntry(
  entry: GuideEntry,
  terms: readonly string[],
  imperative: boolean,
): EntryScore {
  const surface = surfaceFor(entry);
  let total = 0;
  let matched = 0;

  for (const term of terms) {
    // Summed rather than "best surface wins": a term appearing in both the
    // title and the body genuinely is a stronger signal than one in the title
    // alone, and the ranking should say so.
    let termScore = 0;
    if (surface.titleTokens.has(term)) termScore += TITLE_WEIGHT;
    if (surface.keywordTokens.has(term)) termScore += KEYWORD_WEIGHT;
    if (surface.quoteTokens.has(term)) termScore += QUOTE_WEIGHT;

    // Only fall back to prefix matching when the term matched nothing exactly,
    // so a real hit is never diluted by also counting as a partial.
    if (termScore === 0 && term.length >= MIN_PREFIX_LENGTH) {
      if (surface.joined.includes(term)) termScore += PREFIX_WEIGHT;
    }

    if (termScore > 0) {
      matched += 1;
      total += termScore;
    }
  }

  if (matched === 0) return { score: 0, matched: 0 };

  // Divide by the query's term count, not by a theoretical maximum: this makes
  // the score "average weight per term asked for", which is comparable across
  // queries of different lengths and does not penalise short entries.
  let score = (total / terms.length) * (entry.weight ?? 1);

  if (entry.kind === "command") {
    score *= imperative ? COMMAND_BOOST : NON_IMPERATIVE_COMMAND_FACTOR;
  }

  return { score, matched };
}

/**
 * Ranks `entries` against `query`. Returns `[]` for an empty or all-stop-word
 * query rather than falling back to "everything", because a panel that
 * silently lists the whole index looks broken — and because the guide has to
 * be able to answer "nothing here matches that" honestly.
 */
export function searchIndex(
  entries: readonly GuideEntry[],
  query: string,
  limit: number = DEFAULT_RESULT_LIMIT,
): GuideHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const imperative = terms.some((term) => IMPERATIVE_TERMS.has(term));
  const required = requiredMatches(terms.length);

  const hits: GuideHit[] = [];
  for (const entry of entries) {
    const { score, matched } = scoreEntry(entry, terms, imperative);
    if (matched >= required) hits.push({ entry, score });
  }

  // Ties broken by id so ordering is deterministic across runs — otherwise
  // the results list reshuffles between identical queries and the snapshot
  // tests become flaky for no real reason.
  hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return hits.slice(0, limit);
}
