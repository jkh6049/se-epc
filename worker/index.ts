// se-epc 서버: 화면 파일 제공 + /api/* (웹소켓 동기화·내보내기·초기 데이터)
// 팀 전체 데이터 = Durable Object "main" 하나 (SQLite 저장). 모든 수정이 이 객체를 한 줄로 거쳐 가므로
// 도착 순서대로 번호(seq)가 붙고, 같은 레코드는 나중에 도착한 수정이 최종본이 됨.
import { DurableObject } from "cloudflare:workers";
import { backupToRecs, recsToBackup, type Rec } from "./shape";
import { gate } from "./auth";

export interface Env {
  HUB: DurableObjectNamespace<Hub>;
  ASSETS: Fetcher;
  SITE_PASSWORD?: string;
}

type Att = { cid: string; name: string; color: string; page: string };
type Op = { c: string; op: "put" | "del"; id: string; d?: any; at?: string; by?: string };

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // 공용 비밀번호 확인 (화면·API 전부)
    const blocked = await gate(req, env.SITE_PASSWORD);
    if (blocked) return blocked;
    if (url.pathname.startsWith("/api/")) {
      const hub = env.HUB.get(env.HUB.idFromName("main"));
      return hub.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

export class Hub extends DurableObject<Env> {
  sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rec(
      c TEXT NOT NULL, id TEXT NOT NULL, d TEXT NOT NULL, by TEXT, at TEXT,
      seq INTEGER NOT NULL, ord INTEGER NOT NULL, PRIMARY KEY(c, id))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT)`);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  // ---------- 저장소 ----------
  kvGet(k: string): string | null {
    const r = this.sql.exec<{ v: string }>("SELECT v FROM kv WHERE k=?", k).toArray()[0];
    return r ? r.v : null;
  }
  kvSet(k: string, v: string) {
    this.sql.exec("INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", k, v);
  }
  seq(): number {
    return Number(this.kvGet("seq") || 0);
  }
  count(): number {
    return this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM rec").one().n;
  }
  all(): Rec[] {
    return this.sql
      .exec<{ c: string; id: string; d: string; by: string; at: string }>("SELECT c,id,d,by,at FROM rec ORDER BY ord")
      .toArray()
      .map((r) => ({ c: r.c, id: r.id, d: JSON.parse(r.d), by: r.by, at: r.at }));
  }

  // 수정 묶음 저장 → 새 seq 반환
  applyOps(ops: Op[]): number {
    let seq = this.seq();
    this.ctx.storage.transactionSync(() => {
      let ord = this.sql.exec<{ m: number | null }>("SELECT MAX(ord) AS m FROM rec").one().m ?? 0;
      for (const o of ops) {
        if (!o || !o.c || o.id == null) continue;
        const id = String(o.id);
        seq++;
        if (o.op === "del") {
          this.sql.exec("DELETE FROM rec WHERE c=? AND id=?", o.c, id);
        } else if (o.op === "put" && o.d != null) {
          const d = JSON.stringify(o.d);
          const cur = this.sql.exec("SELECT 1 FROM rec WHERE c=? AND id=?", o.c, id).toArray().length;
          if (cur) {
            this.sql.exec("UPDATE rec SET d=?, by=?, at=?, seq=? WHERE c=? AND id=?", d, o.by ?? null, o.at ?? null, seq, o.c, id);
          } else {
            ord++;
            this.sql.exec("INSERT INTO rec(c,id,d,by,at,seq,ord) VALUES(?,?,?,?,?,?,?)", o.c, id, d, o.by ?? null, o.at ?? null, seq, ord);
          }
        }
      }
      this.kvSet("seq", String(seq));
    });
    return seq;
  }

  replaceAll(recs: Rec[]): number {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM rec");
    });
    return this.applyOps(recs.map((r) => ({ c: r.c, op: "put", id: r.id, d: r.d, at: new Date().toISOString(), by: "초기 데이터" })));
  }

  // ---------- 접속자 ----------
  sockets(): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN);
  }
  att(ws: WebSocket): Att {
    return (ws.deserializeAttachment() as Att) || { cid: "?", name: "", color: "", page: "" };
  }
  send(ws: WebSocket, o: unknown) {
    try {
      ws.send(typeof o === "string" ? o : JSON.stringify(o));
    } catch {}
  }
  broadcast(o: unknown, except?: WebSocket) {
    const s = JSON.stringify(o);
    for (const ws of this.sockets()) if (ws !== except) this.send(ws, s);
  }
  presence() {
    const users = this.sockets().map((ws) => {
      const a = this.att(ws);
      return { cid: a.cid, name: a.name, color: a.color, page: a.page };
    });
    this.broadcast({ t: "presence", users });
  }

  // ---------- HTTP ----------
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === "/api/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return json({ error: "websocket only" }, 426);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const att: Att = {
        cid: crypto.randomUUID().slice(0, 8),
        name: (url.searchParams.get("name") || "").slice(0, 40),
        color: (url.searchParams.get("color") || "").slice(0, 20),
        page: (url.searchParams.get("page") || "").slice(0, 20),
      };
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment(att);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (p === "/api/health") return json({ ok: true, records: this.count(), seq: this.seq(), online: this.sockets().length });

    // 전체 백업 (기존 대시보드 백업 JSON과 같은 모양 → 기존 '백업 불러오기'로 복원 가능)
    if (p === "/api/export") {
      const b = recsToBackup(this.all());
      const name = `epc-backup-${b.exportedAt.slice(0, 10)}.json`;
      return new Response(JSON.stringify(b), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${name}"`,
          "cache-control": "no-store",
        },
      });
    }

    // 초기 데이터 넣기: 서버가 비어 있을 때만. 덮어쓰려면 ?force=1
    if (p === "/api/seed" && req.method === "POST") {
      const force = url.searchParams.get("force") === "1";
      if (this.count() > 0 && !force) return json({ error: "이미 데이터가 있음. 덮어쓰려면 ?force=1" }, 409);
      let body: any;
      try {
        body = await req.json();
      } catch {
        return json({ error: "JSON 아님" }, 400);
      }
      const recs = backupToRecs(body);
      const seq = this.replaceAll(recs);
      this.broadcast({ t: "reload" });
      return json({ ok: true, records: recs.length, seq });
    }

    return json({ error: "not found" }, 404);
  }

  // ---------- 웹소켓 ----------
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;
    let m: any;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const a = this.att(ws);

    if (m.t === "hello") {
      if (typeof m.name === "string") a.name = m.name.slice(0, 40);
      if (typeof m.color === "string") a.color = m.color.slice(0, 20);
      if (typeof m.page === "string") a.page = m.page.slice(0, 20);
      ws.serializeAttachment(a);
      this.send(ws, { t: "snap", seq: this.seq(), me: a.cid, recs: this.all().map((r) => ({ c: r.c, id: r.id, d: r.d })) });
      this.presence();
      return;
    }

    if (m.t === "ops" && Array.isArray(m.ops)) {
      const ops: Op[] = m.ops.slice(0, 5000);
      const seq = this.applyOps(ops);
      this.send(ws, { t: "ack", b: m.b, seq });
      this.broadcast({ t: "ops", seq, from: a.cid, ops }, ws);
      return;
    }

    if (m.t === "me") {
      if (typeof m.name === "string") a.name = m.name.slice(0, 40);
      if (typeof m.page === "string") a.page = m.page.slice(0, 20);
      ws.serializeAttachment(a);
      this.presence();
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye");
    } catch {}
    this.presence();
  }

  async webSocketError() {
    this.presence();
  }
}
