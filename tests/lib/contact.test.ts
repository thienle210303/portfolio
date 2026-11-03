import { describe, expect, it } from "vitest";
import { leadSchema } from "@/app/api/contact/schema";
import { NAME_MAX, PHONE_MAX } from "@/lib/contact";

describe("leadSchema", () => {
  it("accepts email only", () => {
    expect(leadSchema.safeParse({ name: "Jo", email: "j@example.com" }).success).toBe(true);
  });

  it("accepts phone only", () => {
    expect(leadSchema.safeParse({ name: "Jo", phone: "+1 (555) 010-9999" }).success).toBe(true);
  });

  it("rejects neither, with the error on both fields", () => {
    const r = leadSchema.safeParse({ name: "Jo", email: "", phone: "  " });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("email");
    expect(paths).toContain("phone");
  });

  it("rejects a malformed phone", () => {
    const r = leadSchema.safeParse({ name: "Jo", phone: "call me" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path[0]).toBe("phone");
  });

  it("rejects a phone with fewer than seven digits, and accepts real numbers", () => {
    for (const phone of ["-------", "(((((((", "+ () - .", "555-01"]) {
      expect(leadSchema.safeParse({ name: "Jo", phone }).success, phone).toBe(false);
    }
    for (const phone of ["+1 (864) 555-0100", "864.555.0100", "5550100"]) {
      expect(leadSchema.safeParse({ name: "Jo", phone }).success, phone).toBe(true);
    }
  });

  it("lets the phone input hold the longest phone the pattern accepts", () => {
    const longest = "+" + "1".repeat(20);
    expect(longest).toHaveLength(PHONE_MAX);
    expect(leadSchema.safeParse({ name: "Jo", phone: longest }).success).toBe(true);
    expect(leadSchema.safeParse({ name: "Jo", phone: longest + "1" }).success).toBe(false);
  });

  it("rejects a newline in the phone and control characters in the name", () => {
    expect(leadSchema.safeParse({ name: "Jo", phone: "555\n0109999" }).success).toBe(false);
    for (const name of ["Jo\r\nBcc: x@y.z", "Jo\nEmail: forged@example.com", "Jo\tQ", "Jo\u0000"]) {
      const r = leadSchema.safeParse({ name, email: "j@example.com" });
      expect(r.success, JSON.stringify(name)).toBe(false);
      expect(r.error!.issues[0].message).toBe("Use a single line.");
    }
  });

  it("trims and caps lengths", () => {
    const ok = leadSchema.safeParse({ name: "  Jo  ", email: " j@example.com " });
    expect(ok.data).toMatchObject({ name: "Jo", email: "j@example.com" });
    expect(leadSchema.safeParse({ name: "x".repeat(NAME_MAX + 1), email: "j@example.com" }).success).toBe(false);
  });
});
