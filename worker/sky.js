/* The sky server: who is on oldhawkline.com right now, one lantern each, and the Buy clicks that send a lantern up.
   One Durable Object holds every open page's WebSocket (hibernating between messages, so it costs nothing while
   nothing happens). It keeps no address, no cookie and nothing on disk: each open page gets a random name that
   goes when the page closes. Deployed by scripts/sky-deploy.mjs. */
import { DurableObject } from "cloudflare:workers";

const CAP = 150; // names sent to a new page; the count is always the real one
const PER_IP = 12; // open pages counted from one address (homes and offices share one)
const BUY_GAP = 20000; // one lantern up per page every 20 seconds

const allowed = (env, origin) => {
  const list = String(env.ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return !list.length || list.includes(origin);
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/live") {
      if ((req.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("The lanterns speak WebSocket.", { status: 426 });
      if (!allowed(env, req.headers.get("Origin") || "")) return new Response("Not from here.", { status: 403 });
      return env.SKY.get(env.SKY.idFromName("sky")).fetch(req);
    }
    if (url.pathname === "/") return new Response("Oldhawk Line sky server: one lantern for everyone watching.\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return new Response("Not found.", { status: 404 });
  }
};

const name = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);
async function tag(ip) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`oldhawk-sky:${ip}`));
  return [...new Uint8Array(d).slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class Sky extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    /* keep-alive pings are answered without waking the object */
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  people(except) {
    /* readyState 2 and 3: closing or closed */
    return this.ctx.getWebSockets().filter((w) => w !== except && w.readyState < 2 && !(w.deserializeAttachment() || {}).gone);
  }

  async fetch(req) {
    const ip = await tag(req.headers.get("CF-Connecting-IP") || "");
    const here = this.people();
    if (here.filter((w) => (w.deserializeAttachment() || {}).ip === ip).length >= PER_IP) return new Response("Too many pages from one place.", { status: 429 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = name();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, ip, buy: 0 });
    const ids = here.map((w) => (w.deserializeAttachment() || {}).id).filter(Boolean).slice(-(CAP - 1));
    ids.push(id);
    server.send(JSON.stringify({ t: "hello", you: id, n: here.length + 1, ids }));
    this.send({ t: "n", n: here.length + 1, add: [id] }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > 200) return;
    let m;
    try { m = JSON.parse(msg); } catch { return; }
    if (!m || m.t !== "buy") return;
    const a = ws.deserializeAttachment() || {};
    const now = Date.now();
    if (now - (a.buy || 0) < BUY_GAP) return;
    a.buy = now;
    ws.serializeAttachment(a);
    this.send({ t: "up", id: a.id }, ws);
  }

  async webSocketClose(ws, code) {
    this.gone(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch { /* already closed */ }
  }

  async webSocketError(ws) {
    this.gone(ws);
  }

  gone(ws) {
    const a = ws.deserializeAttachment() || {};
    if (!a.id || a.gone) return;
    a.gone = true;
    try { ws.serializeAttachment(a); } catch { /* closing */ }
    const left = this.people(ws);
    this.send({ t: "n", n: left.length, del: [a.id] }, ws, left);
  }

  send(m, except, list) {
    const s = JSON.stringify(m);
    for (const w of list || this.people(except)) {
      if (w === except) continue;
      try { w.send(s); } catch { /* gone */ }
    }
  }
}
