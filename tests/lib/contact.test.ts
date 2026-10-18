import { describe, expect, it } from "vitest";
import { buildLeadMailto, leadSchema, leadSubject, NAME_MAX } from "@/lib/contact";

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

  it("trims and caps lengths", () => {
    const ok = leadSchema.safeParse({ name: "  Jo  ", email: " j@example.com " });
    expect(ok.data).toMatchObject({ name: "Jo", email: "j@example.com" });
    expect(leadSchema.safeParse({ name: "x".repeat(NAME_MAX + 1), email: "j@example.com" }).success).toBe(false);
  });
});

describe("buildLeadMailto", () => {
  const body = (href: string) => decodeURIComponent(href.slice(href.indexOf("&body=") + 6));

  it("subject and body carry name, email, phone; omits missing ones", () => {
    const full = buildLeadMailto({ name: "Jo Q", email: "j@example.com", phone: "5550109999" }, "to@example.com");
    expect(full.startsWith(`mailto:to@example.com?subject=${encodeURIComponent(leadSubject("Jo Q"))}&body=`)).toBe(true);
    expect(full).not.toContain("+");
    expect(body(full)).toBe("Name: Jo Q\nEmail: j@example.com\nPhone: 5550109999");
    expect(body(buildLeadMailto({ name: "Jo Q", phone: "5550109999" }, "to@example.com"))).toBe(
      "Name: Jo Q\nPhone: 5550109999",
    );
    expect(body(buildLeadMailto({ name: "Jo Q", email: "j@example.com" }, "to@example.com"))).not.toContain("Phone");
  });
});
