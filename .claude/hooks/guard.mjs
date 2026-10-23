// Guard for rules in CLAUDE.md that nothing else enforces at edit time.
// PreToolUse: checks Edit/Write content and shell commands before they run.
// PostToolUse (shell only): a command can write files the Pre check never
// sees (sed -i, a script), so files it touched under guarded paths are
// re-checked by mtime against the start time Pre recorded.
// Exit 2 blocks the call (Pre) or reports back to Claude (Post) via stderr.
import { readFileSync, writeFileSync, rmSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || "{}");
const { tool_name, tool_input = {}, hook_event_name } = input;
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const isShell = tool_name === "Bash" || tool_name === "PowerShell";
const stamp = join(tmpdir(), `portfolio-guard-${input.tool_use_id ?? input.session_id ?? "x"}`);

const block = (why) => {
  process.stderr.write(why + "\n");
  process.exit(2);
};

const LOCKFILE = /(^|\/)(package-lock\.json|yarn\.lock)$/;
const SCENERY = /(^|\/)public\/scenery\//;
const LIB = /(^|\/)src\/lib\//;
const STYLED = /(^|\/)src\/(components|sections)\//;
// Hex only where it is a colour: a colour-ish property/attribute or a
// Tailwind arbitrary value. Bare strings like href="#add" are anchors.
const HEX =
  /(?:\[|\b(?:fill|stroke|stop-?color|colou?r|background|border|outline|shadow|accent|caret)[\w-]*\s*[:=]\s*\{?\s*["'`]?)#(?:[0-9a-fA-F]{3}){1,2}(?:[0-9a-fA-F]{2})?\b/i;

// Returns the violation for `text` written to `path`, or null.
function contentRule(path, text) {
  if (LIB.test(path) && /["']@\/sections/.test(text))
    return "src/lib/ never imports from src/sections/: move what the library needs into lib/.";
  if (STYLED.test(path)) {
    if (/var\(\s*--color-[\w-]+/.test(text))
      return "Style against the semantic aliases (text-fg, bg-surface, --accent, ...), never a raw --color-* token.";
    if (HEX.test(text)) return "No literal hex colours in components/sections: use a semantic alias.";
  }
  return null;
}

const SCENERY_WHY =
  "public/scenery/ is generated. Change scripts/draw-scenery.mjs and run `pnpm draw:scenery`; " +
  "tests/lib/scenery.test.ts fails on hand edits.";
// The generator itself, or git restoring committed drawings (checkout, stash).
const runsDraw = (cmd) => /draw:scenery|draw-scenery\.mjs|^\s*git\s/.test(cmd);

if (hook_event_name === "PostToolUse") {
  if (!isShell || !existsSync(stamp)) process.exit(0);
  const since = Number(readFileSync(stamp, "utf8"));
  rmSync(stamp, { force: true });

  const touched = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (statSync(p).mtimeMs >= since) touched.push(relative(root, p).replace(/\\/g, "/"));
    }
  };
  for (const d of ["public/scenery", "src/lib", "src/components", "src/sections"]) walk(join(root, d));
  for (const f of ["package-lock.json", "yarn.lock"])
    if (existsSync(join(root, f)) && statSync(join(root, f)).mtimeMs >= since) touched.push(f);

  const problems = [];
  for (const f of touched) {
    if (LOCKFILE.test(f)) problems.push(`${f}: pnpm only, delete it.`);
    else if (SCENERY.test(f)) {
      if (!runsDraw(tool_input.command ?? "")) problems.push(`${f}: ${SCENERY_WHY}`);
    } else {
      const why = contentRule(f, readFileSync(join(root, f), "utf8"));
      if (why) problems.push(`${f}: ${why}`);
    }
  }
  if (problems.length) block("That command wrote files that break project rules; revert them:\n" + problems.join("\n"));
  process.exit(0);
}

// PreToolUse
if (isShell) {
  // Only at a command position, so prose like a commit message saying
  // "npm/yarn installs" doesn't trip it.
  if (/(?:^|[;&|(`]|\$\()\s*(?:npm\s+(?:i|install|ci|add)\b|yarn(?:\s|$))/m.test(tool_input.command ?? ""))
    block("pnpm only: never run npm/yarn installs here (they write a second lockfile).");
  writeFileSync(stamp, String(Date.now()));
  process.exit(0);
}

const path = (tool_input.file_path ?? "").replace(/\\/g, "/");
if (LOCKFILE.test(path)) block("pnpm only: never create an npm/yarn lockfile.");
if (SCENERY.test(path)) block(SCENERY_WHY);
const why = contentRule(path, tool_input.content ?? tool_input.new_string ?? "");
if (why) block(why);
