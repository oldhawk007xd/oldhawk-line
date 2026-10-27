/* Draws the share card that X and other sites show for the link: today's Line over its own sky.
   Runs in the deploy job, so the picture is never committed. Needs, installed with --no-save:
   @resvg/resvg-js, @expo-google-fonts/instrument-serif, @expo-google-fonts/jetbrains-mono.
   Usage: node scripts/card.mjs <out.png> [site address] */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const [out = "card.png", site = ""] = process.argv.slice(2);
const r = JSON.parse(await readFile(new URL("../data/latest.json", import.meta.url), "utf8"));
const reading = r.line != null ? { line: r.line, zone: r.zone, ghost: false } : r.lastGood ? { line: r.lastGood.line, zone: r.lastGood.zone, ghost: true } : null;
if (!reading || !reading.zone) { console.log("card: no reading yet, keeping the fixed picture"); process.exit(0); }

const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const FONTS = [
  path.join(pkgDir("@expo-google-fonts/instrument-serif"), "400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"),
  path.join(pkgDir("@expo-google-fonts/jetbrains-mono"), "400Regular/JetBrainsMono_400Regular.ttf"),
  path.join(pkgDir("@expo-google-fonts/jetbrains-mono"), "800ExtraBold/JetBrainsMono_800ExtraBold.ttf")
];
const { Resvg } = require("@resvg/resvg-js");

const L = reading.line, z = reading.zone;
const tone = L < 15 ? 0 : L < 30 ? 1 : L < 45 ? 2 : L < 60 ? 3 : L < 75 ? 4 : L < 90 ? 5 : 6;
/* the same skies as the site, one per hour */
const SKY = [
  [[0, "#010208"], [0.42, "#050816"], [0.74, "#0c1233"], [1, "#1a2350"]],
  [[0, "#02040f"], [0.45, "#081032"], [0.78, "#16205a"], [1, "#26306b"]],
  [[0, "#0b1236"], [0.45, "#2c2a6b"], [0.75, "#7a4a8c"], [1, "#c9707a"]],
  [[0, "#1b2f7a"], [0.40, "#4b5fc2"], [0.80, "#d98a6a"], [1, "#ffcf8a"]],
  [[0, "#1550b0"], [0.45, "#2f78d6"], [0.80, "#8fc1f2"], [1, "#ffeec4"]],
  [[0, "#ff7a3d"], [0.45, "#ffa233"], [0.75, "#ffcf6e"], [1, "#ffe9b8"]],
  [[0, "#ff4d5e"], [0.36, "#ff8a3d"], [0.70, "#ffb020"], [1, "#ffe3a3"]]
][tone];
const ZONE_INK = ["#4fd1ff", "#4fd1ff", "#ffd27a", "#14F195", "#9cc8ff", "#ffb27a", "#ff9a8a"][tone];
const H1 = ["It's midnight in memecoins.", "Still night in memecoins.", "Dawn is breaking in memecoins.", "The sun is on the Line.", "Morning in memecoins.", "Late morning in memecoins.", "High noon in memecoins."];
const headline = tone === 3 && r.season && r.season.on ? "Sunrise. The season is on." : H1[tone];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const usd = (n) => (n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${Math.round(n / 1e6)}M`);
const m = r.market || {};
const stats = [
  m.memeMC ? `Memes <tspan font-weight="800">${usd(m.memeMC)}</tspan>` : "",
  m.drawdown != null ? (m.drawdown >= 0 ? `<tspan font-weight="800">${Math.round(m.drawdown * 100)}%</tspan> below the last top` : `<tspan font-weight="800">${Math.round(-m.drawdown * 100)}%</tspan> above the last top`) : "",
  r.ladder ? `<tspan font-weight="800">${r.ladder.counts[0]}</tspan> runners from $10M` : ""
].filter(Boolean).join("  ·  ");
const when = new Date(r.lastGood && reading.ghost ? r.lastGood.at : r.at);
const stamp = `${when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, ${when.toISOString().slice(11, 16)} UTC`;
const host = site ? site.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "";

/* the sun: under the sea at 0, on the Line at 45, high at 100 */
const HZ = 430;
const sunY = L <= 45 ? HZ + (45 - L) * 2.2 : HZ - (L - 45) * 4.9;
const sunX = 985;
/* the number sits on the left margin; the hour and zone start right after its last digit */
const zx = 64 + String(L).length * 102 + 24;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${SKY.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.75"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff8e6"/><stop offset="0.55" stop-color="#ffe2a0"/><stop offset="0.85" stop-color="#ffb020"/><stop offset="1" stop-color="#ffb020" stop-opacity="0"/></radialGradient>
  <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040614" stop-opacity="0.78"/><stop offset="0.5" stop-color="#040614" stop-opacity="0.55"/><stop offset="0.72" stop-color="#040614" stop-opacity="0"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060918" stop-opacity="0.9"/><stop offset="1" stop-color="#02030a"/></linearGradient>
  <linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14F195" stop-opacity="0"/><stop offset="0.08" stop-color="#14F195"/><stop offset="0.92" stop-color="#14F195"/><stop offset="1" stop-color="#14F195" stop-opacity="0"/></linearGradient>
  <pattern id="road" width="8" height="9" patternUnits="userSpaceOnUse"><rect width="160" height="2" fill="#ffd68c" fill-opacity="0.7"/></pattern>
  <radialGradient id="roadMask" cx="0.5" cy="0" r="1"><stop offset="0.08" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="roadM"><rect x="${sunX - 85}" y="${HZ}" width="170" height="160" fill="url(#roadMask)"/></mask>
</defs>
<rect width="1200" height="${HZ}" fill="url(#sky)"/>
<circle cx="${sunX}" cy="${sunY}" r="330" fill="url(#glow)"/>
<circle cx="${sunX}" cy="${sunY}" r="78" fill="url(#sun)"/>
<rect width="1200" height="${HZ}" fill="url(#scrim)"/>
<rect y="${HZ}" width="1200" height="${630 - HZ}" fill="url(#sea)"/>
${sunY < HZ + 40 ? `<rect x="${sunX - 85}" y="${HZ + 2}" width="170" height="160" fill="url(#road)" mask="url(#roadM)"/>` : ""}
<rect y="${HZ - 1.5}" width="1200" height="3" fill="url(#line)"/>
<text x="72" y="84" font-family="JetBrains Mono" font-weight="800" font-size="19" letter-spacing="4" fill="#14F195">OLDHAWK LINE${reading.ghost ? " · LAST GOOD READING" : " · LIVE"}</text>
<text x="58" y="320" font-family="Instrument Serif" font-style="italic" font-size="220" fill="#ffffff">${L}</text>
<text x="${zx}" y="236" font-family="JetBrains Mono" font-weight="800" font-size="21" letter-spacing="3" fill="${ZONE_INK}">${esc(z.hour.toUpperCase())}</text>
<text x="${zx}" y="272" font-family="JetBrains Mono" font-size="21" letter-spacing="3" fill="#ededed">${esc(z.name.toUpperCase())}</text>
<text x="${zx}" y="318" font-family="JetBrains Mono" font-size="26" fill="#c9cfdc">/ 100</text>
<text x="72" y="396" font-family="Instrument Serif" font-style="italic" font-size="56" fill="#ffffff">${esc(headline)}</text>
<text x="72" y="488" font-family="JetBrains Mono" font-size="21" fill="#c9cfdc">Season starts when the sun crosses the Line at 45.</text>
${stats ? `<text x="72" y="528" font-family="JetBrains Mono" font-size="21" fill="#ededed">${stats}</text>` : ""}
<text x="72" y="594" font-family="JetBrains Mono" font-size="17" fill="#a3abc0">${esc(stamp)}</text>
<text x="1128" y="594" text-anchor="end" font-family="JetBrains Mono" font-size="17" fill="#a3abc0">${esc([host, "@oldhawksol"].filter(Boolean).join("  ·  "))}</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "JetBrains Mono" } }).render().asPng();
await writeFile(out, png);
console.log(`card: ${out}, Line ${L}, ${z.hour}, ${png.length} bytes`);
