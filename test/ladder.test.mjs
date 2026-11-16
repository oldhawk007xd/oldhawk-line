/* The runner ladder's record (lib/ladder.mjs): one close per UTC day, a close is final only when the next day
   arrives, the week's moves come from two closes, and a coin too young to be named is never named. */
import assert from "node:assert/strict";
import { ladderStep, FLOORS } from "../lib/ladder.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };

const MIN = [1e7, 5e7, 1e8, 5e8, 1e9, 5e9, 1e10];
const tier = (m) => MIN.reduce((t, v, i) => (m >= v ? i : t), 0);
/* coins: { TICKER: market cap in $M } or { TICKER: { m, g, ad, c, y } } */
const reading = (day, coins, opt = {}) => ({
  at: `${day}T${opt.time || "12:00"}:00.000Z`,
  ladder: {
    onchain: { status: opt.down ? "offline" : "live" },
    runners: Object.entries(coins).map(([s, v]) => {
      const o = typeof v === "number" ? { m: v } : v, m = o.m * 1e6;
      return { s, n: `${s} coin`, c: o.c || "listed", m, t: tier(m), ...(o.ad ? { ad: o.ad } : {}), ...(o.g || !o.ad ? { g: o.g || s.toLowerCase() } : {}), ...(o.y ? { y: 1 } : {}) };
    })
  }
});
const run = (steps, file = null) => steps.reduce((f, [day, coins, opt]) => ladderStep(f, reading(day, coins, opt)), file);
const names = (list) => list.map((x) => x.s || "?").sort().join(",");

check("seven floors, the same as the engine's ladder", () => assert.deepEqual(FLOORS, ["$10M", "$50M", "$100M", "$500M", "$1B", "$5B", "$10B"]));

check("the first reading starts the record: one close, no week yet, every coin on its floor", () => {
  const f = run([["2026-11-01", { AAA: 12, BBB: 60, CCC: 2000 }]]);
  assert.equal(f.v, 1); assert.equal(f.since, "2026-11-01"); assert.equal(f.closes.length, 1);
  assert.equal(f.out.week, null);
  assert.deepEqual(f.out.base, { n: 3, up: 0, same: 3, down: 0, off: 0 });
  assert.equal(f.out.moves.length, 0); assert.equal(f.out.climbs.length, 0);
});

check("a later reading the same day moves today's close and counts no move", () => {
  const f = run([["2026-11-01", { AAA: 12, BBB: 60 }], ["2026-11-01", { AAA: 55, BBB: 40 }, { time: "18:00" }]]);
  assert.equal(f.closes.length, 1); assert.equal(f.closes[0].at, "2026-11-01T18:00:00.000Z");
  assert.equal(f.moves.length, 0); assert.equal(f.out.moves.length, 0);
  assert.deepEqual(f.out.base, { n: 2, up: 0, same: 2, down: 0, off: 0 });
});

check("the next day: yesterday is final, today's moves show against it", () => {
  const f = run([["2026-11-01", { AAA: 12, BBB: 60, CCC: 30 }], ["2026-11-02", { AAA: 55, BBB: 40, DDD: 11 }]]);
  assert.equal(f.closes.length, 2);
  assert.equal(f.moves.length, 0, "today's moves are not final yet");
  assert.deepEqual(f.out.moves.map((m) => `${m.s} ${m.from}>${m.to} ${m.d}`).sort(), ["AAA 0>1 2026-11-02", "BBB 1>0 2026-11-02"]);
  const w = f.out.week;
  assert.equal(w.from, "2026-11-01"); assert.equal(w.to, "2026-11-02"); assert.equal(w.days, 1);
  assert.equal(names(w.up), "AAA"); assert.equal(names(w.down), "BBB"); assert.equal(names(w.joined), "DDD"); assert.equal(names(w.left), "CCC");
  assert.deepEqual(w.now, [2, 1, 0, 0, 0, 0, 0]); assert.deepEqual(w.then, [2, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(f.out.base, { n: 3, up: 1, same: 0, down: 1, off: 1 });
  assert.deepEqual(f.out.climbs.map((c) => `${c.s} ${c.to} ${c.on} ${c.days} ${c.held}`), ["AAA 1 2026-11-02 1 true"]);
});

check("a floor touched during the day and lost by the close is not a climb", () => {
  const f = run([["2026-11-01", { AAA: 12 }], ["2026-11-02", { AAA: 70 }, { time: "09:00" }], ["2026-11-02", { AAA: 20 }, { time: "23:30" }], ["2026-11-03", { AAA: 21 }]]);
  assert.equal(f.moves.length, 0); assert.equal(f.out.climbs.length, 0); assert.equal(f.out.moves.length, 0);
});

check("a finished climb stays in the record, and says if the coin still holds the floor", () => {
  const f = run([["2026-11-01", { AAA: 12 }], ["2026-11-02", { AAA: 120 }], ["2026-11-03", { AAA: 40 }], ["2026-11-04", { AAA: 41 }]]);
  assert.deepEqual(f.moves.map((m) => `${m.d} ${m.from}>${m.to}`), ["2026-11-02 0>2", "2026-11-03 2>0"]);
  assert.deepEqual(f.out.climbs.map((c) => `${c.s} ${c.to} ${c.on} ${c.held}`).sort(), ["AAA 1 2026-11-02 false", "AAA 2 2026-11-02 false"]);
  assert.equal(f.out.climbCount, 2);
});

check("the week is the last close against the one seven days before it", () => {
  const steps = [];
  for (let d = 1; d <= 9; d++) steps.push([`2026-11-0${d}`, { AAA: d === 9 ? 55 : 12, OLD: d <= 2 ? 15 : 0.1, KEEP: 200, ...(d >= 8 ? { NEW: 11 } : {}) }]);
  const f = run(steps);
  const w = f.out.week;
  assert.equal(w.from, "2026-11-02"); assert.equal(w.to, "2026-11-09"); assert.equal(w.days, 7);
  assert.equal(names(w.up), "AAA"); assert.equal(names(w.joined), "NEW"); assert.equal(names(w.left), "OLD"); assert.equal(w.down.length, 0);
  assert.equal(f.closes.length, 9);
});

check("only nine closes are kept, and the record of every coin of the first day stays", () => {
  const steps = [];
  for (let d = 1; d <= 28; d++) steps.push([`2026-11-${String(d).padStart(2, "0")}`, { AAA: 12, ...(d === 1 ? { GONE: 15 } : {}) }]);
  const f = run(steps);
  assert.equal(f.closes.length, 9); assert.equal(f.closes[0].d, "2026-11-20");
  assert.equal(f.out.base.n, 2); assert.equal(f.out.base.off, 1); assert.equal(f.out.base.same, 1);
});

check("a coin that only passed by is forgotten after a month, one that changed floor is not", () => {
  const steps = [["2026-10-01", { AAA: 12 }]];
  steps.push(["2026-10-02", { AAA: 12, PASS: 11, MOVER: 12 }], ["2026-10-03", { AAA: 12, MOVER: 60 }], ["2026-10-04", { AAA: 12 }]);
  for (let d = 5; d <= 31; d++) steps.push([`2026-10-${String(d).padStart(2, "0")}`, { AAA: 12 }]);
  for (let d = 1; d <= 12; d++) steps.push([`2026-11-${String(d).padStart(2, "0")}`, { AAA: 12 }]);
  const f = run(steps);
  const kept = Object.values(f.coins).map((c) => c.s).sort().join(",");
  assert.equal(kept, "AAA,MOVER");
  assert.equal(f.out.climbs.filter((c) => c.s === "MOVER").length, 1);
});

check("the on-chain source down: no close is taken, the file stays as it was", () => {
  const a = run([["2026-11-01", { AAA: 12, SOL: { m: 20, c: "sol", ad: "So1" } }]]);
  const b = ladderStep(a, reading("2026-11-02", { AAA: 12 }, { down: true }));
  assert.equal(b, a);
  assert.equal(ladderStep(null, reading("2026-11-02", { AAA: 12 }, { down: true })), null);
});

check("a reading older than the last close changes nothing", () => {
  const a = run([["2026-11-01", { AAA: 12 }], ["2026-11-02", { AAA: 13 }]]);
  assert.equal(ladderStep(a, reading("2026-11-01", { AAA: 99 })), a);
});

check("a listed coin later matched to its address is the same coin", () => {
  const f = run([["2026-11-01", { AAA: { m: 12, g: "aaa" } }], ["2026-11-02", { AAA: { m: 60, g: "aaa", ad: "0xabc" } }], ["2026-11-03", { AAA: { m: 61, c: "base", ad: "0xabc" } }]]);
  assert.equal(Object.keys(f.coins).length, 1); assert.ok(f.coins["ad:0xabc"]);
  assert.equal(f.out.week.joined.length, 0); assert.equal(f.out.week.left.length, 0); assert.equal(names(f.out.week.up), "AAA");
  assert.equal(f.out.base.n, 1); assert.equal(f.out.base.up, 1);
});

check("a coin too young to be named is counted, never named", () => {
  const f = run([["2026-11-01", { AAA: 12, YNG: { m: 30, y: 1 } }], ["2026-11-02", { AAA: 12, YNG: { m: 70, y: 1 }, YN2: { m: 11, y: 1 } }]]);
  const text = JSON.stringify(f.out);
  assert.ok(!text.includes("YNG") && !text.includes("YN2"), "no young coin's name in what the pages read");
  assert.equal(f.out.week.up.length, 1); assert.equal(f.out.week.up[0].y, 1); assert.equal(f.out.week.joined[0].y, 1);
  /* once it is old enough it is named, in the moves it already made too */
  const g = ladderStep(f, reading("2026-11-03", { AAA: 12, YNG: 71, YN2: { m: 11, y: 1 } }));
  assert.ok(JSON.stringify(g.out.moves).includes("YNG"));
});

check("two rows for one coin count once, at the larger market cap", () => {
  const r = reading("2026-11-01", { AAA: 12 });
  r.ladder.runners.push({ ...r.ladder.runners[0], m: 6e7, t: 1 });
  const f = ladderStep(null, r);
  assert.deepEqual(Object.values(f.closes[0].rows), [[1, 6e7]]);
});

check("the file is plain JSON and feeding it back gives the same file", () => {
  const a = run([["2026-11-01", { AAA: 12, BBB: 60 }], ["2026-11-02", { AAA: 55, BBB: 40 }]]);
  const b = ladderStep(JSON.parse(JSON.stringify(a)), reading("2026-11-02", { AAA: 55, BBB: 40 }));
  assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)));
});

for (const [s, name, why] of results) console.log(s === "ok" ? "ok" : "FAIL", name, why || "");
if (results.some((r) => r[0] !== "ok")) process.exit(1);
