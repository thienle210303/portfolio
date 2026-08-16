/**
 * Tier 0 retrieval: lexical scoring over the guide index.
 *
 * This is the default and it ships with no model, no network call beyond the
 * index JSON itself, and no dependency. Tier 1 (semantic) is an opt-in layer
 * *on top* of this — never a replacement — so a visitor who declines the
 * download still gets a working guide, and the two paths return the same
 * `GuideHit` shape.
 *
 * Everything here is pure and synchronous, which is what makes it directly
 * unit-testable against the real content index.
 */

import type { GuideEntry, GuideHit } from "./types";

/** Words too common in this corpus to carry signal. Deliberately short — an
 *  aggressive stop list starts eating real queries ("what failed", "no
 *  results"), and the scoring below already discounts ubiquitous terms. */
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
  "who",
  "with",
  "you",
  "your",
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
  "go",
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
 * Fraction of the query's terms an entry must match to count as a hit.
 *
 * This is a *coverage* gate, deliberately separate from the score used for
 * ranking. An earlier version thresholded the normalised score instead, which
 * was subtly broken: a one-word query matching only an entry's quote scored
 * 1/6 of the theoretical ceiling and fell under the floor, so "collection"
 * — an obviously reasonable query — returned nothing at all. Coverage asks the
 * question that actually matters ("did we match what was asked?") and leaves
 * "how well" to the ordering.
 */
const MIN_QUERY_COVERAGE = 0.5;

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

/** Query tokens worth scoring: stop words dropped, duplicates collapsed. */
export function queryTerms(query: string): string[] {
  const terms = tokenize(query).filter((token) => !STOP_WORDS.has(token));
  return [...new Set(terms)];
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

  const titleTokens = new Set(tokenize(entry.title));
  const keywordTokens = new Set(tokenize(entry.keywords.join(" ")));
  const quoteTokens = new Set(tokenize(entry.quote));
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

  if (entry.kind === "command" && imperative) score *= COMMAND_BOOST;

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

  const hits: GuideHit[] = [];
  for (const entry of entries) {
    const { score, matched } = scoreEntry(entry, terms, imperative);
    if (matched / terms.length >= MIN_QUERY_COVERAGE) hits.push({ entry, score });
  }

  // Ties broken by id so ordering is deterministic across runs — otherwise
  // the results list reshuffles between identical queries and the snapshot
  // tests become flaky for no real reason.
  hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return hits.slice(0, limit);
}

/**
 * Cosine similarity between two equal-length, already L2-normalised vectors.
 * Used by Tier 1; lives here so both retrieval paths share one module.
 *
 * Normalisation is the caller's job (the embedding pipeline does it), so this
 * is a plain dot product — but it returns 0 rather than NaN on a length
 * mismatch, because a cache holding vectors from a different model must
 * degrade to "no semantic signal", not poison the ranking.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += (a[index] as number) * (b[index] as number);
  }
  return dot;
}

/**
 * Blends semantic similarity with the lexical score.
 *
 * Semantic-only ranking is worse than it sounds on a corpus this small: exact
 * technology names ("Mendix", "Damerau–Levenshtein") are precisely what
 * visitors type and precisely what a 22M-parameter sentence encoder is
 * weakest at. Keeping lexical signal in the blend means an exact term match
 * still wins, while paraphrases ("how do you handle flaky scrapers") get
 * found at all.
 */
export function blendHits(
  lexical: readonly GuideHit[],
  semantic: readonly GuideHit[],
  limit: number = DEFAULT_RESULT_LIMIT,
): GuideHit[] {
  const byId = new Map<string, GuideHit>();

  for (const hit of semantic) {
    byId.set(hit.entry.id, { entry: hit.entry, score: hit.score * 0.6 });
  }
  for (const hit of lexical) {
    const existing = byId.get(hit.entry.id);
    byId.set(hit.entry.id, {
      entry: hit.entry,
      score: (existing?.score ?? 0) + hit.score * 0.4,
    });
  }

  return [...byId.values()]
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit);
}
