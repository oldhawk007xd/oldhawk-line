import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mentionsIn, refreshCalls, kolBoard, scoreOf, incidentPoints, recordOf, band, KOL_RULE } from "../lib/kols.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };
const DAY = 86400000;
const NOW = Date.parse("2026-10-23T18:07:00Z");
const S = (ms) => Math.floor(ms / 1000);

/* made-up addresses in the right shape, so they can never pass for real coins */
const CA1 = "DemoCoinUno1111111111111111111111111111pump";
const CA2 = "DemoCoinTwo2222222222222222222222222222pump";
const RUN = "DemoRunner333333333333333333333333333333pump";
const EVM = "0xABCDEF0123456789abcdef0123456789ABCDEF01";

/* a fake world: FxTwitter timelines per account, DexScreener market caps per address */
function world() {
  const w = { posts: {}, mc: { [CA1]: 2e6, [CA2]: 5e6, [RUN]: 40e6, [EVM.toLowerCase()]: 8e6 }, down: new Set(), calls: [] };
  w.fetch = async (url) => {
    w.calls.push(url);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    let m = url.match(/^https:\/\/api\.fxtwitter\.com\/2\/profile\/([^/]+)\/statuses$/);
    if (m) {
      const h = m[1].toLowerCase();
      if (w.down.has(h)) return json(404, { code: 404, message: "User not found" });
      return json(200, { code: 200, results: (w.posts[h] || []).map((p) => ({ id: p.id, url: `https://x.com/${h}/status/${p.id}`, text: p.text, created_timestamp: p.t, author: { screen_name: p.by || h } })) });
    }
    m = url.match(/^https:\/\/api\.fxtwitter\.com\/([^/]+)$/);
    if (m) return json(404, { code: 404, message: "User not found" });
    if (url.startsWith("https://api.dexscreener.com/latest/dex/tokens/")) {
      const want = url.split("/").pop().split(",");
      const pairs = want.filter((a) => w.mc[a.startsWith("0x") ? a.toLowerCase() : a]).map((a) => ({ chainId: a.startsWith("0x") ? "base" : "solana", baseToken: { address: a, symbol: a.slice(4, 8).toUpperCase(), name: a.slice(0, 12) }, marketCap: w.mc[a.startsWith("0x") ? a.toLowerCase() : a], liquidity: { usd: 50000 }, info: { imageUrl: "https://cdn.dexscreener.com/x.png" } }));
      return json(200, { schemaVersion: "1.0.0", pairs });
    }
    return json(404, {});
  };
  return w;
}
const people = [
  { id: "a", name: "Caller A", x: "callerA", track: true, incidents: [{ harm: "dump", evidence: "onchain", usd: 125000 }], align: [] },
  { id: "b", name: "Caller B", x: "callerB", track: true, incidents: [], align: [{ kind: "wallets" }, { kind: "holds" }] },
  { id: "c", name: "Not tracked", x: null, track: false, incidents: [{ harm: "insiders", evidence: "reported" }], align: [] }
];
const runners = [{ s: "RUNR", ad: RUN }, { s: "DUPE", ad: CA1 }, { s: "DUPE", ad: CA2 }, { s: "LIST", g: "listed-coin" }];

check("coins in a post: Solana and EVM addresses, cashtags; money and short strings are not calls", () => {
  const m = mentionsIn(`aped ${CA1} and ${EVM} https://dexscreener.com/solana/${CA2} $runr $USDC So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 1234567890abcdefABCDEFghijkmnop`);
  assert.deepEqual(m.cas.sort(), [CA1, CA2, EVM.toLowerCase()].sort());
  assert.deepEqual(m.tags.sort(), ["RUNR", "USDC"]);
});

const w = world();
w.posts.callera = [
  { id: "1", t: S(NOW - 2 * 3600000), text: `new gem ${CA1} sending it` },
  { id: "2", t: S(NOW - 3 * DAY), text: `old call ${CA2}` },
  { id: "3", t: S(NOW - 1 * 3600000), text: "$RUNR looks ready, $DUPE too" },
  { id: "4", t: S(NOW - 600000), text: `repost of ${CA2}`, by: "someoneelse" },
  { id: "5", t: S(NOW - 300000), text: "NotARealToken111111111111111111111111111pump is fake" }
];
w.posts.callerb = [{ id: "9", t: S(NOW - 4 * 3600000), text: `holding ${EVM} for months` }];
const r1 = await refreshCalls(null, people, { runners, fetchImpl: w.fetch, now: NOW, gapMs: 0, wait: 0 });
const L1 = r1.calls;
check("first read: only posts from the last day count, own posts only, every named coin a call at its market cap then", () => {
  assert.equal(r1.stats.read, 2);
  const a = L1.calls.filter((x) => x.h === "callerA").map((x) => x.ad).sort();
  assert.deepEqual(a, [CA1, RUN].sort(), "CA1 from post 1, RUNR by its ticker; the 3-day-old post, the repost, the ambiguous ticker and the unknown address are not calls");
  const c1 = L1.calls.find((x) => x.ad === CA1);
  assert.equal(c1.m0, 2e6); assert.equal(c1.t, S(NOW - 2 * 3600000)); assert.equal(c1.u, "https://x.com/callera/status/1");
  assert.equal(L1.calls.find((x) => x.h === "callerB").ad, EVM.toLowerCase());
});
check("accounts not tracked or without an X account are never read", () => assert.ok(!w.calls.some((u) => /profile\/null|Not tracked/.test(u))));

/* an hour later nothing is due; three hours later both are, and A names CA1 again while it doubles */
const w2Calls = w.calls.length;
await refreshCalls(L1, people, { runners, fetchImpl: w.fetch, now: NOW + 3600000, gapMs: 0, wait: 0 });
check("accounts are read every 2 hours, not every run", () => assert.equal(w.calls.slice(w2Calls).filter((u) => u.includes("fxtwitter")).length, 0));
w.posts.callera.push({ id: "6", t: S(NOW + 2.5 * 3600000), text: `still holding ${CA1}` });
w.mc[CA1] = 4e6;
const r3 = await refreshCalls(L1, people, { runners, fetchImpl: w.fetch, now: NOW + 3 * 3600000, gapMs: 0, wait: 0 });
check("the same coin named again within 7 days adds to the same call, and the call follows the market cap", () => {
  const c1 = r3.calls.calls.filter((x) => x.ad === CA1);
  assert.equal(c1.length, 1); assert.equal(c1[0].x, 2); assert.equal(c1[0].m, 4e6); assert.equal(c1[0].mx, 4e6); assert.equal(c1[0].m0, 2e6);
  assert.equal(r3.stats.repeats, 1);
});

/* a week later CA1 is down 90%, RUNR up 150%: the 7-day results freeze */
w.mc[CA1] = 0.2e6; w.mc[RUN] = 100e6;
const r4 = await refreshCalls(r3.calls, people, { runners, fetchImpl: w.fetch, now: NOW + 7.2 * DAY, gapMs: 0, wait: 0 });
check("after 7 days each call keeps its 7-day change, the record counts rugs and wins", () => {
  const c1 = r4.calls.calls.find((x) => x.ad === CA1), cr = r4.calls.calls.find((x) => x.ad === RUN);
  assert.equal(c1.d7, -0.9); assert.equal(cr.d7, 1.5); assert.equal(c1.mn, 0.2e6);
  const rec = recordOf("callerA", r4.calls.calls, NOW + 7.2 * DAY);
  assert.deepEqual(rec, { n: 2, measured: 2, rug: 1, win: 1, med7: 0.3 });
});
w.mc[CA1] = 5e6;
const r5 = await refreshCalls(r4.calls, people, { runners, fetchImpl: w.fetch, now: NOW + 9 * DAY, gapMs: 0, wait: 0 });
check("a frozen 7-day change never moves again", () => assert.equal(r5.calls.calls.find((x) => x.ad === CA1).d7, -0.9));

/* FxTwitter failing: the account is tried again after an hour, its calls are kept */
w.down.add("callera");
const r6 = await refreshCalls(r5.calls, people, { runners, fetchImpl: w.fetch, now: NOW + 9.2 * DAY, gapMs: 0, wait: 0 });
check("a failed read is noted and the calls stay", () => { assert.equal(r6.calls.read.callera.miss, 1); assert.equal(r6.calls.calls.filter((x) => x.h === "callerA").length, 2); });

/* the score */
check("score: neutral 5, documented harm pushes it up, documented alignment pulls it down", () => {
  assert.equal(scoreOf({ incidents: [], align: [] }, null).score, null, "no record, no score");
  assert.equal(scoreOf(people[0], null).score, 7.4);
  assert.equal(scoreOf(people[1], null).score, 2.5);
  assert.equal(scoreOf({ incidents: [{ harm: "dump", evidence: "admitted", usd: 1e8 }, { harm: "dump", evidence: "onchain", usd: 12e6 }], align: [] }, null).score, 9.3);
  assert.equal(incidentPoints({ harm: "insiders", evidence: "reported" }), 1.5);
  assert.equal(incidentPoints({ harm: "undisclosed", evidence: "settled" }), 2.4);
  assert.equal(band(2.5), "trusted"); assert.equal(band(5), "caution"); assert.equal(band(7), "risk");
});
check("score: from 10 measured calls, what the coins did moves it", () => {
  const bad = { n: 10, measured: 10, rug: 8, win: 0, med7: -0.9 }, good = { n: 12, measured: 12, rug: 0, win: 6, med7: 1.1 };
  assert.equal(scoreOf({ incidents: [], align: [] }, bad).score, 7, "no documented record, 8 of 10 calls lost 80% or more");
  assert.equal(scoreOf({ incidents: [], align: [] }, good).score, 4.3);
  assert.equal(scoreOf({ incidents: [], align: [] }, { n: 9, measured: 9, rug: 9, win: 0 }).score, null, "9 calls are not enough");
});

const board = kolBoard({ people }, r5.calls, NOW + 9 * DAY);
check("board: riskiest first, each with its record and its last calls", () => {
  assert.deepEqual(board.people.map((p) => p.id), ["a", "c", "b"]);
  const a = board.people[0];
  assert.equal(a.band, "risk"); assert.equal(a.rec.measured, 2); assert.equal(a.last.length, 2); assert.equal(a.usd, 125000);
  assert.deepEqual(a.pts, { harm: 6.1, align: 0, live: 0 });
});
check("board: latest calls carry the caller's score, coins named this week carry the riskiest caller", () => {
  assert.equal(board.calls[0].h, "callerA"); assert.equal(board.calls.find((x) => x.h === "callerB").score, 2.5);
  const nowB = kolBoard({ people }, r3.calls, NOW + 3 * 3600000);
  assert.deepEqual(nowB.byToken[CA1], { h: ["callerA"], max: 7.4 });
  assert.equal(board.byToken[CA1], undefined, "older than 7 days");
});
check("board: totals", () => { assert.equal(board.stats.people, 3); assert.equal(board.stats.risk, 1); assert.equal(board.stats.trusted, 1); assert.equal(board.stats.measured, 3); });

/* the real file: every record has sources, and only the words the method knows */
const file = JSON.parse(await readFile(new URL("../kols.json", import.meta.url), "utf8"));
check("board: an account X has not let us read lately says so", () => {
  const one = (read) => kolBoard({ people: [{ id: "a", name: "A", x: "Abc_1", track: true, incidents: [], align: [] }] }, { calls: [], read }, Date.now()).people[0].seen;
  assert.deepEqual(one({ abc_1: { at: "2026-10-31T12:00:00Z", miss: 3 } }), { ok: null, miss: 3 });
  assert.deepEqual(one({ abc_1: { at: "2026-10-31T12:00:00Z", ok: "2026-10-31T12:00:00Z", since: 1 } }), { ok: "2026-10-31T12:00:00Z", miss: 0 });
  assert.equal(one({}), null);
});
check("kols.json: every incident and alignment has a date, a known kind and at least one https source", () => {
  for (const p of file.people) {
    assert.ok(p.id && p.name, JSON.stringify(p).slice(0, 60));
    for (const i of p.incidents) { assert.ok(/^\d{4}-\d{2}$/.test(i.date) && i.what && ["dump", "insiders", "undisclosed", "collapse"].includes(i.harm) && ["admitted", "court", "settled", "onchain", "lawsuit", "dismissed", "reported"].includes(i.evidence), `${p.id} ${i.token}`); assert.ok(i.sources.length && i.sources.every((s) => /^https:\/\//.test(s.u) && s.t), `${p.id} ${i.token} sources`); }
    for (const a of p.align) { assert.ok(["wallets", "holds", "discloses"].includes(a.kind) && a.what && a.sources.length && a.sources.every((s) => /^https:\/\//.test(s.u)), `${p.id} align`); }
    if (p.track) assert.ok(/^[A-Za-z0-9_]{1,15}$/.test(p.x), `${p.id} handle`);
  }
});
check("kols.json: no dashes", () => assert.ok(!/[–—]/.test(JSON.stringify(file))));
const real = kolBoard(file, { calls: [] }, NOW);
check("kols.json: the board stays small", () => assert.ok(JSON.stringify(real).length < 30000, String(JSON.stringify(real).length)));

for (const [s, n, m] of results) console.log(`${s.padEnd(4)} ${n}${m ? "  >> " + m : ""}`);
console.log(`\nKOL board: ${real.people.map((p) => `${p.name} ${p.score}`).join(", ")}`);
process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
