import assert from "node:assert/strict";
import { collect, compute, INPUTS } from "../lib/engine.mjs";
import { anchorFetch, NOW } from "./anchors.mjs";
let bad = 0;
for (const [name, want] of [["cold", 0], ["mid", 50], ["hot", 100]]) {
  const raw = await collect({ fetchImpl: anchorFetch(name), now: NOW, gapMs: 0, retryWaitMs: 1 });
  const r = compute(raw, { now: NOW, history: [] });
  const scores = r.inputs.map((m) => `${m.id}=${m.s == null ? "off" : Math.round(m.s)}`).join(" ");
  const ok = r.line === want && r.coverage === 1;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: Line ${r.line} (exact ${r.lineExact}), want ${want}, coverage ${r.coverage} · ${r.zone.hour}, ${r.zone.name}`);
  console.log(`      inputs ${scores}`);
  console.log(`      ladder ${r.ladder.counts.join("/")} wlp ${r.ladder.wlp} fresh ${r.ladder.fresh} · dominance ${r.inputs[0].x} · DOGE ${r.inputs[1].x}x · funding ${r.inputs[8].x}`);
}
process.exitCode = bad ? 1 : 0;
