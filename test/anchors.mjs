/* Calibration backtest: API-shaped responses whose numbers equal each input's anchor.
   "cold" = every input at its January 2024 value, "hot" = every input at its December 2024 value,
   "mid" = halfway on every input. The engine must read 0, 100 and 50. */
const DAY = 86400000;
export const NOW = Date.parse("2026-10-24T09:00:00Z");
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

const SETS = {
  //          dominance%  mayer  dogeShare%  wlp counts (>=100M,500M,1B,5B,10B)  fresh  pump$M/d  vol$B  turnover%  funding%/8h  appRank  fng
  cold: { dom: 1.0, mayer: 0.7, share: 50, counts: [16, 6, 3, 1, 1], fresh: 0, pump: 0.5, vol: 1.5, turn: 5, fund: 0.01, rank: null, fng: 50 },
  hot: { dom: 4.0, mayer: 1.8, share: 28, counts: [120, 35, 18, 3, 3], fresh: 20, pump: 10, vol: 20, turn: 25, fund: 0.08, rank: 1, fng: 80 },
  mid: { dom: 2.5, mayer: 1.25, share: 39, counts: [71, 20, 10, 2, 2], fresh: 10, pump: 5.25, vol: 10.75, turn: 15, fund: 0.045, rank: 31.6227766, fng: 65 }
};

function coin(id, symbol, mc, o = {}) {
  return {
    id, symbol, name: o.name || symbol.toUpperCase(), current_price: o.price ?? 0.01, market_cap: mc, total_volume: mc * 0.01,
    ath_change_percentage: -50, ath_date: o.fresh ? iso(5) : iso(600), atl_date: o.fresh ? iso(40) : iso(900),
    price_change_percentage_30d_in_currency: 0, price_change_percentage_7d_in_currency: 0
  };
}

export function anchorFetch(name) {
  const S = SETS[name];
  const cleanMC = (S.vol * 1e9) / (S.turn / 100);           // turnover fixes the clean meme market cap
  const totalMC = cleanMC / (S.dom / 100);                   // dominance fixes the total market cap
  const dogeMC = cleanMC * S.share / 100;                    // DOGE share fixes DOGE
  /* the ladder: counts are cumulative, DOGE is one of the $10B+ coins */
  const [c100, c500, c1b, c5b, c10b] = S.counts;
  const list = [coin("dogecoin", "doge", dogeMC, { name: "Dogecoin" })];
  for (let i = 1; i < c10b; i++) list.push(coin(`big-${i}`, i === 1 ? "pepe" : `big${i}`, 11e9 + i * 1e8));
  for (let i = 0; i < c5b - c10b; i++) list.push(coin(`five-${i}`, `five${i}`, 6e9 + i * 1e8));
  for (let i = 0; i < c1b - c5b; i++) list.push(coin(`one-${i}`, i === 0 ? "wif" : `one${i}`, 2e9 + i * 1e7));
  for (let i = 0; i < c500 - c1b; i++) list.push(coin(`half-${i}`, i === 0 ? "bonk" : `half${i}`, 7e8 + i * 1e6));
  let fresh = S.fresh;
  for (let i = 0; i < c100 - c500; i++) list.push(coin(`tenth-${i}`, `tenth${i}`, 2e8 + i * 1e6, { fresh: fresh-- > 0 }));
  for (let i = 0; i < 20; i++) list.push(coin(`small-${i}`, `small${i}`, 3e7 + i * 1e5));
  list.sort((a, b) => b.market_cap - a.market_cap);
  const closes = [];
  for (let i = 0; i < 239; i++) closes.push([NOW - (239 - i) * DAY, 0.1]);
  const doge = { prices: [...closes, [NOW, 0.1 * S.mayer]], market_caps: [], total_volumes: [] };
  const btc = { prices: [...closes.map(([t]) => [t, 60000]), [NOW, 60000]], market_caps: [], total_volumes: [] };
  const chart = [];
  for (let i = 0; i < 120; i++) chart.push([Math.floor((NOW - (120 - i) * DAY) / 1000), S.pump * 1e6]);
  const perpF = String(S.fund / 100 / 8);
  const hl = [{ universe: ["DOGE", "kBONK", "WIF", "BTC"].map((n) => ({ name: n })) },
    ["DOGE", "kBONK", "WIF", "BTC"].map((n) => ({ funding: n === "BTC" ? "0.0001" : perpF, markPx: "1", openInterest: "1000000" }))];
  const apps = { feed: { results: Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: S.rank && i + 1 === Math.round(S.rank) ? "Coinbase: Buy Bitcoin & Ether" : `App ${i + 1}` })) } };
  const routes = [
    [/coins\/categories$/, () => [{ id: "meme-token", name: "Meme", market_cap: cleanMC, volume_24h: S.vol * 1e9 }]],
    [/\/global$/, () => ({ data: { total_market_cap: { usd: totalMC } } })],
    [/coins\/markets.*page=1&/, () => list],
    [/coins\/markets.*page=2&/, () => []],
    [/dogecoin\/market_chart/, () => doge],
    [/bitcoin\/market_chart/, () => btc],
    [/llama\.fi/, () => ({ total7d: S.pump * 1e6 * 7, total24h: S.pump * 1e6, totalDataChart: chart })],
    [/hyperliquid/, () => hl],
    [/alternative\.me/, () => ({ data: [{ value: String(S.fng), value_classification: "x", timestamp: String(Math.floor(NOW / 1000)) }] })],
    [/applemarketingtools/, () => apps]
  ];
  return async (url) => {
    const r = routes.find(([re]) => re.test(url));
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    const data = r[1]();
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(data)) };
  };
}
