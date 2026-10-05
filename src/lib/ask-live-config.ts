/**
 * The live-mode gate for "Ask this site" — same shape as `page.tsx`'s
 * `emailDeliveryConfigured` for Contact. The env var names live here rather
 * than inline in `page.tsx` because two callers need the same check, and
 * neither should have to know these three names exist.
 *
 * Two call sites import this one file, so the three env var names it reads
 * exist in exactly one place: `src/app/page.tsx` (to decide the boolean it
 * hands down through Contact to `AskThisSite`, which since round 18 lives in
 * Contact's `#ask`; through round 17 `Hero.tsx` made this call, for the
 * hero's "Ask Thien" tab) and `src/app/api/ask/route.ts` (to defend itself
 * independently, the same reason `/api/contact` re-checks its own three env
 * vars rather than trusting the prop it was handed).
 */

export interface AskLiveConfig {
  readonly apiKey: string;
  readonly model: string;
  /** OpenAI-compatible chat-completions endpoint. Defaults to OpenAI's own
   *  when `ASK_LLM_URL` is unset, so setting just the key and model is
   *  enough to turn live mode on. */
  readonly url: string;
}

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";

/**
 * `undefined` when any of `ASK_LLM_API_KEY` / `ASK_LLM_MODEL` is missing —
 * live mode stays off until both are set, exactly like the Resend trio for
 * Contact. `ASK_LLM_URL` is optional and defaults to OpenAI's endpoint.
 */
export function askLiveConfig(): AskLiveConfig | undefined {
  const apiKey = process.env.ASK_LLM_API_KEY;
  const model = process.env.ASK_LLM_MODEL;
  if (!apiKey || !model) return undefined;

  const url = process.env.ASK_LLM_URL || DEFAULT_URL;
  return { apiKey, model, url };
}

/** The boolean half of `askLiveConfig()` — all a Server Component or a
 *  client prop should ever need; the key and URL never cross into it. */
export function askLiveModeConfigured(): boolean {
  return askLiveConfig() !== undefined;
}
