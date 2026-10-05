import { describe, expect, it } from "vitest";
import { validBookingUrl } from "@/lib/booking";

describe("validBookingUrl", () => {
  it("passes an https URL through, trimmed", () => {
    expect(validBookingUrl(" https://cal.com/a/b ")).toBe("https://cal.com/a/b");
  });
  it.each([undefined, "", "  ", "cal.com/a", "http://cal.com/a", "javascript:alert(1)", "//cal.com/a"])(
    "returns undefined for %j",
    (v) => expect(validBookingUrl(v)).toBeUndefined(),
  );
  // "Starts with https://" is not enough on its own: a bare scheme, or one
  // followed only by a path, has no host to send anyone to.
  it.each(["https://", " https:// ", "https:///path", "https://?q=1", "https://#x"])(
    "returns undefined for %j, which names no host",
    (v) => expect(validBookingUrl(v)).toBeUndefined(),
  );
});
