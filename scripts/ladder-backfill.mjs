/* Seeds data/ladder.json from the readings this repository has already published: for every UTC day from the
   start date on, the last data/latest.json committed that day is fed to lib/ladder.mjs in order, exactly as the
   update job does from then on. Nothing comes from outside: every close it writes is a reading that was public
   the day it was taken (the commits are the proof).

   The start date is 31 Oct 2026, the first day after the rules for which coins count last changed, so that no
   coin joins or falls off because a rule moved.

   One-off, needs the full git history (not a shallow clone):
     node scripts/ladder-backfill.mjs [first day, default 2026-10-31] */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { ladderStep } from "../lib/ladder.mjs";

const FROM = process.argv[2] || "2026-10-31";
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const lastOfDay = new Map();
for (const line of git("log", "--format=%H %aI", "--", "data/latest.json").trim().split("\n")) {
  const [hash, at] = line.split(" "), d = new Date(at).toISOString().slice(0, 10);
  if (d >= FROM && !lastOfDay.has(d)) lastOfDay.set(d, hash);
}
let file = null, taken = 0, skipped = 0;
for (const d of [...lastOfDay.keys()].sort()) {
  let reading = null;
  try { reading = JSON.parse(git("show", `${lastOfDay.get(d)}:data/latest.json`)); } catch { /* not a reading */ }
  const next = reading ? ladderStep(file, reading) : file;
  if (next && next !== file) taken++; else skipped++;
  file = next;
}
if (!file) { console.log("ladder backfill: no reading found, nothing written"); process.exit(0); }
await writeFile(new URL("../data/ladder.json", import.meta.url), JSON.stringify(file) + "\n");
const o = file.out, w = o.week;
console.log(`ladder backfill: ${taken} closes from ${file.since} (${skipped} skipped), ${Object.keys(file.coins).length} coins, ${file.moves.length} floor changes`);
if (w) console.log(`week ${w.from} to ${w.to}: ${w.up.length} up, ${w.down.length} down, ${w.joined.length} joined, ${w.left.length} fell off; base ${JSON.stringify(o.base)}; climbs ${o.climbCount}`);
