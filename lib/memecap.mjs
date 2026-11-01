/* The meme market cap, one row per UTC day: [day, open, high, low, close, basket], values in $B.
   basket 0: a live day, from the CoinGecko Meme category total read on every update (every 30 minutes).
   basket 1: a day before the site went live, from the biggest memes on CoinGecko summed day by day,
   scaled to the category on the days both exist. The site builds its 3D, 1W and 1M candles from these rows. */

export const DAY = 86400000;
const r3 = (v) => Math.round(v * 1000) / 1000;
const r4 = (v) => Math.round(v * 10000) / 10000;
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };

/* readings [[iso time, usd], ...] into live rows: the first reading of a day opens it, the last closes it */
export function liveRows(points) {
  const rows = [];
  const sorted = points.filter((p) => p && isFinite(Date.parse(p[0])) && Number(p[1]) > 0).sort((a, b) => Date.parse(a[0]) - Date.parse(b[0]));
  for (const [at, usd] of sorted) {
    const b = r3(Number(usd) / 1e9), d = new Date(at).toISOString().slice(0, 10), last = rows[rows.length - 1];
    if (last && last[0] === d) { last[2] = Math.max(last[2], b); last[3] = Math.min(last[3], b); last[4] = b; }
    else rows.push([d, b, b, b, b, 0]);
  }
  return rows;
}

/* A coin's market cap that jumps more than 3 times above the week around it and falls straight back is a data
   error, not a market (a new listing with the wrong supply, a supply typo for a day or two): that day takes the
   median of the three days before and after it. A real move lasts, so the week around it moves too. */
export function despike(vals, k = 3, floor = 25e6) {
  const out = vals.slice();
  for (let i = 0; i < vals.length; i++) {
    const win = vals.slice(Math.max(0, i - 3), i).concat(vals.slice(i + 1, i + 4));
    if (win.length < 3) continue;
    const m = median(win);
    if (vals[i] > k * m && vals[i] - m > floor) out[i] = m;
  }
  return out;
}

/* Each coin's daily market caps, summed by day. CoinGecko's daily points sit at 00:00 UTC and each one is the close
   of the day before; the extra point at the time of the call is left out. Inside a coin's own life a missing day
   carries its last value, so a gap in one series never shows as a drop of the whole market. */
export function basketCloses(charts) {
  const byDay = new Map();
  for (const { caps } of charts) {
    const own = new Map();
    for (const [t, v] of caps || []) {
      const tt = Number(t), vv = Number(v);
      if (!isFinite(tt) || !(vv > 0)) continue;
      const into = ((tt % DAY) + DAY) % DAY;
      if (into > 3600e3) continue;
      own.set(dayOf(tt - into - DAY), vv);
    }
    const days = [...own.keys()].sort();
    if (!days.length) continue;
    const seq = [];
    let prev = null;
    for (let t = Date.parse(days[0]); t <= Date.parse(days[days.length - 1]); t += DAY) {
      const d = dayOf(t), v = own.has(d) ? own.get(d) : prev;
      if (v == null) continue;
      prev = v;
      seq.push([d, v]);
    }
    const clean = despike(seq.map((x) => x[1]));
    seq.forEach(([d], i) => byDay.set(d, (byDay.get(d) || 0) + clean[i]));
  }
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/* The full record: basket days before the first live day, live days after. The scale is the median of the category
   total over the basket on the days both exist, and the check says how far apart they were on those days. */
export function buildMemecap({ charts = [], coins = [], category = {}, live = [], basketAt = null, at = null } = {}) {
  const closes = basketCloses(charts);
  const L = liveRows(live);
  const liveClose = new Map(L.map((r) => [r[0], r[4] * 1e9]));
  const pairs = closes.filter(([d]) => liveClose.has(d)).map(([d, v]) => liveClose.get(d) / v);
  const answered = new Set(charts.map((c) => c.id));
  const coverNow = category.mc ? coins.filter((c) => answered.has(c.id)).reduce((s, c) => s + (Number(c.mc) || 0), 0) / category.mc : null;
  const scale = pairs.length ? median(pairs) : coverNow ? 1 / coverNow : 1;
  const devs = pairs.map((k) => Math.abs(k / scale - 1));
  const first = L.length ? L[0][0] : null;
  const rows = [];
  let prev = null;
  for (const [d, v] of closes) {
    if (first && d >= first) break;
    const c = r3(v * scale / 1e9), o = prev == null ? c : prev;
    rows.push([d, o, Math.max(o, c), Math.min(o, c), c, 1]);
    prev = c;
  }
  const lastLive = live.length ? live.map((p) => p[0]).sort().pop() : null;
  return {
    v: 1, unit: "$B", basis: "CoinGecko Meme category market cap", at: at || lastLive,
    live: { from: live.length ? live.map((p) => p[0]).sort()[0] : null, every: 30 },
    basket: closes.length ? {
      at: basketAt, coins: coins.length || charts.length, answered: charts.length,
      cover: coverNow != null ? r3(coverNow) : null, scale: r4(scale),
      check: { days: devs.length, max: devs.length ? r4(Math.max(...devs)) : null, mean: devs.length ? r4(devs.reduce((s, x) => s + x, 0) / devs.length) : null },
      from: rows.length ? rows[0][0] : null, until: rows.length ? rows[rows.length - 1][0] : null
    } : null,
    days: rows.concat(L)
  };
}

/* One reading moves today's row, or opens a new day. A basket row for the same day gives way to the live one. */
export function addReading(mc, at, usd, keep = 900) {
  const b = r3(Number(usd) / 1e9);
  const base = mc && Array.isArray(mc.days) ? mc : { v: 1, unit: "$B", basis: "CoinGecko Meme category market cap", live: { from: at, every: 30 }, basket: null, days: [] };
  if (!(b > 0) || !isFinite(Date.parse(at))) return base;
  const out = { ...base, at, live: base.live && base.live.from ? base.live : { from: at, every: 30 }, days: base.days.slice() };
  const d = new Date(at).toISOString().slice(0, 10), last = out.days[out.days.length - 1];
  if (last && last[0] > d) return base;
  if (last && last[0] === d && last[5] === 0) out.days[out.days.length - 1] = [d, last[1], Math.max(last[2], b), Math.min(last[3], b), b, 0];
  else if (last && last[0] === d) out.days[out.days.length - 1] = [d, b, b, b, b, 0];
  else out.days.push([d, b, b, b, b, 0]);
  out.days = out.days.slice(-keep);
  return out;
}
