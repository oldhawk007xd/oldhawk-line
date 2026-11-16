/* Which sources give daily history back to 2021 and Jan 2025, from a GitHub runner (where the update job runs).
   Prints one JSON line per check. Reads no secret other than the CoinGecko Demo key, and never prints it. */
const CG = process.env.COINGECKO_DEMO_KEY || "";
const t = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);
const day = (s) => new Date(s * 1000).toISOString().slice(0, 10);
async function get(url, opt = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...opt, signal: AbortSignal.timeout(30000), headers: { accept: "application/json", "user-agent": "oldhawk-line-probe", ...(opt.headers || {}) } });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text: text.slice(0, 300), ms: Date.now() - t0 };
  } catch (e) { return { status: 0, json: null, text: String(e.message || e).slice(0, 200), ms: Date.now() - t0 }; }
}
const out = (name, r, detail) => console.log(JSON.stringify({ name, status: r.status, ms: r.ms, ...detail, ...(r.status !== 200 ? { body: r.text } : {}) }));
const near = (rows, d, f) => { const s = t(d); let best = null; for (const x of rows) { const v = f(x); if (best == null || Math.abs(v[0] - s) < Math.abs(best[0] - s)) best = v; } return best ? { d: day(best[0]), v: best[1] } : null; };

// 1. Fear and Greed, all of it
{ const r = await get("https://api.alternative.me/fng/?limit=0");
  const rows = r.json && Array.isArray(r.json.data) ? r.json.data : [];
  const f = (x) => [Number(x.timestamp), Number(x.value)];
  out("fng", r, { days: rows.length, first: rows.length ? day(Math.min(...rows.map((x) => Number(x.timestamp)))) : null, nov2021: near(rows, "2021-11-10", f), jan2025: near(rows, "2025-01-20", f) }); }

// 2. pump.fun revenue (DefiLlama), all of it
{ const r = await get("https://api.llama.fi/summary/fees/pump.fun?dataType=dailyRevenue");
  const rows = r.json && Array.isArray(r.json.totalDataChart) ? r.json.totalDataChart : [];
  out("pump", r, { days: rows.length, first: rows.length ? day(rows[0][0]) : null, jan2025: near(rows, "2025-01-20", (x) => [x[0], Math.round(x[1])]) }); }

// 3. DefiLlama coin prices, 2021 and 2025 (no market cap)
for (const id of ["dogecoin", "shiba-inu", "dogelon-mars", "floki", "baby-doge-coin", "samoyedcoin", "pepe", "dogwifcoin", "bonk"]) {
  for (const [from, span] of [["2021-04-01", 300], ["2024-11-01", 120]]) {
    const r = await get(`https://coins.llama.fi/chart/coingecko:${id}?start=${t(from)}&span=${span}&period=1d`);
    const p = r.json && r.json.coins && Object.values(r.json.coins)[0];
    const rows = p && Array.isArray(p.prices) ? p.prices : [];
    out(`llama-price ${id} ${from}`, r, { points: rows.length, first: rows.length ? day(rows[0].timestamp) : null, last: rows.length ? day(rows[rows.length - 1].timestamp) : null, keys: rows[0] ? Object.keys(rows[0]) : [] });
  }
}
// 3b. DefiLlama market caps endpoint, if it takes a past date
{ const r = await get("https://coins.llama.fi/mcaps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ coins: ["coingecko:dogecoin", "coingecko:shiba-inu"], timestamp: t("2021-11-10") }) });
  out("llama-mcaps 2021-11-10", r, { got: r.json }); }

// 4. Hyperliquid funding: how far back for meme perps
for (const coin of ["DOGE", "kPEPE", "WIF", "kBONK", "kSHIB"]) {
  const r = await get("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "fundingHistory", coin, startTime: Date.parse("2022-01-01") }) });
  const rows = Array.isArray(r.json) ? r.json : [];
  out(`hl-funding ${coin}`, r, { rows: rows.length, first: rows[0] ? new Date(rows[0].time).toISOString().slice(0, 10) : null });
}

// 5. CoinGecko Demo: past 365 days, global chart, inactive coins
if (CG) {
  const H = { headers: { "x-cg-demo-api-key": CG } };
  for (const [a, b] of [["2021-11-01", "2021-11-10"], ["2025-01-10", "2025-01-20"], ["2025-11-20", "2025-11-30"]]) {
    const r = await get(`https://api.coingecko.com/api/v3/coins/dogecoin/market_chart/range?vs_currency=usd&from=${t(a)}&to=${t(b)}`, H);
    out(`cg-demo dogecoin ${a}`, r, { mcaps: r.json && Array.isArray(r.json.market_caps) ? r.json.market_caps.length : null, err: r.json && (r.json.error || r.json.status) });
  }
  { const r = await get("https://api.coingecko.com/api/v3/global/market_cap_chart?days=30&vs_currency=usd", H); out("cg-demo global chart", r, { err: r.json && (r.json.error || r.json.status) }); }
  { const r = await get("https://api.coingecko.com/api/v3/coins/list?status=inactive", H); out("cg-demo inactive list", r, { n: Array.isArray(r.json) ? r.json.length : null, err: r.json && !Array.isArray(r.json) ? (r.json.error || r.json.status) : null }); }
} else console.log(JSON.stringify({ name: "cg-demo", note: "no key in this run" }));

// 6. Other free price and funding sources, for the record
{ const r = await get(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=DOGE&tsym=USD&limit=5&toTs=${t("2021-11-10")}`); out("cryptocompare no key", r, { resp: r.json && r.json.Response, msg: r.json && r.json.Message }); }
{ const r = await get("https://api.exchange.coinbase.com/products/DOGE-USD/candles?granularity=86400&start=2021-11-01T00:00:00Z&end=2021-11-10T00:00:00Z"); out("coinbase DOGE 2021", r, { rows: Array.isArray(r.json) ? r.json.length : null }); }
{ const r = await get("https://api.exchange.coinbase.com/products/SHIB-USD/candles?granularity=86400&start=2021-11-01T00:00:00Z&end=2021-11-10T00:00:00Z"); out("coinbase SHIB 2021", r, { rows: Array.isArray(r.json) ? r.json.length : null }); }
{ const r = await get(`https://api.binance.com/api/v3/klines?symbol=DOGEUSDT&interval=1d&startTime=${t("2021-11-01") * 1000}&limit=5`); out("binance spot", r, { rows: Array.isArray(r.json) ? r.json.length : null }); }
{ const r = await get(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=DOGEUSDT&startTime=${t("2021-11-01") * 1000}&limit=5`); out("binance funding", r, { rows: Array.isArray(r.json) ? r.json.length : null }); }
{ const r = await get(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=DOGEUSDT&endTime=${t("2021-11-10") * 1000}&limit=5`); out("bybit funding 2021", r, { rows: r.json && r.json.result && Array.isArray(r.json.result.list) ? r.json.result.list.length : null, msg: r.json && r.json.retMsg }); }
{ const r = await get(`https://www.okx.com/api/v5/public/funding-rate-history?instId=DOGE-USDT-SWAP&before=${t("2021-11-01") * 1000}&limit=5`); out("okx funding 2021", r, { rows: r.json && Array.isArray(r.json.data) ? r.json.data.length : null, msg: r.json && r.json.msg }); }
{ const r = await get("https://api.coinpaprika.com/v1/tickers/doge-dogecoin/historical?start=2021-11-01&interval=1d&limit=5"); out("coinpaprika 2021", r, { rows: Array.isArray(r.json) ? r.json.length : null, err: r.json && r.json.error }); }
{ const r = await get("https://api.coinpaprika.com/v1/tickers/doge-dogecoin/historical?start=2025-01-10&interval=1d&limit=5"); out("coinpaprika 2025-01", r, { rows: Array.isArray(r.json) ? r.json.length : null, err: r.json && r.json.error, sample: Array.isArray(r.json) ? r.json[0] : null }); }
