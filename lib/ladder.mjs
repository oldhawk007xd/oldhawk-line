/* The runner ladder's own record (data/ladder.json): the floor every memecoin above $10M stood on at each daily
   close, kept by the update job. From it come the moves of the week (who climbed a floor, who slipped, who joined,
   who fell off), what became of the coins on the ladder the day the record began, and every floor change since.

   One close per UTC day. The last close in the file is today's and moves with every update; a close becomes final
   when the next day's first reading arrives, and only then enters the per-coin record (coins, moves). So a coin
   that touches a higher floor for an hour and is back by the close never counts as a climb.

   Nothing here reads the network: ladderStep(file, reading) takes the file as it was and one reading and returns
   the file as it should be. A reading with the on-chain source down is not counted as a close, since half the
   ladder would look like it fell off.

   In the file: coins is keyed by the coin's own key (its contract address, else its CoinGecko id) and gives each
   a short number, i; closes[].rows and moves[].i use that number. out is what the pages read. */

export const FLOORS = ["$10M", "$50M", "$100M", "$500M", "$1B", "$5B", "$10B"];
const KEEP = 9;          /* daily closes kept: a week back from the last one, and one spare */
const MOVES = 3000;      /* floor changes kept */
const SHOWN = 300;       /* floor changes written out for the pages */
const FORGET = 30;       /* a coin seen on only a few closes, gone this many days, leaves the record */
const DAY = 86400000;
const dayOf = (iso) => String(iso).slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/* One key per coin: its contract address when it has one, else its CoinGecko id. A listed coin later matched
   to its address is the same coin: the alias carries its record over. */
function keyOf(r, alias) {
  if (r.ad) return `ad:${r.ad}`;
  if (r.g) return alias[`g:${r.g}`] || `g:${r.g}`;
  return `s:${r.c}:${r.s}`;
}

function adopt(state, r) {
  if (!r.ad || !r.g) return;
  const old = `g:${r.g}`, key = `ad:${r.ad}`;
  if (state.alias[old] === key) return;
  state.alias[old] = key;
  const a = state.coins[old], b = state.coins[key];
  if (!a) return;
  delete state.coins[old];
  if (!b) { state.coins[key] = a; return; }
  /* both were seen: keep the older start and the earlier date of every floor, and move the rows over */
  if (a.f && (!b.f || a.f < b.f)) { b.f = a.f; b.t0 = a.t0; }
  if (a.l && (!b.l || a.l > b.l)) b.l = a.l;
  b.k = (b.k || 0) + (a.k || 0);
  for (const [t, d] of Object.entries(a.hi || {})) if (!b.hi[t] || d < b.hi[t]) b.hi[t] = d;
  for (const c of state.closes) if (c.rows[a.i]) { if (!c.rows[b.i]) c.rows[b.i] = c.rows[a.i]; delete c.rows[a.i]; }
  for (const m of state.moves) if (m.i === a.i) m.i = b.i;
}

/* a finished close enters the per-coin record, with the floor changes against the close before it */
function fold(state, close, before) {
  const byId = new Map(Object.values(state.coins).map((c) => [String(c.i), c]));
  for (const [i, [t]] of Object.entries(close.rows)) {
    const c = byId.get(i);
    if (!c) continue;
    if (!c.f) { c.f = close.d; c.t0 = t; }
    c.l = close.d; c.k = (c.k || 0) + 1;
    for (let x = c.t0 + 1; x <= t; x++) if (!c.hi[x]) c.hi[x] = close.d;
  }
  if (before) for (const [i, [t, m]] of Object.entries(close.rows)) {
    const was = before.rows[i];
    if (was && was[0] !== t) state.moves.push({ d: close.d, i: Number(i), from: was[0], to: t, m });
  }
  if (state.moves.length > MOVES) state.moves = state.moves.slice(-MOVES);
}

const band = (rows) => { const c = FLOORS.map(() => 0); for (const [t] of Object.values(rows)) if (c[t] != null) c[t]++; return c; };

/* what the pages show, worked out from the record and the last close */
function view(state) {
  const closes = state.closes, last = closes[closes.length - 1];
  if (!last) return null;
  const byId = new Map(Object.values(state.coins).map((c) => [String(c.i), c]));
  /* a coin too young to be named is counted, never named */
  const who = (i, extra) => { const c = byId.get(String(i)) || {}; return c.y || !c.s ? { y: 1, c: c.c, ...extra } : { s: c.s, ...(c.n ? { n: c.n } : {}), c: c.c, ...extra }; };
  const bySize = (a, b) => b.m - a.m;

  /* the week: the last close against the one seven days before it, or the oldest one kept while the record is young */
  let week = null;
  const target = new Date(Date.parse(`${last.d}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);
  const older = closes.slice(0, -1);
  const ref = older.filter((c) => c.d <= target).pop() || older[0] || null;
  if (ref) {
    const A = ref.rows, B = last.rows, up = [], down = [], joined = [], left = [];
    for (const [i, [t, m]] of Object.entries(B)) {
      if (!A[i]) joined.push(who(i, { m, t }));
      else if (t > A[i][0]) up.push(who(i, { m, t, from: A[i][0] }));
      else if (t < A[i][0]) down.push(who(i, { m, t, from: A[i][0] }));
    }
    for (const [i, [t, m]] of Object.entries(A)) if (!B[i]) left.push(who(i, { m, t }));
    week = { from: ref.d, to: last.d, days: daysBetween(ref.d, last.d), up: up.sort(bySize), down: down.sort(bySize), joined: joined.sort(bySize), left: left.sort(bySize), now: band(B), then: band(A) };
  }

  /* the coins on the ladder the day the record began: where they stand at the last close */
  const first = closes.find((c) => c.d === state.since);
  const folded = Object.values(state.coins).filter((c) => c.f === state.since);
  const start = folded.length ? folded.map((c) => [String(c.i), c.t0]) : first ? Object.entries(first.rows).map(([i, [t]]) => [i, t]) : [];
  const base = { n: start.length, up: 0, same: 0, down: 0, off: 0 };
  for (const [i, t0] of start) { const r = last.rows[i]; if (!r) base.off++; else if (r[0] > t0) base.up++; else if (r[0] < t0) base.down++; else base.same++; }

  /* climbs: the first close a coin stood on a floor higher than any before, after its first day */
  const climbs = [];
  for (const c of Object.values(state.coins)) {
    if (!c.f) continue;
    const r = last.rows[c.i];
    for (const [t, d] of Object.entries(c.hi || {})) climbs.push(who(c.i, { to: Number(t), on: d, days: daysBetween(c.f, d), held: Boolean(r && r[0] >= Number(t)), m: r ? r[1] : null }));
    const top = Math.max(c.t0, ...Object.keys(c.hi || {}).map(Number));
    if (r && c.f < last.d) for (let x = top + 1; x <= r[0]; x++) climbs.push(who(c.i, { to: x, on: last.d, days: daysBetween(c.f, last.d), held: true, m: r[1] }));
  }
  climbs.sort((a, b) => (a.on === b.on ? b.to - a.to : a.on < b.on ? 1 : -1));

  /* every floor change, newest first: the finished closes, then today's against yesterday's */
  const prev = closes[closes.length - 2];
  const today = prev ? Object.entries(last.rows).filter(([i, [t]]) => prev.rows[i] && prev.rows[i][0] !== t).map(([i, [t, m]]) => ({ d: last.d, i, from: prev.rows[i][0], to: t, m })) : [];
  const moves = [...state.moves, ...today].slice(-SHOWN).reverse().map((m) => who(m.i, { d: m.d, from: m.from, to: m.to, m: m.m }));
  return { at: last.at, since: state.since, week, base, climbs: climbs.slice(0, 60), climbCount: climbs.length, moves, moveCount: state.moves.length + today.length };
}

export function ladderStep(file, reading) {
  const L = reading && reading.ladder;
  const live = L && Array.isArray(L.runners) && L.runners.length && L.onchain && L.onchain.status === "live";
  if (!live || !reading.at) return file || null;
  const day = dayOf(reading.at);
  const state = file && file.v === 1
    ? JSON.parse(JSON.stringify({ v: 1, since: file.since, seq: file.seq || 0, closes: file.closes || [], coins: file.coins || {}, moves: file.moves || [], alias: file.alias || {} }))
    : { v: 1, since: day, seq: 0, closes: [], coins: {}, moves: [], alias: {} };
  const tail = state.closes[state.closes.length - 1];
  /* a reading older than the last close (a rerun of an old job) changes nothing */
  if (tail && day < tail.d) return file;

  for (const r of L.runners) if (r) adopt(state, r);
  const rows = {};
  for (const r of L.runners) {
    if (!r || !r.s || !(r.m >= 1e7) || !(r.t >= 0)) continue;
    const key = keyOf(r, state.alias);
    const c = state.coins[key] || (state.coins[key] = { i: ++state.seq, s: r.s, c: r.c, f: null, t0: null, l: null, k: 0, hi: {} });
    if (rows[c.i] && rows[c.i][1] >= r.m) continue;
    rows[c.i] = [r.t, r.m];
    c.s = r.s; c.c = r.c;
    if (r.n) c.n = String(r.n).slice(0, 60);
    if (r.y) c.y = 1; else delete c.y;
  }
  if (tail && tail.d === day) { tail.rows = rows; tail.at = reading.at; }
  else {
    if (tail) fold(state, tail, state.closes[state.closes.length - 2] || null);
    state.closes.push({ d: day, at: reading.at, rows });
    if (state.closes.length > KEEP) state.closes = state.closes.slice(-KEEP);
  }

  /* forget a coin that only passed by: never in the record, or a few closes long ago with no floor change. The
     coins of the first day always stay. */
  const kept = new Set(state.closes.flatMap((c) => Object.keys(c.rows)));
  const moved = new Set(state.moves.map((m) => String(m.i)));
  for (const [key, c] of Object.entries(state.coins)) {
    const id = String(c.i);
    if (kept.has(id) || moved.has(id) || c.f === state.since) continue;
    if (!c.f || (c.k <= 3 && !Object.keys(c.hi).length && daysBetween(c.l, day) > FORGET)) delete state.coins[key];
  }
  for (const [g, key] of Object.entries(state.alias)) if (!state.coins[key]) delete state.alias[g];
  state.out = view(state);
  return state;
}
