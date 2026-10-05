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
});
