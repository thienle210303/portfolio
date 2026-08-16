"use client";

/**
 * Tier 1: opt-in semantic retrieval, running entirely in the visitor's
 * browser.
 *
 * ## What this is and is not
 *
 * It is a 22M-parameter *sentence encoder* — it turns text into vectors so
 * paraphrases can be matched. It does not generate text, and there is no code
 * path here that could. Results are still verbatim quotes from
 * `src/content/**`; this only changes which ones get found. On a page that
 * makes factual claims about someone's employment history, that distinction
 * is the entire point: a retrieval model cannot invent a job.
 *
 * ## Why the browser encodes the corpus instead of the build
 *
 * The obvious alternative is to precompute vectors at build time and ship
 * them. This does it client-side on first opt-in instead, because:
 *
 *  - the build stays free of a model download, so CI cannot break on a
 *    Hugging Face outage and `pnpm build` stays fast;
 *  - the vectors cannot go stale relative to the content, since the cache key
 *    includes the index's content fingerprint;
 *  - nothing extra is shipped to the ~100% of visitors who never opt in.
 *
 * The cost is a few seconds of encoding on first use, behind an explicit
 * click. That trade flips if the corpus grows by an order of magnitude — at
 * which point precompute the vectors in the `/guide-index.json` route and
 * have this module read them instead of encoding.
 */

import { cosineSimilarity, DEFAULT_RESULT_LIMIT } from "./match";
import type { GuideEntry, GuideHit, GuideIndex } from "./types";

/**
 * Sentence-transformers MiniLM-L6, ONNX. 384 dimensions, and the smallest
 * model that is genuinely good at short-passage similarity. `q8` keeps the
 * download around 25 MB rather than the ~90 MB of the fp32 weights.
 */
const MODEL_ID = "onnx-community/all-MiniLM-L6-v2-ONNX";
const MODEL_DTYPE = "q8";
const EMBEDDING_DIMS = 384;

/**
 * Approximate download, surfaced in the opt-in copy before anything starts.
 * Deliberately hedged ("about") rather than a precise figure this code cannot
 * verify — and the live progress readout gives the real number as it arrives.
 */
export const MODEL_DOWNLOAD_LABEL = "About 25 MB";

/** Encode in batches so progress is reportable and peak memory stays low. */
const BATCH_SIZE = 16;

const DB_NAME = "thienle-guide";
const DB_VERSION = 1;
const STORE_NAME = "vectors";

export type SemanticPhase = "downloading" | "encoding" | "ready";

export interface SemanticProgress {
  readonly phase: SemanticPhase;
  /** 0–100 where known, otherwise null (some files report no total). */
  readonly percent: number | null;
}

export interface SemanticSearcher {
  search(query: string, limit?: number): Promise<GuideHit[]>;
}

/* -------------------------------------------------------------------------- */
/* Vector cache (IndexedDB)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Vectors are stored as one flat Float32Array rather than an array of arrays:
 * ~200 entries × 384 dims is 300 KB contiguous, which IndexedDB stores and
 * returns far more cheaply than 200 separate objects.
 */
interface CachedVectors {
  readonly count: number;
  readonly dims: number;
  readonly data: Float32Array;
}

function cacheKey(revision: string): string {
  // The model id is part of the key: vectors from a different encoder are not
  // interchangeable, and a silently mismatched cache would degrade ranking in
  // a way that is very hard to notice.
  return `${MODEL_ID}@${MODEL_DTYPE}:${revision}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      // Some hardened/private configurations throw on open. The cache is an
      // optimisation, so losing it must never fail the feature.
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function readCachedVectors(revision: string): Promise<CachedVectors | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(cacheKey(revision));
      request.onsuccess = () => {
        const value = request.result as CachedVectors | undefined;
        resolve(value ?? null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    } finally {
      // Safe to close immediately: an in-flight transaction keeps the
      // connection alive until it settles.
      db.close();
    }
  });
}

async function writeCachedVectors(revision: string, vectors: CachedVectors): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(vectors, cacheKey(revision));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    } finally {
      db.close();
    }
  });
}

/**
 * Drops every cached entry that is not the current key, so an edit to the
 * content does not leave the previous revision's 300 KB behind forever.
 */
async function pruneStaleVectors(revision: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const current = cacheKey(revision);
        for (const key of keysRequest.result) {
          if (key !== current) store.delete(key);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    } finally {
      db.close();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Model loading                                                               */
/* -------------------------------------------------------------------------- */

/** The text actually embedded for an entry. */
function embeddingText(entry: GuideEntry): string {
  // Title plus quote, and deliberately *not* the keyword list: keywords are
  // bare tokens ("cv", "pdf", "Mendix") and stuffing them into a sentence
  // encoder's input degrades the vector for the prose that surrounds them.
  // Exact-token matching is Tier 0's job, and `blendHits` keeps it in play.
  return `${entry.title}. ${entry.quote}`;
}

type Embedder = (texts: readonly string[]) => Promise<number[][]>;

async function createEmbedder(onProgress: (progress: SemanticProgress) => void): Promise<Embedder> {
  // The only dynamic import in the project. It is what keeps ~1 MB of
  // library and its wasm runtime out of the main bundle: nothing here is
  // fetched until a visitor explicitly opts in, so the initial page load is
  // byte-for-byte unchanged by this feature existing.
  const { env, pipeline } = await import("@huggingface/transformers");

  // Without this, the library probes this origin for `/models/**` first and
  // takes a round of 404s on every load before falling back to the Hub.
  env.allowLocalModels = false;

  // WebGPU where it exists, wasm everywhere else. For an encoder this small
  // wasm is entirely adequate, so this is an optimisation and not a
  // requirement — hence the fallback rather than a hard failure.
  const preferWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;

  const options = {
    dtype: MODEL_DTYPE,
    progress_callback: (report: unknown) => {
      const event = report as { status?: string; progress?: number };
      if (event.status === "progress") {
        onProgress({
          phase: "downloading",
          percent: typeof event.progress === "number" ? Math.round(event.progress) : null,
        });
      }
    },
  } as const;

  let extractor;
  try {
    extractor = await pipeline("feature-extraction", MODEL_ID, {
      ...options,
      ...(preferWebGpu ? { device: "webgpu" as const } : {}),
    });
  } catch (error) {
    if (!preferWebGpu) throw error;
    // A machine can advertise `navigator.gpu` and still fail to get an
    // adapter (headless, blocklisted driver, GPU process crash). Retrying on
    // wasm turns that into a slower success instead of a dead feature.
    extractor = await pipeline("feature-extraction", MODEL_ID, options);
  }

  return async (texts) => {
    const tensor = await extractor([...texts], { pooling: "mean", normalize: true });
    // `normalize: true` gives unit-length vectors, which is what lets the
    // similarity step below be a plain dot product.
    return tensor.tolist() as number[][];
  };
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Downloads the encoder (or reuses the browser's HTTP cache), embeds the
 * corpus (or reuses the IndexedDB cache), and resolves to a searcher.
 *
 * Rejects if the model cannot be loaded at all, so the caller can fall back
 * to Tier 0 and say so plainly.
 */
export async function createSemanticSearcher(
  index: GuideIndex,
  onProgress: (progress: SemanticProgress) => void,
): Promise<SemanticSearcher> {
  const entries = index.entries;
  const embed = await createEmbedder(onProgress);

  let vectors: Float32Array;

  const cached = await readCachedVectors(index.revision);
  if (cached && cached.count === entries.length && cached.dims === EMBEDDING_DIMS) {
    vectors = cached.data;
  } else {
    onProgress({ phase: "encoding", percent: 0 });
    vectors = new Float32Array(entries.length * EMBEDDING_DIMS);

    for (let start = 0; start < entries.length; start += BATCH_SIZE) {
      const batch = entries.slice(start, start + BATCH_SIZE);
      const embedded = await embed(batch.map(embeddingText));
      embedded.forEach((vector, offset) => {
        vectors.set(vector, (start + offset) * EMBEDDING_DIMS);
      });
      onProgress({
        phase: "encoding",
        percent: Math.round(Math.min(start + BATCH_SIZE, entries.length) / entries.length * 100),
      });
    }

    await writeCachedVectors(index.revision, {
      count: entries.length,
      dims: EMBEDDING_DIMS,
      data: vectors,
    });
    // Fire-and-forget: reclaiming an old revision's bytes must never delay
    // the first search.
    void pruneStaleVectors(index.revision);
  }

  onProgress({ phase: "ready", percent: 100 });

  return {
    async search(query, limit = DEFAULT_RESULT_LIMIT) {
      const trimmed = query.trim();
      if (trimmed.length === 0) return [];

      const [queryVector] = await embed([trimmed]);
      if (!queryVector) return [];

      const hits: GuideHit[] = entries.map((entry, position) => {
        const offset = position * EMBEDDING_DIMS;
        // `subarray` is a view, not a copy — this runs once per entry per
        // keystroke-debounced query, so avoiding ~200 allocations matters.
        const vector = vectors.subarray(offset, offset + EMBEDDING_DIMS);
        return { entry, score: cosineSimilarity(queryVector, vector) };
      });

      return hits
        .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
        .slice(0, limit);
    },
  };
}
