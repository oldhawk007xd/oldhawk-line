/* Adds the days before the site went live to data/memecap.json, from a basket file written by
   scripts/memecap-backfill.mjs, and keeps every live day already in the record.
   Usage: node scripts/memecap-basket.mjs <basket.json> */
import { readFile, writeFile } from "node:fs/promises";
import { buildMemecap } from "../lib/memecap.mjs";
const [file = "basket.json"] = process.argv.slice(2);
const basket = JSON.parse(await readFile(file, "utf8"));
let current = null;
try { current = JSON.parse(await readFile("data/memecap.json", "utf8")); } catch { current = null; }
/* the live days stand as they are: their open, high, low and close come from every update of that day */
const liveDays = current && Array.isArray(current.days) ? current.days.filter((r) => r[5] === 0) : [];
const points = liveDays.map((r) => [`${r[0]}T23:59:59.000Z`, r[4] * 1e9]);
const built = buildMemecap({ charts: basket.charts, coins: basket.coins, category: basket.category, live: points, basketAt: basket.at, at: current && current.at });
const out = { ...built, live: current && current.live ? current.live : built.live, days: built.days.filter((r) => r[5] === 1).concat(liveDays) };
await writeFile("data/memecap.json", JSON.stringify(out) + "\n");
console.log(`memecap: ${out.days.length} days, ${out.days.filter((r) => r[5] === 1).length} from the basket of ${out.basket.answered} coins, scale ${out.basket.scale}, within ${(out.basket.check.max * 100).toFixed(2)}% on ${out.basket.check.days} shared days`);
