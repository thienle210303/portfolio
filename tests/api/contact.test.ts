import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

function post(body: unknown, ip = "203.0.113.1"): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

type Route = typeof import("@/app/api/contact/route");
let POST: Route["POST"];

describe("/api/contact", () => {
  // Cold transform of the route's module graph; see tests/api/ask.test.ts.
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/contact/route"));
  }, 30_000);

  beforeEach(() => {
    send.mockReset().mockResolvedValue({ error: null });
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("CONTACT_TO_EMAIL", "to@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "from@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("ok sends one email with replyTo when email present", async () => {
    const res = await POST(post({ name: "Jo", email: "j@example.com", phone: "5550109999" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "to@example.com",
      replyTo: "j@example.com",
      subject: "Portfolio lead — Jo",
      text: "Name: Jo\nEmail: j@example.com\nPhone: 5550109999",
    });
  });

  it("phone-only sends without replyTo", async () => {
    const res = await POST(post({ name: "Jo", phone: "+1 555 010 9999" }));
    expect(res.status).toBe(200);
    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it("honeypot returns ok and sends nothing", async () => {
    const res = await POST(post({ name: "Bot", website: "http://spam" }));
    expect(await res.json()).toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("invalid returns 400 with fieldErrors", async () => {
    const res = await POST(post({ name: "Jo" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.reason).toBe("invalid");
    expect(Object.keys(json.fieldErrors).sort()).toEqual(["email", "phone"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("not-configured returns 503", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await POST(post({ name: "Jo", email: "j@example.com" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "not-configured" });
  });

  it("send failure returns 502", async () => {
    send.mockResolvedValue({ error: { name: "x", message: "y" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ name: "Jo", email: "j@example.com" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "send-failed" });
  });

  it("rate-limited after 5 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await POST(post({ name: "Jo", email: "j@example.com" }, "198.51.100.9"))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
