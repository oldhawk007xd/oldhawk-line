/* The lanterns' sky server: the deploy step stays quiet without the Cloudflare secrets, only a workers.dev
   address reaches the page, and the server code keeps its promises (no storage, one lantern up per 20 s). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { liveOk } from "../scripts/sky-deploy.mjs";

const results = [];
const check = (name, fn) => { try { fn(); results.push(["ok", name]); } catch (e) { results.push(["FAIL", name, e.message]); } };

check("only a workers.dev address ending in /live is used", () => {
  assert.equal(liveOk("wss://oldhawk-sky.oldhawkline.workers.dev/live"), true);
  for (const bad of ["", null, "ws://oldhawk-sky.oldhawkline.workers.dev/live", "wss://evil.example/live", "wss://oldhawk-sky.x.workers.dev/other", "javascript:alert(1)"]) assert.equal(liveOk(bad), false, String(bad));
});

check("without the Cloudflare secrets the deploy step does nothing and succeeds", () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN; delete env.CLOUDFLARE_ACCOUNT_ID;
  const out = execFileSync("node", [new URL("../scripts/sky-deploy.mjs", import.meta.url).pathname], { env, encoding: "utf8" });
  assert.match(out, /lanterns stay off/);
});

const code = await readFile(new URL("../worker/sky.js", import.meta.url), "utf8");
const toml = await readFile(new URL("../worker/wrangler.toml", import.meta.url), "utf8");
check("the server keeps nothing on disk and answers pings without waking", () => {
  assert.ok(!/ctx\.storage|this\.storage|\.put\(/.test(code), "no storage calls");
  assert.match(code, /setWebSocketAutoResponse/);
  assert.match(code, /acceptWebSocket/);
});
check("the server lets in only the site's own pages, twelve per place, one lantern up per 20 s", () => {
  assert.match(toml, /ORIGINS = "https:\/\/oldhawkline\.com/);
  assert.match(code, /PER_IP = 12/);
  assert.match(code, /BUY_GAP = 20000/);
  assert.match(toml, /new_sqlite_classes = \["Sky"\]/);
});
check("no keys in the server files", () => assert.ok(!/(api[_-]?token|account[_-]?id)\s*=/i.test(toml + code)));

for (const [s, n, m] of results) console.log(`${s.padEnd(4)} ${n}${m ? "  >> " + m : ""}`);
process.exitCode = results.some(([s]) => s === "FAIL") ? 1 : 0;
