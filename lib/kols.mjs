/* KOL Watch: the record of accounts that promote coins.
   kols.json holds what is documented about each account, with a source for every line. The update reads the
   latest posts of the tracked accounts (FxTwitter), notes every coin they name by contract address, or by the
   ticker of an on-chain runner, and follows that coin's market cap (DexScreener) to measure what came next.
   A score describes the risk to buyers when the account promotes a coin. It is not a legal finding. */
import { fxGet } from "./engine.mjs";

const DAY = 86400000;
const num = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Number(v));
const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);
const sig3 = (v) => (v == null ? null : Number(Number(v).toPrecision(3)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const since = (iso, now) => { const t = Date.parse(iso || ""); return isFinite(t) ? now - t : Infinity; };

/* ---------- the score ---------- */
/* Each documented incident weighs evidence x harm, and more when a source puts a bigger amount on it (log scale).
   Documented alignment pulls the score down. From 10 measured calls on, what the coins did in the 7 days after
   the call moves it too: calls that lost 80% or more push it up, calls that doubled pull it down. */
export const EVIDENCE = { admitted: 3, court: 3, onchain: 2, lawsuit: 1.5, dismissed: 1, reported: 1 };
export const HARM = { dump: 3, insiders: 1.5, undisclosed: 1.2, collapse: 1 };
export const ALIGN = { holds: 3, wallets: 2, discloses: 1 };
export const KOL_RULE = { neutral: 5, up: 4.5, upScale: 8, down: 4, downScale: 5, minCalls: 10, rug: -0.8, win: 1, liveRug: 2.5, liveWin: 1.5, liveMin: -1.5, liveMax: 2, trusted: 3.5, risk: 7, readEveryHours: 2, firstSeenHours: 24 };
const magnitude = (usd) => (usd > 1e5 ? Math.min(1.75, 1 + 0.25 * Math.log10(usd / 1e5)) : 1);
export const incidentPoints = (i) => (EVIDENCE[i.evidence] || 0) * (HARM[i.harm] || 0) * magnitude(num(i.usd) || 0);
export const band = (s) => (s == null ? "none" : s < KOL_RULE.trusted ? "trusted" : s < KOL_RULE.risk ? "caution" : "risk");

export function scoreOf(p, rec) {
  const harm = sum((p.incidents || []).map(incidentPoints));
  const align = sum((p.align || []).map((a) => ALIGN[a.kind] || 0));
  const enough = Boolean(rec && rec.measured >= KOL_RULE.minCalls);
  const live = enough ? clamp(KOL_RULE.liveRug * rec.rug / rec.measured - KOL_RULE.liveWin * rec.win / rec.measured, KOL_RULE.liveMin, KOL_RULE.liveMax) : 0;
  if (!harm && !align && !enough) return { score: null, harm: 0, align: 0, live: 0 };
  const s = KOL_RULE.neutral + KOL_RULE.up * (1 - Math.exp(-harm / KOL_RULE.upScale)) - KOL_RULE.down * (1 - Math.exp(-align / KOL_RULE.downScale)) + live;
  return { score: r1(clamp(s, 1, 10)), harm: r1(harm), align: r1(align), live: r1(live) };
}

/* ---------- coins named in a post ---------- */
const B58 = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/g;
const EVM = /(?<![0-9A-Za-z])0x[a-fA-F0-9]{40}(?![0-9A-Za-z])/g;
const TAG = /(?:^|[^\w$])\$([A-Za-z][A-Za-z0-9]{1,15})(?!\w)/g;
/* wrapped SOL and the big stablecoins are money, not calls */
const NOT_CALLS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "0xdac17f958d2ee523a2206206994597c13d831ec7", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "0x55d398326f99059ff775485246999027b3197955", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"]);
export function mentionsIn(text) {
  const t = String(text || "");
  const cas = new Set(), tags = new Set();
  for (const m of t.matchAll(EVM)) { const a = m[0].toLowerCase(); if (!NOT_CALLS.has(a)) cas.add(a); }
  for (const m of t.matchAll(B58)) if (!NOT_CALLS.has(m[0])) cas.add(m[0]);
  for (const m of t.matchAll(TAG)) tags.add(m[1].toUpperCase());
  return { cas: [...cas], tags: [...tags] };
}

/* the account's own latest posts, with the links in them spelled out */
export async function xPosts(handle, { fetchImpl = globalThis.fetch, wait = 2500 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fxGet(`/2/profile/${encodeURIComponent(handle)}/statuses`, fetchImpl);
    if (r.status === 200 && r.j && Array.isArray(r.j.results)) {
      const own = r.j.results.filter((p) => p && p.author && String(p.author.screen_name || "").toLowerCase() === handle.toLowerCase());
      if (own.length || attempt === 1) {
        return { ok: true, posts: own.map((p) => ({
          id: String(p.id || ""), t: num(p.created_timestamp) || 0, url: String(p.url || ""),
          text: [p.text || "", ...((p.raw_text && Array.isArray(p.raw_text.facets) ? p.raw_text.facets : []).map((f) => [f.replacement, f.original, f.display].filter(Boolean).join(" ")))].join(" ")
        })) };
      }
    }
    if (attempt === 0) await sleep(wait);
  }
  return { fail: true };
}

/* DexScreener: market cap, name and logo of tokens by address, any chain, 30 a call */
const DEX = "https://api.dexscreener.com/latest/dex/tokens/";
export async function dexTokens(addrs, { fetchImpl = globalThis.fetch, gapMs = 400, log = () => {} } = {}) {
  const out = new Map();
  const list = [...new Set(addrs)];
  for (let i = 0; i < list.length; i += 30) {
    const chunk = list.slice(i, i + 30), want = new Set(chunk.map((a) => (a.startsWith("0x") ? a.toLowerCase() : a)));
    try {
      const res = await fetchImpl(DEX + chunk.join(","), { headers: { accept: "application/json" } });
      if (!res.ok) { log(`dexscreener: HTTP ${res.status}`); continue; }
      const j = await res.json();
      for (const p of (j && Array.isArray(j.pairs) ? j.pairs : [])) {
        const b = p && p.baseToken;
        if (!b || !b.address) continue;
        const a = b.address.startsWith("0x") ? b.address.toLowerCase() : b.address;
        if (!want.has(a)) continue;
        const liq = num(p.liquidity && p.liquidity.usd) || 0, m = num(p.marketCap) || num(p.fdv);
        const prev = out.get(a);
        if (m && (!prev || liq > prev.liq)) out.set(a, { ch: String(p.chainId || ""), ad: a, s: String(b.symbol || "").slice(0, 16), n: String(b.name || "").slice(0, 40), m, liq, i: p.info && typeof p.info.imageUrl === "string" && /^https:\/\//.test(p.info.imageUrl) ? p.info.imageUrl : null });
      }
    } catch (e) { log(`dexscreener: ${e.message}`); }
    if (i + 30 < list.length) await sleep(gapMs);
  }
  return out;
}

/* ---------- the call ledger (data/calls.json) ---------- */
/* Every coin a tracked account names is one call, kept from the market cap we first saw it at. A post counts only
   when we see it within a day, so a late read never invents a call at a price nobody could buy. The same coin named
   again within 7 days adds to the same call. Calls are followed for 31 days and kept for 120. */
export async function refreshCalls(calls, people, { runners = [], fetchImpl = globalThis.fetch, now = Date.now(), maxReads = 4, gapMs = 1000, wait = 2500, log = () => {} } = {}) {
  const c = calls && calls.v === 1 ? calls : { v: 1, read: {}, calls: [] };
  c.read = c.read || {}; c.calls = Array.isArray(c.calls) ? c.calls : [];
  const at = new Date(now).toISOString();
  const stats = { read: 0, readFails: 0, posts: 0, newCalls: 0, repeats: 0, priced: 0 };
  const tracked = (people || []).filter((p) => p.track && p.x);
  const due = tracked.map((p) => ({ p, r: c.read[p.x.toLowerCase()] || null }))
    .filter(({ r }) => !r || since(r.at, now) >= (r.miss ? 1 : KOL_RULE.readEveryHours) * 3600000 - 60000)
    .sort((a, b) => (a.r ? Date.parse(a.r.at) : 0) - (b.r ? Date.parse(b.r.at) : 0))
    .slice(0, maxReads);
  /* tickers of on-chain runners, so a $TICKER with no address still lands on the right coin; only unique ones */
  const byTicker = new Map();
  for (const x of runners) if (x && x.ad && x.s) { const k = x.s.toUpperCase(); byTicker.set(k, byTicker.has(k) ? null : x.ad); }
  const fresh = [];
  for (const { p } of due) {
    const h = p.x, k = h.toLowerCase(), prev = c.read[k] || {};
    const got = await xPosts(h, { fetchImpl, wait });
    if (got.fail) { c.read[k] = { ...prev, at, miss: (prev.miss || 0) + 1 }; stats.readFails++; await sleep(gapMs); continue; }
    stats.read++;
    const floor = Math.max(prev.since || 0, now / 1000 - KOL_RULE.firstSeenHours * 3600);
    let newest = prev.since || 0;
    for (const post of got.posts) {
      newest = Math.max(newest, post.t);
      if (post.t <= floor) continue;
      stats.posts++;
      const m = mentionsIn(post.text);
      const cas = new Set(m.cas);
      for (const tag of m.tags) { const ad = byTicker.get(tag); if (ad) cas.add(ad); }
      for (const ad of cas) fresh.push({ h, ad, post });
    }
    c.read[k] = { at, ok: at, since: newest };
    await sleep(gapMs);
  }
  /* what the named addresses are: real tokens with a market cap, or nothing */
  const ledgerOpen = c.calls.filter((x) => now / 1000 - x.t <= 31 * 86400);
  const look = [...new Set([...fresh.map((f) => f.ad), ...ledgerOpen.map((x) => x.ad)])];
  const info = look.length ? await dexTokens(look, { fetchImpl, log }) : new Map();
  for (const f of fresh.sort((a, b) => a.post.t - b.post.t)) {
    const d = info.get(f.ad.startsWith("0x") ? f.ad.toLowerCase() : f.ad);
    if (!d) continue;
    const same = c.calls.find((x) => x.h.toLowerCase() === f.h.toLowerCase() && x.ad === d.ad && f.post.t - x.t < 7 * 86400 && f.post.t >= x.t);
    if (same) { if (same.p !== f.post.id && !(same.ps || []).includes(f.post.id)) { same.x = (same.x || 1) + 1; same.ps = [...(same.ps || []), f.post.id].slice(-5); stats.repeats++; } continue; }
    c.calls.push({ h: f.h, k: `${d.ch}:${d.ad}`, ch: d.ch, ad: d.ad, s: d.s, n: d.n, i: d.i, p: f.post.id, u: f.post.url, t: f.post.t, at, m0: sig3(d.m), m: sig3(d.m), mx: sig3(d.m), mn: sig3(d.m), lu: at, x: 1 });
    stats.newCalls++;
  }
  /* follow every open call: latest, highest and lowest market cap seen, and the change frozen at 1 and 7 days */
  for (const x of c.calls) {
    if (now / 1000 - x.t > 31 * 86400) continue;
    const d = info.get(x.ad);
    if (d) {
      x.m = sig3(d.m); x.mx = sig3(Math.max(x.mx || 0, d.m)); x.mn = sig3(Math.min(x.mn || d.m, d.m)); x.lu = at; stats.priced++;
      if (!x.i && d.i) x.i = d.i;
    }
    const age = now / 1000 - x.t;
    if (x.d1 == null && age >= 86400 && x.m0) x.d1 = r3(x.m / x.m0 - 1);
    if (x.d7 == null && age >= 7 * 86400 && x.m0) x.d7 = r3(x.m / x.m0 - 1);
  }
  c.calls = c.calls.filter((x) => now / 1000 - x.t <= 120 * 86400).sort((a, b) => b.t - a.t);
  c.at = at;
  c.last = stats;
  return { calls: c, stats };
}

/* ---------- the board the site shows ---------- */
const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
export function recordOf(handle, calls, now) {
  const mine = (calls || []).filter((x) => handle && x.h.toLowerCase() === handle.toLowerCase() && now / 1000 - x.t <= 90 * 86400);
  const done = mine.filter((x) => x.d7 != null);
  return {
    n: mine.length, measured: done.length,
    rug: done.filter((x) => x.d7 <= KOL_RULE.rug).length,
    win: done.filter((x) => x.d7 >= KOL_RULE.win).length,
    med7: done.length ? r3(median(done.map((x) => x.d7))) : null
  };
}
export function kolBoard(file, calls, now = Date.now()) {
  const list = (file && Array.isArray(file.people) ? file.people : []);
  const ledger = calls && Array.isArray(calls.calls) ? calls.calls : [];
  const people = list.map((p) => {
    const rec = recordOf(p.x, ledger, now);
    const sc = scoreOf(p, rec);
    const usd = sum((p.incidents || []).map((i) => num(i.usd) || 0));
    const last = ledger.filter((x) => p.x && x.h.toLowerCase() === p.x.toLowerCase()).slice(0, 5).map((x) => ({ s: x.s, ch: x.ch, ad: x.ad, i: x.i || undefined, t: x.t, m0: x.m0, m: x.m, d7: x.d7 }));
    return { id: p.id, name: p.name, x: p.x || null, also: p.also || undefined, role: p.role || "", track: Boolean(p.track && p.x), score: sc.score, band: band(sc.score), pts: { harm: sc.harm, align: sc.align, live: sc.live }, usd: usd || null, incidents: p.incidents || [], align: p.align || [], rec, last };
  }).sort((a, b) => (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score) || a.name.localeCompare(b.name));
  const scoreBy = new Map(people.filter((p) => p.x).map((p) => [p.x.toLowerCase(), p]));
  const recent = ledger.slice(0, 40).map((x) => { const p = scoreBy.get(x.h.toLowerCase()); return { h: x.h, name: p ? p.name : x.h, score: p ? p.score : null, s: x.s, n: x.n || undefined, ch: x.ch, ad: x.ad, i: x.i || undefined, t: x.t, u: x.u || undefined, m0: x.m0, m: x.m, mx: x.mx, mn: x.mn, d1: x.d1 ?? null, d7: x.d7 ?? null, x: x.x || 1 }; });
  /* coins named in the last 7 days, with the riskiest account that named them */
  const byToken = {};
  for (const x of ledger) {
    if (now / 1000 - x.t > 7 * 86400) continue;
    const p = scoreBy.get(x.h.toLowerCase()), sc = p ? p.score : null;
    const e = byToken[x.ad] || (byToken[x.ad] = { h: [], max: null });
    if (!e.h.includes(x.h)) e.h.push(x.h);
    if (sc != null && (e.max == null || sc > e.max)) e.max = sc;
  }
  const measured = ledger.filter((x) => x.d7 != null && now / 1000 - x.t <= 90 * 86400);
  return {
    at: calls && calls.at ? calls.at : null,
    rule: { evidence: EVIDENCE, harm: HARM, align: ALIGN, ...KOL_RULE },
    people,
    calls: recent,
    byToken,
    stats: {
      people: people.length, scored: people.filter((p) => p.score != null).length,
      risk: people.filter((p) => p.band === "risk").length, caution: people.filter((p) => p.band === "caution").length, trusted: people.filter((p) => p.band === "trusted").length,
      tracked: people.filter((p) => p.track).length,
      incidents: sum(people.map((p) => p.incidents.length)), usd: sum(people.map((p) => p.usd || 0)),
      calls30: ledger.filter((x) => now / 1000 - x.t <= 30 * 86400).length,
      measured: measured.length, rugShare: measured.length ? r3(measured.filter((x) => x.d7 <= KOL_RULE.rug).length / measured.length) : null
    }
  };
}
