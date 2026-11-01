import assert from "node:assert/strict";
import { liveRows, basketCloses, buildMemecap, addReading, DAY } from "../lib/memecap.mjs";

let failed = 0;
const check = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); } };
const T = (d) => Date.parse(`${d}T00:00:00Z`);

check("live rows: the first reading opens a day, the last closes it, highs and lows in between", () => {
  const rows = liveRows([["2026-10-27T16:04:00Z", 29.3e9], ["2026-10-27T20:00:00Z", 29.9e9], ["2026-10-27T23:37:00Z", 29.5e9], ["2026-10-28T00:07:00Z", 29.4e9], ["2026-10-27T18:00:00Z", 28.8e9]]);
  assert.deepEqual(rows, [["2026-10-27", 29.3, 29.9, 28.8, 29.5, 0], ["2026-10-28", 29.4, 29.4, 29.4, 29.4, 0]]);
});

check("basket: a point at midnight is the close of the day before, the point at call time is left out", () => {
  const c = basketCloses([{ id: "a", caps: [[T("2026-10-30"), 10], [T("2026-10-31"), 12], [T("2026-10-31") + 9 * 3600e3, 99]] }, { id: "b", caps: [[T("2026-10-30"), 1], [T("2026-10-31"), 2]] }]);
  assert.deepEqual(c, [["2026-10-29", 11], ["2026-10-30", 14]]);
});

check("basket: a coin's missing day carries its last value, a coin that did not exist yet adds nothing", () => {
  const c = basketCloses([{ id: "a", caps: [[T("2026-10-01"), 10], [T("2026-10-03"), 30]] }, { id: "new", caps: [[T("2026-10-03"), 5]] }]);
  assert.deepEqual(c, [["2026-09-30", 10], ["2026-10-01", 10], ["2026-10-02", 35]]);
});

check("a one-day error in a coin's market cap is taken out, a move that lasts stays", () => {
  const c = basketCloses([{ id: "glitch", caps: [[T("2026-09-09"), 9628e6], [T("2026-09-10"), 650e6], [T("2026-09-11"), 183e6], [T("2026-09-12"), 170e6], [T("2026-09-13"), 160e6], [T("2026-09-14"), 150e6]] }]);
  assert.ok(c.every(([, v]) => v < 200e6), JSON.stringify(c));
  const pump = basketCloses([{ id: "pump", caps: [10, 10, 10, 50, 52, 55, 60].map((v, i) => [T("2026-09-01") + i * DAY, v * 1e6]) }]);
  assert.deepEqual(pump.map((x) => x[1] / 1e6), [10, 10, 10, 50, 52, 55, 60]);
});

const charts = [{ id: "doge", caps: [] }, { id: "pepe", caps: [] }];
/* 38 midnight points, 24 Sep to 31 Oct: the closes of 23 Sep to 30 Oct, then the point at call time */
for (let i = 0; i < 38; i++) {
  const t = T("2026-09-24") + i * DAY;
  charts[0].caps.push([t, (10 + i * 0.1) * 1e9]);
  charts[1].caps.push([t, (5 + i * 0.05) * 1e9]);
}
charts[0].caps.push([T("2026-11-01"), 13.8e9], [T("2026-11-01") + 9 * 3600e3, 14e9]);
charts[1].caps.push([T("2026-11-01"), 6.9e9], [T("2026-11-01") + 9 * 3600e3, 7e9]);
/* the category total was 2% above the basket on every shared day (27 to 31 Oct) */
const closes = { "2026-10-27": 20.1, "2026-10-28": 20.25, "2026-10-29": 20.4, "2026-10-30": 20.55, "2026-10-31": 20.7 };
const live = [];
for (const [d, v] of Object.entries(closes)) live.push([`${d}T06:00:00.000Z`, 20e9], [`${d}T23:40:00.000Z`, v * 1.02 * 1e9]);
live.push(["2026-11-01T06:00:00.000Z", 21e9]);
const mc = buildMemecap({ charts, coins: [{ id: "doge", mc: 13e9 }, { id: "pepe", mc: 6.4e9 }, { id: "other", mc: 0.5e9 }], category: { mc: 20e9 }, live, basketAt: "2026-11-01T09:00:00Z" });

check("record: basket days end the day before the first live day, live days follow", () => {
  const b = mc.days.filter((r) => r[5] === 1), l = mc.days.filter((r) => r[5] === 0);
  assert.equal(b[b.length - 1][0], "2026-10-26");
  assert.equal(l[0][0], "2026-10-27");
  assert.equal(l.length, 6);
  assert.ok(mc.days.every((r) => r[2] >= Math.max(r[1], r[4]) && r[3] <= Math.min(r[1], r[4])), "every high above open and close, every low below");
});

check("record: the scale is the median of category over basket on the shared days, and the check says how close", () => {
  assert.equal(mc.basket.scale, 1.02);
  assert.equal(mc.basket.check.days, 5);
  assert.ok(mc.basket.check.max < 0.001, String(mc.basket.check.max));
  assert.equal(mc.basket.cover, 0.97);
  assert.equal(mc.basket.answered, 2);
});

check("record: a basket day opens at the close before it", () => {
  const b = mc.days.filter((r) => r[5] === 1);
  for (let i = 1; i < b.length; i++) assert.equal(b[i][1], b[i - 1][4]);
});

check("a reading moves today's live row, or opens the next day; an older one changes nothing", () => {
  const today = mc.days[mc.days.length - 1];
  const a = addReading(mc, "2026-11-01T23:59:00.000Z", 18.2e9);
  assert.deepEqual(a.days[a.days.length - 1], [today[0], today[1], Math.max(today[2], 18.2), Math.min(today[3], 18.2), 18.2, 0]);
  const b = addReading(a, "2026-11-02T00:07:00.000Z", 18.1e9);
  assert.deepEqual(b.days[b.days.length - 1], ["2026-11-02", 18.1, 18.1, 18.1, 18.1, 0]);
  assert.equal(b.days.length, a.days.length + 1);
  assert.equal(addReading(b, "2026-10-01T10:00:00.000Z", 5e9), b);
});

check("a fresh site starts the record with its first reading", () => {
  const f = addReading(null, "2026-11-01T10:00:00.000Z", 28.3e9);
  assert.equal(f.basket, null);
  assert.deepEqual(f.days, [["2026-11-01", 28.3, 28.3, 28.3, 28.3, 0]]);
  assert.equal(f.live.from, "2026-11-01T10:00:00.000Z");
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nmemecap: all good");
