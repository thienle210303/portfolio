import { describe, expect, it } from "vitest";
import { buildMailtoHref, buildReason, REASON_MAX } from "@/lib/contact";
import { contactIntents, projects } from "@/content/portfolio";

describe("buildReason", () => {
  const intent = { subject: "Career opportunity" };

  it("is the intent's subject when no case study was being read", () => {
    expect(buildReason(intent, null)).toBe("Career opportunity");
  });

  it("names the case study after the subject when one was", () => {
    expect(buildReason(intent, "Chess")).toBe("Career opportunity — Chess");
  });

  it("never builds a reason the API would reject as too long", () => {
    // The form has no reason field to show an error against any more, so a
    // reason over the route's limit would fail with nothing to fix.
    expect(contactIntents.length * projects.length).toBeGreaterThan(0);
    for (const intent of contactIntents) {
      for (const project of projects) {
        expect(buildReason(intent, project.title).length, `${intent.id} + ${project.id}`).toBeLessThanOrEqual(
          REASON_MAX,
        );
      }
    }
  });
});

describe("buildMailtoHref", () => {
  const message = { subject: "A secret", message: "Hi Thien,\n\nTwo words.\n\nBest,", name: "Jamie Q", email: "j@example.com" };

  it("percent-encodes spaces rather than turning them into '+'", () => {
    const href = buildMailtoHref("to@example.com", message);
    expect(href.startsWith("mailto:to@example.com?subject=A%20secret&body=")).toBe(true);
    expect(href).not.toContain("+");
  });

  it("carries the message verbatim, then who it is from and where to reply", () => {
    const href = buildMailtoHref("to@example.com", message);
    const body = decodeURIComponent(href.slice(href.indexOf("&body=") + "&body=".length));
    expect(body).toBe("Hi Thien,\n\nTwo words.\n\nBest,\n\n—\nName: Jamie Q\nEmail: j@example.com");
  });

  it("falls back to a generic subject when it is given none", () => {
    const href = buildMailtoHref("to@example.com", { ...message, subject: "  " });
    expect(href).toContain(`subject=${encodeURIComponent("Message from your portfolio site")}&`);
  });
});
