/* One year of daily market caps for the biggest coins of the CoinGecko Meme category, and the category total now.
   Usage: node scripts/memecap-backfill.mjs <out.json> [coins=250]. Needs COINGECKO_DEMO_KEY for the pace. */
import { writeFile } from "node:fs/promises";
import { basketCharts } from "../lib/engine.mjs";
const [out = "basket.json", nArg = "250"] = process.argv.slice(2);
const N = Math.max(10, Math.min(250, Number(nArg) || 250));
const key = process.env.COINGECKO_DEMO_KEY || "";
const H = key ? { "x-cg-demo-api-key": key } : {};
const BASE = "https://api.coingecko.com/api/v3";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (p) => {
  for (let i = 0; i < 5; i++) {
    try { const r = await fetch(BASE + p, { headers: H }); if (r.ok) return await r.json(); console.log(p, r.status); } catch (e) { console.log(p, e.message); }
    await sleep(20000);
  }
  throw new Error(`CoinGecko did not answer ${p}`);
};
const cats = await get("/coins/categories");
const meme = cats.find((c) => c && c.id === "meme-token");
await sleep(2500);
const page = await get(`/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=1`);
const top = page.filter((c) => c && c.market_cap > 0).slice(0, N);
await sleep(2500);
const t0 = Date.now();
const charts = await basketCharts({ cgKey: key, ids: top.map((c) => c.id), gapMs: key ? 2200 : 7000, budgetMs: 24 * 60000 });
console.log(`backfill: ${charts.length} of ${top.length} coins in ${Math.round((Date.now() - t0) / 1000)} s; failed ${charts.failed.length}`);
await writeFile(out, JSON.stringify({
  at: new Date().toISOString(),
  category: { id: "meme-token", mc: meme ? meme.market_cap : null, updated: meme ? meme.updated_at : null },
  coins: top.map((c) => ({ id: c.id, s: c.symbol, mc: c.market_cap, rank: c.market_cap_rank })),
  charts: charts.map((c) => ({ id: c.id, caps: c.caps.map(([t, v]) => [t, Math.round(v)]) })),
  failed: charts.failed
}));
