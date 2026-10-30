/* Runs every 30 minutes in GitHub Actions (see .github/workflows/update.yml).
   Pulls the live sources, writes data/latest.json, keeps one close per UTC day in data/history.json,
   logs alerts in data/alerts.json and, if a Telegram bot is set up, posts them to the channel. */
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { collect, compute, toDaily, alertsFor, blank, basketIds, basketCharts, basketSeries, weeklyFrom, liveCandle, slimCodex, watchIds, NEEDS, refreshSocials } from "../lib/engine.mjs";

const DATA = new URL("../data/", import.meta.url);
const read = async (name, fallback) => {
  try { return JSON.parse(await readFile(new URL(name, DATA), "utf8")); } catch { return fallback; }
};
const write = (name, obj) => writeFile(new URL(name, DATA), JSON.stringify(obj) + "\n");

await mkdir(DATA, { recursive: true });
/* The method without live values, so the site can show every rule even before a reading exists */
await write("method.json", blank());
const prev = await read("latest.json", null);
const history = await read("history.json", { v: 2, days: [] });
const alerts = await read("alerts.json", { v: 2, state: null, log: [] });

/* On-chain data from Codex is refreshed every CODEX_EVERY_MIN minutes (120 by default) and kept in between in
   .cache/codex.json (the workflow carries it from run to run with actions/cache). The free plan has 10,000 compute
   units a month and each Codex call costs about 5, so calling it every 30 minutes would run out in two weeks. */
const CODEX_KEY = process.env.CODEX_API_KEY || "";
const CODEX_EVERY = Math.max(30, Number(process.env.CODEX_EVERY_MIN || 120));
const CACHE = new URL("../.cache/", import.meta.url);
let codexCache = null;
try { codexCache = JSON.parse(await readFile(new URL("codex.json", CACHE), "utf8")); } catch { codexCache = null; }
const cacheAge = codexCache && codexCache.at ? (Date.now() - Date.parse(codexCache.at)) / 60000 : Infinity;
/* v3 snapshots carry the trader and holder fields, the logos and the X links; an older one is refreshed */
const useCache = Boolean(CODEX_KEY && codexCache && codexCache.v === 3 && cacheAge < CODEX_EVERY - 5);

/* watchlist.json: coins the scans miss, added by hand by chain and contract address */
let watch = [];
try { watch = watchIds(JSON.parse(await readFile(new URL("../watchlist.json", import.meta.url), "utf8")).coins); } catch { watch = []; }
if (watch.length) console.log(`watchlist: ${watch.length} coin${watch.length === 1 ? "" : "s"}`);

const raw = await collect({
  cgKey: process.env.COINGECKO_DEMO_KEY || "",
  codexKey: CODEX_KEY,
  watch,
  codexPages: Number(process.env.CODEX_MAX_PAGES || 2),
  codexCache: useCache ? codexCache : null,
  log: (m) => console.log("source failed:", m)
});
raw.codexEvery = CODEX_EVERY;
if (CODEX_KEY) {
  if (useCache) console.log(`codex: snapshot from ${Math.round(cacheAge)} min ago, next refresh in about ${Math.max(0, Math.round(CODEX_EVERY - cacheAge))} min`);
  else if (["codex", "codexRadar", "codexPinned"].every((k) => raw[k] && raw[k].ok)) {
    await mkdir(CACHE, { recursive: true });
    await writeFile(new URL("codex.json", CACHE), JSON.stringify({ v: 3, at: raw.at, codex: slimCodex(raw.codex.data), codexRadar: slimCodex(raw.codexRadar.data), codexPinned: slimCodex(raw.codexPinned.data), codexWatch: raw.codexWatch && raw.codexWatch.ok ? slimCodex(raw.codexWatch.data) : null, watchKey: raw.watchKey }));
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "codex=fresh\n");
    console.log("codex: refreshed");
  } else console.log("codex: a call failed, it is tried again on the next run");
}
/* X accounts (data/socials.json): each coin's account from its CoinGecko page or its launchpad, and the date of
   its newest post. compute() lists what is due; it is asked for within limits, then the reading is made again. */
let socials = await read("socials.json", null);
let reading = compute(raw, { history: history.days, socials });
const needs = reading[NEEDS];
if (reading.ladder && needs && (needs.pages.length || needs.handles.length)) {
  try {
    const out = await refreshSocials(socials, needs, { cgKey: process.env.COINGECKO_DEMO_KEY || "", log: (m) => console.log("x check:", m) });
    socials = out.socials;
    const st = out.stats;
    console.log(`x check: ${st.pages} coin pages${st.pageFails ? ` (${st.pageFails} failed)` : ""}, ${st.checks} accounts asked, ${st.answered} answered, ${st.gone} gone, ${st.fails} no answer; ${Math.max(0, needs.pages.length - st.pages - st.pageFails)} pages and ${Math.max(0, needs.handles.length - st.checks)} accounts left for the next runs`);
    reading = compute(raw, { history: history.days, socials });
  } catch (e) { console.log("x check failed:", e.message); }
}
if (socials) await write("socials.json", socials);

/* No reading this run: keep the last good one visible, clearly marked */
if (reading.line == null) {
  const last = prev && prev.line != null ? prev : (prev && prev.lastGood) || null;
  reading.lastGood = last ? { at: last.at, line: last.line, zone: last.zone, action: last.action } : null;
}
await write("latest.json", reading);

if (reading.line != null) {
  const row = toDaily(reading);
  const days = history.days.filter((d) => d.d !== row.d);
  days.push(row);
  days.sort((a, b) => (a.d < b.d ? -1 : 1));
  await write("history.json", { v: 2, days });
}

/* Weekly candles of the meme market (data/weekly.json), values in $B.
   The year before launch is estimated once from the 15 biggest memes, scaled to the CoinGecko Meme
   category total on launch day. From then on every update moves the live candle with the real total. */
let weekly = await read("weekly.json", null);
const memeMC = reading.market && reading.market.memeMC;
const hasWeeks = (w) => Boolean(w && Array.isArray(w.weeks) && w.weeks.length);
if (memeMC && !hasWeeks(weekly)) {
  try {
    const ids = basketIds(raw, 15);
    const charts = await basketCharts({ cgKey: process.env.COINGECKO_DEMO_KEY || "", ids, gapMs: process.env.CG_GAP_MS ? Number(process.env.CG_GAP_MS) : undefined });
    if (charts.failed.length) console.log("weekly backfill: skipped", charts.failed.map((f) => `${f.id} (${f.error})`).join(", "));
    const series = basketSeries(charts);
    const last = series.length ? series[series.length - 1][1] : 0;
    /* at least two thirds of the basket, or it waits for a run where CoinGecko answers */
    if (charts.length >= Math.ceil(ids.length * 2 / 3) && series.length >= 30 && last > 0) {
      const from = charts.map((c) => c.id);
      const k = memeMC / last;
      weekly = {
        v: 1, unit: "$B", basis: "CoinGecko Meme category market cap",
        estimated: { from, scale: Number(k.toFixed(4)), until: reading.at, note: `Weeks before launch: the ${from.length} biggest memes, scaled to the category total` },
        weeks: weeklyFrom(series.map(([t, x]) => [t, Number((x * k / 1e9).toFixed(3))]))
      };
      console.log(`weekly backfill: ${weekly.weeks.length} weeks from ${from.length} coins`);
    } else console.log(`weekly backfill: ${charts.length} of ${ids.length} coins answered, tried again on the next run`);
  } catch (e) { console.log("weekly backfill failed:", e.message); }
}
if (hasWeeks(weekly) && memeMC) {
  weekly.weeks = liveCandle(weekly.weeks, Date.parse(reading.at), Number((memeMC / 1e9).toFixed(3)));
  weekly.at = reading.at;
  await write("weekly.json", weekly);
}

const { messages, state } = alertsFor(alerts.state, reading);
alerts.state = state;
for (const text of messages) alerts.log.unshift({ at: reading.at, line: reading.line, text });
alerts.log = alerts.log.slice(0, 500);
await write("alerts.json", alerts);

const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
if (token && chat && messages.length) {
  const site = process.env.SITE_URL ? `\n${process.env.SITE_URL}` : "";
  for (const text of messages) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: `Oldhawk Line: ${text}${site}`, disable_web_page_preview: true })
      });
      if (!res.ok) console.log("telegram:", res.status, await res.text());
    } catch (e) { console.log("telegram:", e.message); }
  }
}

const okCount = reading.sources.filter((s) => s.ok).length;
console.log(`Line ${reading.line ?? "none"} (${reading.lineExact ?? "-"}), ${reading.zone ? reading.zone.name : "no zone"}, coverage ${Math.round(reading.coverage * 100)}%, sources ok ${okCount}/${reading.sources.length}, alerts ${messages.length}`);
