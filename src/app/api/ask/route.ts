import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { answer, type Answer, type Citation } from "@/lib/answers";
import { askLiveConfig } from "@/lib/ask-live-config";

/**
 * "Ask this site", live mode — retrieval-augmented generation over the exact
 * same index the static engine uses (`src/lib/answers.ts`), composed by a
 * small OpenAI-compatible chat model over plain `fetch`. No SDK: the whole
 * network surface this route touches is one POST to `ASK_LLM_URL`.
 *
 * Contract with the client (`AskThisSite.tsx`):
 *  - The client only calls this route when `page.tsx` (a Server
 *    Component) told it live mode is configured — the same
 *    compute-once-on-the-server, hand-down-a-boolean shape `page.tsx` uses
 *    for Contact's `emailDeliveryConfigured`. This route re-checks
 *    `askLiveConfig()` independently regardless, for the same reason
 *    `/api/contact` re-checks its own three env vars: a prop computed at
 *    render time can go stale relative to the process's actual environment,
 *    and this endpoint must never be the reason a visitor is told something
 *    is "live" when the key that would make it so isn't actually set.
 *  - Every response is one of the shapes in `AskApiResponse` below. Nothing
 *    else is ever returned, and nothing throws past this module.
 *  - Retrieval happens before generation, unconditionally, using the
 *    visitor's exact question through `answer()` — the same ranking a
 *    static-mode visitor gets. When it finds nothing, the model is never
 *    called at all: `grounded: false` comes back immediately, with the
 *    honest decline text. That is the refusal the round-10 design asks for
 *    ("confines answers to the supplied chunks and refuses questions the
 *    corpus can't ground"), and skipping the network call when there is
 *    nothing to ground on also means an off-topic flood costs nothing.
 */

export const runtime = "nodejs";

const QUESTION_MAX = 300;
const HISTORY_TURN_MAX = 320;
const HISTORY_MAX_ITEMS = 4;
/** How many retrieved passages the model is allowed to draw from. Mirrors
 *  the static engine's own default result count, just slightly wider —
 *  the model can afford to be handed one or two passages it ends up not
 *  using, which a human skimming a prose list cannot. */
const TOP_K = 4;

const historyTurnSchema = z.object({
  question: z.string().max(HISTORY_TURN_MAX),
  answer: z.string().max(HISTORY_TURN_MAX),
});

const askSchema = z.object({
  question: z
    .string()
    .min(1, "Ask something.")
    .max(QUESTION_MAX, `Keep it under ${QUESTION_MAX} characters.`),
  history: z.array(historyTurnSchema).max(HISTORY_MAX_ITEMS).optional(),
});

/**
 * Every possible response this route returns. `ok: true` covers both a
 * grounded answer and an honest refusal — both are the engine working
 * correctly, not an error — so the client switches on `grounded`, not on a
 * second-guessed `ok`. Citations are exactly `answer()`'s own `Answer`
 * shape with the ranking `score` dropped — see `Citation` in
 * `src/lib/answers.ts`.
 */
export type AskApiResponse =
  | { readonly ok: true; readonly grounded: true; readonly text: string; readonly citations: readonly Citation[] }
  | { readonly ok: true; readonly grounded: false; readonly text: string }
  | { readonly ok: false; readonly reason: "invalid"; readonly message: string }
  | { readonly ok: false; readonly reason: "not-configured" }
  | { readonly ok: false; readonly reason: "rate-limited" }
  | { readonly ok: false; readonly reason: "upstream-failed" };

function respond(body: AskApiResponse, status: number): NextResponse<AskApiResponse> {
  return NextResponse.json(body, { status });
}

/**
 * Shown when retrieval finds nothing worth handing the model — the same
 * honesty the static engine's `NOTHING_FOUND` string carries
 * (`AskThisSite.tsx`), reworded for the fact that a live model, not a lookup,
 * is declining.
 */
const UNGROUNDED_REPLY =
  "I don't have anything grounded on this page to answer that from, so I'd rather say so than guess. Try asking about his career, the work, his background, or his skills.";

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Minimal fixed-window limiter, in memory only — the same shape and the same
 * disclaimer as `/api/contact`'s: not a durable security boundary, just
 * enough to blunt an obvious flood before every question spends money on a
 * model call. Tighter than Contact's, because a chat box invites many more
 * requests than a form ever does, and each one that reaches generation has a
 * real cost. Disabled outside production so it never gets in the way of
 * local development.
 */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);

  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Model call                                                                  */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = [
  "You answer questions about Thien Le's portfolio site on his behalf, in third person.",
  "You may use ONLY the numbered passages below — no outside knowledge, no assumptions about facts they don't state, and never a number, date or employer that isn't written in them.",
  "If the passages don't actually answer the question, say plainly that the site doesn't cover that rather than guessing or generalising.",
  "Keep the answer to 2-4 sentences of plain prose. Do not invent a persona or greet the visitor; just answer.",
].join(" ");

function buildPrompt(question: string, chunks: readonly Answer[]): string {
  const passages = chunks
    .map((chunk, index) => `${index + 1}. [${chunk.source}] ${chunk.text}`)
    .join("\n");
  return `Passages:\n${passages}\n\nQuestion: ${question}`;
}

interface ChatCompletion {
  readonly choices?: ReadonlyArray<{ readonly message?: { readonly content?: string } }>;
}

function isChatCompletion(value: unknown): value is ChatCompletion {
  return typeof value === "object" && value !== null;
}

/**
 * The one network call this feature ever makes: a plain `fetch` against an
 * OpenAI-compatible `/chat/completions` shape. Returns `undefined` on any
 * failure — a non-2xx status, malformed JSON, or an empty completion — so
 * the caller has exactly one thing to check rather than several different
 * exception shapes.
 */
async function complete(
  config: { readonly apiKey: string; readonly model: string; readonly url: string },
  question: string,
  history: ReadonlyArray<{ readonly question: string; readonly answer: string }>,
  chunks: readonly Answer[],
): Promise<string | undefined> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.flatMap((turn) => [
      { role: "user" as const, content: turn.question },
      { role: "assistant" as const, content: turn.answer },
    ]),
    { role: "user", content: buildPrompt(question, chunks) },
  ];

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
  } catch (caught) {
    console.error("[ask] Failed to reach the live model:", caught instanceof Error ? caught.message : caught);
    return undefined;
  }

  if (!response.ok) {
    console.error("[ask] Live model returned", response.status, await response.text().catch(() => ""));
    return undefined;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return undefined;
  }

  if (!isChatCompletion(data)) return undefined;
  const content = data.choices?.[0]?.message?.content?.trim();
  return content && content.length > 0 ? content : undefined;
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest): Promise<NextResponse<AskApiResponse>> {
  if (isRateLimited(getClientIp(request))) {
    return respond({ ok: false, reason: "rate-limited" }, 429);
  }

  // Re-checked independently of the boolean `page.tsx` handed the
  // client — see the file banner for why.
  const config = askLiveConfig();
  if (!config) {
    return respond({ ok: false, reason: "not-configured" }, 503);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return respond({ ok: false, reason: "invalid", message: "Malformed request body." }, 400);
  }

  const parsed = askSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    return respond({ ok: false, reason: "invalid", message }, 400);
  }

  const { question, history = [] } = parsed.data;

  // Retrieval first, generation only if it found something — see the file
  // banner. `answer()` is the exact static-mode engine; live mode never gets
  // a different or looser retrieval pass.
  const chunks = answer(question, TOP_K);
  if (chunks.length === 0) {
    return respond({ ok: true, grounded: false, text: UNGROUNDED_REPLY }, 200);
  }

  const text = await complete(config, question, history, chunks);
  if (!text) {
    return respond({ ok: false, reason: "upstream-failed" }, 502);
  }

  return respond(
    {
      ok: true,
      grounded: true,
      text,
      citations: chunks.map((chunk) => ({
        text: chunk.text,
        source: chunk.source,
        sectionId: chunk.sectionId,
        sectionLabel: chunk.sectionLabel,
      })),
    },
    200,
  );
}
