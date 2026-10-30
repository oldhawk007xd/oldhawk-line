import assert from "node:assert/strict";
import { collect, compute, toDaily, alertsFor, blank, INPUTS, deepEnough, cloneGroups, cloneLeads, watchIds, rigged, xHandle, logoUrl, seriousCheck, socialNeeds, refreshSocials, NEEDS, SERIOUS } from "../lib/engine.mjs";
import { fakeFetch, NOW } from "./fixtures.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };
const fast = { now: NOW, gapMs: 0, retryWaitMs: 5 };

/* 1. Today, every source up, Codex key set */
const calls = [];
const raw = await collect({ fetchImpl: fakeFetch({ calls }), codexKey: "test-key", ...fast });
const r0 = compute(raw, { now: NOW, history: [] });
/* the X checks of scripts/update.mjs, as on two runs half an hour apart */
const xc = [], fx = fakeFetch({ calls: xc });
const xo = { fetchImpl: fx, gapMs: 0, cgGapMs: 0, retryWaitMs: 0, maxPages: 100 };
const s1 = await refreshSocials(null, r0[NEEDS], { ...xo, now: NOW });
const xc1 = xc.slice();
const n2 = compute(raw, { now: NOW + 31 * 60000, history: [], socials: s1.socials })[NEEDS];
const s2 = await refreshSocials(JSON.parse(JSON.stringify(s1.socials)), n2, { ...xo, now: NOW + 31 * 60000 });
const socials = s2.socials;
const r = compute(raw, { now: NOW, history: [], socials });
const L = r.ladder;
const T = L.trending;

check("weights sum to 100", () => assert.equal(INPUTS.reduce((s, m) => s + m.w, 0), 100));
check("12 calls routed (9 sources + 1 Codex page + 2 launch radar calls)", () => assert.equal(calls.filter((c) => c.route).length, 12));
check("radar: one scan of every launchpad, then one call for StonkFun and pons only", () => {
  const rc = calls.filter((c) => c.route === "codex" && /query Radar/.test(JSON.parse(c.body).query)).map((c) => JSON.parse(c.body).variables);
  assert.equal(rc.length, 2);
  assert.ok(rc[0].filters.launchpadName.length > 20 && rc[0].limit === 200, "200 candidates, since rigged launches no longer take the seats");
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
check("look-alikes left out: shallow coins, a ticker launched three times, a copy of a listed ticker", () => {
  assert.equal(L.onchain.left, 7, "the two OILX launches with one name count once, plus three rigged markets");
  assert.deepEqual(L.onchain.why, { shallow: 4, held: 1, oneway: 1, bots: 1 }, "the depth check comes first");
  for (const t of ["RIGHELD", "RIGONE", "RIGBOT"]) assert.ok(!L.runners.some((x) => x.s === t), `${t} should not be a runner`);
  for (const t of ["OILX", "DEEPX"]) assert.ok(!L.runners.some((x) => x.s === t), `${t} should not be a runner`);
  assert.ok(!L.runners.some((x) => x.s === "PNUT" && x.ad), "an on-chain PNUT copy should not be a runner");
});
check("rigged markets, measured on the coins in the screenshots", () => {
  assert.equal(rigged({ a: 0.2, q: { ub: 1748, us: 15, tx: 2896, sus: 98.869 } }), "held", "DOTF: insiders hold 99%");
  assert.equal(rigged({ a: 2, q: { ub: 2910, us: 7, tx: 33304, sus: 1 } }), "oneway", "2,910 buyers, 7 sellers");
  assert.equal(rigged({ a: 1, q: { ub: 344, us: 331, tx: 75441, sus: 19 } }), "bots", "75,441 trades by 675 wallets");
  assert.equal(rigged({ a: 3, q: { ub: 13, us: 15, tx: 6233 } }), "bots", "17 traders, 6,233 trades");
  assert.equal(rigged({ a: 109, q: { ub: 678, us: 687, tx: 5241, sus: 0 } }), null, "PONS");
  assert.equal(rigged({ a: 99, q: { ub: 3368, us: 3214, tx: 18432, sus: 0 } }), null, "STONK");
  assert.equal(rigged({ a: 689, q: { ub: 143, us: 144, tx: 6252, sus: 0 } }), null, "ARC: an old coin with market makers");
  assert.equal(rigged({ a: 0.2, q: { ub: 10017, us: 8322, tx: 90388, sus: 0 } }), null, "a busy new launch with real buyers and sellers");
  assert.equal(rigged({ a: 2 }), null, "no numbers, no verdict");
  assert.equal(rigged({ a: 64, q: { ub: 53, us: 57, tx: 1292, sus: 10.6, flags: ["SuspiciousWalletActivity", "BundledLaunch"] } }), "bundled", "CIGR: Codex marks a bundled launch");
  assert.equal(rigged({ a: 2.7, q: { ub: 717, us: 689, tx: 25892, sus: 1, flags: ["SuspiciousWalletActivity", "BundledLaunch"] } }), "bundled", "JOB: a bundled launch");
  assert.equal(rigged({ a: 109, q: { ub: 675, us: 680, tx: 5190, sus: 0, flags: ["SuspiciousWalletActivity"] } }), null, "PONS: the wide wallet flag alone is not enough");
});
check("radar: the rigged launch is left out, and nothing younger than a day shows a 24h move", () => {
  assert.ok(!r.ladder.radar.tokens.some((x) => x.s === "DEMORIG"));
  assert.equal(r.ladder.radar.why.held, 1);
  assert.ok(r.ladder.radar.tokens.filter((x) => x.a < 1).every((x) => x.d == null));
});
check("depth: one holder per $8,000 of market cap", () => {
  assert.equal(deepEnough({ m: 80e6, h: 10000 }), true);
  assert.equal(deepEnough({ m: 300e6, h: 2972 }), false);
  assert.equal(deepEnough({ m: 50e6, lq: 1.2e6 }), true, "no holder count: liquidity of 2% will do");
  assert.equal(deepEnough({ m: 50e6, lq: 0.4e6 }), false);
});
check("clones: only a clear leader of a ticker survives", () => {
  const g = cloneGroups([{ s: "CAT", address: "a", h: 60000 }, { s: "C A T", address: "b", h: 3000 }, { s: "DOG", address: "c", h: 5000 }]);
  assert.equal(g.size, 1);
  assert.equal(cloneLeads({ s: "CAT", address: "a", h: 60000 }, g, 20000), true);
  assert.equal(cloneLeads({ s: "CAT", address: "b", h: 3000 }, g, 20000), false);
  assert.equal(cloneLeads({ s: "DOG", address: "c", h: 5000 }, g, 20000), true, "a single launch is not a clone");
  const even = cloneGroups([{ s: "OIL", address: "x", h: 3000 }, { s: "OIL", address: "y", h: 2900 }]);
  assert.equal(cloneLeads({ s: "OIL", address: "x", h: 3000 }, even, 2000), false, "no leader, none kept");
});
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

/* logos and X accounts */
check("X handles: links, @names and bare names; posts, communities and searches are not accounts", () => {
  assert.equal(xHandle("https://x.com/LaunchOnSF"), "LaunchOnSF");
  assert.equal(xHandle("https://twitter.com/pepecoineth/"), "pepecoineth");
  assert.equal(xHandle("http://www.x.com/dogecoin?lang=en"), "dogecoin");
  assert.equal(xHandle("@BinanceLife_"), "BinanceLife_");
  assert.equal(xHandle("dogecoin"), "dogecoin");
  for (const bad of ["https://x.com/i/communities/1880000000000000000", "https://x.com/elonmusk/status/123", "https://x.com/search?q=$DOGE", "https://t.me/dogecoin", "https://example.com/x", "", null, "much_too_long_handle_here"]) assert.equal(xHandle(bad), null, String(bad));
});
check("logos: https only, CoinGecko's small size", () => {
  assert.equal(logoUrl("https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409"), "https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png?1696501409");
  assert.equal(logoUrl("https://token-media.defined.fi/1_0xabc_small_1.png"), "https://token-media.defined.fi/1_0xabc_small_1.png");
  for (const bad of ["http://coin-images.coingecko.com/a.png", "javascript:alert(1)", "https://x.png\" onerror=\"1", 42, null]) assert.equal(logoUrl(bad), null, String(bad));
});
check("every runner carries its logo: CoinGecko's for listed coins, the launchpad's for on-chain ones", () => {
  const doge = L.runners.find((x) => x.s === "DOGE"), h = L.runners.find((x) => x.s === "DEMOH"), f = L.runners.find((x) => x.s === "DEMOF");
  assert.equal(doge.i, "https://coin-images.coingecko.com/coins/images/1/small/dogecoin.png");
  assert.match(h.i, /^https:\/\/token-media\.defined\.fi\//);
  assert.equal(f.i, undefined, "no logo given, none made up");
  assert.ok(L.runners.filter((x) => x.i).length >= L.runners.length - 1);
});
check("Codex is asked for the logo and the X link", () => {
  const c = calls.find((x) => x.route === "codex");
  assert.match(JSON.parse(c.body).query, /info \{ imageSmallUrl \} socialLinks \{ twitter \}/);
});
check("X checks: one coin page per listed coin over 10 days and $10M, every account asked once, the flaky one again", () => {
  const pages = xc1.filter((c) => c.route === "cgPage").length;
  const listedOld = r0.ladder.runners.filter((x) => x.g && !["tail-3"].includes(x.g)).length;
  assert.ok(pages >= listedOld - 1 && pages <= listedOld + 1, `${pages} pages for ${listedOld} listed`);
  const posts = xc1.filter((c) => c.route === "xPosts").map((c) => c.url.split("/")[5].toLowerCase());
  assert.equal(posts.filter((h) => h === "pepecoineth").length, 2, "a 404 from the posts call is checked against the profile, then asked again");
  assert.equal(new Set(posts).size, posts.length - 1);
  assert.equal(s1.socials.x.pepecoineth.fol, 734807);
});
check("X checks: reposts of famous accounts never count as a post or as followers", () => {
  assert.equal(s1.socials.x.dogecoin.fol, 4359057);
  assert.equal(s1.socials.x.dogecoin.post, Math.floor((NOW - 2 * 86400000) / 1000));
  assert.equal(s1.socials.x.realflokiinu.post, null);
});
check("X checks: an account is marked suspended only when two checks in a row say so", () => {
  assert.equal(s1.socials.x.binancelife_.maybeGone, "suspended"); assert.equal(s1.socials.x.binancelife_.gone, undefined);
  assert.equal(socials.x.binancelife_.gone, "suspended");
});
check("X checks: nothing is due right after, accounts again after 20 hours, gone ones after 7 days", () => {
  const now = socialNeeds([], socials, NOW);
  assert.deepEqual(now, { pages: [], handles: [] });
  assert.deepEqual(r[NEEDS].pages, []); assert.deepEqual(r[NEEDS].handles, []);
  const later = compute(raw, { now: NOW + 21 * 3600000, history: [], socials })[NEEDS];
  assert.ok(later.handles.length > 20 && !later.handles.map((h) => h.toLowerCase()).includes("binancelife_"));
  const week = compute(raw, { now: NOW + 8 * 86400000, history: [], socials })[NEEDS];
  assert.ok(week.handles.map((h) => h.toLowerCase()).includes("binancelife_"));
});
check("the X check list never reaches latest.json", () => { assert.ok(r[NEEDS]); assert.ok(!/"handles"|"pages"/.test(JSON.stringify(r))); });
check("trending: every coin is over 10 days old, above $10M, with its own X account active in 14 days and 1,000+ followers", () => {
  assert.ok(T.coins.length >= 8, String(T.coins.length));
  for (const x of T.coins) {
    assert.ok(x.m >= 10e6, x.s); assert.ok(x.a == null || x.a >= 10, x.s);
    assert.ok(x.x && x.xd <= 14 && x.fol >= 1000, `${x.s} ${x.x} ${x.xd} ${x.fol}`);
    assert.ok(x.g || x.ad, x.s); assert.ok(x.i, x.s);
  }
  const ups = T.coins.filter((x) => x.d > 0);
  assert.deepEqual(ups.map((x) => x.d), ups.map((x) => x.d).slice().sort((a, b) => b - a), "biggest 24h gainers first");
});
check("trending leaves out fresh launches, borrowed, quiet, suspended and tiny X accounts, and accounts that are not accounts", () => {
  const names = T.coins.map((x) => x.s);
  for (const s of ["DEMOB", "DEMOC", "DEMOE", "DEMOD", "DEMOA", "DEMOG", "DEMOF", "BONK", "FLOKI", "FARTCOIN", "币安人生", "T0", "T5"]) assert.ok(!names.includes(s), s);
  assert.equal(seriousCheck({ m: 20e6, a: 5, src: "onchain", xu: "demob_bonk" }, socials, NOW).why, "young");
  assert.equal(seriousCheck({ m: 27e6, a: 120, src: "onchain", xu: "RockstarGames" }, socials, NOW).why, "xborrowed");
  assert.equal(seriousCheck({ m: 15e6, a: 20, src: "onchain", xu: "demof_monad" }, socials, NOW).why, "xquiet");
  assert.equal(seriousCheck({ m: 50e6, a: 40, src: "onchain", xu: null }, socials, NOW).why, "nox");
  assert.equal(seriousCheck({ m: 514e6, minAge: 380, src: "both", id: "binance-life", xu: "BinanceLife_" }, socials, NOW).why, "xgone");
  assert.equal(seriousCheck({ m: 90e6, minAge: 900, src: "cg", id: "tail-0" }, socials, NOW).why, "xsmall");
  assert.equal(seriousCheck({ m: 90e6, minAge: 900, src: "cg", id: "not-asked-yet" }, socials, NOW).why, "xwait");
  assert.equal(seriousCheck({ m: 9e6, minAge: 900, src: "cg", id: "dogecoin" }, socials, NOW).why, "small");
  assert.equal(seriousCheck({ m: 12e9, minAge: 900, src: "cg", id: "dogecoin" }, socials, NOW).ok, true);
  assert.ok(T.why.young >= 3 && T.why.xborrowed === 1 && T.why.xgone === 1 && T.why.nox >= 2 && T.why.xquiet >= 3, JSON.stringify(T.why));
  assert.equal(T.pool + T.left, L.runners.length);
});
check("trending: a listed coin with no X on CoinGecko uses the link from its launchpad", () => {
  const k = seriousCheck({ m: 208e6, minAge: 900, src: "both", id: "useless-3", xu: "theuselesscoin" }, socials, NOW);
  assert.equal(k.ok, true); assert.equal(k.h, "theuselesscoin");
});
check("launchpads: the hot coin is one that passes the checks, never a fresh launch", () => {
  const lp = (id) => L.launch.find((x) => x.id === id);
  assert.equal(lp("Bonk").hot.s, "USELESS"); assert.equal(lp("Printr").hot.s, "DEMOH");
  assert.equal(lp("StonkFun").hot, null); assert.equal(lp("Clanker").hot, null);
  const fresh = new Set(r.ladder.radar.tokens.map((x) => x.s));
  L.launch.filter((x) => x.hot).forEach((x) => assert.ok(!fresh.has(x.hot.s), `${x.id}: ${x.hot.s}`));
});
check("runners under 10 days old are marked, so the site counts them without naming them", () => {
  assert.deepEqual(L.runners.filter((x) => x.y).map((x) => x.s).sort(), ["DEMOB", "DEMOC", "DEMOE"]);
  assert.ok(!L.runners.find((x) => x.s === "DOGE").y);
});
check("edge and near name only coins with 10 days behind them", () => [...L.edge, ...L.near].forEach((x) => assert.ok(!["DEMOB", "DEMOC", "DEMOE"].includes(x.s), x.s)));
check("FxTwitter is listed as a source: waiting before the first check, answered after", () => {
  assert.equal(r0.sources.find((x) => x.id === "x").ok, false); assert.match(r0.sources.find((x) => x.id === "x").failed[0].error, /not checked yet/);
  assert.equal(r.sources.find((x) => x.id === "x").ok, true);
});
{
  /* CoinGecko refusing coin pages: one try, then it waits for the next run */
  const fc = [];
  const out = await refreshSocials(null, { pages: ["a", "b", "c"], handles: [] }, { fetchImpl: fakeFetch({ calls: fc, fail: ["cgPage"] }), gapMs: 0, cgGapMs: 0, now: NOW });
  check("coin pages stop at the first 429", () => { assert.equal(fc.filter((c) => c.route === "cgPage").length, 1); assert.equal(out.stats.pageFails, 1); });
  /* FxTwitter answering 404 for every account is an outage: nobody is marked gone */
  const down = await refreshSocials(JSON.parse(JSON.stringify(socials)), { pages: [], handles: ["dogecoin", "Shibtoken", "spx6900", "pudgypenguins", "dogwifcoin"] }, { fetchImpl: fakeFetch({ fail: ["fx"] }), gapMs: 0, retryWaitMs: 0, now: NOW + 3600000 });
  /* "not found" is a hiccup until it lasts: three in a row over a day */
  let sNF = { v: 1, pages: {}, x: {} };
  const nfAt = [0, 0.5, 26].map((h) => NOW + h * 3600000);
  const nfSeen = [];
  for (const t of nfAt) { sNF = (await refreshSocials(sNF, { pages: [], handles: ["nosuchaccount"] }, { fetchImpl: fakeFetch(), gapMs: 0, retryWaitMs: 0, now: t })).socials; nfSeen.push(sNF.x.nosuchaccount.gone || `miss ${sNF.x.nosuchaccount.nf}`); }
  check("X checks: an account FxTwitter cannot find is marked gone only after three tries over a day", () => assert.deepEqual(nfSeen, ["miss 1", "miss 2", "not found"]));
  const empty = await (await import("../lib/engine.mjs")).xLatest("emptyline", { fetchImpl: fakeFetch(), wait: 0 });
  check("X checks: an empty timeline from an account that has posts is a failed check, not a quiet account", () => assert.equal(empty.fail, true));
  check("X checks: an account whose timeline holds only reposts, with no post of its own, is quiet", () => assert.equal(socials.x.realflokiinu.post, null));
  check("FxTwitter down: nobody marked gone, the last answers still count", () => {
    for (const h of ["dogecoin", "shibtoken", "spx6900"]) { assert.ok(!down.socials.x[h].gone && !down.socials.x[h].maybeGone, h); assert.equal(down.socials.x[h].post, socials.x[h].post); }
    assert.equal(down.stats.fails, 5);
    assert.ok(compute(raw, { now: NOW + 3600000, history: [], socials: down.socials }).ladder.trending.coins.some((x) => x.s === "DOGE"));
  });
  const cc = [];
  await refreshSocials(null, { pages: [], handles: ["dogecoin", "Shibtoken", "spx6900"] }, { fetchImpl: fakeFetch({ calls: cc }), gapMs: 0, retryWaitMs: 0, maxChecks: 2, now: NOW });
  check("the X check is capped per run", () => assert.equal(cc.filter((c) => c.route === "xPosts").length, 2));
}

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
{
  /* the watchlist: chain names to Codex ids, one call, counted once, small coins left out */
  check("watchlist ids from chain names and address:network", () => assert.deepEqual(watchIds([{ chain: "base", address: "0xWATCH" }, { chain: "SOL", address: "SmallAddr" }, "FARTCOINAddr1399811149:1399811149", { chain: "tron", address: "x" }, { chain: "base", address: "0xWATCH" }]), ["0xWATCH:8453", "SmallAddr:1399811149", "FARTCOINAddr1399811149:1399811149"]));
  const wc = [];
  const watch = watchIds([{ chain: "base", address: "0xWATCH" }, { chain: "sol", address: "SmallAddr" }, { chain: "sol", address: "FARTCOINAddr1399811149" }]);
  const rawW = await collect({ fetchImpl: fakeFetch({ calls: wc }), codexKey: "k", watch, ...fast });
  const LW = compute(rawW, { now: NOW }).ladder;
  check("watchlist: one Codex call more, DEMOW counted, the small one and the listed one not", () => {
    assert.equal(wc.filter((c) => c.route === "codex" && /query Watch/.test(JSON.parse(c.body).query)).length, 1);
    const w = LW.runners.filter((x) => x.s === "DEMOW");
    assert.equal(w.length, 1); assert.equal(w[0].w, 1); assert.equal(w[0].c, "base"); assert.equal(w[0].ad, "0xWATCH");
    assert.ok(!LW.runners.some((x) => x.s === "DEMOS"));
    assert.equal(LW.runners.filter((x) => x.s === "FARTCOIN").length, 1);
    assert.equal(LW.onchain.watched, 1);
  });
  const snapW = { at: rawW.at, codex: rawW.codex.data, codexRadar: rawW.codexRadar.data, codexPinned: rawW.codexPinned.data, codexWatch: rawW.codexWatch.data, watchKey: rawW.watchKey };
  const wc2 = [];
  await collect({ fetchImpl: fakeFetch({ calls: wc2 }), codexKey: "k", watch, codexCache: snapW, ...fast });
  check("watchlist unchanged: rides on the snapshot, no Codex call", () => assert.equal(wc2.filter((c) => c.route === "codex").length, 0));
  const wc3 = [];
  await collect({ fetchImpl: fakeFetch({ calls: wc3 }), codexKey: "k", watch: [...watch, "NEWAddr:1399811149"], codexCache: snapW, ...fast });
  check("watchlist changed: asked at once, one call", () => assert.equal(wc3.filter((c) => c.route === "codex").length, 1));
}

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
  check("snapshot stays small, logos and X links included", () => assert.ok(JSON.stringify(snap).length < 20000, String(JSON.stringify(snap).length)));
  check("snapshot keeps each coin's logo and X link", () => { const t = snap.codex.results.find((x) => x.token.symbol === "DEMOH").token; assert.match(t.info.imageSmallUrl, /^https:/); assert.equal(t.socialLinks.twitter, "https://x.com/demoh_coin"); });
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

import { weeklyFrom, liveCandle, basketSeries, basketCharts, weekStart } from "../lib/engine.mjs";
{
  const D = 86400000, mon = Date.UTC(2026, 9, 19);
  const pts = [[mon, 10], [mon + D, 12], [mon + 2 * D, 9], [mon + 6 * D, 11], [mon + 7 * D, 11.5], [mon + 8 * D, 13]];
  const w = weeklyFrom(pts);
  check("weekly candles: Monday weeks, open/high/low/close", () => { assert.equal(w.length, 2); assert.deepEqual(w[0], { t: mon, o: 10, h: 12, l: 9, c: 11 }); assert.deepEqual(w[1], { t: mon + 7 * D, o: 11.5, h: 13, l: 11.5, c: 13 }); });
  check("weekStart: a Sunday belongs to the week that began on Monday", () => assert.equal(weekStart(mon + 6 * D + 23 * 3600000), mon));
  const w2 = liveCandle(w, mon + 9 * D, 14), w3 = liveCandle(w2, mon + 14 * D, 12);
  check("live candle: same week moves high and close, a new week opens at the last close", () => { assert.deepEqual(w2[1], { t: mon + 7 * D, o: 11.5, h: 14, l: 11.5, c: 14 }); assert.deepEqual(w3[2], { t: mon + 14 * D, o: 14, h: 14, l: 12, c: 12 }); });
  check("basket series sums coins per day and ignores repeats in a day", () => assert.deepEqual(basketSeries([{ caps: [[mon, 1], [mon + 3600000, 5], [mon + D, 2]] }, { caps: [[mon, 3]] }]), [[mon, 4], [mon + D, 2]]));
  {
    /* a coin that fails is skipped and listed; three failures in a row at the start stop the asking */
    const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
    const caps = { market_caps: [[mon, 1], [mon + D, 2]] };
    const some = await basketCharts({ ids: ["a", "b", "c"], gapMs: 0, retryWaitMs: 0, fetchImpl: async (u) => (u.includes("/b/") ? json({}, 404) : json(caps)) });
    check("basket skips a coin that fails and keeps the rest", () => { assert.deepEqual(some.map((c) => c.id), ["a", "c"]); assert.equal(some.failed.length, 1); assert.equal(some.failed[0].id, "b"); });
    let asked = 0;
    const none = await basketCharts({ ids: ["a", "b", "c", "d", "e"], gapMs: 0, retryWaitMs: 0, fetchImpl: async () => { asked++; return json({}, 401); } });
    check("basket stops asking after three failures at the start", () => { assert.equal(none.length, 0); assert.equal(asked, 3); assert.equal(none.failed.length, 5); });
  }
}
for (const [s, n, m] of results) console.log(`${s.padEnd(4)} ${n}${m ? "  >> " + m : ""}`);
console.log(`\nToday: Line ${r.line} (${r.lineExact}) ${r.zone.name} · ladder ${L.counts.join("/")} · new this week ${L.newWeekCount} · bytes ${JSON.stringify(r).length}`);
console.log("By chain:", L.byChain.map((c) => `${c.id} ${c.count}`).join(", "), "· by launchpad:", L.byLaunchpad.map((c) => `${c.id} ${c.count}`).join(", "));
console.log(`Hot: Line ${rH.line} ${rH.zone.name} · ladder ${rH.ladder.counts.join("/")} · fresh ${rH.ladder.fresh} · bytes ${JSON.stringify(rH).length}`);

process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
