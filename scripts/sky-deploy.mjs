/* The sky server for the lanterns (worker/), put on Cloudflare when its code changes.
   Runs in the update workflow. Without the repository secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID it
   does nothing and the lanterns stay off. With them it gives the account a workers.dev name if it has none, deploys,
   and writes live.json with the address the page connects to; scripts/update.mjs puts it in data/latest.json.
   The keys stay in the environment: nothing here writes them anywhere. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const WRANGLER = "wrangler@4.151.3";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "", ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const say = (...a) => console.log("sky:", ...a);

export const liveOk = (ws) => /^wss:\/\/[a-z0-9.-]+\.workers\.dev\/live$/i.test(String(ws || ""));

async function main() {
  if (!TOKEN || !ACCOUNT) { say("no Cloudflare secrets, the lanterns stay off"); return 0; }
  const code = await Promise.all(["worker/sky.js", "worker/wrangler.toml"].map((f) => readFile(new URL(f, ROOT), "utf8")));
  const hash = createHash("sha256").update(code.join("\n")).digest("hex").slice(0, 16);
  let prev = {};
  try { prev = JSON.parse(await readFile(new URL("live.json", ROOT), "utf8")); } catch { /* first time */ }
  if (prev.hash === hash && liveOk(prev.ws)) { say("up to date at", prev.ws); return 0; }

  const api = async (path, init = {}) => {
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, signal: AbortSignal.timeout(20000) });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && j.success !== false, status: r.status, j };
    } catch (e) { return { ok: false, status: 0, j: { errors: [String(e.message || e)] } }; }
  };
  /* a workers.dev name for the account, if it has none yet */
  const got = await api(`/accounts/${ACCOUNT}/workers/subdomain`);
  let sub = got.ok && got.j.result ? got.j.result.subdomain : "";
  if (!sub) {
    for (const want of ["oldhawkline", "oldhawk-line", `oldhawkline-${hash.slice(0, 4)}`]) {
      const r = await api(`/accounts/${ACCOUNT}/workers/subdomain`, { method: "PUT", body: JSON.stringify({ subdomain: want }) });
      if (r.ok) { sub = want; say("workers.dev name:", want); break; }
    }
  }
  if (!sub) { say("could not get a workers.dev name:", JSON.stringify(got.j.errors || got.status)); return 1; }

  let out = "";
  try {
    out = execFileSync("npx", ["--yes", WRANGLER, "deploy", "--config", "worker/wrangler.toml"], { cwd: ROOT, encoding: "utf8", env: process.env, stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
  } catch (e) {
    say("deploy failed:", String((e.stderr || e.stdout || e.message || "")).slice(-1500));
    return 1;
  }
  const m = out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i);
  const ws = m ? `wss://${m[0].slice(8)}/live` : `wss://oldhawk-sky.${sub}.workers.dev/live`;
  if (!liveOk(ws)) { say("no workers.dev address in the deploy output"); return 1; }
  await writeFile(new URL("live.json", ROOT), JSON.stringify({ ws, hash, at: new Date().toISOString() }) + "\n");
  say("live at", ws);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await main();
