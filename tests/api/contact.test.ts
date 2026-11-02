import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { contactCopy } from "@/content/portfolio";

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
    // The thank-you is off unless a test turns it on.
    vi.stubEnv("CONTACT_REPLY_FROM", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("ok sends one email with replyTo when email present", async () => {
    const res = await POST(post({ name: "Jo", email: "j@example.com", phone: "5550109999" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, thanked: false });
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

  it("accepts an empty email with a phone", async () => {
    const res = await POST(post({ name: "Jo", email: "", phone: "5550109999" }));
    expect(res.status).toBe(200);
    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it("a malformed non-empty email is an email fieldError", async () => {
    const res = await POST(post({ name: "Jo", email: "nope", phone: "5550109999" }));
    expect(res.status).toBe(400);
    expect(Object.keys((await res.json()).fieldErrors)).toEqual(["email"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("a wrong-type body is invalid, not a 500", async () => {
    const res = await POST(post({ name: 5 }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("invalid");
  });

  it("a multi-line name cannot forge a subject or body line", async () => {
    const res = await POST(post({ name: "Jo\nBcc: x@y.z", email: "j@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.name).toBe("Use a single line.");
    expect(send).not.toHaveBeenCalled();
  });

  it("honeypot returns ok and sends nothing", async () => {
    const res = await POST(post({ name: "Bot", website: "http://spam" }));
    expect(await res.json()).toEqual({ ok: true, thanked: false });
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

  describe("the thank-you (CONTACT_REPLY_FROM)", () => {
    const VISITOR = { name: "Zebulon Quux", email: "zq@example.org", phone: "+1 864 555 0142" };

    it("is sent to a visitor who gave an email, from my verified address, replying to my inbox", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      const res = await POST(post(VISITOR));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, thanked: true });
      expect(send).toHaveBeenCalledTimes(2);
      // My own copy goes first, exactly as before.
      expect(send.mock.calls[0][0]).toMatchObject({ to: "to@example.com", from: "from@example.com" });
      expect(send.mock.calls[1][0]).toMatchObject({
        from: "Thien Le <hello@mydomain.test>",
        to: VISITOR.email,
        replyTo: "to@example.com",
        subject: contactCopy.thanks.subject,
      });
      expect(send.mock.calls[1][0].text).toContain(contactCopy.thanks.body);
      expect(send.mock.calls[1][0].html).toContain(contactCopy.thanks.body);
    });

    it("keeps a pasted display name from nesting", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "Someone Else <hello@mydomain.test>");
      await POST(post(VISITOR));
      expect(send.mock.calls[1][0].from).toBe("Thien Le <hello@mydomain.test>");
    });

    it("never repeats anything the visitor typed, not even their name", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      await POST(post(VISITOR));
      const { to, ...message } = send.mock.calls[1][0];
      expect(to).toBe(VISITOR.email);
      const written = JSON.stringify(message).toLowerCase();
      for (const typed of [VISITOR.name, "Zebulon", "Quux", VISITOR.email, "zq@", VISITOR.phone, "555 0142"]) {
        expect(written, typed).not.toContain(typed.toLowerCase());
      }
    });

    it("is not sent when CONTACT_REPLY_FROM is unset", async () => {
      const res = await POST(post(VISITOR));
      expect(await res.json()).toEqual({ ok: true, thanked: false });
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("is not sent to a phone-only lead: there is no SMS", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      const res = await POST(post({ name: VISITOR.name, phone: VISITOR.phone }));
      expect(await res.json()).toEqual({ ok: true, thanked: false });
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("is not sent when my own copy failed", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      send.mockResolvedValue({ error: { name: "x", message: "y" } });
      vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await POST(post(VISITOR));
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ ok: false, reason: "send-failed" });
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("is not sent for a honeypot hit", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      await POST(post({ ...VISITOR, website: "http://spam" }));
      expect(send).not.toHaveBeenCalled();
    });

    it("a rejected thank-you never fails the lead, and is logged", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      send.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { name: "validation_error", message: "domain not verified" } });
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await POST(post(VISITOR));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, thanked: false });
      expect(log).toHaveBeenCalledTimes(1);
    });

    it("a thank-you that throws never fails the lead either", async () => {
      vi.stubEnv("CONTACT_REPLY_FROM", "hello@mydomain.test");
      send.mockResolvedValueOnce({ error: null }).mockRejectedValueOnce(new Error("network"));
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await POST(post(VISITOR));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, thanked: false });
      expect(log).toHaveBeenCalledTimes(1);
    });
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
