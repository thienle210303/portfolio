import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the contact zod fence", () => {
  // The lead form is a client component; zod reached from it cost ~65 KB of
  // JS at load (R20-P6). The schema lives in src/app/api/contact/schema.ts.
  it("keeps zod out of src/lib/contact.ts and src/sections/Contact/", () => {
    const src = join(process.cwd(), "src");
    const contactDir = join(src, "sections", "Contact");
    const files = [
      join(src, "lib", "contact.ts"),
      ...readdirSync(contactDir, { recursive: true, encoding: "utf8" })
        .filter((entry) => /\.(ts|tsx)$/.test(entry))
        .map((entry) => join(contactDir, entry)),
    ];
    const importers = files.filter((file) => /from\s+["']zod["']|import\(\s*["']zod["']\s*\)/.test(readFileSync(file, "utf8")));
    expect(importers).toEqual([]);
  });
});
