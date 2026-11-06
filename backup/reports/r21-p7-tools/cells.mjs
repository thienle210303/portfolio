import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const [dir, out, ids, night] = process.argv.slice(2);
const ink = night ? "#b9c4bd" : "#56605A", ground = night ? "#141A17" : "#E4E8E0";
const coat = { moon: `color-mix(in oklab,${ink} ${night?34:40}%,${ground})`, mi: `color-mix(in oklab,${ink} 14%,${ground})`, police: `color-mix(in oklab,${ink} 40%,${ground})` };
let cells = "";
for (const spec of ids.split(",")) {
  const [n, id] = spec.split(":");
  const tail = /^look|^react-[0-35-7]$/.test(id) ? (id === "react-3" ? "tail-puff" : "tail") : null;
  cells += `<div style="--cat-coat:${coat[n]};--cat-sock:${ground}"><svg viewBox="0 0 50 42" width="250" height="210">${tail ? `<use href="/${n}.svg#${tail}"/>` : ""}<use href="/${n}.svg#${id}"/></svg><div style="font:12px monospace">${spec}</div></div>`;
}
const html = `<body style="margin:0;background:linear-gradient(${night ? "#1c2a33,#141A17" : "#dce6e2,#ecece2"});color:${ink}"><div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px">${cells}</div></body>`;
const srv = createServer((q, r) => { if (q.url === "/") { r.setHeader("content-type", "text/html"); return r.end(html); } r.setHeader("content-type", "image/svg+xml"); r.end(readFileSync(dir + q.url)); }).listen(3229);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 700 } });
await p.goto("http://localhost:3229/"); await p.waitForTimeout(300); await p.screenshot({ path: out, fullPage: true }); await b.close(); srv.close();
