const UA = "oldhawk-line/2.4 (+https://github.com/oldhawk007xd/oldhawk-line)";
const BR = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u, json) {
  try { const r = await fetch(u, { headers: { "user-agent": json ? UA : BR, accept: json ? "application/json" : "text/html" }, signal: AbortSignal.timeout(20000) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    return { status: r.status, t, j }; } catch (e) { return { status: 0, t: "", err: String(e) }; }
}
const xs = (html) => [...new Set([...String(html || "").matchAll(/(?:x|twitter)\.com\/(?:#!\/)?([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g)].map((m) => m[1]).filter((h) => !/^(intent|share|home|i|search|kolexplorer|pumpfun|kolscan|hashtag)$/i.test(h)))];
const slugs = ["decu", "notdecu", "jack", "jackduval", "jackduvalcalls", "duval", "ely", "schoen", "gar0u", "garou", "icedknife", "iced", "ferre", "tylerd", "tyler", "patty", "officialpatty", "lynk", "lynk0x", "shawty", "sh4vwty", "poorgoat", "detective", "thedetective", "dethective", "mickey", "mickeymantled", "yenni", "yennii56", "flippingprofits", "profit", "ethan", "solstice", "thesolstice", "chairman", "mitch", "daumen", "limfork", "cooker", "cupsey"];
console.log("## kolexplorer slugs");
for (const s of slugs) { const r = await get(`https://kolexplorer.com/kol/${s}`); if (r.status === 200) console.log(`  ${s}: x=[${xs(r.t).join(",")}] title=${(r.t.match(/<title>([^<]*)/) || [])[1]}`); else console.log(`  ${s}: ${r.status}`); await sleep(300); }
console.log("## kolexplorer search");
for (const q of ["search.php?q=gar0u", "search.php?query=gar0u", "search.php?s=gar0u", "api/search.php?q=gar0u", "search.php?term=gar0u"]) { const r = await get(`https://kolexplorer.com/${q}`); console.log(`  ${q}: ${r.status} len ${r.t.length} x=[${xs(r.t).slice(0, 8).join(",")}] kols=[${[...new Set([...r.t.matchAll(/\/kol\/([a-z0-9_]+)/g)].map((m) => m[1]))].slice(0, 12).join(",")}]`); }
const home = await get("https://kolexplorer.com/home.php");
const allk = [...new Set([...home.t.matchAll(/\/kol\/([a-z0-9_.-]+)/gi)].map((m) => m[1]))];
console.log(`## kolexplorer home ${home.status}: ${allk.length} kols: ${allk.join(",")}`);
console.log("## fxtwitter retry (profile, then statuses)");
for (const h of ["daumeneth", "idrawline", "limfork", "notdecu", "icedknife", "sh4vwty", "jackduvalcalls", "gar0u", "dethective", "lynk0x_", "bandosei", "Chairman_DN", "mickeymantled", "Yennii56", "FlippingProfits", "CookerFlips", "Cupseyy"]) {
  const p = await get(`https://api.fxtwitter.com/${h}`, true); await sleep(900);
  const s = await get(`https://api.fxtwitter.com/2/profile/${h}/statuses`, true); await sleep(900);
  const u = p.j && p.j.user; const res = (s.j && s.j.results) || [];
  const own = res.find((x) => x.author && x.author.screen_name.toLowerCase() === h.toLowerCase());
  const a = own && own.author;
  const pumpish = res.filter((x) => /pump|callout|\bsol\b|solana|memecoin|\$[A-Z]/i.test(x.text || "")).length;
  console.log(`  @${h}: profile ${p.status} ${u ? `${u.followers} "${u.name}"` : (p.j && p.j.message) || ""} | statuses ${s.status} n=${res.length} ${a ? `author ${a.screen_name} ${a.followers} "${a.name}" bio: ${String(a.description || "").replace(/\s+/g, " ").slice(0, 120)}` : ""} | crypto posts ${pumpish}/${res.length} | sample: ${String((res[0] && res[0].text) || "").replace(/\s+/g, " ").slice(0, 100)}`);
}
console.log("## pump.fun api guesses");
for (const u of ["https://frontend-api-v3.pump.fun/users/search?searchTerm=chairman", "https://frontend-api-v3.pump.fun/users/username/chairman", "https://frontend-api-v3.pump.fun/users/chairman", "https://frontend-api-v3.pump.fun/users/by-username/chairman", "https://frontend-api.pump.fun/users/chairman", "https://frontend-api-v3.pump.fun/callouts/leaderboard", "https://frontend-api-v3.pump.fun/social/callouts/leaderboard"]) { const r = await get(u, true); console.log(`  ${u}: ${r.status} ${r.t.slice(0, 300).replace(/\s+/g, " ")}`); await sleep(400); }
