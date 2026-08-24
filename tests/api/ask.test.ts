import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/ask` — live-mode RAG for "Ask this site".
 *
 * These pin the contract the client (`AskThisSite.tsx`) is built against:
 * the route never calls the model unless retrieval actually found something
 * to ground it on, it re-checks its own configuration independently of
 * whatever the client believes, and it degrades to a clean error shape
 * rather than a 500 whenever the upstream model misbehaves.
 *
 * The module under test reads `process.env` at *call* time (inside
 * `askLiveConfig()`/`isRateLimited()`, not at import time), so
 * `vi.stubEnv` before each request is enough — no module reset needed for
 * env, only for the in-memory rate-limit map (isolated below by using a
 * distinct `x-forwarded-for` per test instead).
 */

function post(body: unknown, ip = "203.0.113.1"): NextRequest {
  return new NextRequest("http://localhost/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function importRoute() {
  const mod = await import("@/app/api/ask/route");
  return mod.POST;
}

describe("/api/ask", () => {
  beforeEach(() => {
    vi.stubEnv("ASK_LLM_API_KEY", "");
    vi.stubEnv("ASK_LLM_MODEL", "");
    vi.stubEnv("ASK_LLM_URL", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refuses to run when the three env vars aren't all set", async () => {
    const POST = await importRoute();
    const res = await POST(post({ question: "What does he do at DoorDash?" }, "198.51.100.10"));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, reason: "not-configured" });
  });

  it("rejects an empty question as invalid, without ever calling the model", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const POST = await importRoute();
    const res = await POST(post({ question: "" }, "198.51.100.11"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("invalid");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a question over the length cap as invalid", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");

    const POST = await importRoute();
    const res = await POST(post({ question: "x".repeat(500) }, "198.51.100.12"));
    expect(res.status).toBe(400);
  });

  it("rejects a history array longer than the cap as invalid", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");

    const POST = await importRoute();
    const history = Array.from({ length: 10 }, (_, i) => ({
      question: `q${i}`,
      answer: `a${i}`,
    }));
    const res = await POST(post({ question: "What does he do at DoorDash?", history }, "198.51.100.13"));
    expect(res.status).toBe(400);
  });

  it("declines an ungrounded question without ever calling the model", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const POST = await importRoute();
    const res = await POST(post({ question: "what is the capital of France" }, "198.51.100.14"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, grounded: false, text: expect.any(String) });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("grounds a real question, calls the model with the retrieved passages, and returns citations", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    vi.stubEnv("ASK_LLM_URL", "https://example.test/v1/chat/completions");

    const fetchSpy = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "He works on retail data at DoorDash." } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const POST = await importRoute();
    const res = await POST(post({ question: "What does he do at DoorDash?" }, "198.51.100.15"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.grounded).toBe(true);
    expect(body.text).toBe("He works on retail data at DoorDash.");
    expect(Array.isArray(body.citations)).toBe(true);
    expect(body.citations.length).toBeGreaterThan(0);
    for (const citation of body.citations) {
      expect(typeof citation.text).toBe("string");
      expect(typeof citation.source).toBe("string");
      expect(typeof citation.sectionId).toBe("string");
    }

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk-test" });
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.model).toBe("gpt-test");
    expect(sentBody.messages[0]).toMatchObject({ role: "system" });
  });

  it("returns upstream-failed when the model endpoint errors", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );

    const POST = await importRoute();
    const res = await POST(post({ question: "What does he do at DoorDash?" }, "198.51.100.16"));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ ok: false, reason: "upstream-failed" });
  });

  it("returns upstream-failed when fetch itself throws (network failure)", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );

    const POST = await importRoute();
    const res = await POST(post({ question: "What does he do at DoorDash?" }, "198.51.100.17"));
    expect(res.status).toBe(502);
  });

  it("returns upstream-failed when the completion body is empty", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 })),
    );

    const POST = await importRoute();
    const res = await POST(post({ question: "What does he do at DoorDash?" }, "198.51.100.18"));
    expect(res.status).toBe(502);
  });

  it("rate-limits a flood from the same IP once in production", async () => {
    vi.stubEnv("ASK_LLM_API_KEY", "sk-test");
    vi.stubEnv("ASK_LLM_MODEL", "gpt-test");
    vi.stubEnv("NODE_ENV", "production");
    // Off-topic on purpose: keeps every allowed request on the cheap
    // no-model path, so this test is only exercising the limiter.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const POST = await importRoute();
    const ip = "198.51.100.19";
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) {
      const res = await POST(post({ question: "what is the capital of France" }, ip));
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 12).every((status) => status === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
