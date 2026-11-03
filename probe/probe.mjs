// one-off: find the X accounts behind the pump.fun names in @bandosei's table, and check them by follower count
const rows = [
  ["mickeymantled", 45126, ["mickeymantled"]],
  ["thedetective", 68661, ["thedetective", "dethective"]],
  ["gar0u", 38194, ["gar0u", "garouxbt", "gar0u_", "gar0uxbt"]],
  ["ely", 64006, ["ely", "elycalls", "ely_sol", "elyfatyou"]],
  ["sh4vwty", 35248, ["sh4vwty"]],
  ["Yennii56", 73160, ["Yennii56"]],
  ["schoen", 113455, ["schoen", "schoenxbt", "schoensol"]],
  ["icedknife", 51370, ["icedknife"]],
  ["chairman", 125690, ["chairman", "chairmancalls", "chairman_sol"]],
  ["cooker", 115026, ["CookerFlips", "cooker"]],
  ["jackduvalcalls", 92360, ["jackduvalcalls", "jackduval"]],
  ["0xEthan", 42583, ["0xEthan"]],
  ["limfork", 61183, ["limfork"]],
  ["ferre", 56832, ["ferre", "ferresol", "0xferre"]],
  ["daumen", 99517, ["daumeneth", "daumen"]],
  ["POORGOAT___", 91046, ["POORGOAT___", "poorgoat"]],
  ["FlippingProfits", 124179, ["FlippingProfits"]],
  ["TylerD", 39104, ["TylerD", "TylerDCalls", "tylerdsol"]],
  ["officialpatty", 40645, ["officialpatty"]],
  ["notdecu", 73568, ["notdecu", "decu"]],
  ["lynk0x_", 42449, ["lynk0x_", "lynk0x"]],
  ["The_Solstice", 145339, ["The__Solstice", "The_Solstice"]],
  ["cupsey", 141928, ["Cupseyy", "cupsey"]],
  ["mitch", 143985, ["mitch", "idrawline", "mitchcalls"]],
];
const UA = "oldhawk-line/2.4 (+https://github.com/oldhawk007xd/oldhawk-line)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u, json) {
  try {
    const r = await fetch(u, { headers: { "user-agent": json ? UA : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: json ? "application/json" : "text/html" }, signal: AbortSignal.timeout(20000) });
    return { status: r.status, body: json ? await r.json().catch(() => null) : await r.text() };
  } catch (e) { return { status: 0, body: null, err: String(e) }; }
}
const xs = (html) => [...new Set([...String(html || "").matchAll(/(?:x|twitter)\.com\/(?:#!\/)?([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g)].map((m) => m[1]).filter((h) => !/^(intent|share|home|i|search|kolexplorer|pumpfun|kolscan|hashtag)$/i.test(h)))];
const out = [];
for (const [name, fol, cands] of rows) {
  const found = new Set(cands);
  const ke = await get(`https://kolexplorer.com/kol/${name.toLowerCase()}`);
  const keX = ke.status === 200 ? xs(ke.body) : [];
  const keWallet = ke.status === 200 ? ((String(ke.body).match(/[1-9A-HJ-NP-Za-km-z]{43,44}/) || [])[0] || "") : "";
  keX.forEach((h) => found.add(h));
  const pf = await get(`https://pump.fun/profile/${encodeURIComponent(name)}`);
  const pfX = pf.status === 200 ? xs(pf.body) : [];
  const tw = pf.status === 200 ? [...String(pf.body).matchAll(/\\?"(?:twitter|twitter_username|x_username|twitterHandle|twitter_handle)\\?"\s*:\s*\\?"([^"\\]{1,40})/g)].map((m) => m[1]) : [];
  pfX.concat(tw.map((t) => t.replace(/^.*\//, "").replace(/^@/, ""))).forEach((h) => found.add(h));
  console.log(`\n## ${name}  table followers ${fol}  kolexplorer ${ke.status} x=[${keX.join(",")}] wallet=${keWallet}  pump.fun ${pf.status} x=[${pfX.join(",")}] tw=[${tw.join(",")}]`);
  for (const h of found) {
    const p = await get(`https://api.fxtwitter.com/${encodeURIComponent(h)}`, true);
    const u = p.body && p.body.user;
    if (u) {
      const d = Math.abs(u.followers - fol) / fol;
      console.log(`  @${u.screen_name}  followers ${u.followers}  (${(d * 100).toFixed(1)}% off)  name "${u.name}"  joined ${u.joined}  bio: ${String(u.description || "").replace(/\s+/g, " ").slice(0, 140)}`);
      out.push({ name, fol, h: u.screen_name, f: u.followers, d: +d.toFixed(3), n: u.name, bio: String(u.description || "").slice(0, 200), joined: u.joined });
    } else console.log(`  @${h}  -> ${p.status} ${(p.body && p.body.message) || p.err || ""}`);
    await sleep(700);
  }
}
const best = {};
for (const o of out) if (!best[o.name] || o.d < best[o.name].d) best[o.name] = o;
console.log("\nBEST " + JSON.stringify(Object.values(best).map((o) => [o.name, o.h, o.fol, o.f, o.d, o.n])));
const b = await get("https://api.fxtwitter.com/bandosei", true);
console.log("\nSOURCE " + JSON.stringify(b.body && b.body.user ? { h: b.body.user.screen_name, n: b.body.user.name, f: b.body.user.followers, bio: b.body.user.description, joined: b.body.user.joined } : b));
const t = await get("https://api.fxtwitter.com/bandosei/status/2117597322817483012", true);
console.log("\nPOST " + JSON.stringify(t.body && t.body.tweet ? { text: t.body.tweet.text, at: t.body.tweet.created_at, likes: t.body.tweet.likes, views: t.body.tweet.views, media: (t.body.tweet.media && t.body.tweet.media.all || []).map((m) => m.url), quote: t.body.tweet.quote && { u: t.body.tweet.quote.url, text: t.body.tweet.quote.text }, replying: t.body.tweet.replying_to } : t));
