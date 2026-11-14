/* Draws the share card that X and other sites show for the link: today's Line as the site's first screen.
   One night sky whose hour follows the reading (22:00 at 0, dawn 06:30 at 100), one star for every memecoin above
   $10M (the same places as the star map on the site), and on the horizon the Line as a fuse: lit from 0 to the
   reading, the gate at 45, the six season checks as lamps. The whole horizon lights only when the Season Flag is on.
   Runs in the deploy job, so the picture is never committed. Needs, installed with --no-save:
   @resvg/resvg-js, @expo-google-fonts/ibm-plex-sans, @expo-google-fonts/ibm-plex-mono.
   Usage: node scripts/card.mjs <out.png> [site address] [reading file, default data/latest.json] */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const [out = "card.png", site = "", dataFile = ""] = process.argv.slice(2);
const r = JSON.parse(await readFile(dataFile || new URL("../data/latest.json", import.meta.url), "utf8"));
const reading = r.line != null ? { line: r.line, zone: r.zone, ghost: false } : r.lastGood ? { line: r.lastGood.line, zone: r.lastGood.zone, ghost: true } : null;
if (!reading || !reading.zone) { console.log("card: no reading yet, keeping the fixed picture"); process.exit(0); }

const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const SANS = pkgDir("@expo-google-fonts/ibm-plex-sans"), MONO = pkgDir("@expo-google-fonts/ibm-plex-mono");
const FONTS = [
  path.join(SANS, "400Regular/IBMPlexSans_400Regular.ttf"),
  path.join(SANS, "600SemiBold/IBMPlexSans_600SemiBold.ttf"),
  path.join(SANS, "700Bold/IBMPlexSans_700Bold.ttf"),
  path.join(MONO, "500Medium/IBMPlexMono_500Medium.ttf"),
  path.join(MONO, "600SemiBold/IBMPlexMono_600SemiBold.ttf")
];
const { Resvg } = require("@resvg/resvg-js");

const W = 1200, H = 630, HZ = 452;
const L = reading.line, z = reading.zone;
const tone = L < 15 ? 0 : L < 30 ? 1 : L < 45 ? 2 : L < 60 ? 3 : L < 75 ? 4 : L < 90 ? 5 : 6;
const zoneNow = (Array.isArray(r.zones) && r.zones.find((q) => L >= q.from && L < q.to)) || (Array.isArray(r.zones) && L >= 100 ? r.zones[r.zones.length - 1] : null) || z;
const ZONE_INK = ["#4fd1ff", "#4fd1ff", "#ffd27a", "#14F195", "#9cc8ff", "#ffb27a", "#ff9a8a"][tone];
const H1 = ["Late evening in memecoins.", "Midnight in memecoins.", "The small hours in memecoins.", "First light on the Line.", "Before dawn in memecoins.", "Blue hour in memecoins.", "Dawn in memecoins."];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const usd = (n) => (n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${Math.round(n / 1e6)}M`);
const f1 = (n) => Number(n).toFixed(1);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (t) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => `#${c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
/* the hour of the sky, the same clock as the site: 22:00 at 0, 06:30 at 100 */
const clock = (() => { const m = (22 * 60 + Math.round(L * 5.1)) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; })();

/* the sky, top to horizon, at five readings; any reading sits between two of them */
const KEYS = [
  [0, ["#03050d", "#070b1d", "#0e1531", "#1a2344"]],
  [45, ["#040717", "#0a112e", "#18224e", "#2e3965"]],
  [62, ["#0a1030", "#1c2456", "#47427c", "#8a6a8e"]],
  [80, ["#16204e", "#3a3c7c", "#9a6f92", "#e0a08a"]],
  [100, ["#3b4f8e", "#7e7fae", "#d7a3a6", "#f6cfa6"]]
];
const ki = Math.max(0, KEYS.findIndex(([v]) => L <= v) - 1), ka = KEYS[ki], kb = KEYS[Math.min(KEYS.length - 1, ki + 1)];
const kt = kb[0] === ka[0] ? 0 : clamp((L - ka[0]) / (kb[0] - ka[0]));
const SKY = ka[1].map((c, i) => mix(c, kb[1][i], kt));
const dawn = smooth((L - 45) / 55);          /* 0 through the night, 1 at dawn */
const starFade = 1 - 0.86 * smooth((L - 50) / 50);

/* the stars: a fixed field of faint ones, and one for every runner above $10M, placed as on the site's star map */
const rnd = ((s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20241209);
let field = "";
for (let i = 0; i < 190; i++) {
  const x = rnd() * W, y = rnd() * (HZ - 26), rr = 0.45 + rnd() * 0.75, o = (0.18 + rnd() * 0.6) * starFade, c = ["#ffffff", "#dfe6ff", "#fff1dc"][Math.floor(rnd() * 3)];
  field += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr.toFixed(2)}" fill="${c}" fill-opacity="${o.toFixed(2)}"/>`;
}
const STAR_TINT = { sol: "#d2c4ff", base: "#b9d2ff", bsc: "#ffe7b5", hood: "#c9f5d9" };
const runners = r.ladder && Array.isArray(r.ladder.runners) ? r.ladder.runners.filter((q) => q && q.s && q.m >= 1e7) : [];
const fresh = new Set((r.ladder && Array.isArray(r.ladder.newWeek) ? r.ladder.newWeek : []).map((q) => `${q.s}|${q.c}`));
const SX0 = 640, SX1 = 1136, STOP = 74, SBOT = HZ - 58;
const hsh = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
const lo = 7, hi = runners.length ? Math.max(10.3, Math.log10(runners[0].m) + 0.14) : 10.3;
const yOf = (m) => SBOT - (Math.log10(m) - lo) / (hi - lo) * (SBOT - STOP);
/* words on the sky and the sea keep a dark edge, so they read over the moon's light */
const T = (x, y, body, attr) => `<text x="${f1(x)}" y="${f1(y)}" ${attr} filter="url(#halo)">${body}</text>`;
const MONO_S = 'font-family="IBM Plex Mono" font-weight="500"', MONO_B = 'font-family="IBM Plex Mono" font-weight="600"';
let alt = "", stars = "", names = "";
if (runners.length) {
  for (const [m, lab] of [[1e7, "$10M"], [1e8, "$100M"], [1e9, "$1B"], [1e10, "$10B"]]) {
    alt += `<line x1="${SX0 - 14}" y1="${f1(yOf(m))}" x2="${SX1 - 46}" y2="${f1(yOf(m))}" stroke="#ffffff" stroke-opacity="${(0.10 * starFade + 0.04).toFixed(2)}" stroke-dasharray="2 7"/>`;
    alt += `<text x="${SX1}" y="${f1(yOf(m) + 4)}" text-anchor="end" ${MONO_S} font-size="11.5" fill="#ffffff" fill-opacity="${(0.42 * starFade + 0.2).toFixed(2)}">${lab}</text>`;
  }
  const placed = [];
  runners.forEach((q, i) => {
    const x = SX0 + (SX1 - SX0 - 60) * hsh(`${q.s}${q.n || ""}${q.c || ""}`), y = yOf(q.m), k = Math.max(0, Math.log10(q.m) - 7), rr = 1.15 + k * 1.25, c = STAR_TINT[q.c] || "#ffffff";
    stars += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + rr * 3.2)}" fill="url(#sg-${STAR_TINT[q.c] ? q.c : "w"})" opacity="${(0.75 * starFade).toFixed(2)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${rr.toFixed(2)}" fill="${mix(c, "#ffffff", 0.55)}" fill-opacity="${(0.35 + 0.65 * starFade).toFixed(2)}"/>`;
    if (fresh.has(`${q.s}|${q.c}`)) stars += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr + 5.5)}" fill="none" stroke="#14F195" stroke-opacity="0.9" stroke-width="1.2"/>`;
    if (i < 9 && /^[\x20-\x7e]+$/.test(q.s)) {
      const off = 7 + rr, w = (q.s.length + 1 + usd(q.m).length) * 7.9 + 4, left = x + off + w > SX1 - 50;
      const b = left ? [x - off - w, y - 9, x - off, y + 9] : [x + off, y - 9, x + off + w, y + 9];
      if (b[0] >= SX0 - 60 && !placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1])) {
        placed.push(b);
        names += T(left ? x - off : x + off, y + 4.5, `${esc(q.s)}<tspan dx="7" fill="#aab3c8">${usd(q.m)}</tspan>`, `${left ? 'text-anchor="end" ' : ""}${MONO_S} font-size="13" fill="#eef1f8" fill-opacity="${(0.55 + 0.45 * starFade).toFixed(2)}"`);
      }
    }
  });
}
const nStars = runners.length || (r.ladder && Array.isArray(r.ladder.tiers) && r.ladder.tiers[0] ? r.ladder.tiers[0].count : 0);
const flagOn = Boolean(r.season && r.season.on) && !reading.ghost;
const headline = nStars ? `${nStars} stars tonight.` : tone === 3 && flagOn ? "First light. The season is on." : H1[tone];

/* the moon climbs with the reading and pales toward dawn */
const MX = 608, MY = 152 - L * 0.5, MR = 27, moonA = 1 - 0.55 * dawn;

let glints = "";
for (let i = 0; i < 120; i++) {
  const t = Math.pow(rnd(), 1.5), y = HZ + 3 + t * 168, half = 10 + t * 92, w = (4 + rnd() * 22) * (0.5 + t), x = MX + (rnd() + rnd() - 1) * half - w / 2;
  glints += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${(0.9 + t * 0.9).toFixed(1)}" rx="0.6" fill="#e9eeff" fill-opacity="${((0.2 + rnd() * 0.55) * (1 - t * 0.72)).toFixed(2)}"/>`;
}

/* the Line on the horizon: a fuse from 0 to the gate at 45, then the six season checks */
const X0 = 560, XE = 1128, XG = X0 + (XE - X0) * 0.58, XF = X0 + clamp(L, 0, 45) / 45 * (XG - X0), over = L >= 45;
const S = r.boards && r.boards.season && Array.isArray(r.boards.season.items) && r.boards.season.items.length > 1 && !reading.ghost ? r.boards.season : null;
const LA = XG + 86, LB = XE - 6;
let fuse = "";
if (flagOn) {
  fuse += `<line x1="0" y1="${HZ}" x2="${W}" y2="${HZ}" stroke="#14F195" stroke-width="9" stroke-opacity="0.75" filter="url(#blur5)"/><line x1="0" y1="${HZ}" x2="${W}" y2="${HZ}" stroke="#9dffd2" stroke-width="2.4"/>`;
} else {
  fuse += `<rect x="0" y="${HZ - 0.6}" width="${X0}" height="1.2" fill="url(#baseL)"/><line x1="${X0}" y1="${HZ}" x2="${f1(XG)}" y2="${HZ}" stroke="#cfd8ee" stroke-opacity="0.44" stroke-width="1.3"/><rect x="${f1(XG)}" y="${HZ - 0.6}" width="${f1(W - XG)}" height="1.2" fill="url(#baseR)"/>`;
  if (XF > X0 + 0.5) fuse += `<line x1="${X0}" y1="${HZ}" x2="${f1(XF)}" y2="${HZ}" stroke="#14F195" stroke-width="8" stroke-opacity="0.8" filter="url(#blur5)"/><line x1="${X0}" y1="${HZ}" x2="${f1(XF)}" y2="${HZ}" stroke="#7dffc8" stroke-width="2.4" stroke-linecap="round"/>`;
  if (!over) fuse += `<circle cx="${f1(XF)}" cy="${HZ}" r="22" fill="url(#spark)"/><circle cx="${f1(XF)}" cy="${HZ}" r="4" fill="#ffffff"/>`;
}
for (const v of [0, 15, 30]) {
  const x = X0 + v / 45 * (XG - X0);
  if (v) fuse += `<line x1="${f1(x)}" y1="${HZ - 6}" x2="${f1(x)}" y2="${HZ + 6}" stroke="#e1e8f6" stroke-opacity="0.62"/>`;
  fuse += T(x, HZ + 24, String(v), `text-anchor="middle" ${MONO_S} font-size="12" fill="#c5cde0"`);
}
const nowTag = reading.ghost ? "LAST" : "NOW";
if (over) fuse += T(XG - 78, HZ - 20, `${nowTag}<tspan dx="8" font-size="21" ${MONO_B} fill="#ffffff">${L}</tspan>`, `text-anchor="end" ${MONO_B} font-size="13" letter-spacing="1.3" fill="#f4f7fc"`);
else {
  fuse += T(XF - 5, HZ - 20, `${nowTag}<tspan dx="8" font-size="21" ${MONO_B} fill="#ffffff">${L}</tspan>`, `${MONO_B} font-size="13" letter-spacing="1.3" fill="#f4f7fc"`);
  const a = XF - 5 + 40 + String(L).length * 13 + 16, b = XG - 76, gw = `${45 - L} TO THE LINE`.length * 8.4;
  if (b - a >= gw) fuse += T((a + b) / 2, HZ - 14, `${45 - L} TO THE LINE`, `text-anchor="middle" ${MONO_B} font-size="12.5" letter-spacing="1.1" fill="#3dffaa"`);
}
fuse += over || flagOn
  ? `<rect x="${f1(XG - 66)}" y="${HZ - 15}" width="132" height="30" rx="15" fill="#14F195"/><text x="${f1(XG)}" y="${HZ + 4.6}" text-anchor="middle" font-family="IBM Plex Sans" font-weight="700" font-size="12.5" letter-spacing="2.2" fill="#06130d">THE LINE 45</text>`
  : `<rect x="${f1(XG - 66)}" y="${HZ - 15}" width="132" height="30" rx="15" fill="#080e16" fill-opacity="0.92" stroke="#14F195" stroke-opacity="0.8" stroke-width="1.2"/><text x="${f1(XG)}" y="${HZ + 4.6}" text-anchor="middle" font-family="IBM Plex Sans" font-weight="700" font-size="12.5" letter-spacing="2.2" fill="#3dffaa">THE LINE 45</text>`;
let hits = 0;
if (S) {
  const n = S.items.length, step = (LB - LA) / (n - 1);
  S.items.forEach((it, i) => {
    const x = LA + i * step, on = Boolean(it.hit);
    if (on) hits++;
    fuse += on
      ? `<circle cx="${f1(x)}" cy="${HZ}" r="13" fill="url(#spark)"/><circle cx="${f1(x)}" cy="${HZ}" r="5.6" fill="#14F195"/>`
      : `<circle cx="${f1(x)}" cy="${HZ}" r="5.2" fill="#0a0f1c" stroke="#e6ecf8" stroke-opacity="0.66" stroke-width="1.4"/>`;
    if (it.id === "S6") fuse += `<circle cx="${f1(x)}" cy="${HZ}" r="10" fill="none" stroke="${on ? "#14F195" : "#e6ecf8"}" stroke-opacity="${on ? 1 : 0.6}" stroke-width="1" stroke-dasharray="2.2 2.6"/>`;
    fuse += T(x, HZ + 24, esc(it.id), `text-anchor="middle" ${on ? MONO_B : MONO_S} font-size="12" fill="${on ? "#3dffaa" : "#c5cde0"}"`);
  });
  fuse += T(LB + 6, HZ - 20, `SEASON CHECKS ${hits} OF ${n}`, `text-anchor="end" ${MONO_B} font-size="13" letter-spacing="1.3" fill="#f4f7fc"`);
}

const m = r.market || {};
/* the facts sit apart by a gap, no separator marks */
const stats = [
  m.memeMC ? `Memes <tspan font-weight="700">${usd(m.memeMC)}</tspan>` : "",
  m.drawdown != null ? (Math.round(Math.abs(m.drawdown) * 100) === 0 ? `At the <tspan font-weight="700">last top</tspan>` : m.drawdown >= 0 ? `<tspan font-weight="700">${Math.round(m.drawdown * 100)}%</tspan> below the last top` : `<tspan font-weight="700">${Math.round(-m.drawdown * 100)}%</tspan> above the last top`) : "",
  S ? `Season flag <tspan font-weight="700" fill="${flagOn ? "#3dffaa" : "#ff9c9c"}">${flagOn ? "on" : "off"}</tspan>` : ""
].filter(Boolean).map((x, i) => (i ? `<tspan dx="34">${x}</tspan>` : x)).join("");
const when = new Date(r.lastGood && reading.ghost ? r.lastGood.at : r.at);
const stamp = `${when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, ${when.toISOString().slice(11, 16)} UTC`;
const host = site ? site.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "";
/* the number sits on the left margin (IBM Plex Mono, every digit 0.6 em wide); the hour and zone start right after its last digit */
const zx = 66 + String(L).length * 120 + 30;
const seaTop = mix(SKY[3], "#04060f", 0.42 - 0.12 * dawn), seaBot = mix(SKY[3], "#02030a", 0.9 - 0.25 * dawn);
const cloud = mix(SKY[3], "#ffffff", 0.35);
const rule = zoneNow && zoneNow.spot ? `The rules say: <tspan font-weight="700" fill="#ffffff">${esc(zoneNow.spot)}</tspan>` : "Season starts when the reading crosses the Line at 45.";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${[0, 0.45, 0.8, 1].map((o, i) => `<stop offset="${o}" stop-color="${SKY[i]}"/>`).join("")}</linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${seaTop}"/><stop offset="1" stop-color="${seaBot}"/></linearGradient>
  <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040614" stop-opacity="${(0.5 + 0.3 * dawn).toFixed(2)}"/><stop offset="0.36" stop-color="#040614" stop-opacity="${(0.3 + 0.3 * dawn).toFixed(2)}"/><stop offset="0.6" stop-color="#040614" stop-opacity="0"/></linearGradient>
  <linearGradient id="seaScrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040b" stop-opacity="0"/><stop offset="0.3" stop-color="#03040b" stop-opacity="${(0.5 + 0.25 * dawn).toFixed(2)}"/><stop offset="1" stop-color="#03040b" stop-opacity="${(0.72 + 0.2 * dawn).toFixed(2)}"/></linearGradient>
  <radialGradient id="moonGlow"><stop offset="0" stop-color="#dfe7ff" stop-opacity="0.5"/><stop offset="0.28" stop-color="#b9c6f2" stop-opacity="0.17"/><stop offset="1" stop-color="#b9c6f2" stop-opacity="0"/></radialGradient>
  <radialGradient id="moon" cx="0.42" cy="0.4" r="0.66"><stop offset="0" stop-color="#ffffff"/><stop offset="0.75" stop-color="#f6f8fd"/><stop offset="1" stop-color="#e3e8f3"/></radialGradient>
  <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter>
  <radialGradient id="spark"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.3" stop-color="#7dffc8" stop-opacity="0.55"/><stop offset="1" stop-color="#14F195" stop-opacity="0"/></radialGradient>
  <radialGradient id="dawn" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="#ffe2b8" stop-opacity="0.85"/><stop offset="0.45" stop-color="#ffb9a0" stop-opacity="0.3"/><stop offset="1" stop-color="#ffb9a0" stop-opacity="0"/></radialGradient>
  <linearGradient id="baseL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfd8ee" stop-opacity="0"/><stop offset="1" stop-color="#cfd8ee" stop-opacity="0.32"/></linearGradient>
  <linearGradient id="baseR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfd8ee" stop-opacity="0.32"/><stop offset="1" stop-color="#cfd8ee" stop-opacity="0"/></linearGradient>
  <filter id="blur5" x="-10%" y="-600%" width="120%" height="1300%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur16" x="-30%" y="-300%" width="160%" height="700%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="halo" x="-15%" y="-60%" width="130%" height="220%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="d"/><feGaussianBlur in="d" stdDeviation="2.4" result="b"/><feFlood flood-color="#04060f" flood-opacity="0.9"/><feComposite in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.7"/></filter>
  ${[["w", "#ffffff"], ...Object.entries(STAR_TINT)].map(([k, c]) => `<radialGradient id="sg-${k}"><stop offset="0" stop-color="${c}" stop-opacity="0.55"/><stop offset="0.35" stop-color="${c}" stop-opacity="0.16"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join("")}
  <clipPath id="moonClip"><circle cx="${MX}" cy="${f1(MY)}" r="${MR}"/></clipPath>
  <pattern id="ripple" width="${W}" height="7" patternUnits="userSpaceOnUse"><rect y="3" width="${W}" height="1" fill="#ffffff" fill-opacity="0.035"/></pattern>
</defs>
<rect width="${W}" height="${HZ}" fill="url(#sky)"/>
${dawn > 0.02 ? `<ellipse cx="830" cy="${HZ}" rx="760" ry="260" fill="url(#dawn)" opacity="${(dawn * 0.9).toFixed(2)}"/>` : ""}
${field}
<g filter="url(#blur16)" opacity="${(0.1 + 0.1 * dawn).toFixed(2)}"><ellipse cx="300" cy="${HZ - 44}" rx="270" ry="13" fill="${cloud}"/><ellipse cx="840" cy="${HZ - 78}" rx="310" ry="11" fill="${cloud}"/><ellipse cx="1090" cy="${HZ - 30}" rx="190" ry="10" fill="${cloud}"/></g>
<circle cx="${MX}" cy="${f1(MY)}" r="170" fill="url(#moonGlow)" opacity="${moonA.toFixed(2)}"/>
<g opacity="${(0.55 + 0.45 * moonA).toFixed(2)}"><circle cx="${MX}" cy="${f1(MY)}" r="${MR}" fill="url(#moon)" filter="url(#soft)"/><g clip-path="url(#moonClip)" filter="url(#blur3)" fill="#7f8aa6" fill-opacity="0.2"><ellipse cx="${MX - 8}" cy="${f1(MY - 7)}" rx="9" ry="7"/><ellipse cx="${MX + 7}" cy="${f1(MY + 4)}" rx="7" ry="9"/><ellipse cx="${MX - 5}" cy="${f1(MY + 12)}" rx="8" ry="5"/></g></g>
${alt}${stars}
<rect width="${W}" height="${HZ}" fill="url(#scrim)"/>
${names}
<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#sea)"/>
<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#ripple)"/>
<g opacity="${moonA.toFixed(2)}"><ellipse cx="${MX}" cy="${HZ + 4}" rx="150" ry="70" fill="url(#moonGlow)" opacity="0.5"/>${glints}</g>
<rect y="${HZ + 34}" width="${W}" height="${H - HZ - 34}" fill="url(#seaScrim)"/>
${fuse}
<text x="72" y="84" font-family="IBM Plex Sans" font-weight="700" font-size="19" letter-spacing="4" fill="#14F195">OLDHAWK LINE<tspan dx="22">${reading.ghost ? "LAST GOOD READING" : "LIVE"}</tspan></text>
<text x="62" y="304" font-family="IBM Plex Mono" font-weight="500" font-size="200" fill="#ffffff">${L}</text>
<text x="${zx}" y="220" font-family="IBM Plex Sans" font-weight="700" font-size="21" letter-spacing="3" fill="${ZONE_INK}">${esc(z.hour.toUpperCase())}<tspan dx="12" font-family="IBM Plex Mono" font-weight="600">${clock}</tspan></text>
<text x="${zx}" y="256" font-family="IBM Plex Sans" font-size="21" letter-spacing="3" fill="#ededed">${esc(z.name.toUpperCase())}</text>
<text x="${zx}" y="302" font-family="IBM Plex Mono" font-weight="500" font-size="26" fill="#c9cfdc">/ 100</text>
<text x="72" y="378" font-family="IBM Plex Sans" font-weight="600" font-size="50" letter-spacing="-1" fill="#ffffff">${esc(headline)}</text>
${nStars ? `<text x="72" y="414" font-family="IBM Plex Sans" font-size="20" fill="#c9cfdc">One star for every memecoin above $10M.</text>` : ""}
<text x="72" y="528" font-family="IBM Plex Sans" font-size="23" fill="#d5dae6">${rule}</text>
${stats ? `<text x="72" y="562" font-family="IBM Plex Sans" font-size="21" fill="#d5dae6">${stats}</text>` : ""}
<text x="72" y="604" font-family="IBM Plex Sans" font-size="17" fill="#a3abc0">${esc(stamp)}</text>
<text x="1128" y="604" text-anchor="end" font-family="IBM Plex Sans" font-size="17" fill="#a3abc0">${[host, "@oldhawksol"].filter(Boolean).map((x, i) => (i ? `<tspan dx="26">${esc(x)}</tspan>` : esc(x))).join("")}</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "IBM Plex Sans" } }).render().asPng();
await writeFile(out, png);
console.log(`card: ${out}, Line ${L}, ${z.hour}, ${png.length} bytes`);
