/* Simulated API responses in the exact shapes the real endpoints return.
   Numbers follow the Oct 23, 2026 research so the reading can be checked by hand.
   On-chain tokens that exist only in this test are named DEMO so they can never pass for real coins. */
const DAY = 86400000;
export const NOW = Date.parse("2026-10-23T18:07:00Z");
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

function series(days, start, end, wobble, seed) {
  const out = [];
  const t0 = Math.floor((NOW - days * DAY) / DAY) * DAY;
  for (let i = 0; i < days; i++) {
    const f = i / (days - 1);
    const base = start + (end - start) * f;
    out.push([t0 + i * DAY, base * (1 + wobble * Math.sin(i / 6 + seed))]);
  }
  out.push([NOW, end]);
  return out;
}

/* a steady, varied 24h move per coin, so lists and colours can be checked */
const d24of = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997; return Math.round(((h % 240) / 10 - 12) * 10) / 10; };

function coin(id, symbol, name, mc, vol, o = {}) {
  return {
    id, symbol, name,
    image: `https://coin-images.coingecko.com/coins/images/1/large/${id}.png`,
    current_price: o.price ?? 0.01, market_cap: mc, market_cap_rank: 0, fully_diluted_valuation: mc * 1.1,
    total_volume: vol, high_24h: 0, low_24h: 0, price_change_24h: 0, price_change_percentage_24h: o.d24 ?? d24of(id),
    market_cap_change_24h: 0, market_cap_change_percentage_24h: -1.1, circulating_supply: 1, total_supply: 1, max_supply: null,
    ath: 1, ath_change_percentage: o.fromHigh ?? -75, ath_date: o.athDate ?? iso(600), atl: 0.0001, atl_change_percentage: 500,
    atl_date: o.atlDate ?? iso(900), roi: null, last_updated: iso(0),
    price_change_percentage_30d_in_currency: o.d30 ?? -14, price_change_percentage_7d_in_currency: o.d7 ?? -4
  };
}

export function memes(variant = "today") {
  const list = [
    coin("dogecoin", "doge", "Dogecoin", 12.48e9, 610e6, { price: 0.0798, fromHigh: -89, d30: -12 }),
    coin("shiba-inu", "shib", "Shiba Inu", 4.2e9, 120e6, { fromHigh: -92, d30: -15 }),
    coin("memecore", "m", "MemeCore", 2.2e9, 20e6, { fromHigh: -40, d30: 4 }),
    coin("pump-fun", "pump", "Pump.fun", 1.9e9, 150e6, { fromHigh: -70, d30: -9 }),
    coin("pepe", "pepe", "Pepe", 1.6e9, 300e6, { fromHigh: -86, d30: -18 }),
    coin("binance-life", "币安人生", "币安人生", 515.5e6, 40e6, { fromHigh: -60, d30: -22, atlDate: iso(380), athDate: iso(370) }),
    coin("pudgy-penguins", "pengu", "Pudgy Penguins", 507.5e6, 90e6, { fromHigh: -88, d30: -10 }),
    coin("official-trump", "trump", "Official Trump", 503.5e6, 70e6, { fromHigh: -98, d30: -8 }),
    coin("spx6900", "spx", "SPX6900", 420e6, 25e6, { fromHigh: -80, d30: -20 }),
    coin("bonk", "bonk", "Bonk", 380e6, 60e6, { fromHigh: -90, d30: -16 }),
    coin("binance-peg-dogecoin", "doge", "Binance-Peg Dogecoin", 321e6, 1e6, { fromHigh: -89 }),
    coin("apepe", "apepe", "Ape and Pepe", 300e6, 4e6, { fromHigh: -50, d30: 6 }),
    coin("floki", "floki", "FLOKI", 280e6, 30e6, { fromHigh: -93, d30: -17 }),
    coin("dogwifcoin", "wif", "dogwifhat", 260e6, 80e6, { fromHigh: -97, d30: -21 }),
    coin("useless-3", "useless", "Useless Coin", 210e6, 12e6, { fromHigh: -70, d30: -5 }),
    coin("fartcoin", "fartcoin", "Fartcoin", 200e6, 45e6, { fromHigh: -91, d30: -19 }),
    coin("npc", "npc", "Non-Playable Coin", 150e6, 3e6, { fromHigh: -60, d30: -2 }),
    coin("build-on", "b", "BUILDon", 130e6, 9e6, { fromHigh: -55, d30: -11 }),
    coin("cashcat", "cashcat", "Cash Cat", 104.4e6, 2e6, { fromHigh: -45, d30: 3 }),
    coin("thin-meme", "thin", "Thin Meme", 120e6, 20e3, { fromHigh: -50 })
  ];
  for (let i = 0; i < 45; i++) {
    const mc = 95e6 - i * 2e6;
    list.push(coin(`tail-${i}`, `t${i}`, `Tail ${i}`, mc, mc * 0.03, { fromHigh: -80, d30: -20 + (i % 9) * 3, atlDate: i === 3 ? iso(20) : undefined, athDate: i === 3 ? iso(5) : undefined }));
  }
  if (variant === "hot") {
    return list.map((c) => {
      if (c.id.startsWith("tail-")) return { ...c, market_cap: c.market_cap * 9, total_volume: c.market_cap * 0.4, price_change_percentage_30d_in_currency: 120, atl_date: iso(40), ath_date: iso(1) };
      return { ...c, market_cap: c.market_cap * 6.5, total_volume: c.market_cap * 2.6, price_change_percentage_30d_in_currency: 90 };
    });
  }
  return list.sort((a, b) => b.market_cap - a.market_cap);
}

export function categories(variant = "today") {
  const k = variant === "hot" ? 6.4 : 1;
  return [
    { id: "layer-1", name: "Layer 1 (L1)", market_cap: 2.2e12, market_cap_change_24h: -0.5, content: "", top_3_coins_id: ["bitcoin"], top_3_coins: [], volume_24h: 60e9, updated_at: iso(0) },
    { id: "meme-token", name: "Meme", market_cap: 30.006e9 * k, market_cap_change_24h: -1.2, content: "", top_3_coins_id: ["dogecoin", "shiba-inu", "memecore"], top_3_coins: [], volume_24h: 2.191e9 * (variant === "hot" ? 17 : 1), updated_at: iso(0) }
  ];
}

export function global(variant = "today") {
  return { data: { active_cryptocurrencies: 17000, markets: 1300, total_market_cap: { usd: variant === "hot" ? 3.9e12 : 2.836e12, eur: 2.6e12 }, total_volume: { usd: 1.0e11 }, market_cap_percentage: { btc: 59.4, eth: 11.2, usdt: 6.1 }, market_cap_change_percentage_24h_usd: -0.8, updated_at: Math.floor(NOW / 1000) } };
}

export function chart(id, variant = "today") {
  if (id === "dogecoin") {
    const p = variant === "hot" ? series(240, 0.12, 0.42, 0.05, 1) : series(240, 0.096, 0.0798, 0.06, 1);
    return { prices: p, market_caps: p.map(([t, v]) => [t, v * 1.5e11]), total_volumes: p.map(([t]) => [t, 6e8]) };
  }
  const p = variant === "hot" ? series(240, 60000, 101000, 0.04, 2) : series(240, 64000, 81400, 0.05, 2);
  return { prices: p, market_caps: p.map(([t, v]) => [t, v * 2e7]), total_volumes: p.map(([t]) => [t, 3e10]) };
}

export function pump(variant = "today") {
  const days = 300, chartRows = [];
  const t0 = Math.floor((NOW - days * DAY) / 1000 / 86400) * 86400;
  for (let i = 0; i < days; i++) {
    const v = variant === "hot" ? 4e6 + i * 30000 : 1.15e6 + 0.35e6 * Math.sin(i / 11) + (i > 280 ? 0.2e6 : 0);
    chartRows.push([t0 + i * 86400, Math.round(v)]);
  }
  if (variant === "hot") return { name: "pump.fun", slug: "pump.fun", category: "Launchpad", total24h: 12.8e6, total7d: 80e6, total30d: 300e6, totalDataChart: chartRows, totalDataChartBreakdown: [] };
  return { id: "parent#pump", name: "pump.fun", slug: "pump.fun", category: "Launchpad", parentProtocol: "parent#pump", chains: ["Solana"], total24h: 1457872, total48hto24h: 1500000, total7d: 9545072, total30d: 45372494, totalDataChart: chartRows, totalDataChartBreakdown: [] };
}

export function hyperliquid(variant = "today") {
  const names = ["BTC", "ETH", "SOL", "DOGE", "kPEPE", "WIF", "kBONK", "kSHIB", "TRUMP", "PENGU", "FARTCOIN", "SPX", "HYPE", "kFLOKI"];
  const universe = names.map((n) => ({ name: n, szDecimals: 0, maxLeverage: 10 }));
  universe.push({ name: "OLDMEME", szDecimals: 0, maxLeverage: 3, isDelisted: true });
  const f = variant === "hot" ? "0.00016" : "0.0000125";
  const ctxs = names.map((n) => ({
    dayNtlVlm: "1000000", funding: ["BTC", "ETH", "SOL", "HYPE"].includes(n) ? "0.00002" : (n === "DOGE" && variant !== "hot" ? "0.000006" : f),
    impactPxs: ["1", "1"], markPx: n === "BTC" ? "81400" : n === "DOGE" ? "0.0798" : "0.5", midPx: "0.5",
    openInterest: n === "DOGE" ? "1200000000" : "40000000", oraclePx: "0.5", premium: "0.0", prevDayPx: "0.5"
  }));
  ctxs.push({ dayNtlVlm: "0", funding: "0.0", markPx: "0", openInterest: "0", oraclePx: "0" });
  return [{ universe, marginTables: [] }, ctxs];
}

export function fng(variant = "today") {
  return { name: "Fear and Greed Index", data: [{ value: variant === "hot" ? "86" : "50", value_classification: variant === "hot" ? "Extreme Greed" : "Neutral", timestamp: "1792713600", time_until_update: "85443" }], metadata: { error: null } };
}

export function apps(variant = "today") {
  const results = [];
  for (let i = 0; i < 100; i++) results.push({ artistName: "Dev", id: String(1000 + i), name: `App ${i + 1}`, releaseDate: "2024-01-01", kind: "apps", artworkUrl100: "", genres: [], url: "" });
  if (variant === "hot") { results[0].name = "Coinbase: Buy Bitcoin & Ether"; results[4].name = "Phantom - Crypto Wallet"; }
  return { feed: { title: "Top Free Apps", id: "x", author: { name: "Apple" }, links: [], copyright: "", country: "us", icon: "", updated: iso(0), results } };
}

/* Codex filterTokens results: numbers come back as strings, createdAt as unix seconds. */
function cx(symbol, name, networkId, mc, o = {}) {
  return {
    circulatingMarketCap: String(mc), marketCap: String(mc * 1.02), liquidity: String(o.liq ?? mc * 0.05), volume24: String(o.vol ?? mc * 0.08),
    holders: o.holders ?? 12000, isScam: Boolean(o.scam), change24: String(o.ch ?? (d24of(symbol + networkId) / 100)),
    token: { address: o.addr ?? `${symbol}Addr${networkId}`, networkId, name, symbol, createdAt: Math.floor((NOW - (o.age ?? 400) * DAY) / 1000), launchpad: { launchpadName: o.lp ?? "Pump.fun", migrated: true, completed: true } }
  };
}

export function codexResults(variant = "today") {
  if (variant === "hot") {
    const out = [];
    for (let i = 0; i < 450; i++) out.push(cx(`DEMO${i}`, `Demo ${i}`, [1399811149, 56, 8453, 4663][i % 4], 900e6 - i * 1.9e6, { age: 3 + (i % 80), lp: ["Pump.fun", "Bonk", "Four.meme", "BAGS"][i % 4] }));
    return out;
  }
  return [
    cx("币安人生", "币安人生", 56, 514e6, { lp: "Four.meme", age: 380 }),
    cx("USELESS", "Useless Coin", 1399811149, 208e6, { lp: "Bonk", age: 470 }),
    cx("FARTCOIN", "Fartcoin", 1399811149, 201e6, { lp: "Pump.fun", age: 700, liq: 12e6 }),
    cx("FARTCOIN", "Fartcoin", 8453, 199e6, { lp: "Clanker", age: 200, liq: 90e3 }),
    cx("DEMOH", "Demo H", 1, 85e6, { lp: "Printr", age: 30 }),
    cx("DEMOA", "Demo A", 1399811149, 62e6, { lp: "Pump.fun", age: 40 }),
    cx("DEMOX", "Demo Scam", 1399811149, 50e6, { lp: "Pump.fun", age: 9, scam: true }),
    cx("DEMOB", "Demo B", 1399811149, 33e6, { lp: "Bonk", age: 5 }),
    cx("DEMOQ", "Demo Quiet", 1399811149, 30e6, { lp: "Pump.fun", age: 100, vol: 10e3 }),
    cx("DEMOD", "Demo D", 8453, 27e6, { lp: "Clanker", age: 120 }),
    cx("DEMOR", "Demo Arb", 42161, 25e6, { lp: "Printr", age: 50 }),
    cx("DEMOC", "Demo C", 56, 18e6, { lp: "Four.meme", age: 3 }),
    cx("DEMOF", "Demo F", 143, 15e6, { lp: "Nad.Fun", age: 20 }),
    cx("DEMOE", "Demo E", 4663, 12e6, { lp: "BAGS", age: 2 }),
    cx("DEMOG", "Demo G", 1399811149, 11e6, { lp: "StonkFun", age: 60 })
  ];
}

export function radarResults(variant = "today") {
  const k = variant === "hot" ? 8 : 1;
  return [
    cx("DEMOSTK", "Demo Stonk", 1399811149, 6.2e6 * k, { lp: "StonkFun", age: 2, vol: 2.4e6 * k, ch: 1.85 }),
    cx("DEMOPON", "Demo Pons", 4663, 3.1e6 * k, { lp: "pons", age: 1, vol: 1.1e6 * k, ch: 0.62 }),
    cx("DEMOE", "Demo E", 4663, 12e6, { lp: "BAGS", age: 2, ch: 0.4 }),
    cx("DEMOB", "Demo B", 1399811149, 33e6, { lp: "Bonk", age: 5, ch: 0.12 }),
    cx("DEMOPF", "Demo Pump", 1399811149, 2.2e6 * k, { lp: "Pump.fun", age: 0.5, vol: 900e3 * k, ch: 3.1 }),
    cx("DEMOC", "Demo C", 56, 18e6, { lp: "Four.meme", age: 3, ch: -0.08 }),
    cx("DEMOSTK2", "Demo Stonk Two", 1399811149, 1.6e6 * k, { lp: "StonkFun", age: 4, vol: 400e3 * k, ch: 0.21 }),
    cx("DEMOOLD", "Demo Old", 1399811149, 5e6, { lp: "Pump.fun", age: 30 }),
    /* past the top 100 of the main scan: only the pinned call finds it */
    Object.assign(cx("DEMOPON2", "Demo Pons Two", 4663, 1.4e6 * k, { lp: "pons", age: 3, vol: 300e3 * k, ch: 0.35 }), { _deep: true }),
    cx("DEMOTINY", "Demo Tiny", 1399811149, 400e3, { lp: "Pump.fun", age: 1 })
  ];
}

/* One year of daily market caps for a basket coin */
export function chart365(id) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const base = 2e8 + (h % 50) * 4e7;
  const p = series(366, base * 1.6, base, 0.12, h % 7);
  return { prices: p.map(([t, v]) => [t, v / 1e9]), market_caps: p, total_volumes: p.map(([t, v]) => [t, v * 0.05]) };
}

/* A fetch stand-in that routes each real endpoint URL to its fixture. fail = list of route names to break. */
export function fakeFetch({ variant = "today", fail = [], calls = [] } = {}) {
  const routes = [
    ["cgCategories", /api\.coingecko\.com\/api\/v3\/coins\/categories$/, () => categories(variant)],
    ["cgGlobal", /api\.coingecko\.com\/api\/v3\/global$/, () => global(variant)],
    ["cgMemes", /api\.coingecko\.com\/api\/v3\/coins\/markets\?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=1&/, () => memes(variant)],
    ["cgMemes2", /api\.coingecko\.com\/api\/v3\/coins\/markets\?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=2&/, () => []],
    ["cgDoge", /coins\/dogecoin\/market_chart\?vs_currency=usd&days=240&interval=daily/, () => chart("dogecoin", variant)],
    ["cgBtc", /coins\/bitcoin\/market_chart\?vs_currency=usd&days=240&interval=daily/, () => chart("bitcoin", variant)],
    ["cgYear", /coins\/([a-z0-9%.-]+)\/market_chart\?vs_currency=usd&days=365&interval=daily$/, (url) => chart365(decodeURIComponent(url.match(/coins\/([^/]+)\/market_chart/)[1]))],
    ["pump", /api\.llama\.fi\/summary\/fees\/pump\.fun\?dataType=dailyRevenue/, () => pump(variant)],
    ["hl", /api\.hyperliquid\.xyz\/info$/, () => hyperliquid(variant)],
    ["fng", /api\.alternative\.me\/fng\/\?limit=1$/, () => fng(variant)],
    ["apps", /rss\.applemarketingtools\.com\/api\/v2\/us\/apps\/top-free\/100\/apps\.json$/, () => apps(variant)],
    ["appsLegacy", /itunes\.apple\.com\/us\/rss\/topfreeapplications/, () => ({ feed: { entry: [] } })],
    ["codex", /^https:\/\/graph\.codex\.io\/graphql$/, null]
  ];
  return async (url, init = {}) => {
    const r = routes.find(([, re]) => re.test(url));
    calls.push({ url, method: init.method || "GET", headers: init.headers || {}, body: init.body || null, route: r ? r[0] : null });
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    if (r[0] === "hl" && (init.method !== "POST" || JSON.parse(init.body).type !== "metaAndAssetCtxs")) return { ok: false, status: 422, json: async () => ({}) };
    if (fail.includes(r[0]) || (fail.includes("coingecko") && r[0].startsWith("cg"))) return { ok: false, status: 429, json: async () => ({ status: { error_code: 429 } }) };
    if (r[0] === "codex") {
      if (!init.headers || !init.headers.authorization) return { ok: false, status: 401, json: async () => ({}) };
      const body = JSON.parse(init.body);
      if (fail.includes("codexGraphql")) return { ok: true, status: 200, json: async () => ({ data: null, errors: [{ message: "Cannot query field \"holders\" on type \"TokenFilterResult\"." }] }) };
      if (/query Radar/.test(body.query)) {
        if (fail.includes("codexRadar")) return { ok: true, status: 200, json: async () => ({ data: null, errors: [{ message: "Field \"tokenCreatedAt\" is not defined by type \"TokenFilters\"." }] }) };
        const pads = body.variables.filters.launchpadName || [];
        const pinnedOnly = pads.length <= 2;
        const list = radarResults(variant).filter((x) => pads.includes(x.token.launchpad.launchpadName) && (pinnedOnly || !x._deep)).map(({ _deep, ...x }) => x);
        return { ok: true, status: 200, json: async () => ({ data: { filterTokens: { results: JSON.parse(JSON.stringify(list.slice(0, body.variables.limit || 100))) } } }) };
      }
      const all = codexResults(variant);
      const off = body.variables.offset || 0;
      return { ok: true, status: 200, json: async () => ({ data: { filterTokens: { results: JSON.parse(JSON.stringify(all.slice(off, off + 200))) } } }) };
    }
    const data = r[2](url);
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(data)) };
  };
}
