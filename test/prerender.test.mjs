/* The reading written into the published pages (scripts/prerender.mjs): it only ever writes into the markup
   before the page's script, it notes what each place held so the page's code can put it back, and the share
   text leads with the reading and its time. The drawing itself runs in Chrome in the deploy job. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setInner, scriptStart, describe, stamp, PAGES } from "../scripts/prerender.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };

const page = `<head><meta name="description" content="The cycle as a sky."><meta property="og:description" content="A live index."></head>
<body><div id="num">0</div><p id="lead">Wait <b>here</b></p><div id="box"><div class="in"><div>deep</div></div></div><span id="late"></span>
<script data-dial>var x = 1;</script>
<script>const t = \`<div id="num">\${n}</div><div id="ghost"></div>\`;</script></body>`;

check("the time is written out in UTC", () => assert.equal(stamp("2026-11-11T08:30:50.495Z"), "11 Nov 2026, 08:30 UTC"));
check("a place gets the reading and keeps a note of what it held", () => {
  const out = setInner(page, "num", "3");
  assert.ok(out.includes('<div id="num" data-pre="0">3</div>'));
  assert.equal(setInner(page, "lead", "x").includes('<p id="lead" data-pre="Wait &lt;b&gt;here&lt;/b&gt;">x</p>'), true);
});
check("nested tags of the same name are passed over to the real closing tag", () => {
  const out = setInner(page, "box", "<i>new</i>");
  assert.ok(out.includes('<div id="box" data-pre="&lt;div class=&quot;in&quot;&gt;&lt;div&gt;deep&lt;/div&gt;&lt;/div&gt;"><i>new</i></div><span id="late">'));
});
check("an id that lives only inside the script is never written", () => {
  assert.equal(setInner(page, "ghost", "x"), null);
  assert.equal(setInner(page, "nothere", "x"), null);
});
check("the script comes out byte for byte the same", () => {
  let out = page;
  for (const [id, v] of [["num", "3"], ["lead", "<b>a</b>"], ["box", "y"], ["late", "z"]]) out = setInner(out, id, v);
  assert.equal(out.slice(scriptStart(out)), page.slice(scriptStart(page)));
  assert.ok(page.slice(scriptStart(page)).startsWith("<script>const t"));
});
check("writing twice keeps the first note", () => {
  const twice = setInner(setInner(page, "num", "3"), "num", "4");
  assert.ok(twice.includes('<div id="num" data-pre="0">4</div>'));
});
check("the share text leads with the reading and its time, once", () => {
  const r = { at: "2026-11-11T08:30:50.495Z", line: 3, zone: { name: "Deep Winter" } };
  const out = describe(page, r, "index.html");
  assert.ok(out.includes('<meta name="description" content="Reading of 11 Nov 2026, 08:30 UTC: the Line is 3 of 100, Deep Winter. The cycle as a sky.">'));
  assert.ok(out.includes('<meta property="og:description" content="Reading of 11 Nov 2026, 08:30 UTC: the Line is 3 of 100, Deep Winter. A live index.">'));
  assert.equal(describe(out, r, "index.html"), out);
  assert.equal(describe(page, { ...r, line: null }, "index.html"), page);
  assert.equal(describe(page, r, "kols.html"), page);
});

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const kols = await readFile(new URL("../kols.html", import.meta.url), "utf8");
const record = await readFile(new URL("../record.html", import.meta.url), "utf8");
check("every place named for the pages is in their markup, before the script", () => {
  assert.deepEqual(PAGES.map((pg) => pg.file), ["index.html", "kols.html", "record.html"]);
  for (const pg of PAGES) {
    const html = { "index.html": index, "kols.html": kols, "record.html": record }[pg.file];
    for (const id of [...pg.slots, ...Object.keys(pg.fixed({ at: "2026-11-11T08:30:00Z", kols: { people: [] } }))]) assert.notEqual(setInner(html, id, "x"), null, `${pg.file} #${id}`);
  }
});
check("every page puts back what it held before it draws", () => {
  for (const html of [index, kols, record]) { assert.ok(html.includes("const unpre = ")); assert.ok(/\n\s+unpre\(\);\n/.test(html)); }
  assert.ok(index.includes("<script data-dial>"));
});
check("no dashes or middle dots in what the file is given", () => {
  const r = { at: "2026-11-11T08:30:50.495Z", line: 3, zone: { name: "Deep Winter" }, kols: { people: [1, 2] } };
  const text = PAGES.map((pg) => Object.values(pg.fixed(r)).join(" ")).join(" ") + describe(page, r, "index.html");
  assert.ok(!/[–—·]/.test(text));
});

for (const [s, n, m] of results) console.log(`${s.padEnd(4)} ${n}${m ? "  >> " + m : ""}`);
process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
