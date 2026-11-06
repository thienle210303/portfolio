#!/usr/bin/env node
/**
 * Draws the résumé's first page as an image, for `/resume` on a phone.
 *
 *   pnpm resume:preview          render the page and record the PDF's hash
 *   pnpm resume:preview --check  exit 1 if the PDF has changed since
 *
 * A phone shows an embedded PDF as one cropped page or as nothing, so under
 * 40rem `/resume` shows this picture of page one instead, linked to the PDF
 * (`src/app/resume/page.tsx`). The picture is made from the real file, never
 * retyped: `profile.resumePdf` in `src/content/portfolio.ts` names it, and
 * Quick Look (`qlmanage`, part of macOS) renders page one at 1600px on its
 * long side, sharp enough for a 3x phone at full width.
 *
 * Beside the page it writes `src/app/resume/resume-preview.json`: the image's
 * path and size (so the page reserves its box) and the PDF's SHA-256.
 * `tests/lib/resume-preview.test.ts` fails when the PDF in `public/` no longer
 * matches that hash, which is how a new résumé without a new preview is
 * caught. The image itself is not hashed: Quick Look's rendering may differ
 * by a pixel between macOS versions, and that is not a stale preview.
 *
 * macOS only, by design (no new dependency). On another system, replace the
 * PDF and ask someone with a Mac to run this, or the test stays red.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "src/content/portfolio.ts");
const RECORD = path.join(ROOT, "src/app/resume/resume-preview.json");
/** The long side, in pixels. */
const SIZE = 1600;

function resumePdf() {
  const match = readFileSync(CONTENT, "utf8").match(/resumePdf:\s*"([^"]+\.pdf)"/);
  if (!match) throw new Error("profile.resumePdf is not set in src/content/portfolio.ts");
  return match[1];
}

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** A PNG's width and height are the two big-endian words after its IHDR tag. */
function pngSize(file) {
  const bytes = readFileSync(file);
  if (bytes.toString("latin1", 12, 16) !== "IHDR") throw new Error(`${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const pdf = resumePdf();
const pdfFile = path.join(ROOT, "public", pdf);
if (!existsSync(pdfFile)) throw new Error(`public${pdf} does not exist`);
const image = pdf.replace(/\.pdf$/, "-preview.png");
const imageFile = path.join(ROOT, "public", image);

if (process.argv.includes("--check")) {
  const record = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : null;
  const fresh = record?.pdf === pdf && record?.pdfSha256 === sha256(pdfFile) && existsSync(imageFile);
  if (!fresh) {
    console.error(`The résumé preview is stale: public${pdf} changed. Run pnpm resume:preview.`);
    process.exit(1);
  }
  console.log("The résumé preview matches the PDF.");
  process.exit(0);
}

if (process.platform !== "darwin") {
  throw new Error("resume-preview needs macOS (Quick Look's qlmanage renders the page).");
}

const scratch = mkdtempSync(path.join(tmpdir(), "resume-preview-"));
try {
  execFileSync("qlmanage", ["-t", "-s", String(SIZE), "-o", scratch, pdfFile], { stdio: "pipe" });
  const made = path.join(scratch, `${path.basename(pdfFile)}.png`);
  if (!existsSync(made)) throw new Error("Quick Look made no thumbnail");
  rmSync(imageFile, { force: true });
  renameSync(made, imageFile);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const record = { pdf, pdfSha256: sha256(pdfFile), image, ...pngSize(imageFile) };
writeFileSync(RECORD, `${JSON.stringify(record, null, 2)}\n`);
console.log(`Wrote public${image} (${record.width} x ${record.height}) and ${path.relative(ROOT, RECORD)}.`);
