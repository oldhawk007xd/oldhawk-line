/* Writes the latest reading into the two pages, so a reader that runs no JavaScript (a search engine, a link
   preview, an AI assistant) gets the number, the zone, the runners and the KOL record instead of empty places.
   Runs in the deploy job on the built folder (scripts/site.mjs): it opens each page in headless Chrome with the
   page's own code, waits for it to draw, and copies what the code wrote into the same places in the file.
   The page's script is left byte for byte as it was, and nothing is committed: the next deploy writes it again.
   If Chrome is missing or a page does not draw, the file stays as it was and the page fills itself in as before.
   Needs playwright-core (installed with --no-save in the workflow) and the runner's Chrome.
   Usage: node scripts/prerender.mjs <site dir> */
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const say = (...a) => console.log("prerender:", ...a);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* 11 Nov 2026, 08:30 UTC */
export const stamp = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
};

/* The places the page's code fills from the reading, by id. Left out on purpose: the charts and the sky
   (drawings, no words), the scrolling ticker (a second copy of the trending list), anything that counts minutes,
   and what the page writes once from its settings and not from the reading (the referral note). */
export const PAGES = [
  {
    file: "index.html",
    slots: ["h1", "explain", "sinceY", "rulesSay", "num", "zone", "stats", "runnersLead", "tiers", "legend", "listTable", "listCount", "trendList", "edge", "srcNote",
      "hoursGrid", "proofLead", "trioNow", "wkChg", "wkFromTop", "wkStreak", "wkStreakL", "chartCap", "signalsLead", "oneLine", "verdicts", "gauges", "kills", "sources"],
    ready: () => Boolean(document.querySelector("#listTable tr") && document.querySelector("#verdicts > *") && document.querySelector("#hoursGrid > *") && document.querySelector("#stats > *")),
    /* the places that say how long ago: the file says when instead */
    fixed: (r) => ({ liveText: `Reading of ${esc(stamp(r.at))}` })
  },
  {
    file: "kols.html",
    slots: ["kolStats", "kolSpectrum", "kolGrid", "kolMore", "kolCalls", "kolMethodBody"],
    ready: () => Boolean(document.querySelector("#kolGrid .kcard") && document.querySelector("#kolStats > *") && document.querySelector("#kolMethodBody > *")),
    fixed: (r) => ({ kolAt: `Record of ${esc(stamp(r.kols && r.kols.at ? r.kols.at : r.at))}, ${r.kols && Array.isArray(r.kols.people) ? r.kols.people.length : 0} accounts` })
  }
];

/* the page's markup ends where its script starts (the last script of the file): nothing from there on is touched */
export const scriptStart = (html) => {
  const i = html.lastIndexOf("<script");
  return i < 0 ? html.length : i;
};

/* Puts inner into the element with this id and notes on the element what it held before (data-pre).
   Only looks in the markup before the page's script, and only at a real opening tag, so a string inside the
   script can never be taken for the element. Returns null when the element is not there or its closing tag
   cannot be found. */
export function setInner(html, id, inner) {
  const limit = scriptStart(html);
  const open = new RegExp(`<([a-zA-Z][\\w-]*)\\b[^<>]*\\bid="${id}"[^<>]*>`).exec(html.slice(0, limit));
  if (!open) return null;
  const tag = open[1].toLowerCase(), start = open.index + open[0].length;
  const re = new RegExp(`<(/?)${tag}\\b[^<>]*>`, "gi");
  re.lastIndex = start;
  let depth = 1, m;
  while ((m = re.exec(html)) && m.index < limit) {
    if (m[1]) {
      if (--depth) continue;
      /* data-pre keeps what the page held here, and the page's code puts it back before it draws (unpre) */
      const was = /\bdata-pre="/.test(open[0]) ? "" : ` data-pre="${esc(html.slice(start, m.index))}"`;
      return html.slice(0, start - 1) + was + ">" + inner + html.slice(m.index);
    }
    if (!m[0].endsWith("/>")) depth++;
  }
  return null;
}

/* the share texts lead with the reading and its time, so a preview or a search result never shows a bare page */
export function describe(html, r, file) {
  if (file !== "index.html" || r.line == null || !r.zone) return html;
  const lead = `Reading of ${stamp(r.at)}: the Line is ${r.line} of 100, ${r.zone.name}.`;
  const set = (attr, name) => {
    html = html.replace(new RegExp(`(<meta ${attr}="${name}" content=")([^"]*)(")`), (m, a, val, c) => (val.startsWith("Reading of ") ? m : `${a}${esc(lead)} ${val}${c}`));
  };
  set("name", "description"); set("property", "og:description");
  return html;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml", ".js": "text/javascript", ".css": "text/css" };
function serve(dir) {
  const root = path.resolve(dir);
  const srv = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(root, p);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      const buf = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(buf);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}

async function browser() {
  let pw = null;
  const require = createRequire(import.meta.url);
  for (const name of ["playwright-core", "playwright"]) { try { pw = require(name); break; } catch { /* try the next */ } }
  if (!pw) throw new Error("playwright-core is not installed");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const paths = [process.env.CHROME_BIN, "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"].filter(Boolean);
  for (const opt of [{ channel: "chrome" }, ...paths.map((executablePath) => ({ executablePath })), {}]) { try { return await chromium.launch(opt); } catch { /* try the next */ } }
  throw new Error("no Chrome to launch");
}

export async function prerender(dir, pages = PAGES) {
  let r;
  try { r = JSON.parse(await readFile(path.join(dir, "data/latest.json"), "utf8")); } catch { say("no reading file, nothing written"); return 0; }
  if (!r || r.blank || !r.at || !Array.isArray(r.zones)) { say("no reading yet, nothing written"); return 0; }
  const { srv, base } = await serve(dir);
  let b = null, done = 0;
  try {
    b = await browser();
    for (const pg of pages) {
      const file = path.join(dir, pg.file);
      let html;
      try { html = await readFile(file, "utf8"); } catch { say(`${pg.file} missing`); continue; }
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
      /* only the folder itself: no fonts, no beacons, no sockets */
      await ctx.route("**/*", (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e && e.message ? e.message : e)));
      /* the clock stands at the reading, so "3 h ago" in a table counts from the time the file states */
      try { await page.clock.setFixedTime(new Date(r.at)); } catch { /* an older playwright: the clock runs */ }
      let got = null;
      try {
        await page.goto(`${base}/${pg.file}`, { waitUntil: "load", timeout: 20000 });
        await page.waitForFunction(pg.ready, null, { timeout: 15000 });
        await page.waitForTimeout(400);
        got = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => { const e = document.getElementById(id); return [id, e ? e.innerHTML : null]; })), pg.slots);
      } catch (e) { say(`${pg.file} did not draw (${String(e.message || e).split("\n")[0]}), left as it was`); }
      await ctx.close();
      if (!got) continue;
      if (errs.length) { say(`${pg.file} threw (${errs[0]}), left as it was`); continue; }
      let out = html, n = 0;
      const skipped = [];
      for (const [id, inner] of [...Object.entries(got), ...Object.entries(pg.fixed ? pg.fixed(r) : {})]) {
        if (inner == null || inner === "") { skipped.push(id); continue; }
        const next = setInner(out, id, inner);
        if (next == null) { skipped.push(id); continue; }
        out = next; n++;
      }
      out = describe(out, r, pg.file);
      out = out.replace("</head>", `<meta name="ohl-prerendered" content="${esc(r.at)}">\n</head>`);
      /* the script must come out untouched, or the file stays as it was */
      const a = html.slice(scriptStart(html)), z = out.slice(scriptStart(out));
      if (a !== z) { say(`${pg.file}: the script moved, left as it was`); continue; }
      await writeFile(file, out);
      done++;
      say(`${pg.file}: ${n} places written, ${Math.round((out.length - html.length) / 1024)} KB more${skipped.length ? `, skipped ${skipped.join(" ")}` : ""}`);
    }
  } catch (e) { say(`stopped (${String(e.message || e).split("\n")[0]}), the pages fill themselves in as before`); }
  finally { if (b) await b.close().catch(() => {}); srv.close(); }
  return done;
}

if (import.meta.url === `file://${process.argv[1]}`) { await prerender(process.argv[2] || "_site"); process.exit(0); }
