/* Oldhawk Line v2.2, live engine.
   One file, no dependencies. Runs in Node 20+ (the GitHub Action) and in browsers.
   collect() pulls the public sources, compute() turns them into one reading.
   Every input is live or it is left out. Nothing is typed in by hand. */

export const VERSION = "2.4";

export const ANCHORS = {
  cold: { date: "2024-01-22", label: "January 2024 bottom", memeMC: 20.0e9 },
  hot: { date: "2024-12-09", label: "December 2024 top", memeMC: 150.6e9 }
};

export const ZONES = [
  { from: 0, to: 15, name: "Deep Winter", hour: "Midnight", tone: 0, spot: "Weekly DCA, 1/12 of target, blue-chip memes only", active: "Closed" },
  { from: 15, to: 30, name: "Winter", hour: "Night", tone: 1, spot: "Weekly DCA at half pace, 1/24 of target", active: "Closed" },
  { from: 30, to: 45, name: "Thaw", hour: "Dawn", tone: 2, spot: "Hold. New buys only with 3 of 6 season confirmations", active: "Paper trades only" },
  { from: 45, to: 60, name: "Season On", hour: "Sunrise", tone: 3, spot: "Hold. No adding above 55", active: "Open for fresh runners, 0.5% risk per trade" },
  { from: 60, to: 75, name: "Greed", hour: "Morning", tone: 4, spot: "Sell 20% at 60 and 20% at 70", active: "Trims only, no new positions above 70" },
  { from: 75, to: 90, name: "Extreme Greed", hour: "Late morning", tone: 5, spot: "Sell 20% at 80 and 20% at 85", active: "No new entries" },
  { from: 90, to: 100, name: "Ultra Greed", hour: "Noon", tone: 6, spot: "Sell 10% at 90, keep a 10% moonbag", active: "Closed" }
];

export const PILLARS = [
  { id: "size", name: "Size and share" },
  { id: "ladder", name: "Runner ladder" },
  { id: "launch", name: "Launchpad heat" },
  { id: "flow", name: "Flow and leverage" },
  { id: "attention", name: "Attention" },
  { id: "mood", name: "Market mood" }
];

/* cold = value at the January 2024 bottom (score 0), hot = value at the December 2024 top (score 100).
   est = anchor is an estimate, shown with a ~ on the site. Weights sum to 100. */
export const INPUTS = [
  { id: "1.1", pillar: "size", name: "Clean meme dominance", unit: "%", dp: 2, w: 12, cold: 1.0, hot: 4.0, src: "coingecko" },
  { id: "1.2", pillar: "size", name: "DOGE vs its 200-day average", unit: "x", dp: 2, w: 6, cold: 0.7, hot: 1.8, src: "coingecko" },
  { id: "1.3", pillar: "size", name: "DOGE share of clean meme market cap (inverse)", unit: "%", dp: 1, w: 6, cold: 50, hot: 28, src: "coingecko" },
  { id: "2.1", pillar: "ladder", name: "Weighted ladder points, $100M and up", unit: "", dp: 0, w: 17, cold: 60, hot: 322, est: true, src: "coingecko" },
  { id: "2.2", pillar: "ladder", name: "Fresh runners above $100M", unit: "", dp: 0, w: 10, cold: 0, hot: 20, est: true, src: "coingecko" },
  { id: "3.1", pillar: "launch", name: "pump.fun revenue per day, 7-day average", unit: "$M", dp: 2, w: 15, cold: 0.5, hot: 10, src: "defillama" },
  { id: "4.1", pillar: "flow", name: "Meme spot volume, 24h", unit: "$B", dp: 2, w: 6, cold: 1.5, hot: 20, src: "coingecko" },
  { id: "4.2", pillar: "flow", name: "Turnover, 24h volume / meme market cap", unit: "%", dp: 1, w: 6, cold: 5, hot: 25, src: "coingecko" },
  { id: "4.3", pillar: "flow", name: "Meme perps funding per 8h, weighted by open interest", unit: "%", dp: 4, w: 6, cold: 0.01, hot: 0.08, src: "hyperliquid" },
  { id: "5.1", pillar: "attention", name: "Best US App Store rank, Coinbase or Phantom", unit: "rank", dp: 0, w: 9, scale: "outside the top 100 = 0, top 10 = 100, log scale", src: "apple" },
  { id: "6.1", pillar: "mood", name: "Crypto Fear and Greed", unit: "", dp: 0, w: 7, cold: 50, hot: 80, src: "alternative" }
];

/* Runner ladder. Counts are cumulative: a $5B token also counts above $1B, $500M, $100M, $50M and $10M.
   Only the $100M+ floors are scored (w > 0), because only those have anchors from the last cycle.
   The $10M and $50M floors are counted live and logged, and join the score once calibrated. */
export const LADDER = [
  { min: 10e6, label: "$10M", w: 0 },
  { min: 50e6, label: "$50M", w: 0 },
  { min: 100e6, label: "$100M", w: 1, cold: 16, hot: 120, est: true },
  { min: 500e6, label: "$500M", w: 2, cold: 6, hot: 35, est: true },
  { min: 1e9, label: "$1B", w: 4, cold: 3, hot: 18, est: true },
  { min: 5e9, label: "$5B", w: 8, cold: 1, hot: 3, est: true },
  { min: 10e9, label: "$10B", w: 12, cold: 1, hot: 3, est: false }
];

/* Chains covered on-chain (Codex network ids). Coins listed only on exchanges show as "listed". */
export const CHAINS = {
  1399811149: { id: "sol", name: "Solana", color: "#14F195" },
  56: { id: "bsc", name: "BNB Chain", color: "#ffb020" },
  8453: { id: "base", name: "Base", color: "#4d8dff" },
  1: { id: "eth", name: "Ethereum", color: "#c4b5fd" },
  143: { id: "monad", name: "Monad", color: "#b07cff" },
  4663: { id: "hood", name: "Robinhood Chain", color: "#ff6b84" }
};
export const LISTED = { id: "listed", name: "Listed, CoinGecko", color: "#ededed" };

/* Launchpads whose tokens count as memes on-chain (Codex launchpadName values). */
export const LAUNCHPADS = ["Pump.fun", "Pump Mayhem", "Bonk", "BONAD.fun", "Nad.Fun", "Baseapp", "Baseapp Creator", "Zora", "Zora Creator", "Four.meme", "Four.meme Fair", "Believe", "Moonshot", "Jupiter Studio", "boop", "Heaven", "TokenMill V2", "Virtuals", "Clanker", "Clanker V4", "Moonit", "LaunchLab", "MeteoraDBC", "Zora Solana", "Cooking.City", "time.fun", "BAGS", "Circus", "Dealr", "OhFuckFun", "PrintFun", "Trend", "shout.fun", "xApple", "Sendshot", "DubDub", "cults", "OpenGameProtocol", "AMERICA.fun", "bow.fun", "Sushi Launch", "Printr", "Bankr", "Liquid", "Noice", "Flaunch", "Coinbarrel", "Blowfish", "MeMoo", "Eitherway", "Livo", "Trench", "Flap", "NOXA Fun", "hood.fun", "moto.fun", "pons", "Genius", "LONG", "Feel.cash", "EasyA Kickstart", "Doppler", "o1.exchange", "tren.ch", "StonkFun", "Launchfair", "send.fun", "hostile.xyz", "meme.fun", "Flywheel", "Realm"];

export const LEGACY = ["dogecoin", "shiba-inu", "pepe", "floki", "dogwifcoin", "bonk"];

/* Fixed history for the cycle chart. Live daily points are appended from data/history.json. */
export const CYCLE = [
  { d: "Oct 2021", t: 2021.83, mc: 88.0, ev: "2021 top" },
  { d: "Jan 2024", t: 2024.06, mc: 20.0, ev: "Bottom", gap: true },
  { d: "Mar 2024", t: 2024.2, mc: 66.0, ev: "" },
  { d: "Dec 2024", t: 2024.94, mc: 150.6, ev: "ATH" },
  { d: "Sep 2025", t: 2025.67, mc: 71.6, ev: "" },
  { d: "Nov 2025", t: 2025.84, mc: 47.2, ev: "" }
];

export const SOURCES = {
  coingecko: { name: "CoinGecko: Meme category, meme markets, global market cap, DOGE and BTC daily prices", url: "https://www.coingecko.com/en/categories/meme-token" },
  codex: { name: "Codex: on-chain launchpad memes from $10M on Solana, BNB, Base, Ethereum, Monad and Robinhood Chain", url: "https://www.codex.io" },
  defillama: { name: "DefiLlama: pump.fun daily revenue", url: "https://defillama.com/protocol/pump.fun" },
  hyperliquid: { name: "Hyperliquid: perps funding and open interest", url: "https://app.hyperliquid.xyz/trade" },
  apple: { name: "Apple: US top free iPhone apps", url: "https://rss.applemarketingtools.com/api/v2/us/apps/top-free/100/apps.json" },
  alternative: { name: "alternative.me: Crypto Fear and Greed Index", url: "https://alternative.me/crypto/fear-and-greed-index/" },
  x: { name: "FxTwitter: the latest posts of each coin's X account, to check the account is alive", url: "https://github.com/FxEmbed/FxEmbed" }
};

const RAW_SOURCE = { cgCategories: "coingecko", cgGlobal: "coingecko", cgMemes: "coingecko", cgDoge: "coingecko", cgBtc: "coingecko", codex: "codex", codexRadar: "codex", codexPinned: "codex", pump: "defillama", hl: "hyperliquid", apps: "apple", fng: "alternative" };

const NON_MEME_PERPS = new Set(["BTC", "ETH", "SOL", "HYPE", "XRP", "BNB", "SUI", "AVAX", "LINK", "ADA", "TON", "TRX", "LTC", "DOT", "NEAR", "APT", "ARB", "OP", "TIA", "SEI", "INJ", "JUP", "PYTH", "JTO", "ENA", "ONDO", "WLD", "AAVE", "UNI", "S", "TAO", "PUMP", "M"]);
const FALLBACK_MEME_SYMBOLS = ["DOGE", "SHIB", "PEPE", "BONK", "WIF", "FLOKI", "PENGU", "TRUMP", "SPX", "FARTCOIN", "POPCAT", "BRETT", "MEW", "PNUT", "MOODENG", "GOAT", "TURBO", "NEIRO", "MELANIA", "CHILLGUY", "USELESS"];

const CG_BASE = "https://api.coingecko.com/api/v3";
const CODEX_URL = "https://graph.codex.io/graphql";
const CODEX_QUERY = `query Runners($filters: TokenFilters, $offset: Int) {
  filterTokens(filters: $filters, rankings: [{attribute: circulatingMarketCap, direction: DESC}], limit: 200, offset: $offset) {
    results {
      circulatingMarketCap
      marketCap
      liquidity
      volume24
      change24
      holders
      isScam
      uniqueBuys24
      uniqueSells24
      buyCount24
      sellCount24
      txnCount24
      walletAgeAvg
      top10HoldersPercent
      sniperHeldPercentage
      bundlerHeldPercentage
      insiderHeldPercentage
      devHeldPercentage
      suspiciousHeldPercentage
      potentialScamReasons
      token { address networkId name symbol createdAt launchpad { launchpadName migrated completed } info { imageSmallUrl } socialLinks { twitter } }
    }
  }
}`;
/* Launch radar: launchpad memes born in the last 7 days that already reached $1M with real trading, hottest first */
const RADAR_QUERY = `query Radar($filters: TokenFilters, $limit: Int) {
  filterTokens(filters: $filters, rankings: [{attribute: trendingScore24, direction: DESC}], limit: $limit) {
    results {
      circulatingMarketCap
      marketCap
      liquidity
      volume24
      change24
      holders
      isScam
      uniqueBuys24
      uniqueSells24
      buyCount24
      sellCount24
      txnCount24
      walletAgeAvg
      top10HoldersPercent
      sniperHeldPercentage
      bundlerHeldPercentage
      insiderHeldPercentage
      devHeldPercentage
      suspiciousHeldPercentage
      potentialScamReasons
      token { address networkId name symbol createdAt launchpad { launchpadName migrated completed } info { imageSmallUrl } socialLinks { twitter } }
    }
  }
}`;
/* The watchlist: coins the scans miss, kept by hand as address:networkId. Their numbers still come live from Codex. */
const WATCH_QUERY = `query Watch($tokens: [String], $limit: Int) {
  filterTokens(tokens: $tokens, limit: $limit) {
    results {
      circulatingMarketCap
      marketCap
      liquidity
      volume24
      change24
      holders
      isScam
      uniqueBuys24
      uniqueSells24
      buyCount24
      sellCount24
      txnCount24
      walletAgeAvg
      top10HoldersPercent
      sniperHeldPercentage
      bundlerHeldPercentage
      insiderHeldPercentage
      devHeldPercentage
      suspiciousHeldPercentage
      potentialScamReasons
      token { address networkId name symbol createdAt launchpad { launchpadName migrated completed } info { imageSmallUrl } socialLinks { twitter } }
    }
  }
}`;
/* chain names people write (sol, bsc, base, eth, monad, hood) to Codex network ids; "address:networkId" passes through */
export function watchIds(coins) {
  const byName = {};
  for (const [nid, c] of Object.entries(CHAINS)) byName[c.id] = nid;
  const out = [];
  (Array.isArray(coins) ? coins : []).forEach((c) => {
    let id = null;
    if (typeof c === "string" && /^[^:\s]+:\d+$/.test(c.trim())) id = c.trim();
    else if (c && typeof c === "object" && c.address && byName[String(c.chain || "").toLowerCase()]) id = `${String(c.address).trim()}:${byName[String(c.chain).toLowerCase()]}`;
    if (id && !out.includes(id)) out.push(id);
  });
  return out.slice(0, 200);
}
/* Launchpads always shown on the site, whatever their numbers, plus the busiest others */
export const TRACKED_LAUNCHPADS = ["Pump.fun", "Bonk", "BAGS", "StonkFun", "pons", "Believe", "Four.meme", "Zora", "Clanker", "Heaven", "Moonshot", "Jupiter Studio", "Nad.Fun", "Printr", "Flap", "hood.fun"];
export const PINNED_LAUNCHPADS = ["StonkFun", "pons"];
const DAY = 86400000;

/* ---------- small helpers ---------- */
const num = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v))) ? null : Number(v);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);
const mean = (a) => sum(a) / a.length;
const up = (s) => String(s || "").toUpperCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysSince = (iso, now) => { const t = Date.parse(iso); return isFinite(t) ? (now - t) / DAY : Infinity; };
const round = (v, dp) => (v == null ? null : Number(v.toFixed(dp)));
const sig3 = (v) => (v == null ? null : Number(v.toPrecision(3)));

export function fmtUSD(n) {
  if (n == null) return "";
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e8) return `$${(n / 1e6).toFixed(0)}M`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
const fmtPx = (p) => (p == null ? "" : p >= 1000 ? `$${(p / 1000).toFixed(1)}K` : p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(4)}`);
const sgn = (x) => `${x > 0 ? "+" : ""}${x.toFixed(1)}%`;
/* a readable list of tickers: the first few, then how many more */
const few = (list, n = 6) => (list.length > n ? `${list.slice(0, n).join(", ")} and ${list.length - n} more` : list.join(", "));

/* ---------- fetching ---------- */
async function getJSON(url, { fetchImpl, headers = {}, method = "GET", body, timeout = 25000, retries = 2, wait = 4000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
    try {
      const res = await fetchImpl(url, { method, headers: { accept: "application/json", ...headers }, body, signal: ctrl ? ctrl.signal : undefined });
      if (res.status === 429 || res.status >= 500) { const e = new Error(`HTTP ${res.status}`); e.retry = true; throw e; }
      if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.retry = false; throw e; }
      return await res.json();
    } catch (e) {
      const retryable = e.retry === true || e.name === "AbortError" || e.name === "TypeError";
      if (!retryable || attempt >= retries) throw e;
      await sleep(wait * (attempt + 1));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

async function appsFeed(fetchImpl, wait) {
  try {
    const j = await getJSON("https://rss.applemarketingtools.com/api/v2/us/apps/top-free/100/apps.json", { fetchImpl, retries: 1, wait });
    const list = (j && j.feed && Array.isArray(j.feed.results)) ? j.feed.results : [];
    if (!list.length) throw new Error("empty feed");
    return { kind: "rss-v2", names: list.map((r) => ({ name: String(r.name || ""), id: String(r.id || "") })) };
  } catch (first) {
    const j = await getJSON("https://itunes.apple.com/us/rss/topfreeapplications/limit=100/json", { fetchImpl, retries: 1, wait });
    const list = (j && j.feed && Array.isArray(j.feed.entry)) ? j.feed.entry : [];
    if (!list.length) throw new Error(`apple feeds failed (${first.message})`);
    return { kind: "itunes-legacy", names: list.map((r) => ({ name: String((r["im:name"] && r["im:name"].label) || ""), id: String((r.id && r.id.attributes && r.id.attributes["im:id"]) || "") })) };
  }
}

/* Codex: every launchpad meme from $10M on the chains Fomo trades. Paged by 200, biggest first. */
async function codexRunners(fetchImpl, key, maxPages, wait) {
  const results = [];
  let truncated = false;
  for (let page = 0; page < maxPages; page++) {
    const j = await getJSON(CODEX_URL, {
      fetchImpl, wait, retries: 1, method: "POST",
      headers: { "content-type": "application/json", authorization: key },
      body: JSON.stringify({
        query: CODEX_QUERY,
        variables: {
          offset: page * 200,
          filters: {
            network: Object.keys(CHAINS).map(Number),
            launchpadName: LAUNCHPADS,
            circulatingMarketCap: { gte: 10000000 },
            liquidity: { gte: 50000 },
            volume24: { gte: 25000 }
          }
        }
      })
    });
    if (j && Array.isArray(j.errors) && j.errors.length) throw new Error(`codex: ${j.errors.map((e) => e.message).join("; ").slice(0, 200)}`);
    const rows = j && j.data && j.data.filterTokens && Array.isArray(j.data.filterTokens.results) ? j.data.filterTokens.results : null;
    if (!rows) throw new Error("codex: no results field");
    results.push(...rows);
    if (rows.length < 200) break;
    if (page === maxPages - 1) truncated = true;
    await sleep(300);
  }
  return { results, truncated };
}

/* pads: which launchpads to scan. The pinned ones get a call of their own, so they are never crowded out of the top 100. */
async function codexRadar(fetchImpl, key, wait, now, pads = LAUNCHPADS, limit = 200) {
  const j = await getJSON(CODEX_URL, {
    fetchImpl, wait, retries: 1, method: "POST",
    headers: { "content-type": "application/json", authorization: key },
    body: JSON.stringify({
      query: RADAR_QUERY,
      variables: {
        filters: {
          network: Object.keys(CHAINS).map(Number),
          launchpadName: pads,
          circulatingMarketCap: { gte: 1000000 },
          liquidity: { gte: 20000 },
          volume24: { gte: 20000 },
          tokenCreatedAt: { gte: Math.floor(now / 1000) - 7 * 86400 }
        },
        limit
      }
    })
  });
  if (j && Array.isArray(j.errors) && j.errors.length) throw new Error(`codex radar: ${j.errors.map((e) => e.message).join("; ").slice(0, 200)}`);
  const rows = j && j.data && j.data.filterTokens && Array.isArray(j.data.filterTokens.results) ? j.data.filterTokens.results : null;
  if (!rows) throw new Error("codex radar: no results field");
  return { results: rows };
}

async function codexWatch(fetchImpl, key, wait, tokens) {
  const j = await getJSON(CODEX_URL, {
    fetchImpl, wait, retries: 1, method: "POST",
    headers: { "content-type": "application/json", authorization: key },
    body: JSON.stringify({ query: WATCH_QUERY, variables: { tokens, limit: Math.min(200, tokens.length) } })
  });
  if (j && Array.isArray(j.errors) && j.errors.length) throw new Error(`codex watchlist: ${j.errors.map((e) => e.message).join("; ").slice(0, 200)}`);
  const rows = j && j.data && j.data.filterTokens && Array.isArray(j.data.filterTokens.results) ? j.data.filterTokens.results : null;
  if (!rows) throw new Error("codex watchlist: no results field");
  return { results: rows };
}

/* The fields the engine reads from a Codex answer, so a kept snapshot stays small */
export function slimCodex(data) {
  if (!data || !Array.isArray(data.results)) return null;
  const out = { results: data.results.map((r) => ({
    circulatingMarketCap: r.circulatingMarketCap, marketCap: r.marketCap, liquidity: r.liquidity, volume24: r.volume24, change24: r.change24, holders: r.holders, isScam: r.isScam,
    uniqueBuys24: r.uniqueBuys24, uniqueSells24: r.uniqueSells24, buyCount24: r.buyCount24, sellCount24: r.sellCount24, txnCount24: r.txnCount24, walletAgeAvg: r.walletAgeAvg,
    top10HoldersPercent: r.top10HoldersPercent, sniperHeldPercentage: r.sniperHeldPercentage, bundlerHeldPercentage: r.bundlerHeldPercentage, insiderHeldPercentage: r.insiderHeldPercentage, devHeldPercentage: r.devHeldPercentage, suspiciousHeldPercentage: r.suspiciousHeldPercentage, potentialScamReasons: r.potentialScamReasons,
    token: r.token ? { address: r.token.address, networkId: r.token.networkId, name: r.token.name, symbol: r.token.symbol, createdAt: r.token.createdAt, isScam: r.token.isScam, launchpad: r.token.launchpad ? { launchpadName: r.token.launchpad.launchpadName } : null,
      info: r.token.info && r.token.info.imageSmallUrl ? { imageSmallUrl: r.token.info.imageSmallUrl } : null, socialLinks: r.token.socialLinks && r.token.socialLinks.twitter ? { twitter: r.token.socialLinks.twitter } : null } : null
  })) };
  if (data.truncated != null) out.truncated = data.truncated;
  return out;
}

/* Pull every source once. CoinGecko calls run one after another to stay inside its limits.
   codexCache: a recent Codex snapshot ({ at, codex, codexRadar, codexPinned }). When given, Codex is not called:
   its free plan has 10,000 compute units a month, so on-chain data is refreshed every couple of hours, not every run. */
export async function collect({ fetchImpl = globalThis.fetch, cgKey = "", codexKey = "", codexPages = 2, codexCache = null, watch = [], now = Date.now(), gapMs, retryWaitMs, log = () => {} } = {}) {
  const raw = { v: 2, at: new Date(now).toISOString(), codexEnabled: Boolean(codexKey), watchKey: watch.join(",") };
  const task = async (key, fn) => {
    const t0 = Date.now();
    try { raw[key] = { ok: true, data: await fn(), ms: Date.now() - t0 }; }
    catch (e) { raw[key] = { ok: false, error: String((e && e.message) || e), ms: Date.now() - t0 }; log(`${key}: ${raw[key].error}`); }
  };
  const cgHeaders = cgKey ? { "x-cg-demo-api-key": cgKey } : {};
  const gap = gapMs != null ? gapMs : (cgKey ? 1200 : 3000);
  const wait = retryWaitMs != null ? retryWaitMs : 4000;
  const cg = (path) => getJSON(CG_BASE + path, { fetchImpl, headers: cgHeaders, wait: retryWaitMs != null ? retryWaitMs : (cgKey ? 3000 : 12000) });
  const memesUrl = (page) => `/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=7d%2C30d`;
  const coingecko = (async () => {
    await task("cgCategories", () => cg("/coins/categories"));
    await sleep(gap); await task("cgGlobal", () => cg("/global"));
    await sleep(gap); await task("cgMemes", async () => {
      const first = await cg(memesUrl(1));
      const last = Array.isArray(first) && first.length ? num(first[first.length - 1].market_cap) : 0;
      if (Array.isArray(first) && first.length === 250 && last >= 10e6) {
        await sleep(gap);
        const second = await cg(memesUrl(2));
        return first.concat(Array.isArray(second) ? second : []);
      }
      return first;
    });
    await sleep(gap); await task("cgDoge", () => cg("/coins/dogecoin/market_chart?vs_currency=usd&days=240&interval=daily"));
    await sleep(gap); await task("cgBtc", () => cg("/coins/bitcoin/market_chart?vs_currency=usd&days=240&interval=daily"));
  })();
  const others = Promise.all([
    task("pump", () => getJSON("https://api.llama.fi/summary/fees/pump.fun?dataType=dailyRevenue", { fetchImpl, wait })),
    task("hl", () => getJSON("https://api.hyperliquid.xyz/info", { fetchImpl, wait, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) })),
    task("fng", () => getJSON("https://api.alternative.me/fng/?limit=1", { fetchImpl, wait })),
    task("apps", () => appsFeed(fetchImpl, wait)),
    codexKey ? (async () => {
      const watchLive = () => (watch.length ? task("codexWatch", () => codexWatch(fetchImpl, codexKey, wait, watch)) : null);
      if (codexCache && codexCache.codex) {
        for (const k of ["codex", "codexRadar", "codexPinned"]) raw[k] = codexCache[k] ? { ok: true, data: codexCache[k], ms: 0, cached: true } : { ok: false, error: "not in the snapshot" };
        raw.codexAt = codexCache.at || null;
        /* a changed watchlist is asked for at once; an unchanged one rides on the snapshot */
        if (watch.length) {
          if (codexCache.codexWatch && codexCache.watchKey === raw.watchKey) raw.codexWatch = { ok: true, data: codexCache.codexWatch, ms: 0, cached: true };
          else await watchLive();
        }
        return;
      }
      await task("codex", () => codexRunners(fetchImpl, codexKey, Math.max(1, codexPages), wait));
      await task("codexRadar", () => codexRadar(fetchImpl, codexKey, wait, now));
      await task("codexPinned", () => codexRadar(fetchImpl, codexKey, wait, now, PINNED_LAUNCHPADS, 25));
      await watchLive();
      raw.codexAt = raw.at;
    })() : Promise.resolve()
  ]);
  await Promise.all([coingecko, others]);
  return raw;
}

/* ---------- X accounts: who they are and whether they still post ---------- */
/* compute() leaves what the next check should ask for under this key; JSON never writes it out */
export const NEEDS = Symbol.for("oldhawk.socialNeeds");
const PAGE_DAYS = 30, CHECK_HOURS = 20, GONE_DAYS = 7;
const sinceMs = (t, now) => { const x = Date.parse(t || ""); return isFinite(x) ? now - x : 1e15; };
/* Listed coins over 10 days and $10M without a recent CoinGecko coin page, then every X account that is due:
   never checked first, then the ones whose last check failed (again on the next run, then every 3 hours), then the
   oldest checks. Hottest coins first. */
export function socialNeeds(rows, socials, now) {
  const out = { pages: [], handles: [] };
  if (!Array.isArray(rows)) return out;
  const pages = (socials && socials.pages) || {}, xs = (socials && socials.x) || {};
  const ageOf = (r) => (r.a != null ? r.a : r.minAge);
  const heat = (a, b) => (b.d != null ? b.d : -1e9) - (a.d != null ? a.d : -1e9) || b.m - a.m;
  const cands = rows.filter((r) => r.m >= SERIOUS.minMC && ageOf(r) != null && ageOf(r) >= SERIOUS.minAgeDays).sort(heat);
  cands.forEach((r) => { if ((r.src === "cg" || r.src === "both") && (!pages[r.id] || sinceMs(pages[r.id].at, now) > PAGE_DAYS * DAY)) out.pages.push(r.id); });
  const seen = new Set(), due = [];
  cands.forEach((r) => {
    const h = handleFor(r, socials).h;
    if (!h || seen.has(h.toLowerCase())) return;
    seen.add(h.toLowerCase());
    const a = xs[h.toLowerCase()], since = a ? sinceMs(a.at, now) : 1e15;
    const pri = !a ? 0 : a.gone ? (since > GONE_DAYS * DAY ? 3 : null) : a.miss ? (since > (a.miss >= 2 ? 3 * 3600000 : 20 * 60000) ? 1 : null) : since > CHECK_HOURS * 3600000 ? 2 : null;
    if (pri != null) due.push({ h, pri, since });
  });
  due.sort((a, b) => a.pri - b.pri || b.since - a.since);
  out.handles = due.map((x) => x.h);
  return out;
}

const FX = "https://api.fxtwitter.com";
const FX_UA = "oldhawk-line/2.4 (+https://github.com/oldhawk007xd/oldhawk-line)";
async function fxGet(path, fetchImpl, timeout = 15000) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
  try {
    const res = await fetchImpl(FX + path, { headers: { accept: "application/json", "user-agent": FX_UA }, signal: ctrl ? ctrl.signal : undefined });
    let j = null;
    try { j = await res.json(); } catch { j = null; }
    return { status: res.status, j };
  } catch (e) {
    return { status: 0, error: String((e && e.message) || e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
/* The newest post of an X account and its followers, read from its own posts (reposts of others do not count).
   FxTwitter has hiccups: the posts call can answer 404, or an empty timeline, for an account that is fine, and the
   profile can say "not found" for one that exists. So a 404 is checked against the profile and asked again; an
   empty timeline counts as quiet only when the profile says the account has never posted; "suspended" is believed,
   "not found" is only noted, and refreshSocials() trusts it after a streak that lasts a day. */
export async function xLatest(handle, { fetchImpl = globalThis.fetch, wait = 2500 } = {}) {
  let profile = null, notFound = false;
  const askProfile = async () => {
    const p = await fxGet(`/${encodeURIComponent(handle)}`, fetchImpl);
    const msg = String((p.j && p.j.message) || "");
    if (p.status === 404 && /suspended/i.test(msg)) return "suspended";
    if (p.status === 404 && /not found/i.test(msg)) notFound = true;
    if (p.status === 200 && p.j && p.j.user) profile = { fol: num(p.j.user.followers), tweets: num(p.j.user.tweets) };
    return null;
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fxGet(`/2/profile/${encodeURIComponent(handle)}/statuses`, fetchImpl);
    if (r.status === 200 && r.j && Array.isArray(r.j.results)) {
      const own = r.j.results.filter((p) => p && p.author && String(p.author.screen_name || "").toLowerCase() === handle.toLowerCase());
      const ts = own.map((p) => num(p.created_timestamp)).filter((t) => t > 0);
      if (ts.length) return { ok: true, post: Math.max(...ts), fol: num(own[0].author.followers), n: own.length };
      if (!profile && (await askProfile()) === "suspended") return { gone: "suspended" };
      if (profile && profile.tweets === 0) return { ok: true, post: null, fol: profile.fol, n: 0 };
    } else if (r.status === 404 && !profile) {
      if ((await askProfile()) === "suspended") return { gone: "suspended" };
    }
    if (attempt === 0) await sleep(wait);
  }
  return { fail: true, notFound: notFound && !profile };
}
/* Asks for what socialNeeds() listed, within limits: CoinGecko coin pages share the demo key's 30 calls a minute,
   so they go one every 2.5 s, at most maxPages a run, and stop at the first 429. X accounts go one a second.
   An account is marked gone only when two checks in a row say so. Returns the updated socials and what happened. */
export async function refreshSocials(socials, needs, { fetchImpl = globalThis.fetch, cgKey = "", now = Date.now(), maxPages = 20, maxChecks = 60, budgetMs = 150000, gapMs, cgGapMs, retryWaitMs, log = () => {} } = {}) {
  const s = socials && socials.v === 1 ? socials : { v: 1, pages: {}, x: {} };
  s.pages = s.pages || {}; s.x = s.x || {};
  const t0 = Date.now(), at = new Date(now).toISOString();
  const stats = { pages: 0, pageFails: 0, checks: 0, answered: 0, gone: 0, fails: 0 };
  const cgHeaders = cgKey ? { "x-cg-demo-api-key": cgKey } : {};
  const cgGap = cgGapMs != null ? cgGapMs : (cgKey ? 2500 : 6500);
  /* accounts learned from a coin page are new: they are checked in this same run, before the routine re-checks */
  const handles = ((needs && needs.handles) || []).slice();
  const learn = (x) => {
    if (!x || handles.some((h) => h.toLowerCase() === x.toLowerCase())) return;
    const a = s.x[x.toLowerCase()];
    if (a && !a.miss && sinceMs(a.at, now) < CHECK_HOURS * 3600000) return;
    const i = handles.findIndex((h) => s.x[h.toLowerCase()]);
    handles.splice(i < 0 ? handles.length : i, 0, x);
  };
  for (const id of ((needs && needs.pages) || []).slice(0, maxPages)) {
    if (Date.now() - t0 > budgetMs / 2) break;
    try {
      const j = await getJSON(`${CG_BASE}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, { fetchImpl, headers: cgHeaders, retries: 0 });
      s.pages[id] = { x: xHandle(j && j.links && j.links.twitter_screen_name), at };
      learn(s.pages[id].x);
      stats.pages++;
    } catch (e) {
      stats.pageFails++;
      log(`coin page ${id}: ${e.message}`);
      if (/HTTP 429/.test(e.message)) break;
    }
    await sleep(cgGap);
  }
  const gap = gapMs != null ? gapMs : 1000;
  const got = [];
  for (const h of handles.slice(0, maxChecks)) {
    if (Date.now() - t0 > budgetMs) break;
    got.push([h, await xLatest(h, { fetchImpl, wait: retryWaitMs != null ? retryWaitMs : 2500 })]);
    await sleep(gap);
  }
  /* if most accounts in one run come back suspended, FxTwitter is failing, not the accounts: nothing is marked gone */
  const outage = got.filter(([, r]) => r.gone).length > Math.max(3, got.length / 2);
  for (const [h, r] of got) {
    const k = h.toLowerCase(), prev = s.x[k] || {};
    stats.checks++;
    if (r.ok) { s.x[k] = { h, post: r.post, fol: r.fol, at, ok: at }; stats.answered++; }
    else if (r.gone && !outage && prev.maybeGone) { s.x[k] = { h, gone: r.gone, at }; stats.gone++; }
    else if (r.gone && !outage) { s.x[k] = { ...prev, h, at, miss: (prev.miss || 0) + 1, maybeGone: r.gone }; stats.gone++; }
    else if (r.notFound) {
      /* "not found" three times in a row, the first a day or more ago: the account is gone */
      const nf = (prev.nf || 0) + 1, nfAt = prev.nfAt || at;
      if (nf >= 3 && sinceMs(nfAt, now) >= DAY) { s.x[k] = { h, gone: "not found", at }; stats.gone++; }
      else { s.x[k] = { ...prev, h, at, miss: (prev.miss || 0) + 1, nf, nfAt }; stats.fails++; }
    }
    else { s.x[k] = { ...prev, h, at, miss: (prev.miss || 0) + 1 }; stats.fails++; }
  }
  if (stats.answered || stats.gone) s.lastOk = at;
  s.at = at;
  s.last = stats;
  /* entries nobody asked about for 90 days belong to coins that left the list */
  const stale = (t) => sinceMs(t, now) > 90 * DAY;
  for (const [k, v] of Object.entries(s.pages)) if (stale(v.at)) delete s.pages[k];
  for (const [k, v] of Object.entries(s.x)) if (stale(v.at)) delete s.x[k];
  return { socials: s, stats };
}

/* ---------- analysis helpers ---------- */
function excluded(c) {
  const id = String(c.id || "").toLowerCase();
  const name = String(c.name || "");
  const sym = String(c.symbol || "").toLowerCase();
  if (/^binance-peg|bridged|wrapped/.test(id) || /binance-peg|bridged|wrapped/i.test(name)) return "bridged copy";
  if (id === "pump-fun" || (sym === "pump" && /pump/i.test(name))) return "launchpad token";
  if (id === "memecore" || (sym === "m" && /memecore/i.test(name))) return "meme-branded L1";
  return null;
}

const smaEnd = (arr, n, end) => (end - n < 0 ? null : mean(arr.slice(end - n, end)));

/* CoinGecko market_chart: daily points at 00:00 UTC (each one closes the day before) plus one live point. */
function trend(chart) {
  const p = (chart && Array.isArray(chart.prices)) ? chart.prices.filter((x) => Array.isArray(x) && num(x[1]) != null) : [];
  if (p.length < 60) return null;
  const last = p[p.length - 1];
  const c = p.slice(0, -1).map((x) => Number(x[1]));
  const price = Number(last[1]);
  const s200 = smaEnd(c, 200, c.length), s50 = smaEnd(c, 50, c.length), s200ago = smaEnd(c, 200, c.length - 20);
  const run = (len) => {
    let k = 0;
    for (let i = c.length - 1; i >= 0 && k < 30; i--) {
      const s = smaEnd(c, len, i + 1);
      if (s == null || c[i] >= s) break;
      k++;
    }
    return k;
  };
  return {
    price, at: Number(last[0]), sma200: s200, sma50: s50, sma200ago: s200ago,
    mayer: s200 ? price / s200 : null,
    above200: s200 ? price > s200 : null,
    rising200: (s200 && s200ago) ? s200 > s200ago : null,
    closesBelow200: s200 ? run(200) : null,
    closesBelow50: s50 ? run(50) : null,
    change30: c.length >= 30 ? price / c[c.length - 30] - 1 : null
  };
}

/* Runner rows from both sources share one shape. Volume must be at least $25K and 0.1% of market cap. */
const active = (mc, vol) => vol >= Math.max(25e3, mc * 0.001);

function cgRow(c, now) {
  const low = daysSince(c.atl_date, now), high = daysSince(c.ath_date, now);
  return {
    id: String(c.id), s: up(c.symbol), n: String(c.name || ""), c: LISTED.id, m: num(c.market_cap), v: num(c.total_volume) || 0,
    lp: null, a: null, lowDays: isFinite(low) ? Math.round(low) : null,
    fromHigh: round(num(c.ath_change_percentage), 1),
    d: round(num(c.price_change_percentage_24h), 1),
    fresh: low <= 90 && high <= 90, src: "cg",
    /* the coin is at least as old as its all-time low and high, the only dates CoinGecko gives here */
    minAge: isFinite(low) && isFinite(high) ? Math.max(low, high) : null,
    img: logoUrl(c.image)
  };
}

function codexRow(r, now) {
  const t = r && r.token;
  if (!t || r.isScam === true || t.isScam === true) return null;
  const chain = CHAINS[num(t.networkId)];
  if (!chain) return null;
  const mc = num(r.circulatingMarketCap) || num(r.marketCap);
  if (!mc) return null;
  const created = num(t.createdAt);
  const age = created ? (now - created * 1000) / DAY : null;
  return {
    id: `${chain.id}:${t.address}`, s: up(t.symbol), n: String(t.name || ""), c: chain.id, m: mc, v: num(r.volume24) || 0,
    lq: num(r.liquidity), h: num(r.holders), lp: (t.launchpad && t.launchpad.launchpadName) || null,
    a: age != null && age >= 0 ? Math.round(age * 10) / 10 : null, lowDays: null, fromHigh: null,
    /* a coin younger than a day has no 24h move: its change is measured from the launch price */
    d: age != null && age < 1 ? null : num(r.change24) != null ? round(num(r.change24) * 100, 1) : null,
    fresh: age != null && age <= 90, src: "onchain", address: String(t.address || ""),
    img: logoUrl(t.info && t.info.imageSmallUrl), xu: xHandle(t.socialLinks && t.socialLinks.twitter),
    /* who is trading it, over 24h, and how much of the supply a few hands hold */
    q: { ub: num(r.uniqueBuys24), us: num(r.uniqueSells24), bc: num(r.buyCount24), sc: num(r.sellCount24), tx: num(r.txnCount24), wa: num(r.walletAgeAvg),
         t10: num(r.top10HoldersPercent), snp: num(r.sniperHeldPercentage), bnd: num(r.bundlerHeldPercentage), ins: num(r.insiderHeldPercentage), dev: num(r.devHeldPercentage), sus: num(r.suspiciousHeldPercentage),
         flags: Array.isArray(r.potentialScamReasons) ? r.potentialScamReasons.filter(Boolean).map(String) : null }
  };
}

/* the trading and holder facts kept with an on-chain coin, so anyone can check why it counts */
function qOut(r) {
  if (!r.q) return null;
  const o = {};
  for (const [k, v] of Object.entries(r.q)) {
    if (Array.isArray(v)) { if (v.length) o[k] = v.slice(0, 6); }
    else if (v != null) o[k] = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 1000) / 1000;
  }
  return Object.keys(o).length ? o : null;
}
export const tickerKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9\u0080-\uffff]/g, "");
/* the same coin seen twice: one ticker (spaces and marks aside) and either a close market cap or the same name */
const nameKey = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9\u0080-\uffff]/g, "");
const sameCoin = (x, y) => tickerKey(x.s) === tickerKey(y.s) && (Math.abs(Math.log(x.m / y.m)) <= Math.log(1.35) || (nameKey(x.n).length > 2 && nameKey(x.n) === nameKey(y.n)));

/* Depth checks for coins only Codex sees. A wave of look-alike launches can print a big market cap with a few
   thousand wallets; a real meme has at least one holder per $8,000 of market cap (or, where Codex has no holder
   count, pool liquidity of 2% of it). A ticker launched over and over is a clone: one of them is kept only when it
   clearly leads the rest, with 3 times their holders and a floor of its own. */
export const MC_PER_HOLDER = 8000;
export const deepEnough = (r) => (r.h > 0 ? r.m / r.h <= MC_PER_HOLDER : (r.lq || 0) >= r.m * 0.02);
/* Rigged markets, measured on real coins: a few hands hold the supply, buyers who never sell, or a handful of wallets
   trading with themselves to paint a chart. A check runs only when Codex has its numbers.
   held: insiders, snipers, bundlers and the dev hold 20% or more of the supply together
   bundled: Codex marks it a bundled launch, one group buying the supply over many wallets in the first block
   oneway: 100+ buyers in 24h and fewer than one seller for every ten buyers
   bots: under 30 days old, 500+ trades and more than 25 trades per wallet, or 200+ trades by fewer than 30 wallets */
export function rigged(r) {
  const q = r.q || {};
  if (q.sus != null && q.sus >= 20) return "held";
  if (Array.isArray(q.flags) && q.flags.includes("BundledLaunch")) return "bundled";
  if (q.ub != null && q.us != null && q.ub >= 100 && q.us < q.ub * 0.1) return "oneway";
  const young = r.a != null && r.a < 30, w = (q.ub || 0) + (q.us || 0);
  if (young && q.tx != null && ((q.tx >= 500 && w > 0 && q.tx / w > 25) || (q.tx >= 200 && q.ub != null && q.us != null && w < 30))) return "bots";
  return null;
}
/* tickers held by more than one token address in a Codex answer, with every holder count seen for them */
export function cloneGroups(list) {
  const g = new Map();
  list.forEach((r) => {
    const k = tickerKey(r.s); if (!k) return;
    if (!g.has(k)) g.set(k, new Map());
    const byAddr = g.get(k), a = r.address || r.id, prev = byAddr.get(a);
    if (!prev || (r.h || 0) > prev) byAddr.set(a, r.h || 0);
  });
  const out = new Map();
  g.forEach((byAddr, k) => { if (byAddr.size > 1) out.set(k, byAddr); });
  return out;
}
/* a clone survives only as the clear leader of its ticker */
export function cloneLeads(r, groups, floor) {
  const byAddr = groups.get(tickerKey(r.s));
  if (!byAddr) return true;
  const mine = r.h || 0, a = r.address || r.id;
  if (mine < floor) return false;
  for (const [addr, h] of byAddr) if (addr !== a && mine < 3 * h) return false;
  return true;
}

/* ---------- logos and X accounts ---------- */
/* A logo is the image the project itself gave CoinGecko or its launchpad, kept as an https address.
   CoinGecko sends the large size; the small one (about 64px) is plenty for a list. */
export function logoUrl(u) {
  if (typeof u !== "string") return null;
  const v = u.trim();
  if (v.length > 400 || !/^https:\/\/[^\s"'<>\\]+$/.test(v)) return null;
  return v.replace(/(\/coins\/images\/\d+\/)(large|thumb)\//, "$1small/");
}
/* The X account behind a link or a name: x.com/name, twitter.com/name, @name or name.
   A post, a community, a search or a list is not an account, so it gives none. */
const NOT_HANDLES = new Set(["i", "home", "intent", "search", "share", "hashtag", "explore", "settings", "messages", "notifications", "login", "signup", "tos", "privacy", "compose"]);
export function xHandle(v) {
  if (v == null) return null;
  let h = String(v).trim();
  if (!h) return null;
  const m = h.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/(.*)$/i);
  if (m) {
    const parts = m[1].split(/[?#]/)[0].split("/").filter(Boolean);
    if (parts.length !== 1) return null;
    h = parts[0];
  } else if (/[/.:]/.test(h)) return null;
  h = h.replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(h) && !NOT_HANDLES.has(h.toLowerCase()) ? h : null;
}
/* What a coin needs before the site names it as trending: a life of its own, a real size, and an X account
   that is alive. Followers and posts are read from the account itself. A coin that exists only on-chain and links
   an account with a million followers or more has borrowed a famous account (a brand, a celebrity), not its own. */
export const SERIOUS = { minAgeDays: 10, minMC: 10e6, activeDays: 14, minFollowers: 1000, borrowedFollowers: 1e6 };
export const SOCIAL_WHY = {
  young: "younger than 10 days",
  nox: "no X account of their own",
  xwait: "X account not checked yet",
  xgone: "X account suspended or deleted",
  xquiet: "no post on X in 14 days",
  xsmall: "fewer than 1,000 followers on X",
  xborrowed: "linked to a famous X account that is not theirs"
};
/* the X account of a coin: CoinGecko's coin page first for listed coins, else the link set on its launchpad */
function handleFor(r, socials) {
  const pages = (socials && socials.pages) || {};
  if (r.src === "cg" || r.src === "both") {
    const p = pages[r.id];
    if (p && p.x) return { h: p.x };
    if (!p && !r.xu) return { h: null, wait: true };
  }
  return { h: r.xu || null };
}
export function xStatus(handle, socials, now) {
  if (!handle) return { ok: false, why: "nox" };
  const a = socials && socials.x ? socials.x[handle.toLowerCase()] : null;
  if (!a || (!a.ok && !a.gone)) return { ok: false, why: "xwait" };
  if (a.gone) return { ok: false, why: "xgone" };
  const days = a.post ? (now / 1000 - a.post) / 86400 : null;
  if (days == null || days > SERIOUS.activeDays) return { ok: false, why: "xquiet", days };
  if (a.fol == null || a.fol < SERIOUS.minFollowers) return { ok: false, why: "xsmall", days, fol: a.fol };
  return { ok: true, days: Math.max(0, days), fol: a.fol };
}
/* one coin against the rules: { ok, why, h, days, fol } */
export function seriousCheck(r, socials, now) {
  const age = r.a != null ? r.a : r.minAge != null ? r.minAge : null;
  if (!(r.m >= SERIOUS.minMC)) return { ok: false, why: "small" };
  if (age == null || age < SERIOUS.minAgeDays) return { ok: false, why: "young" };
  const hf = handleFor(r, socials);
  if (hf.wait) return { ok: false, why: "xwait" };
  const x = xStatus(hf.h, socials, now);
  if (!x.ok) return { ok: false, why: x.why, h: hf.h };
  if ((r.src === "onchain" || r.src === "watch") && x.fol >= SERIOUS.borrowedFollowers) return { ok: false, why: "xborrowed", h: hf.h };
  return { ok: true, h: hf.h, days: x.days, fol: x.fol };
}

function tierOf(m) {
  let ti = -1;
  LADDER.forEach((t, i) => { if (m >= t.min) ti = i; });
  return ti;
}

const rule = (id, text, hit, value, last) => ({ id, text, hit: hit == null ? null : Boolean(hit), value: value || "", last: last || "" });

export function zoneFor(line) {
  if (line == null) return null;
  return ZONES.find((z) => line >= z.from && line < z.to) || ZONES[ZONES.length - 1];
}

/* ---------- the reading ---------- */
export function compute(raw, opts = {}) {
  const now = opts.now != null ? opts.now : (Date.parse(raw.at) || Date.now());
  const history = Array.isArray(opts.history) ? opts.history : [];
  const ok = (k) => Boolean(raw[k] && raw[k].ok);

  const catList = ok("cgCategories") && Array.isArray(raw.cgCategories.data) ? raw.cgCategories.data : null;
  const cat = catList ? (catList.find((c) => c && c.id === "meme-token") || null) : null;
  const glob = ok("cgGlobal") && raw.cgGlobal.data ? (raw.cgGlobal.data.data || null) : null;
  const mk = ok("cgMemes") && Array.isArray(raw.cgMemes.data) ? raw.cgMemes.data.filter((c) => c && num(c.market_cap) > 0) : null;
  const doge = ok("cgDoge") ? trend(raw.cgDoge.data) : null;
  const btc = ok("cgBtc") ? trend(raw.cgBtc.data) : null;

  /* Universe: CoinGecko Meme category minus launchpad tokens, meme-branded L1s and bridged copies */
  let eligible = null;
  const excludedList = [];
  if (mk) {
    eligible = [];
    const seen = new Set();
    for (const c of mk) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const why = excluded(c);
      if (why) excludedList.push({ id: String(c.id), symbol: up(c.symbol), name: String(c.name || ""), why, mc: num(c.market_cap) || 0, vol: num(c.total_volume) || 0 });
      else eligible.push(c);
    }
    eligible.sort((a, b) => num(b.market_cap) - num(a.market_cap));
  }
  const catMC = cat ? num(cat.market_cap) : null;
  let cleanMC = null, cleanVol = null, cleanBasis = null;
  if (catMC && mk) {
    cleanMC = catMC - sum(excludedList.map((e) => e.mc));
    const cv = num(cat.volume_24h);
    cleanVol = cv != null ? Math.max(0, cv - sum(excludedList.map((e) => e.vol))) : sum(eligible.map((c) => num(c.total_volume)));
    cleanBasis = "category total minus exclusions";
  } else if (eligible && eligible.length) {
    cleanMC = sum(eligible.map((c) => num(c.market_cap)));
    cleanVol = sum(eligible.map((c) => num(c.total_volume)));
    cleanBasis = "sum of the eligible memes listed";
  }
  const totalMC = glob && glob.total_market_cap ? num(glob.total_market_cap.usd) : null;
  const dogeRow = eligible ? eligible.find((c) => c.id === "dogecoin") : null;

  /* Runner ladder from $10M: CoinGecko memes, plus on-chain launchpad memes from Codex when it answers */
  const codexState = !raw.codexEnabled ? "off" : ok("codex") ? "live" : "offline";
  let ladder = null;
  if (eligible) {
    const thin = [];
    const rows = [];
    eligible.filter((c) => num(c.market_cap) >= LADDER[0].min).forEach((c) => {
      const r = cgRow(c, now);
      (active(r.m, r.v) ? rows : thin).push(r);
    });
    let onchainAdded = 0, onchainMatched = 0, onchainLeft = 0;
    const leftWhy = {};
    if (codexState === "live") {
      const list = (raw.codex.data && Array.isArray(raw.codex.data.results) ? raw.codex.data.results : [])
        .map((r) => codexRow(r, now)).filter((r) => r && r.m >= LADDER[0].min && active(r.m, r.v))
        .sort((a, b) => (b.lq || 0) - (a.lq || 0));
      const clones = cloneGroups(list);
      const listed = new Set(rows.filter((x) => x.src === "cg").map((x) => tickerKey(x.s)));
      const kept = [];
      list.forEach((r) => { if (!kept.some((k) => sameCoin(k, r))) kept.push(r); });
      kept.forEach((r) => {
        const match = rows.find((x) => x.src === "cg" && !x.linked && sameCoin(x, r));
        if (match) {
          match.linked = true; match.c = r.c; match.lp = r.lp; match.a = r.a; match.h = r.h; match.address = r.address;
          match.img = match.img || r.img; match.xu = r.xu;
          match.fresh = match.fresh || r.fresh; match.src = "both"; onchainMatched++;
          return;
        }
        /* only Codex sees it: it has to be deep enough, and not a copy of a listed ticker or of other launches */
        const lookalike = listed.has(tickerKey(r.s)) && (r.h || 0) < 20000;
        const why = !deepEnough(r) ? "shallow" : lookalike || !cloneLeads(r, clones, 20000) ? "clone" : rigged(r);
        if (why) { onchainLeft++; leftWhy[why] = (leftWhy[why] || 0) + 1; return; }
        rows.push(r); onchainAdded++;
      });
    }
    /* the hand-kept watchlist: counted like any runner once it has $10M and real trading, never twice */
    let watchAdded = 0;
    const watchRaw = ok("codexWatch") && raw.codexWatch.data && Array.isArray(raw.codexWatch.data.results) ? raw.codexWatch.data.results : [];
    watchRaw.map((r) => codexRow(r, now)).filter((r) => r && r.m >= LADDER[0].min && active(r.m, r.v)).forEach((r) => {
      if (rows.some((x) => (x.address && x.address === r.address) || sameCoin(x, r))) return;
      r.src = "watch"; rows.push(r); watchAdded++;
    });
    rows.sort((a, b) => b.m - a.m);
    rows.forEach((r) => {
      const ti = tierOf(r.m), t = LADDER[ti], next = LADDER[ti + 1] || null;
      r.t = ti;
      r.cushion = r.m / t.min - 1;
      r.toNext = next ? next.min / r.m - 1 : null;
      r.isNew = r.a != null && r.a <= 7;
    });
    const counts = LADDER.map((t) => rows.filter((r) => r.m >= t.min).length);
    const group = (key, names) => {
      const map = new Map();
      rows.forEach((r) => { const k = r[key]; if (k) map.set(k, (map.get(k) || 0) + 1); });
      return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ id: k, name: names ? names(k) : k, count: n }));
    };
    const chainName = (id) => { const c = Object.values(CHAINS).find((x) => x.id === id); return c ? c.name : LISTED.name; };
    /* a coin is named in the highlights only once it has 10 days behind it */
    const named = (r) => { const age = r.a != null ? r.a : r.minAge; return age != null && age >= SERIOUS.minAgeDays; };
    ladder = {
      tiers: LADDER.map((t, i) => ({ label: t.label, min: t.min, scored: t.w > 0, w: t.w, cold: t.cold != null ? t.cold : null, hot: t.hot != null ? t.hot : null, est: Boolean(t.est), count: counts[i] })),
      counts,
      wlp: LADDER.reduce((s, t, i) => s + t.w * counts[i], 0),
      wlpCold: LADDER.reduce((s, t) => s + t.w * (t.cold || 0), 0),
      wlpHot: LADDER.reduce((s, t) => s + t.w * (t.hot || 0), 0),
      fresh: rows.filter((r) => r.fresh && r.m >= 100e6).length,
      fresh10: rows.filter((r) => r.fresh).length,
      newWeek: rows.filter((r) => r.isNew).slice(0, 12).map((r) => ({ s: r.s, n: r.n, c: r.c, m: sig3(r.m), a: r.a, lp: r.lp })),
      newWeekCount: rows.filter((r) => r.isNew).length,
      byChain: group("c", chainName),
      byLaunchpad: group("lp").slice(0, 8),
      edge: rows.filter((r) => r.t >= 2 && r.cushion < 0.05 && named(r)).sort((a, b) => a.cushion - b.cushion).slice(0, 8).map((r) => ({ s: r.s, n: r.n && r.n.toUpperCase() !== r.s ? r.n.slice(0, 40) : undefined, c: r.c, m: sig3(r.m), i: r.img || undefined, floor: LADDER[r.t].label, cushion: round(r.cushion, 4) })),
      near: rows.filter((r) => r.t >= 1 && r.toNext != null && r.toNext < 0.1 && named(r)).sort((a, b) => a.toNext - b.toNext).slice(0, 8).map((r) => ({ s: r.s, n: r.n && r.n.toUpperCase() !== r.s ? r.n.slice(0, 40) : undefined, c: r.c, m: sig3(r.m), i: r.img || undefined, next: LADDER[r.t + 1].label, toNext: round(r.toNext, 4) })),
      /* every runner carries its ticker and name, its 24h move when CoinGecko has it, and a link key:
         g = CoinGecko id for listed coins, ad = token address for on-chain-only coins */
      runners: rows.slice(0, 600).map((r) => {
        const o = { s: r.s.slice(0, 16), c: r.c, m: sig3(r.m), t: r.t };
        if (r.n && r.n.toUpperCase() !== r.s) o.n = r.n.slice(0, 40);
        if (r.img) o.i = r.img;
        if (r.lp) o.lp = r.lp;
        if (r.a != null) o.a = Math.round(r.a);
        if (r.d != null && isFinite(r.d)) o.d = r.d;
        if (r.v) o.v = sig3(r.v);
        if (r.src === "watch") o.w = 1;
        if (r.src !== "onchain" && r.src !== "watch") o.g = String(r.id).slice(0, 80);
        else {
          if (r.address) o.ad = r.address.slice(0, 66);
          /* on-chain depth, so anyone can check a coin is real: pool liquidity and holders */
          if (r.lq) o.lq = sig3(r.lq);
          if (r.h) o.h = Math.round(r.h);
          const q = qOut(r); if (q) o.q = q;
        }
        const f = (r.fresh ? "F" : "") + (r.isNew ? "N" : "") + (r.t >= 2 && r.cushion < 0.05 ? "E" : "");
        if (f) o.f = f;
        /* under 10 days old (or not known to be older): counted, but the site does not name it */
        if (!named(r)) o.y = 1;
        return o;
      }),
      onchain: { status: codexState, added: onchainAdded, matched: onchainMatched, left: onchainLeft, why: leftWhy, watched: watchAdded, truncated: Boolean(codexState === "live" && raw.codex.data && raw.codex.data.truncated), error: codexState === "offline" ? raw.codex.error : null, at: codexState === "live" ? raw.codexAt || raw.at : null, every: raw.codexEvery || null },
      thin: thin.filter((r) => r.m >= 100e6).map((r) => ({ symbol: r.s, mc: r.m, vol: r.v })),
      excluded: excludedList.filter((e) => e.mc >= LADDER[2].min).map((e) => ({ symbol: e.symbol, name: e.name, why: e.why, mc: e.mc }))
    };
    ladder._rows = rows;

    /* Launch radar: the hottest launchpad memes of the last 7 days, from $1M up */
    const radarState = !raw.codexEnabled ? "off" : ok("codexRadar") ? "live" : "offline";
    let radarRows = [], radarLeft = 0;
    const radarWhy = {};
    if (radarState === "live") {
      const resultsOf = (k) => (ok(k) && raw[k].data && Array.isArray(raw[k].data.results) ? raw[k].data.results : []);
      const list = [...resultsOf("codexRadar"), ...resultsOf("codexPinned")]
        .map((r) => codexRow(r, now)).filter((r) => r && r.m >= 1e6 && r.a != null && r.a <= 7.5);
      /* the same depth and clone checks as the runners; a new launch needs 2,000 holders to lead its ticker */
      const runnersSeen = codexState === "live" && raw.codex.data && Array.isArray(raw.codex.data.results) ? raw.codex.data.results.map((r) => codexRow(r, now)).filter(Boolean) : [];
      const clones = cloneGroups([...list, ...runnersSeen]);
      list.forEach((r) => {
        if (radarRows.some((k) => sameCoin(k, r))) return;
        const why = !deepEnough(r) ? "shallow" : !cloneLeads(r, clones, 2000) ? "clone" : rigged(r);
        if (why) { radarLeft++; radarWhy[why] = (radarWhy[why] || 0) + 1; return; }
        radarRows.push(r);
      });
    }
    ladder.radar = {
      status: radarState,
      at: radarState === "live" ? raw.codexAt || raw.at : null,
      error: radarState === "offline" ? raw.codexRadar && raw.codexRadar.error : null,
      left: radarLeft,
      why: radarWhy,
      tokens: radarRows.slice(0, 40).map((r) => {
        const o = { s: r.s.slice(0, 16), c: r.c, m: sig3(r.m), v: sig3(r.v), a: r.a };
        if (r.h) o.h = Math.round(r.h);
        const q = qOut(r); if (q) o.q = q;
        if (r.n && r.n.toUpperCase() !== r.s) o.n = r.n.slice(0, 40);
        if (r.lp) o.lp = r.lp;
        if (r.d != null && isFinite(r.d)) o.d = r.d;
        if (r.address) o.ad = r.address.slice(0, 66);
        return o;
      })
    };

    /* Trending: the only coins the site names as hot. Each one is over 10 days old and above $10M, with an X account
       of its own that posted in the last 14 days and has 1,000 followers or more. Biggest 24h gainers first; when
       fewer than 8 are up, the most traded of the rest fill in. Fresh launches still count in the numbers above. */
    const socials = opts.socials || null;
    const checks = rows.map((r) => ({ r, k: seriousCheck(r, socials, now) }));
    const passed = checks.filter((x) => x.k.ok);
    const tWhy = {};
    checks.forEach((x) => { if (!x.k.ok && x.k.why !== "small") tWhy[x.k.why] = (tWhy[x.k.why] || 0) + 1; });
    let pick = passed.filter((x) => x.r.d != null && x.r.d > 0).sort((a, b) => b.r.d - a.r.d).slice(0, 14);
    if (pick.length < 8) pick = pick.concat(passed.filter((x) => !pick.includes(x)).sort((a, b) => b.r.v / b.r.m - a.r.v / a.r.m).slice(0, 8 - pick.length));
    ladder.trending = {
      rule: { minAgeDays: SERIOUS.minAgeDays, minMC: SERIOUS.minMC, activeDays: SERIOUS.activeDays, minFollowers: SERIOUS.minFollowers },
      pool: passed.length,
      left: checks.length - passed.length,
      why: tWhy,
      at: socials && socials.at ? socials.at : null,
      coins: pick.map(({ r, k }) => {
        const o = { s: r.s.slice(0, 16), c: r.c, m: sig3(r.m), x: k.h, xd: round(k.days, 1), fol: k.fol };
        if (r.n && r.n.toUpperCase() !== r.s) o.n = r.n.slice(0, 40);
        if (r.img) o.i = r.img;
        if (r.lp) o.lp = r.lp;
        if (r.d != null && isFinite(r.d)) o.d = r.d;
        if (r.v) o.v = sig3(r.v);
        if (r.a != null) o.a = Math.round(r.a);
        if (r.src !== "onchain" && r.src !== "watch") o.g = String(r.id).slice(0, 80);
        else if (r.address) o.ad = r.address.slice(0, 66);
        return o;
      })
    };
    ladder._passed = passed;

    /* Launchpad heat: runners above $10M and fresh launches per launchpad. The tracked ones always show. */
    const lpMap = new Map();
    const lpOf = (id) => { if (!lpMap.has(id)) lpMap.set(id, { id, chains: new Set(), runners: 0, mc: 0, top: null, fresh: 0, vol: 0, hot: null }); return lpMap.get(id); };
    TRACKED_LAUNCHPADS.forEach((id) => lpOf(id));
    rows.forEach((r) => {
      if (!r.lp) return;
      const x = lpOf(r.lp); x.runners++; x.mc += r.m; x.chains.add(r.c);
      if (!x.top || r.m > x.top.m) x.top = { s: r.s, m: r.m, d: r.d != null ? r.d : null };
    });
    radarRows.forEach((r) => {
      if (!r.lp) return;
      const x = lpOf(r.lp); x.fresh++; x.vol += r.v || 0; x.chains.add(r.c);
    });
    passed.forEach(({ r }) => {
      if (!r.lp) return;
      const x = lpOf(r.lp), d = r.d != null ? r.d : -Infinity;
      if (!x.hot || d > x.hot.dd || (d === x.hot.dd && r.m > x.hot.m)) x.hot = { s: r.s, m: r.m, d: r.d != null ? r.d : null, i: r.img, dd: d };
    });
    const heat = (x) => x.vol + x.mc * 0.02 + x.fresh * 1e5;
    const all = [...lpMap.values()].sort((a, b) => heat(b) - heat(a) || b.runners - a.runners || a.id.localeCompare(b.id));
    const shownLp = all.filter((x) => x.runners || x.fresh).slice(0, 10);
    PINNED_LAUNCHPADS.forEach((id) => { if (!shownLp.some((x) => x.id === id)) shownLp.push(lpMap.get(id)); });
    ladder.launch = shownLp.map((x) => ({
      id: x.id, chains: [...x.chains], runners: x.runners, mc: x.mc ? sig3(x.mc) : 0, fresh: x.fresh, vol: x.vol ? sig3(x.vol) : 0,
      top: x.top ? { s: x.top.s, m: sig3(x.top.m), d: x.top.d } : null,
      hot: x.hot ? { s: x.hot.s, m: sig3(x.hot.m), d: x.hot.d, i: x.hot.i || undefined } : null,
      pinned: PINNED_LAUNCHPADS.includes(x.id)
    }));
  }

  /* pump.fun revenue */
  let pump = null;
  if (ok("pump") && raw.pump.data) {
    const d = raw.pump.data;
    const chart = Array.isArray(d.totalDataChart) ? d.totalDataChart.filter((x) => Array.isArray(x) && num(x[1]) != null).map((x) => [Number(x[0]), Number(x[1])]) : [];
    let t7 = num(d.total7d), t24 = num(d.total24h);
    const t30 = num(d.total30d);
    if (t7 == null && chart.length >= 7) t7 = sum(chart.slice(-7).map((x) => x[1]));
    if (t24 == null && chart.length) t24 = chart[chart.length - 1][1];
    let low90 = null;
    if (chart.length >= 96) {
      const vals = chart.map((x) => x[1]);
      const roll = [];
      for (let i = 6; i < vals.length; i++) roll.push(mean(vals.slice(i - 6, i + 1)));
      low90 = Math.min(...roll.slice(-90));
    }
    if (t7 != null) pump = { avg7: t7 / 7, t24, avg30: t30 != null ? t30 / 30 : null, low90, day: chart.length ? new Date(chart[chart.length - 1][0] * 1000).toISOString().slice(0, 10) : null };
  }

  /* Hyperliquid meme perps */
  let hl = null;
  if (ok("hl") && Array.isArray(raw.hl.data) && raw.hl.data.length >= 2) {
    const meta = raw.hl.data[0], ctxs = raw.hl.data[1];
    const uni = (meta && Array.isArray(meta.universe)) ? meta.universe : [];
    const memeSyms = new Set(eligible ? eligible.filter((c) => num(c.market_cap) >= 50e6).map((c) => up(c.symbol)) : FALLBACK_MEME_SYMBOLS);
    let oiSum = 0, fSum = 0;
    const rows = [];
    uni.forEach((u, i) => {
      const ctx = Array.isArray(ctxs) ? ctxs[i] : null;
      if (!u || !ctx || u.isDelisted) return;
      const name = String(u.name || "");
      let base = name;
      if (!memeSyms.has(base) && /^k[A-Z0-9]/.test(base) && memeSyms.has(base.slice(1))) base = base.slice(1);
      if (!memeSyms.has(base) || NON_MEME_PERPS.has(base)) return;
      const px = num(ctx.markPx) != null ? num(ctx.markPx) : num(ctx.oraclePx);
      const oi = num(ctx.openInterest), f = num(ctx.funding);
      if (px == null || oi == null || f == null) return;
      const oiUsd = oi * px;
      if (oiUsd <= 0) return;
      oiSum += oiUsd; fSum += f * oiUsd;
      rows.push({ perp: name, symbol: base, oiUsd: Math.round(oiUsd), f8h: round(f * 8 * 100, 5) });
    });
    if (rows.length >= 3 && oiSum > 0) hl = { f8h: fSum / oiSum * 8 * 100, oiUsd: oiSum, perps: rows.length, top: rows.sort((a, b) => b.oiUsd - a.oiUsd).slice(0, 8) };
  }

  /* Fear and Greed */
  let fng = null;
  if (ok("fng")) {
    const d = raw.fng.data && Array.isArray(raw.fng.data.data) ? raw.fng.data.data[0] : null;
    if (d && num(d.value) != null) fng = { value: num(d.value), label: String(d.value_classification || ""), day: num(d.timestamp) ? new Date(num(d.timestamp) * 1000).toISOString().slice(0, 10) : null };
  }

  /* App Store */
  let apps = null;
  if (ok("apps") && raw.apps.data && Array.isArray(raw.apps.data.names) && raw.apps.data.names.length) {
    const names = raw.apps.data.names;
    const find = (re) => { const i = names.findIndex((a) => a && re.test(String(a.name || ""))); return i >= 0 ? i + 1 : null; };
    const coinbase = find(/coinbase/i), phantom = find(/phantom/i);
    const best = [coinbase, phantom].filter(Boolean).sort((a, b) => a - b)[0] || null;
    apps = { coinbase, phantom, best, size: names.length, feed: raw.apps.data.kind || "" };
  }

  /* Input values */
  const v = {
    "1.1": (cleanMC && totalMC) ? cleanMC / totalMC * 100 : null,
    "1.2": doge ? doge.mayer : null,
    "1.3": (cleanMC && dogeRow) ? num(dogeRow.market_cap) / cleanMC * 100 : null,
    "2.1": ladder ? ladder.wlp : null,
    "2.2": ladder ? ladder.fresh : null,
    "3.1": pump ? pump.avg7 / 1e6 : null,
    "4.1": cleanVol != null ? cleanVol / 1e9 : null,
    "4.2": (cleanVol != null && cleanMC) ? cleanVol / cleanMC * 100 : null,
    "4.3": hl ? hl.f8h : null,
    "6.1": fng ? fng.value : null
  };
  const freshNames = ladder ? ladder._rows.filter((r) => r.fresh && r.m >= 100e6).map((r) => r.s) : [];
  const notes = {
    "1.1": cleanMC && totalMC ? `${fmtUSD(cleanMC)} of ${fmtUSD(totalMC)} total crypto market cap` : "",
    "1.2": doge ? `DOGE ${fmtPx(doge.price)} vs 200-day ${fmtPx(doge.sma200)}` : "",
    "1.3": dogeRow && cleanMC ? `DOGE ${fmtUSD(num(dogeRow.market_cap))} of ${fmtUSD(cleanMC)}` : "",
    "2.1": ladder ? `${ladder.counts.slice(2).join(" / ")} runners above $100M / $500M / $1B / $5B / $10B` : "",
    "2.2": ladder ? (freshNames.length ? few(freshNames, 8) : "none: no token above $100M is younger than 90 days") : "",
    "3.1": pump ? `${fmtUSD(pump.t24)} on the last full day` : "",
    "4.1": cleanBasis ? `clean universe, ${cleanBasis}` : "",
    "4.2": "",
    "4.3": hl ? `${hl.perps} meme perps, ${fmtUSD(hl.oiUsd)} open interest` : "",
    "6.1": fng ? `${fng.label}, daily value of ${fng.day || "today"}` : ""
  };

  const inputs = INPUTS.map((def) => {
    const m = { id: def.id, pillar: def.pillar, name: def.name, unit: def.unit, dp: def.dp, w: def.w, cold: def.cold != null ? def.cold : null, hot: def.hot != null ? def.hot : null, est: Boolean(def.est), scale: def.scale || null, src: def.src, x: null, s: null, label: null, note: notes[def.id] || "", status: "offline" };
    if (def.id === "5.1") {
      if (apps) {
        m.status = "live";
        m.x = apps.best;
        m.s = apps.best ? clamp01((Math.log(100) - Math.log(apps.best)) / (Math.log(100) - Math.log(10))) * 100 : 0;
        m.label = apps.best ? `#${apps.best}` : `Outside the top ${apps.size}`;
        m.note = `Coinbase ${apps.coinbase ? "#" + apps.coinbase : "not ranked"}, Phantom ${apps.phantom ? "#" + apps.phantom : "not ranked"} in the US top ${apps.size}`;
      }
    } else {
      const x = v[def.id];
      if (x != null && isFinite(x)) {
        m.status = "live";
        m.x = round(x, Math.max(def.dp, 2) + 2);
        m.s = clamp01((x - def.cold) / (def.hot - def.cold)) * 100;
      }
    }
    if (m.s != null) m.s = round(m.s, 2);
    return m;
  });

  const live = inputs.filter((m) => m.status === "live");
  const wAll = sum(inputs.map((m) => m.w));
  const wLive = sum(live.map((m) => m.w));
  const coverage = wAll ? wLive / wAll : 0;
  const lineExact = wLive ? sum(live.map((m) => m.w * m.s)) / wLive : null;
  const line = (coverage >= 0.6 && lineExact != null) ? Math.round(lineExact) : null;
  const zone = zoneFor(line);

  const pillars = PILLARS.map((p) => {
    const ms = inputs.filter((m) => m.pillar === p.id);
    const lv = ms.filter((m) => m.status === "live");
    const w = sum(ms.map((m) => m.w)), wl = sum(lv.map((m) => m.w));
    return { id: p.id, name: p.name, w, score: wl ? round(sum(lv.map((m) => m.w * m.s)) / wl, 1) : null, live: lv.length, of: ms.length };
  });

  /* Breadth and the meme basket over 30 days, top 50 eligible memes against BTC */
  let breadth = null, basket30 = null, breadthN = 0;
  if (eligible && btc && btc.change30 != null) {
    const top = eligible.filter((c) => num(c.price_change_percentage_30d_in_currency) != null).slice(0, 50);
    if (top.length >= 30) {
      const b30 = btc.change30 * 100;
      breadthN = top.length;
      breadth = top.filter((c) => num(c.price_change_percentage_30d_in_currency) > b30).length / top.length;
      const mcs = sum(top.map((c) => num(c.market_cap)));
      basket30 = sum(top.map((c) => num(c.market_cap) * num(c.price_change_percentage_30d_in_currency))) / mcs;
    }
  }

  const rowsAll = ladder ? ladder._rows : null;
  const drawdown = catMC ? 1 - catMC / ANCHORS.hot.memeMC : null;
  const legacyRows = eligible ? LEGACY.map((id) => eligible.find((c) => c.id === id)).filter(Boolean) : null;
  const legacyDeep = legacyRows ? legacyRows.filter((c) => num(c.ath_change_percentage) != null && num(c.ath_change_percentage) <= -85) : null;
  const fresh500 = rowsAll ? rowsAll.filter((r) => r.fresh && r.m >= 500e6) : null;
  const fastBillion = rowsAll ? rowsAll.filter((r) => r.m >= 1e9 && ((r.lowDays != null && r.lowDays <= 14) || (r.a != null && r.a <= 14))) : null;
  const dom = v["1.1"], dshare = v["1.3"];

  const bottom = [
    rule("B1", "Clean meme dominance at or below 1.3%", dom != null ? dom <= 1.3 : null, dom != null ? `${dom.toFixed(2)}% now` : ""),
    rule("B2", "Meme market cap 75% or more below its December 2024 high", drawdown != null ? drawdown >= 0.75 : null, drawdown != null ? `${Math.round(drawdown * 100)}% below now` : ""),
    rule("B3", "DOGE below its 200-day average", doge && doge.above200 != null ? !doge.above200 : null, doge ? `${fmtPx(doge.price)} vs ${fmtPx(doge.sma200)}` : ""),
    rule("B4", "Meme perps funding at or below the 0.01% baseline per 8h", hl ? hl.f8h <= 0.0105 : null, hl ? `${hl.f8h.toFixed(4)}% now` : ""),
    rule("B5", "3 or more legacy memes 85% or more below their high", legacyDeep ? legacyDeep.length >= 3 : null, legacyDeep ? (legacyDeep.length ? legacyDeep.map((c) => `${up(c.symbol)} ${Math.round(num(c.ath_change_percentage))}%`).join(", ") : "none") : ""),
    rule("B6", "No fresh runner above $500M", fresh500 ? fresh500.length === 0 : null, fresh500 ? (fresh500.length ? few(fresh500.map((r) => r.s)) : "none") : ""),
    rule("B7", "pump.fun revenue at or below $1M a day, 7-day average", pump ? pump.avg7 <= 1e6 : null, pump ? `${fmtUSD(pump.avg7)} a day now` : ""),
    rule("B8", "Meme spot volume at or below $2B a day", cleanVol != null ? cleanVol <= 2e9 : null, cleanVol != null ? `${fmtUSD(cleanVol)} now` : "")
  ];

  const season = [
    rule("S1", "DOGE above its 200-day average, 50-day above the 200-day", doge && doge.sma50 && doge.sma200 ? (doge.above200 && doge.sma50 > doge.sma200) : null, doge ? `${fmtPx(doge.price)}, 50D ${fmtPx(doge.sma50)}, 200D ${fmtPx(doge.sma200)}` : ""),
    rule("S2", "Top 50 memes beat BTC over 30 days, weighted by market cap", basket30 != null ? basket30 > btc.change30 * 100 : null, basket30 != null ? `memes ${sgn(basket30)} vs BTC ${sgn(btc.change30 * 100)}` : ""),
    rule("S3", "2 or more fresh runners above $500M", fresh500 ? fresh500.length >= 2 : null, fresh500 ? `${fresh500.length} now` : ""),
    rule("S4", "pump.fun revenue at least 2x its 90-day low, 7-day average", pump && pump.low90 ? pump.avg7 >= 2 * pump.low90 : null, pump && pump.low90 ? `${(pump.avg7 / pump.low90).toFixed(1)}x the low of ${fmtUSD(pump.low90)}` : ""),
    rule("S5", "BTC above a rising 200-day average", btc && btc.above200 != null && btc.rising200 != null ? (btc.above200 && btc.rising200) : null, btc ? `${fmtPx(btc.price)} vs ${fmtPx(btc.sma200)}, ${btc.rising200 ? "rising" : "falling"}` : ""),
    rule("S6", "Half or more of the top 50 memes beat BTC over 30 days", breadth != null ? breadth >= 0.5 : null, breadth != null ? `${Math.round(breadth * 100)}% of ${breadthN} now` : "")
  ];
  const confirms = season.filter((r) => r.hit).length;
  const flagRaw = line != null && line >= 45 && confirms >= 4 && season[5].hit === true;

  const top = [
    rule("T1", "Coinbase or Phantom is the #1 free app in the US App Store", apps ? apps.best === 1 : null, apps ? (apps.best ? `best rank #${apps.best}` : `outside the top ${apps.size}`) : "", "Coinbase was #1 on Oct 27, 2021, two weeks before the BTC top"),
    rule("T2", "Clean meme dominance at 3.5% or more", dom != null ? dom >= 3.5 : null, dom != null ? `${dom.toFixed(2)}% now` : "", "4.06% on Dec 9, 2024"),
    rule("T3", "DOGE share of clean meme market cap at 30% or less", dshare != null ? dshare <= 30 : null, dshare != null ? `${dshare.toFixed(1)}% now` : "", "27.3% in Oct 2024"),
    rule("T4", "A token goes from its low or its launch to $1B or more inside 14 days", fastBillion ? fastBillion.length > 0 : null, fastBillion ? (fastBillion.length ? few(fastBillion.map((r) => r.s)) : "none") : "", "PNUT, 11 days, Nov 2024"),
    rule("T5", "pump.fun revenue of $10M or more in a day", pump && pump.t24 != null ? pump.t24 >= 10e6 : null, pump && pump.t24 != null ? `${fmtUSD(pump.t24)} last day` : "", "$15.4M a day, Jan 2025"),
    rule("T6", "Meme spot volume of $40B or more in a day", cleanVol != null ? cleanVol >= 40e9 : null, cleanVol != null ? `${fmtUSD(cleanVol)} now` : "", "$87.4B in a day, 2024"),
    rule("T7", "Meme perps funding at 0.10% or more per 8h", hl ? hl.f8h >= 0.1 : null, hl ? `${hl.f8h.toFixed(4)}% now` : "", "new in v2"),
    rule("T8", "3 or more memes above $10B at once", ladder ? ladder.counts[6] >= 3 : null, ladder ? `${ladder.counts[6]} now` : "", "DOGE, SHIB and PEPE, Dec 2024")
  ];
  const lit = top.filter((r) => r.hit).length;
  const hits = bottom.filter((r) => r.hit).length;

  /* Kill switches, using the public daily log for the 14-day peak */
  const recent = history.filter((h) => h && h.line != null && daysSince(`${h.d}T23:59:59Z`, now) <= 14).map((h) => h.line);
  const peak14 = recent.length || line != null ? Math.max(...recent, line != null ? line : -1) : null;
  const k1Armed = peak14 != null && peak14 >= 75;
  const k1Fired = k1Armed && line != null && line <= peak14 - 15;
  const k2Armed = line != null && line >= 60;
  const k2Fired = k2Armed && btc != null && btc.closesBelow200 >= 7;
  const k3Armed = flagRaw;
  const k3Fired = k3Armed && doge != null && doge.closesBelow50 >= 7;
  const kills = [
    { id: "K1", text: "Line drops 15 or more points within 14 days of a close at 75 or higher: sell everything but the moonbag.", state: k1Fired ? "fired" : k1Armed ? "armed" : "off", value: peak14 != null ? `14-day peak ${peak14}` : "" },
    { id: "K2", text: "BTC closes 7 days in a row below its 200-day average with the Line at 60 or higher: cut the meme book in half.", state: k2Fired ? "fired" : k2Armed ? "armed" : "off", value: btc ? `${btc.closesBelow200} closes below now` : "" },
    { id: "K3", text: "DOGE closes 7 days in a row below its 50-day average while the Season Flag is on: the flag goes off.", state: k3Fired ? "fired" : k3Armed ? "armed" : "off", value: doge ? `${doge.closesBelow50} closes below now` : "" }
  ];
  const flag = flagRaw && !k3Fired;

  let action = zone ? zone.spot : "No reading: not enough live sources.";
  if (lit >= 3) action = "Ultra Greed actions now: sell down to the 10% moonbag.";
  else if (lit >= 1) action = `No new buys while a top trigger is live. ${zone ? zone.spot : ""}`.trim();
  if (k2Fired) action = "Kill switch K2: cut the meme book in half.";
  if (k1Fired) action = "Kill switch K1: sell everything but the moonbag.";

  let headline;
  if (line == null) headline = "Not enough live sources for a reading. The last good reading is shown instead.";
  else if (lit >= 3) headline = `${lit} top triggers are live. Ultra Greed actions apply now, whatever the number says.`;
  else if (lit >= 1) headline = "A top trigger is live. No new buys until it clears.";
  else if (flag) headline = `Memecoin season is on: ${confirms} of 6 confirmations, ${Math.round(breadth * 100)}% of top memes beating BTC.`;
  else if (line < 30 && hits >= 5) headline = `${hits} of 8 bottom signals are on. This is accumulation ground: slow, weekly, blue chips first.`;
  else if (line < 30) headline = `Cold market, ${hits} of 8 bottom signals on. No season signal yet.`;
  else headline = `No season signal yet: ${confirms} of 6 confirmations.`;

  const sources = Object.entries(SOURCES).map(([id, s]) => {
    const keys = Object.keys(RAW_SOURCE).filter((k) => RAW_SOURCE[k] === id);
    if (id === "codex" && !raw.codexEnabled) return { id, name: s.name, url: s.url, ok: false, off: true, calls: 0, failed: [{ call: "codex", error: "no API key set" }] };
    if (id === "x") {
      const so = opts.socials, fresh = Boolean(so && so.lastOk && now - Date.parse(so.lastOk) < 26 * 3600000);
      return { id, name: s.name, url: s.url, ok: fresh, calls: so && so.last ? so.last.checks : 0, failed: fresh ? [] : [{ call: "x", error: so ? "no answer in the last day" : "not checked yet" }] };
    }
    const failed = keys.filter((k) => !ok(k));
    return { id, name: s.name, url: s.url, ok: failed.length === 0, calls: keys.length, failed: failed.map((k) => ({ call: k, error: raw[k] ? raw[k].error || "no data" : "not run" })) };
  });

  /* what the next X check asks for: CoinGecko coin pages of listed coins, then the X accounts that are due */
  const needs = socialNeeds(rowsAll, opts.socials || null, now);
  if (ladder) { delete ladder._rows; delete ladder._passed; }

  const reading = {
    v: 2, version: VERSION, at: raw.at,
    line, lineExact: lineExact != null ? round(lineExact, 1) : null, coverage: round(coverage, 3),
    zone: zone ? { name: zone.name, hour: zone.hour, tone: zone.tone, from: zone.from, to: zone.to, spot: zone.spot, active: zone.active } : null,
    action, headline,
    anchors: ANCHORS,
    zones: ZONES,
    chains: [...Object.values(CHAINS), LISTED],
    season: { on: flag, confirms, of: 6, breadth: breadth != null ? round(breadth, 3) : null, breadthN, basket30: round(basket30, 2), btc30: btc && btc.change30 != null ? round(btc.change30 * 100, 2) : null },
    pillars, inputs,
    ladder,
    boards: {
      bottom: { name: "Bottom checklist", rule: "5 of 8 opens the accumulation zone", need: 5, hits, open: hits >= 5, items: bottom },
      season: { name: "Season confirmations", rule: "4 of 6, with S6 among them, plus a Line of 45 or more turns the Season Flag on", need: 4, hits: confirms, items: season },
      top: { name: "Top triggers", rule: "1 live stops new buys, 3 live means Ultra Greed actions now", need: 3, lit, items: top }
    },
    kills,
    market: {
      memeMC: catMC, cleanMC, totalMC, cleanVol, cleanBasis,
      memeChange24: cat && num(cat.market_cap_change_24h) != null ? round(num(cat.market_cap_change_24h), 2) : null,
      drawdown: drawdown != null ? round(drawdown, 4) : null,
      fromBottom: catMC ? round(catMC / ANCHORS.cold.memeMC, 2) : null,
      doge: doge ? { price: doge.price, sma50: doge.sma50, sma200: doge.sma200, mayer: round(doge.mayer, 4), closesBelow50: doge.closesBelow50 } : null,
      btc: btc ? { price: btc.price, sma200: btc.sma200, above200: btc.above200, rising200: btc.rising200, closesBelow200: btc.closesBelow200, change30: round(btc.change30 * 100, 2) } : null,
      pump, hl, fng, apps
    },
    cycle: CYCLE,
    sources
  };
  reading[NEEDS] = needs;
  return reading;
}

/* ---------- weekly candles of the meme market ---------- */
/* Weeks start on Monday, 00:00 UTC. points: [[ms, value], ...] in time order. */
export function weekStart(t) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY;
}
export function weeklyFrom(points) {
  const out = [];
  for (const [t, v] of points) {
    if (!isFinite(t) || !isFinite(v) || v <= 0) continue;
    const wk = weekStart(t);
    const c = out[out.length - 1];
    if (!c || c.t !== wk) out.push({ t: wk, o: v, h: v, l: v, c: v });
    else { c.h = Math.max(c.h, v); c.l = Math.min(c.l, v); c.c = v; }
  }
  return out;
}
/* The biggest eligible memes right now: the basket that estimates the weeks before the site went live */
export function basketIds(raw, n = 15) {
  const mk = raw && raw.cgMemes && raw.cgMemes.ok && Array.isArray(raw.cgMemes.data) ? raw.cgMemes.data : [];
  return mk.filter((c) => c && num(c.market_cap) > 0 && !excluded(c)).sort((a, b) => num(b.market_cap) - num(a.market_cap)).slice(0, n).map((c) => String(c.id));
}
/* One year of daily market caps for each basket coin, one CoinGecko call per coin, paced.
   A coin that fails is skipped and listed in charts.failed; if the first three all fail the run stops asking
   (the API is refusing for now), and no new call starts once the time budget is spent. */
export async function basketCharts({ fetchImpl = globalThis.fetch, cgKey = "", ids = [], gapMs, retryWaitMs, budgetMs = 300000 } = {}) {
  const headers = cgKey ? { "x-cg-demo-api-key": cgKey } : {};
  const gap = gapMs != null ? gapMs : (cgKey ? 2500 : 6000);
  const t0 = Date.now();
  const charts = [], failed = [];
  for (const id of ids) {
    if (Date.now() - t0 > budgetMs) { failed.push({ id, error: "time budget spent" }); continue; }
    if (!charts.length && failed.length >= 3) { failed.push({ id, error: "not asked, the first calls failed" }); continue; }
    try {
      const j = await getJSON(`${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365&interval=daily`, { fetchImpl, headers, wait: retryWaitMs != null ? retryWaitMs : 20000 });
      const caps = Array.isArray(j && j.market_caps) ? j.market_caps : [];
      if (caps.length) charts.push({ id, caps }); else failed.push({ id, error: "no market caps" });
    } catch (e) { failed.push({ id, error: e.message }); }
    await sleep(gap);
  }
  charts.failed = failed;
  return charts;
}
/* Sum of the basket's market caps per UTC day */
export function basketSeries(charts) {
  const byDay = new Map();
  charts.forEach(({ caps }) => {
    const seen = new Set();
    caps.forEach(([t, v]) => {
      const day = Math.floor(Number(t) / DAY) * DAY;
      if (!isFinite(day) || !isFinite(Number(v)) || Number(v) <= 0 || seen.has(day)) return;
      seen.add(day);
      byDay.set(day, (byDay.get(day) || 0) + Number(v));
    });
  });
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
}
/* Move the current week's candle with a live value, opening a new candle when the week turns */
export function liveCandle(weeks, t, v, keep = 104) {
  const out = weeks.slice();
  const wk = weekStart(t);
  const last = out[out.length - 1];
  if (last && last.t === wk) out[out.length - 1] = { t: wk, o: last.o, h: Math.max(last.h, v), l: Math.min(last.l, v), c: v };
  else if (!last || last.t < wk) { const o = last ? last.c : v; out.push({ t: wk, o, h: Math.max(o, v), l: Math.min(o, v), c: v }); }
  return out.slice(-keep);
}

/* The method with no live value in it: every zone, input, anchor and rule, all waiting.
   Written to data/method.json so the site can show the full method before the first reading exists.
   It carries no timestamp, so the file only changes when the method itself changes. */
export function blank() {
  const r = compute({ v: 2, at: "2000-01-01T00:00:00.000Z", codexEnabled: false }, { now: 0, history: [] });
  r.blank = true;
  r.at = null;
  r.action = "";
  r.headline = "";
  r.sources = r.sources.map((s) => ({ id: s.id, name: s.name, url: s.url, ok: false, waiting: true, calls: s.calls, failed: [] }));
  return r;
}

/* One compact row per UTC day for data/history.json. The last update of each day is its close. */
export function toDaily(r) {
  return {
    d: r.at.slice(0, 10), at: r.at, line: r.line, x: r.lineExact, zone: r.zone ? r.zone.name : null,
    cov: Math.round(r.coverage * 100),
    mc: r.market.memeMC ? round(r.market.memeMC / 1e9, 2) : null,
    clean: r.market.cleanMC ? round(r.market.cleanMC / 1e9, 2) : null,
    dom: r.inputs[0].x != null ? round(r.inputs[0].x, 3) : null,
    n: r.ladder ? r.ladder.counts : null,
    oc: r.ladder ? r.ladder.onchain.status : null,
    fresh: r.ladder ? r.ladder.fresh : null,
    nw: r.ladder ? r.ladder.newWeekCount : null,
    flag: r.season.on ? 1 : 0,
    bottom: r.boards.bottom.hits, top: r.boards.top.lit,
    p: r.pillars.map((p) => p.score)
  };
}

/* Alerts fire on state changes only. Zone changes need the Line 2 points inside the new zone, so a
   reading sitting on a boundary does not ping every half hour. */
export function alertsFor(state, r) {
  const out = [];
  if (r.line == null) return { messages: out, state };
  const next = { zone: state && state.zone, flag: Boolean(state && state.flag), lit: (state && state.lit) || [], bottomOpen: Boolean(state && state.bottomOpen), kills: (state && state.kills) || [] };
  const z = r.zone;
  if (!state || !state.zone) next.zone = z.name;
  else if (z.name !== state.zone && (z.from === 0 || r.lineExact >= z.from + 2) && (z.to === 100 || r.lineExact <= z.to - 2)) {
    out.push(`Zone change: ${state.zone} to ${z.name}. Line ${r.line}/100. ${r.action}`);
    next.zone = z.name;
  }
  if (state && r.season.on !== Boolean(state.flag)) out.push(r.season.on ? `Season Flag ON. Line ${r.line}, ${r.season.confirms} of 6 confirmations.` : `Season Flag OFF. Line ${r.line}.`);
  next.flag = r.season.on;
  const litNow = r.boards.top.items.filter((t) => t.hit).map((t) => t.id);
  const newly = litNow.filter((id) => !next.lit.includes(id));
  if (state && newly.length) out.push(`Top trigger live: ${newly.map((id) => { const t = r.boards.top.items.find((x) => x.id === id); return `${id} ${t.text} (${t.value})`; }).join("; ")}. ${r.action}`);
  next.lit = litNow;
  if (state && r.boards.bottom.open && !next.bottomOpen) out.push(`Accumulation zone open: ${r.boards.bottom.hits} of 8 bottom signals. ${r.action}`);
  next.bottomOpen = r.boards.bottom.open;
  const firedNow = r.kills.filter((k) => k.state === "fired").map((k) => k.id);
  firedNow.filter((id) => !next.kills.includes(id)).forEach((id) => { if (state) out.push(`Kill switch ${id}: ${r.kills.find((k) => k.id === id).text}`); });
  next.kills = firedNow;
  return { messages: out, state: next };
}
