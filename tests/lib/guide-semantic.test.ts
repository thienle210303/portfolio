import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuideEntry, GuideIndex } from "@/lib/guide/types";

/**
 * Tier 1's integration with transformers.js, against a mocked library.
 *
 * This exists because the real thing cannot be exercised here: `huggingface.co`
 * is denied by the environment's egress policy, so no test in this repo can
 * actually download weights. What *can* be pinned down is everything this
 * project is responsible for — that the pipeline is asked for the right task and
 * dtype, that pooling and normalisation are switched on (without them the
 * vectors are not unit-length and the dot-product shortcut in
 * `cosineSimilarity` silently returns nonsense), that the corpus is encoded in
 * batches with progress reported, and that ranking comes out in the right order.
 *
 * The mock returns one-hot 384-dimension vectors, so cosine similarity between
 * two texts is exactly 1 when they share an axis and 0 otherwise. That makes the
 * ranking assertions exact rather than approximate.
 */

const EMBEDDING_DIMS = 384;

/** Which axis a piece of text embeds onto — keyed off a marker word. */
const AXES: Record<string, number> = { alpha: 0, beta: 1, gamma: 2 };

function axisFor(text: string): number {
  const lower = text.toLowerCase();
  for (const [marker, axis] of Object.entries(AXES)) {
    if (lower.includes(marker)) return axis;
  }
  // An axis no corpus entry occupies, so unrelated queries match nothing.
  return 300;
}

function oneHot(axis: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMS).fill(0);
  vector[axis] = 1;
  return vector;
}

interface ExtractorCall {
  readonly texts: readonly string[];
  readonly options: unknown;
}

const pipelineCalls: Array<{ task: string; model: string; options: Record<string, unknown> }> = [];
const extractorCalls: ExtractorCall[] = [];
const env: Record<string, unknown> = {};

vi.mock("@huggingface/transformers", () => ({
  env,
  pipeline: vi.fn(async (task: string, model: string, options: Record<string, unknown>) => {
    pipelineCalls.push({ task, model, options });
    return (texts: string[], callOptions: unknown) => {
      extractorCalls.push({ texts: [...texts], options: callOptions });
      const rows = texts.map((text) => oneHot(axisFor(text)));
      return Promise.resolve({ tolist: () => rows });
    };
  }),
}));

// Imported after the mock is registered so the dynamic import inside
// `createSemanticSearcher` resolves to it.
const { createSemanticSearcher } = await import("@/lib/guide/semantic");

function entry(id: string, title: string, quote: string): GuideEntry {
  return {
    id,
    kind: "content",
    source: "Selected work",
    title,
    quote,
    keywords: [],
    action: { kind: "goto", sectionId: "work" },
  };
}

const index: GuideIndex = {
  revision: "testrev1",
  entries: [
    entry("a", "Alpha", "The alpha passage."),
    entry("b", "Beta", "The beta passage."),
    entry("c", "Gamma", "The gamma passage."),
  ],
};

beforeEach(() => {
  pipelineCalls.length = 0;
  extractorCalls.length = 0;
  for (const key of Object.keys(env)) delete env[key];
});

describe("createSemanticSearcher", () => {
  it("asks for the feature-extraction pipeline with the quantised MiniLM", async () => {
    await createSemanticSearcher(index, () => {});

    expect(pipelineCalls).toHaveLength(1);
    expect(pipelineCalls[0]?.task).toBe("feature-extraction");
    expect(pipelineCalls[0]?.model).toContain("all-MiniLM-L6-v2");
    // q8 is what keeps the download near 25 MB rather than ~90 MB.
    expect(pipelineCalls[0]?.options.dtype).toBe("q8");
  });

  it("disables local model lookups so the Hub is not preceded by 404s", async () => {
    await createSemanticSearcher(index, () => {});
    expect(env.allowLocalModels).toBe(false);
  });

  it("does not request WebGPU when the browser does not advertise it", async () => {
    // jsdom's navigator has no `gpu`, so this exercises the wasm path.
    await createSemanticSearcher(index, () => {});
    expect(pipelineCalls[0]?.options.device).toBeUndefined();
  });

  it("mean-pools and normalises every encode call", async () => {
    const searcher = await createSemanticSearcher(index, () => {});
    await searcher.search("alpha");

    expect(extractorCalls.length).toBeGreaterThan(0);
    for (const call of extractorCalls) {
      // Without both of these the vectors are not unit-length, and the dot
      // product `cosineSimilarity` relies on stops being a cosine at all.
      expect(call.options).toEqual({ pooling: "mean", normalize: true });
    }
  });

  it("embeds the title and quote together, and never the keyword list", async () => {
    await createSemanticSearcher(index, () => {});

    const corpusTexts = extractorCalls.flatMap((call) => call.texts);
    expect(corpusTexts).toContain("Alpha. The alpha passage.");
    expect(corpusTexts).toHaveLength(index.entries.length);
  });

  it("reports encoding progress and then readiness", async () => {
    const phases: string[] = [];
    await createSemanticSearcher(index, (progress) => phases.push(progress.phase));

    expect(phases).toContain("encoding");
    expect(phases.at(-1)).toBe("ready");
  });

  it("ranks the semantically closest entry first", async () => {
    const searcher = await createSemanticSearcher(index, () => {});

    const hits = await searcher.search("something about beta");
    expect(hits[0]?.entry.id).toBe("b");
    expect(hits[0]?.score).toBeCloseTo(1);
    // The other two share no axis, so they score exactly zero.
    expect(hits.slice(1).every((hit) => hit.score === 0)).toBe(true);
  });

  it("returns hits in descending score order", async () => {
    const searcher = await createSemanticSearcher(index, () => {});
    const scores = (await searcher.search("alpha")).map((hit) => hit.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("returns nothing for an empty query rather than encoding it", async () => {
    const searcher = await createSemanticSearcher(index, () => {});
    const before = extractorCalls.length;

    expect(await searcher.search("   ")).toEqual([]);
    expect(extractorCalls.length, "an empty query must not reach the encoder").toBe(before);
  });

  it("honours the result limit", async () => {
    const searcher = await createSemanticSearcher(index, () => {});
    expect(await searcher.search("alpha", 2)).toHaveLength(2);
  });

  it("encodes the corpus once, then only the query per search", async () => {
    const searcher = await createSemanticSearcher(index, () => {});
    const afterCorpus = extractorCalls.length;

    await searcher.search("alpha");
    await searcher.search("beta");

    // One extra call per search — the corpus is not re-embedded.
    expect(extractorCalls.length).toBe(afterCorpus + 2);
  });
});
