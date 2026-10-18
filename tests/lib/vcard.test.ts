import { describe, expect, it } from "vitest";
import { buildVCard } from "@/lib/vcard";
import { profile } from "@/content/portfolio";

const p = { ...profile, name: "Thien Le", title: "Software Engineer", email: "a@b.co", location: "Taylors, South Carolina" };
const lines = (s: string) => s.split("\r\n");

describe("buildVCard", () => {
  it("is a 3.0 card", () => {
    const l = lines(buildVCard(p));
    expect(l[0]).toBe("BEGIN:VCARD");
    expect(l[1]).toBe("VERSION:3.0");
    expect(l.at(-2)).toBe("END:VCARD");
  });
  it("uses CRLF only and ends with one", () => {
    const s = buildVCard(p);
    expect(s.endsWith("\r\n")).toBe(true);
    expect(s.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it("derives FN and N from the name", () => {
    const l = lines(buildVCard(p));
    expect(l).toContain("FN:Thien Le");
    expect(l).toContain("N:Le;Thien;;;");
  });
  it("carries email, title and url", () => {
    const l = lines(buildVCard(p, [], "https://x.dev"));
    expect(l).toContain("EMAIL;TYPE=INTERNET:a@b.co");
    expect(l).toContain("TITLE:Software Engineer");
    expect(l).toContain("URL:https://x.dev");
  });
  it("splits location into locality and region", () => {
    expect(lines(buildVCard(p))).toContain("ADR;TYPE=HOME:;;;Taylors;South Carolina;;");
  });
  it("lists http social links as URLs, skipping mailto", () => {
    const s = buildVCard(p);
    expect(s).toContain("URL:https://github.com/thienle210303");
    expect(s).not.toContain("URL:mailto:");
  });
  it("escapes commas, semicolons and backslashes", () => {
    const s = buildVCard({ ...p, title: "A, B; C\\D" });
    expect(s).toContain("TITLE:A\\, B\\; C\\\\D");
  });
  it("escapes newlines as \\n, never leaving a bare line break inside a property", () => {
    const s = buildVCard({ ...p, title: "Engineer\nBuilder\r\nWriter" });
    expect(lines(s)).toContain("TITLE:Engineer\\nBuilder\\nWriter");
    expect(s.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
});
