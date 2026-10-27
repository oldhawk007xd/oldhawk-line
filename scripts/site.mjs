/* Builds the folder GitHub Pages publishes: the page, the data files and the share image
   (today's card.png from scripts/card.mjs when it was drawn, else the fixed og.jpg).
   It fills in what only the live address knows: the repository link, the absolute share image
   and the canonical address, plus robots.txt and sitemap.xml.
   Usage: node scripts/site.mjs <out dir> <owner/repo> <site address> */
import { readFile, writeFile, mkdir, copyFile, readdir } from "node:fs/promises";

const [out = "_site", repo = "", baseIn = ""] = process.argv.slice(2);
const base = baseIn.replace(/\/+$/, "");
await mkdir(`${out}/data`, { recursive: true });
let html = await readFile("index.html", "utf8");

const setMeta = (name, value) => {
  html = html.replace(new RegExp(`(<meta name="${name}" content=")([^"]*)(")`), (m, a, v, c) => (v ? m : a + value + c));
};
if (repo) setMeta("ohl-repo", `https://github.com/${repo}`);
/* today's card, versioned by the reading time so X and others fetch the new one */
let card = false;
try { await copyFile("card.png", `${out}/card.png`); card = true; } catch { card = false; }
if (card) {
  let v = "";
  try { v = String(JSON.parse(await readFile("data/latest.json", "utf8")).at || "").replace(/\D/g, "").slice(0, 12); } catch { v = ""; }
  html = html.replace(/(<meta (?:property|name)="(?:og:image|twitter:image)" content=")og\.jpg(")/g, `$1card.png${v ? `?v=${v}` : ""}$2`);
}
if (base) {
  const abs = (v) => (/^https?:\/\//.test(v) ? v : `${base}/${v.replace(/^\.?\//, "")}`);
  html = html.replace(/(<meta (?:property|name)="(?:og:image|twitter:image)" content=")([^"]*)(")/g, (m, a, v, c) => a + abs(v) + c);
  if (!/property="og:url"/.test(html)) html = html.replace(/(<meta property="og:type"[^>]*>)/, `$1\n<meta property="og:url" content="${base}/">\n<link rel="canonical" href="${base}/">`);
}

await writeFile(`${out}/index.html`, html);
for (const f of ["og.jpg", "apple-touch-icon.png"]) { try { await copyFile(f, `${out}/${f}`); } catch { console.log(`site: ${f} missing`); } }
for (const f of await readdir("data")) if (f.endsWith(".json")) await copyFile(`data/${f}`, `${out}/data/${f}`);
await writeFile(`${out}/robots.txt`, `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ""}`);
if (base) await writeFile(`${out}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc><changefreq>hourly</changefreq></url></urlset>\n`);
console.log(`site: ${out} ready${base ? ` for ${base}` : ""}${repo ? `, repo ${repo}` : ""}, share image ${card ? "card.png" : "og.jpg"}`);
