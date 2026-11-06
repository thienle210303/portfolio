import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { profile } from "@/content/portfolio";
import preview from "@/app/resume/resume-preview.json";

/**
 * `/resume` on a phone shows a picture of the résumé's first page instead of
 * an embedded PDF (round 25). The picture is drawn from the PDF by
 * `pnpm resume:preview` (`scripts/resume-preview.mjs`), which records the
 * PDF's hash beside it. These tests fail when the PDF is replaced and the
 * picture is not redrawn: a phone would show last year's résumé over a link to
 * this year's.
 */

const inPublic = (file: string) => path.join(process.cwd(), "public", file);

describe("the résumé's first-page preview", () => {
  it("was drawn from the PDF the site links to", () => {
    expect(preview.pdf, "resume-preview.json names another file: run `pnpm resume:preview`").toBe(profile.resumePdf);
  });

  it("was drawn from the PDF as it is now", () => {
    const hash = createHash("sha256").update(readFileSync(inPublic(preview.pdf))).digest("hex");
    expect(hash, "the résumé PDF changed without its preview: run `pnpm resume:preview` and commit both").toBe(
      preview.pdfSha256,
    );
  });

  it("is committed, a PNG of the size the page reserves for it, and a portrait page", () => {
    const file = inPublic(preview.image);
    expect(existsSync(file), `${preview.image} is missing from public/`).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.toString("latin1", 1, 4)).toBe("PNG");
    expect({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }).toEqual({
      width: preview.width,
      height: preview.height,
    });
    expect(preview.height).toBeGreaterThan(preview.width);
    // Sharp enough for a 3x phone at full width, and not a multi-megabyte file.
    expect(preview.width).toBeGreaterThanOrEqual(1100);
    expect(bytes.byteLength).toBeLessThan(900_000);
  });
});
