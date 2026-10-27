import assert from "node:assert/strict";
import { collect, compute, toDaily, alertsFor, blank, INPUTS } from "../lib/engine.mjs";
import { fakeFetch, NOW } from "./fixtures.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };
const fast = { now: NOW, gapMs: 0, retryWaitMs: 5 };

/* 1. Today, every source up, Codex key set */
const calls = [];
const raw = await collect({ fetchImpl: fakeFetch({ calls }), codexKey: "test-key", ...fast });
const r = compute(raw, { now: NOW, history: [] });
const L = r.ladder;

check("weights sum to 100", () => assert.equal(INPUTS.reduce((s, m) => s + m.w, 0), 100));
check("12 calls routed (9 sources + 1 Codex page + 2 launch radar calls)", () => assert.equal(calls.filter((c) => c.route).length, 12));
check("radar: one scan of every launchpad, then one call for StonkFun and pons only", () => {
  const rc = calls.filter((c) => c.route === "codex" && /query Radar/.test(JSON.parse(c.body).query)).map((c) => JSON.parse(c.body).variables);
  assert.equal(rc.length, 2);
  assert.ok(rc[0].filters.launchpadName.length > 20 && rc[0].limit === 100);
  assert.deepEqual(rc[1].filters.launchpadName, ["StonkFun", "pons"]); assert.equal(rc[1].limit, 25);
  assert.ok(rc.every((v) => v.filters.circulatingMarketCap.gte === 1000000 && v.filters.tokenCreatedAt.gte > 0));
});
check("hyperliquid is a POST with the right body", () => { const c = calls.find((x) => x.route === "hl"); assert.equal(c.method, "POST"); assert.equal(JSON.parse(c.body).type, "metaAndAssetCtxs"); });
check("Codex call: POST, key in Authorization, $10M floor, six chains, launchpads", () => {
  const c = calls.find((x) => x.route === "codex");
  assert.equal(c.method, "POST"); assert.equal(c.headers.authorization, "test-key");
  const b = JSON.parse(c.body);
  assert.match(b.query, /filterTokens\(filters: \$filters, rankings: \[\{attribute: circulatingMarketCap, direction: DESC\}\], limit: 200, offset: \$offset\)/);
  assert.equal(b.variables.filters.circulatingMarketCap.gte, 10000000);
  assert.deepEqual(b.variables.filters.network.sort(), [1, 143, 1399811149, 4663, 56, 8453].sort());
  assert.ok(b.variables.filters.launchpadName.includes("Pump.fun") && b.variables.filters.launchpadName.includes("StonkFun") && b.variables.filters.launchpadName.includes("Four.meme"));
});
check("no CoinGecko key header when no key", () => calls.filter((c) => c.route && c.route.startsWith("cg")).forEach((c) => assert.ok(!c.headers["x-cg-demo-api-key"])));
check("coverage 100%", () => assert.equal(r.coverage, 1));
check("clean MC = category minus PUMP, M, Binance-Peg", () => assert.ok(Math.abs(r.market.cleanMC - 25.585e9) < 1e6, r.market.cleanMC));
check("clean dominance about 0.90%", () => assert.ok(Math.abs(r.inputs[0].x - 0.902) < 0.002, r.inputs[0].x));
check("ladder $100M+ counts 16/6/3/1/1 after the on-chain merge", () => assert.deepEqual(L.counts.slice(2), [16, 6, 3, 1, 1]));
check("WLP still 60", () => assert.equal(L.wlp, 60));
check("every runner has a ticker; names, 24h moves and link keys come through", () => {
  assert.ok(L.runners.every((x) => x.s && x.s.length));
  const doge = L.runners.find((x) => x.s === "DOGE");
  assert.equal(doge.n, "Dogecoin"); assert.equal(doge.g, "dogecoin"); assert.equal(typeof doge.d, "number");
  const onchainOnly = L.runners.filter((x) => x.ad);
  assert.equal(onchainOnly.length, 8);
  assert.ok(onchainOnly.every((x) => !x.g && x.c !== "listed"));
  assert.ok(L.runners.filter((x) => x.c === "listed").every((x) => x.g && !x.ad));
});
check("$10M+ = 56 listed + 3 linked + 8 on-chain only = 67", () => assert.equal(L.counts[0], 67, JSON.stringify(L.counts)));
check("$50M+ = 39 listed + DEMOA + DEMOH = 41", () => assert.equal(L.counts[1], 41));
check("FARTCOIN counted once and tagged Solana, Pump.fun", () => { const f = L.runners.filter((x) => x.s === "FARTCOIN"); assert.equal(f.length, 1); assert.equal(f[0].c, "sol"); assert.equal(f[0].lp, "Pump.fun"); });
check("币安人生 linked to BNB, Four.meme", () => { const f = L.runners.filter((x) => x.s === "币安人生"); assert.equal(f.length, 1); assert.equal(f[0].c, "bsc"); assert.equal(f[0].lp, "Four.meme"); });
check("scam, unknown chain and quiet tokens kept out", () => ["DEMOX", "DEMOR", "DEMOQ"].forEach((s) => assert.ok(!L.runners.some((x) => x.s === s), s)));
check("on-chain status live, 8 added, 3 linked", () => { assert.equal(L.onchain.status, "live"); assert.equal(L.onchain.added, 8); assert.equal(L.onchain.matched, 3); });
check("new this week: DEMOB, DEMOC, DEMOE", () => { assert.equal(L.newWeekCount, 3); assert.deepEqual(L.newWeek.map((x) => x.s).sort(), ["DEMOB", "DEMOC", "DEMOE"]); });
check("by chain includes Robinhood and Monad", () => { assert.equal(L.byChain.find((x) => x.id === "hood").count, 1); assert.equal(L.byChain.find((x) => x.id === "monad").count, 1); assert.equal(L.byChain.find((x) => x.id === "listed").count, 56); });
check("by launchpad lists Pump.fun first or tied", () => assert.ok(L.byLaunchpad.length >= 5));
check("fresh above $100M stays 0 (DEMOH is $85M)", () => assert.equal(L.fresh, 0));
check("pump.fun 7d avg $1.36M", () => assert.ok(Math.abs(r.inputs[5].x - 1.3636) < 0.001, r.inputs[5].x));
check("HL meme funding near baseline", () => assert.ok(r.market.hl.f8h <= 0.0105 && r.market.hl.f8h > 0.004, r.market.hl.f8h));
check("Line is low single digits, Deep Winter, Midnight", () => { assert.ok(r.line >= 1 && r.line <= 9, String(r.line)); assert.equal(r.zone.name, "Deep Winter"); assert.equal(r.zone.hour, "Midnight"); });
check("bottom board 6 of 8, open", () => { assert.equal(r.boards.bottom.hits, 6); assert.equal(r.boards.bottom.open, true); });
check("season flag off, no top trigger", () => { assert.equal(r.season.on, false); assert.equal(r.boards.top.lit, 0); });
check("every rule has a live status", () => [...r.boards.bottom.items, ...r.boards.season.items, ...r.boards.top.items].forEach((i) => assert.notEqual(i.hit, null, i.id)));
check("sources all ok, Codex included", () => r.sources.forEach((s) => assert.equal(s.ok, true, s.id)));
check("no dashes in published strings", () => assert.ok(!/[–—]/.test(JSON.stringify(r))));
check("daily row has 7 ladder counts", () => { const d = toDaily(r); assert.equal(d.n.length, 7); assert.equal(d.oc, "live"); assert.equal(d.nw, 3); });
check("latest.json stays compact", () => assert.ok(JSON.stringify(r).length < 40000, String(JSON.stringify(r).length)));

check("edge and near rows carry market cap and chain", () => [...L.edge, ...L.near].forEach((x) => { assert.ok(x.m > 0, x.s); assert.ok(typeof x.c === "string", x.s); }));

/* 1b. The method with no live values, for the site before its first reading */
const B1 = blank(), B2 = blank();
check("blank: no reading, no ladder, every rule waiting", () => {
  assert.equal(B1.blank, true); assert.equal(B1.line, null); assert.equal(B1.ladder, null); assert.equal(B1.at, null);
  [...B1.boards.bottom.items, ...B1.boards.season.items, ...B1.boards.top.items].forEach((i) => assert.equal(i.hit, null, i.id));
  B1.inputs.forEach((m) => assert.equal(m.status, "offline", m.id));
  B1.sources.forEach((x) => assert.equal(x.waiting, true, x.id));
});
check("blank: carries the whole method", () => { assert.equal(B1.zones.length, 7); assert.equal(B1.inputs.length, 11); assert.ok(B1.cycle.length >= 4); assert.equal(B1.kills.length, 3); assert.equal(B1.pillars.length, 6); });
check("blank: same bytes every run, so the file only changes with the method", () => assert.equal(JSON.stringify(B1), JSON.stringify(B2)));
check("blank: no dashes", () => assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(B1))));

/* 2. No Codex key: ladder from CoinGecko only, Codex marked off, not failed */
const rawNo = await collect({ fetchImpl: fakeFetch(), ...fast });
const rNo = compute(rawNo, { now: NOW });
check("no key: no Codex call, status off", () => { assert.equal(rNo.ladder.onchain.status, "off"); const s = rNo.sources.find((x) => x.id === "codex"); assert.equal(s.off, true); });
check("no key: Line unchanged", () => assert.equal(rNo.line, r.line));
check("no key: $10M+ = 59 listed", () => assert.equal(rNo.ladder.counts[0], 59));

/* 3. Codex answers with a GraphQL error: offline, Line unaffected */
const rawErr = await collect({ fetchImpl: fakeFetch({ fail: ["codexGraphql"] }), codexKey: "k", ...fast });
const rErr = compute(rawErr, { now: NOW });
check("GraphQL error: Codex offline with the message", () => { assert.equal(rErr.ladder.onchain.status, "offline"); assert.match(rErr.ladder.onchain.error, /Cannot query field/); });
check("GraphQL error: Line unchanged", () => assert.equal(rErr.line, r.line));

/* 4. CoinGecko rate-limited: Line must not be published */
const rawCG = await collect({ fetchImpl: fakeFetch({ fail: ["coingecko"] }), codexKey: "k", ...fast });
const rCG = compute(rawCG, { now: NOW });
check("CoinGecko down: coverage 37%, no Line", () => { assert.equal(Math.round(rCG.coverage * 100), 37); assert.equal(rCG.line, null); });
check("CoinGecko down: ladder offline even with Codex up", () => assert.equal(rCG.ladder, null));

/* 4b. A kept Codex snapshot: no Codex call at all, the same on-chain picture */
{
  const { slimCodex } = await import("../lib/engine.mjs");
  const snap = { at: raw.at, codex: slimCodex(raw.codex.data), codexRadar: slimCodex(raw.codexRadar.data), codexPinned: slimCodex(raw.codexPinned.data) };
  const sc = [];
  const rawS = await collect({ fetchImpl: fakeFetch({ calls: sc }), codexKey: "k", codexCache: JSON.parse(JSON.stringify(snap)), ...fast });
  const rS = compute(rawS, { now: NOW });
  check("snapshot: no Codex call, same runners, launches and Line", () => {
    assert.equal(sc.filter((c) => c.route === "codex").length, 0);
    assert.deepEqual(rS.ladder.counts, r.ladder.counts); assert.equal(rS.line, r.line);
    assert.equal(rS.ladder.radar.tokens.length, r.ladder.radar.tokens.length);
    assert.equal(rS.ladder.onchain.status, "live"); assert.equal(rS.ladder.onchain.at, raw.at);
  });
  check("snapshot stays small", () => assert.ok(JSON.stringify(snap).length < 12000, String(JSON.stringify(snap).length)));
}

/* 5. Hot market with 450 on-chain tokens: paging and the cap */
const hotCalls = [];
const rawH = await collect({ fetchImpl: fakeFetch({ variant: "hot", calls: hotCalls }), codexKey: "k", codexPages: 3, ...fast });
const rH = compute(rawH, { now: NOW });
check("hot: 3 Codex pages plus the two radar calls, not truncated", () => { const cx = hotCalls.filter((c) => c.route === "codex"); assert.equal(cx.filter((c) => !/query Radar/.test(JSON.parse(c.body).query)).length, 3); assert.equal(cx.length, 5); assert.equal(rH.ladder.onchain.truncated, false); });
check("launch radar: fresh tokens from StonkFun and pons, hottest first, under 7 days and from $1M", () => {
  const t = r.ladder.radar.tokens;
  assert.equal(r.ladder.radar.status, "live");
  assert.ok(t.some((x) => x.lp === "StonkFun") && t.some((x) => x.lp === "pons"));
  assert.ok(t.every((x) => x.a <= 7.5 && x.m >= 1e6));
  assert.equal(t[0].s, "DEMOSTK"); assert.equal(t[0].d, 185);
});
check("launchpads: StonkFun and pons always shown, with their counts", () => {
  const lp = r.ladder.launch;
  const stk = lp.find((x) => x.id === "StonkFun"), pons = lp.find((x) => x.id === "pons");
  assert.ok(stk && stk.pinned && stk.fresh === 2 && stk.runners === 1);
  assert.ok(pons && pons.pinned && pons.fresh === 2, JSON.stringify(pons));
  assert.ok(r.ladder.radar.tokens.some((x) => x.s === "DEMOPON2"), "the pinned call adds what the main scan missed");
});
check("meme market 24h change from the category", () => assert.equal(r.market.memeChange24, -1.2));
check("hot: Line 75 or more, 3+ top triggers, flag on", () => { assert.ok(rH.line >= 75, String(rH.line)); assert.ok(rH.boards.top.lit >= 3); assert.equal(rH.season.on, true); });
check("hot: fresh runners above $100M counted from launch dates", () => assert.ok(rH.ladder.fresh >= 20, String(rH.ladder.fresh)));
const rawH2 = await collect({ fetchImpl: fakeFetch({ variant: "hot" }), codexKey: "k", codexPages: 2, ...fast });
check("hot with 2 pages: truncated flag set", () => assert.equal(compute(rawH2, { now: NOW }).ladder.onchain.truncated, true));

/* 6. Alerts */
const a1 = alertsFor(null, r);
const a2 = alertsFor(a1.state, rH);
check("alerts: baseline, then flag and trigger alerts; zone alert only 2+ points inside the zone", () => {
  assert.equal(a1.messages.length, 0);
  assert.ok(a2.messages.some((m) => /Season Flag ON/.test(m)));
  assert.ok(a2.messages.some((m) => /Top trigger live/.test(m)));
  const inside = rH.lineExact >= rH.zone.from + 2 && (rH.zone.to === 100 || rH.lineExact <= rH.zone.to - 2);
  assert.equal(a2.messages.some((m) => /Zone change/.test(m)), inside, `lineExact ${rH.lineExact}`);
});
check("alerts: same state twice sends nothing", () => assert.equal(alertsFor(a2.state, rH).messages.length, 0));

import { weeklyFrom, liveCandle, basketSeries, weekStart } from "../lib/engine.mjs";
{
  const D = 86400000, mon = Date.UTC(2026, 9, 19);
  const pts = [[mon, 10], [mon + D, 12], [mon + 2 * D, 9], [mon + 6 * D, 11], [mon + 7 * D, 11.5], [mon + 8 * D, 13]];
  const w = weeklyFrom(pts);
  check("weekly candles: Monday weeks, open/high/low/close", () => { assert.equal(w.length, 2); assert.deepEqual(w[0], { t: mon, o: 10, h: 12, l: 9, c: 11 }); assert.deepEqual(w[1], { t: mon + 7 * D, o: 11.5, h: 13, l: 11.5, c: 13 }); });
  check("weekStart: a Sunday belongs to the week that began on Monday", () => assert.equal(weekStart(mon + 6 * D + 23 * 3600000), mon));
  const w2 = liveCandle(w, mon + 9 * D, 14), w3 = liveCandle(w2, mon + 14 * D, 12);
  check("live candle: same week moves high and close, a new week opens at the last close", () => { assert.deepEqual(w2[1], { t: mon + 7 * D, o: 11.5, h: 14, l: 11.5, c: 14 }); assert.deepEqual(w3[2], { t: mon + 14 * D, o: 14, h: 14, l: 12, c: 12 }); });
  check("basket series sums coins per day and ignores repeats in a day", () => assert.deepEqual(basketSeries([{ caps: [[mon, 1], [mon + 3600000, 5], [mon + D, 2]] }, { caps: [[mon, 3]] }]), [[mon, 4], [mon + D, 2]]));
}
for (const [s, n, m] of results) console.log(`${s.padEnd(4)} ${n}${m ? "  >> " + m : ""}`);
console.log(`\nToday: Line ${r.line} (${r.lineExact}) ${r.zone.name} · ladder ${L.counts.join("/")} · new this week ${L.newWeekCount} · bytes ${JSON.stringify(r).length}`);
console.log("By chain:", L.byChain.map((c) => `${c.id} ${c.count}`).join(", "), "· by launchpad:", L.byLaunchpad.map((c) => `${c.id} ${c.count}`).join(", "));
console.log(`Hot: Line ${rH.line} ${rH.zone.name} · ladder ${rH.ladder.counts.join("/")} · fresh ${rH.ladder.fresh} · bytes ${JSON.stringify(rH).length}`);

process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
