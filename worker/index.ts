// se-epc 서버: 화면 파일 제공 + /api/* (웹소켓 동기화·내보내기·초기 데이터) + /admin (데이터 보호·복원)
// 팀 전체 데이터 = Durable Object "main" 하나 (SQLite 저장). 모든 수정이 이 객체를 한 줄로 거쳐 가므로
// 도착 순서대로 번호(seq)가 붙고, 같은 레코드는 나중에 도착한 수정이 최종본이 됨.
// 데이터 보호 (2026-11-17): 삭제 = 휴지통 보관 · 대량 삭제 차단 · 매일 03:00(KST) 자동 백업 · 30일 시점 복구
import { DurableObject } from "cloudflare:workers";
import { backupToRecs, recsToBackup, type Rec } from "./shape";
import { gate } from "./auth";
import { isAdmin, checkDeletes, gzip, gunzip, type Win } from "./guard";
import { adminPage } from "./admin";

export interface Env {
  HUB: DurableObjectNamespace<Hub>;
  ASSETS: Fetcher;
  SITE_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
}

type Att = { cid: string; name: string; color: string; page: string };
type Op = { c: string; op: "put" | "del"; id: string; d?: any; at?: string; by?: string };

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const SNAP_KEEP_DAYS = 60;
const TRASH_KEEP_DAYS = 180;
const HIST_KEEP_DAYS = 365;

// ---------- 변경 이력 도우미 ----------
// 기록 대상이 아닌 값 (자동 갱신 시각·작성자 도장)
const HIST_NOISE = new Set(["updatedAt", "_at", "_by", "createdAt"]);
function histShort(v: any): string {
  if (v == null || v === "") return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 140 ? s.slice(0, 137) + "…" : s;
}
// 바뀐 칸 목록 [{k: 경로, f: 이전, t: 이후}] — 객체는 2단계까지, 표(배열)는 행 수 변화 또는 행·칸 단위
export function histDiff(a: any, b: any, path = "", depth = 0, out: { k: string; f: string; t: string }[] = []) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if (out.length >= 40) break;
    if (HIST_NOISE.has(k)) continue;
    const x = a?.[k], y = b?.[k], p = path ? path + "." + k : k;
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    const obj = (v: any) => v && typeof v === "object" && !Array.isArray(v);
    if (depth < 2 && obj(x) && obj(y)) { histDiff(x, y, p, depth + 1, out); continue; }
    if (Array.isArray(x) || Array.isArray(y)) {
      const ax: any[] = Array.isArray(x) ? x : [], ay: any[] = Array.isArray(y) ? y : [];
      if (ax.length !== ay.length) out.push({ k: p, f: ax.length + "행", t: ay.length + "행" });
      else ay.forEach((r, i) => {
        if (out.length >= 40 || JSON.stringify(ax[i]) === JSON.stringify(r)) return;
        if (obj(ax[i]) && obj(r)) histDiff(ax[i], r, p + "." + i, 9, out);
        else out.push({ k: p + "." + i, f: histShort(ax[i]), t: histShort(r) });
      });
      continue;
    }
    out.push({ k: p, f: histShort(x), t: histShort(y) });
  }
  return out;
}
function histLabel(d: any, id: string): string {
  const v = d?.name || d?.title || d?.label || d?.item || d?.vendor || d?.text || d?.note || d?.memo || id;
  return String(v).replace(/\s+/g, " ").slice(0, 80);
}
function histPid(c: string, id: string, d: any): string {
  if (c === "projects") return id;
  return String(d?.projectId || d?.pid || (d?.refType === "project" ? d?.refId : "") || "");
}
const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // 공용 비밀번호 확인 (화면·API 전부)
    const blocked = await gate(req, env.SITE_PASSWORD);
    if (blocked) return blocked;
    if (url.pathname === "/admin" || url.pathname === "/admin/") return adminPage();
    if (url.pathname.startsWith("/api/")) {
      // 관리자 기능은 관리자 비밀번호까지 확인 (공용 비밀번호만으로는 불가)
      const needAdmin = url.pathname.startsWith("/api/admin/") || (url.pathname === "/api/seed" && url.searchParams.get("force") === "1");
      if (needAdmin) {
        if (!env.ADMIN_PASSWORD) return json({ error: "관리자 비밀번호가 서버에 설정되지 않음" }, 503);
        if (!(await isAdmin(req, env.ADMIN_PASSWORD))) return json({ error: "관리자 비밀번호가 맞지 않음" }, 403);
      }
      const hub = env.HUB.get(env.HUB.idFromName("main"));
      return hub.fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
  // 매일 03:00 KST (wrangler.jsonc triggers) 자동 백업
  async scheduled(_ev: ScheduledController, env: Env, ctx: ExecutionContext) {
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    ctx.waitUntil(hub.snapshot("daily"));
  },
} satisfies ExportedHandler<Env>;

export class Hub extends DurableObject<Env> {
  sql: SqlStorage;
  wins = new Map<string, Win>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rec(
      c TEXT NOT NULL, id TEXT NOT NULL, d TEXT NOT NULL, by TEXT, at TEXT,
      seq INTEGER NOT NULL, ord INTEGER NOT NULL, PRIMARY KEY(c, id))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT)`);
    // 휴지통: 지운 레코드 원본 + 누가·언제
    this.sql.exec(`CREATE TABLE IF NOT EXISTS trash(
      tid INTEGER PRIMARY KEY AUTOINCREMENT, c TEXT NOT NULL, id TEXT NOT NULL, d TEXT NOT NULL,
      delAt TEXT NOT NULL, delBy TEXT, seq INTEGER)`);
    // 백업 (gzip JSON) · 종류: daily(매일 자동) / manual(관리자) / pre-restore(복원 직전 자동)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS snaps(sid TEXT PRIMARY KEY, kind TEXT, day TEXT, at TEXT, n INTEGER, z BLOB)`);
    // 관리 기록: 차단된 대량 삭제 · 복원 등
    this.sql.exec(`CREATE TABLE IF NOT EXISTS audit(aid INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, who TEXT, kind TEXT, detail TEXT)`);
    // 변경 이력 (2026-11-18): 누가·언제·무엇을 추가/수정/삭제 — 직원 누구나 '변경 이력' 탭에서 열람 (1년 보관)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS hist(hid INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, who TEXT, c TEXT, id TEXT, op TEXT, pid TEXT, label TEXT, ch TEXT)`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS hist_pid ON hist(pid, hid)");
    // 처음 만들 때 휴지통(11/17~)의 삭제 기록을 이력으로 옮겨 둠
    if (!this.kvGet("histInit")) {
      for (const t of this.sql.exec<{ c: string; id: string; d: string; delAt: string; delBy: string }>("SELECT c,id,d,delAt,delBy FROM trash ORDER BY tid").toArray()) {
        let d: any = {};
        try { d = JSON.parse(t.d); } catch {}
        this.sql.exec("INSERT INTO hist(at,who,c,id,op,pid,label,ch) VALUES(?,?,?,?,?,?,?,?)", t.delAt, t.delBy || "", t.c, t.id, "del", histPid(t.c, t.id, d), histLabel(d, t.id), "");
      }
      this.kvSet("histInit", new Date().toISOString());
    }
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
  count(c?: string): number {
    return c
      ? this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM rec WHERE c=?", c).one().n
      : this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM rec").one().n;
  }
  all(): Rec[] {
    return this.sql
      .exec<{ c: string; id: string; d: string; by: string; at: string }>("SELECT c,id,d,by,at FROM rec ORDER BY ord")
      .toArray()
      .map((r) => ({ c: r.c, id: r.id, d: JSON.parse(r.d), by: r.by, at: r.at }));
  }
  hist(at: string, who: string, c: string, id: string, op: string, d: any, ch: string) {
    this.sql.exec("INSERT INTO hist(at,who,c,id,op,pid,label,ch) VALUES(?,?,?,?,?,?,?,?)", at, String(who || "").slice(0, 40), c, id, op, histPid(c, id, d), histLabel(d, id), ch);
  }
  audit(who: string, kind: string, detail: string) {
    this.sql.exec("INSERT INTO audit(at,who,kind,detail) VALUES(?,?,?,?)", new Date().toISOString(), who, kind, detail.slice(0, 2000));
    this.sql.exec("DELETE FROM audit WHERE aid NOT IN (SELECT aid FROM audit ORDER BY aid DESC LIMIT 2000)");
  }

  // 수정 묶음 저장 → 새 seq 반환. 삭제는 휴지통에 원본을 남기고 지움
  applyOps(ops: Op[], who = "", log = true): number {
    let seq = this.seq();
    const now = new Date().toISOString();
    this.ctx.storage.transactionSync(() => {
      let ord = this.sql.exec<{ m: number | null }>("SELECT MAX(ord) AS m FROM rec").one().m ?? 0;
      for (const o of ops) {
        if (!o || !o.c || o.id == null) continue;
        const id = String(o.id);
        seq++;
        if (o.op === "del") {
          const old = this.sql.exec<{ d: string }>("SELECT d FROM rec WHERE c=? AND id=?", o.c, id).toArray()[0];
          if (old) this.sql.exec("INSERT INTO trash(c,id,d,delAt,delBy,seq) VALUES(?,?,?,?,?,?)", o.c, id, old.d, now, o.by || who || null, seq);
          if (old && log) {
            let od: any = {};
            try { od = JSON.parse(old.d); } catch {}
            this.hist(now, o.by || who, o.c, id, "del", od, "");
          }
          this.sql.exec("DELETE FROM rec WHERE c=? AND id=?", o.c, id);
        } else if (o.op === "put" && o.d != null) {
          const d = JSON.stringify(o.d);
          const prev = this.sql.exec<{ d: string }>("SELECT d FROM rec WHERE c=? AND id=?", o.c, id).toArray()[0];
          const cur = prev ? 1 : 0;
          if (log) {
            if (!prev) this.hist(now, o.by || who, o.c, id, "add", o.d, "");
            else if (prev.d !== d) {
              let pd: any = {};
              try { pd = JSON.parse(prev.d); } catch {}
              const ch = histDiff(pd, o.d);
              if (ch.length) this.hist(now, o.by || who, o.c, id, "put", o.d, JSON.stringify(ch).slice(0, 6000));
            }
          }
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

  replaceAll(recs: Rec[], by = "초기 데이터"): number {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM rec");
    });
    const seq = this.applyOps(recs.map((r) => ({ c: r.c, op: "put", id: r.id, d: r.d, at: new Date().toISOString(), by })), by, false);
    this.sql.exec("INSERT INTO hist(at,who,c,id,op,pid,label,ch) VALUES(?,?,?,?,?,?,?,?)", new Date().toISOString(), by, "meta", "all", "load", "", `전체 데이터 ${recs.length}건`, "");
    return seq;
  }

  // ---------- 백업 ----------
  // RPC (매일 자동) + 관리자 '지금 백업'·복원 직전 자동
  async snapshot(kind: "daily" | "manual" | "pre-restore" = "manual"): Promise<{ sid: string; n: number }> {
    const day = kstDay();
    if (kind === "daily") {
      const has = this.sql.exec("SELECT 1 FROM snaps WHERE kind='daily' AND day=?", day).toArray().length;
      if (has) return { sid: "", n: 0 };
    }
    const recs = this.all();
    const z = await gzip(JSON.stringify(recsToBackup(recs)));
    const at = new Date().toISOString();
    const sid = `${at}-${kind}`;
    this.sql.exec("INSERT INTO snaps(sid,kind,day,at,n,z) VALUES(?,?,?,?,?,?)", sid, kind, day, at, recs.length, z);
    // 보관 기간 정리
    const cut = kstDay(new Date(Date.now() - SNAP_KEEP_DAYS * 864e5));
    this.sql.exec("DELETE FROM snaps WHERE day < ?", cut);
    const tcut = new Date(Date.now() - TRASH_KEEP_DAYS * 864e5).toISOString();
    this.sql.exec("DELETE FROM trash WHERE delAt < ?", tcut);
    this.sql.exec("DELETE FROM hist WHERE at < ?", new Date(Date.now() - HIST_KEEP_DAYS * 864e5).toISOString());
    return { sid, n: recs.length };
  }
  async snapJson(sid: string): Promise<any | null> {
    const r = this.sql.exec<{ z: ArrayBuffer }>("SELECT z FROM snaps WHERE sid=?", sid).toArray()[0];
    return r ? JSON.parse(await gunzip(r.z)) : null;
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

    // 초기 데이터 넣기: 서버가 비어 있을 때만. 덮어쓰기(?force=1)는 관리자 비밀번호 필요 (바깥 fetch에서 확인)
    if (p === "/api/seed" && req.method === "POST") {
      const force = url.searchParams.get("force") === "1";
      if (this.count() > 0 && !force) return json({ error: "이미 데이터가 있음. 덮어쓰려면 ?force=1 (관리자)" }, 409);
      let body: any;
      try {
        body = await req.json();
      } catch {
        return json({ error: "JSON 아님" }, 400);
      }
      const recs = backupToRecs(body);
      if (force && this.count() > 0) await this.snapshot("pre-restore");
      const seq = this.replaceAll(recs, force ? "관리자 복원" : "초기 데이터");
      if (force) this.audit("관리자", "전체 덮어쓰기", `백업 파일 ${recs.length}건 (${body?.exportedAt || "날짜 없음"})`);
      this.broadcast({ t: "reload" });
      return json({ ok: true, records: recs.length, seq });
    }

    // 변경 이력 열람 (직원 누구나) — ?before=hid&limit=&pid=&c=&who=&op=&q=
    if (p === "/api/hist") {
      const q = url.searchParams, W: string[] = [], A: any[] = [];
      const add = (sql: string, v: any) => { W.push(sql); A.push(v); };
      if (q.get("before")) add("hid < ?", Number(q.get("before")));
      if (q.get("pid")) add("pid = ?", q.get("pid"));
      if (q.get("c")) add("c = ?", q.get("c"));
      if (q.get("who")) add("who = ?", q.get("who"));
      if (q.get("op")) add("op = ?", q.get("op"));
      if (q.get("since")) add("at >= ?", q.get("since"));
      if (q.get("q")) { W.push("(label LIKE ? OR ch LIKE ? OR who LIKE ?)"); const s = "%" + q.get("q") + "%"; A.push(s, s, s); }
      const lim = Math.min(500, Math.max(1, Number(q.get("limit")) || 200));
      const rows = this.sql.exec(`SELECT hid,at,who,c,id,op,pid,label,ch FROM hist ${W.length ? "WHERE " + W.join(" AND ") : ""} ORDER BY hid DESC LIMIT ${lim}`, ...A).toArray();
      const names = this.sql.exec<{ who: string }>("SELECT DISTINCT who FROM hist WHERE at > ? ORDER BY who", new Date(Date.now() - 180 * 864e5).toISOString()).toArray().map((r) => r.who);
      const since = this.kvGet("histInit") || "";
      return json({ rows, names, since, more: rows.length === lim });
    }

    if (p.startsWith("/api/admin/")) return this.admin(req, url, p.slice("/api/admin/".length));

    return json({ error: "not found" }, 404);
  }

  // ---------- 관리자 (비밀번호는 바깥 fetch에서 확인됨) ----------
  async admin(req: Request, url: URL, a: string): Promise<Response> {
    const body = async () => {
      try {
        return await req.json<any>();
      } catch {
        return {};
      }
    };
    if (a === "status") {
      const snaps = this.sql.exec<{ sid: string; kind: string; at: string; n: number }>("SELECT sid,kind,at,n FROM snaps ORDER BY at DESC LIMIT 1").toArray();
      return json({
        records: this.count(),
        seq: this.seq(),
        online: this.sockets().length,
        trash: this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM trash").one().n,
        snaps: this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM snaps").one().n,
        lastSnap: snaps[0] || null,
        blocked7d: this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM audit WHERE kind='대량 삭제 차단' AND at > ?", new Date(Date.now() - 7 * 864e5).toISOString()).one().n,
      });
    }
    if (a === "trash") {
      const q = (url.searchParams.get("q") || "").trim();
      const rows = this.sql
        .exec<{ tid: number; c: string; id: string; d: string; delAt: string; delBy: string }>(
          "SELECT tid,c,id,d,delAt,delBy FROM trash ORDER BY tid DESC LIMIT 3000",
        )
        .toArray()
        .map((r) => {
          let d: any = {};
          try {
            d = JSON.parse(r.d);
          } catch {}
          const label = String(d.name || d.title || d.label || d.item || d.subject || d.issue || d.text || d.content || d.memo || d.note || d.ym || d.wk || r.id).replace(/\s+/g, " ").slice(0, 80);
          return { tid: r.tid, c: r.c, id: r.id, delAt: r.delAt, delBy: r.delBy || "", label, pid: d.projectId || "", alive: this.sql.exec("SELECT 1 FROM rec WHERE c=? AND id=?", r.c, r.id).toArray().length > 0 };
        })
        .filter((r) => !q || (r.label + " " + r.delBy + " " + r.c).includes(q));
      return json({ rows });
    }
    if (a === "undelete" && req.method === "POST") {
      const b = await body();
      const tids: number[] = (b.tids || []).map(Number).filter(Boolean).slice(0, 5000);
      const ops: Op[] = [];
      const now = new Date().toISOString();
      for (const tid of tids) {
        const r = this.sql.exec<{ c: string; id: string; d: string }>("SELECT c,id,d FROM trash WHERE tid=?", tid).toArray()[0];
        if (r) ops.push({ c: r.c, op: "put", id: r.id, d: JSON.parse(r.d), at: now, by: "관리자 복원" });
      }
      if (!ops.length) return json({ error: "복원할 항목 없음" }, 400);
      // 현장을 지우면 화면이 실적관리 현장에 '대시보드에서 제외'(dashSkip)를 같이 찍음 → 같은 삭제 묶음이면 되돌려 연결 복구
      let erp = 0;
      const batches = new Set<string>();
      for (const tid of tids) {
        const t = this.sql.exec<{ delAt: string; delBy: string }>("SELECT delAt,delBy FROM trash WHERE tid=?", tid).toArray()[0];
        if (t) batches.add(t.delAt + "|" + (t.delBy || ""));
      }
      for (const k of batches) {
        const [at, who] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
        for (const h of this.sql.exec<{ id: string; ch: string }>("SELECT id,ch FROM hist WHERE at=? AND who=? AND c='erp' AND op='put'", at, who).toArray()) {
          let ch: any[] = [];
          try { ch = JSON.parse(h.ch || "[]"); } catch {}
          if (!ch.some((x) => x.k === "dashSkip" && x.t === "true")) continue;
          const cur = this.sql.exec<{ d: string }>("SELECT d FROM rec WHERE c='erp' AND id=?", h.id).toArray()[0];
          if (!cur) continue;
          const d = JSON.parse(cur.d);
          if (d.dashSkip !== true) continue;
          d.dashSkip = false;
          ops.push({ c: "erp", op: "put", id: h.id, d, at: now, by: "관리자 복원" });
          erp++;
        }
      }
      const seq = this.applyOps(ops, "관리자");
      this.sql.exec(`DELETE FROM trash WHERE tid IN (${tids.map(() => "?").join(",")})`, ...tids);
      this.audit("관리자", "휴지통 복원", `${ops.length - erp}건${erp ? ` · 실적관리 연결 ${erp}곳 되돌림` : ""}`);
      this.broadcast({ t: "ops", seq, from: "admin", ops });
      return json({ ok: true, restored: ops.length - erp, erp, seq });
    }
    if (a === "snaps") {
      return json({ rows: this.sql.exec("SELECT sid,kind,day,at,n,length(z) AS size FROM snaps ORDER BY at DESC").toArray() });
    }
    if (a === "snap-now" && req.method === "POST") {
      const r = await this.snapshot("manual");
      this.audit("관리자", "수동 백업", `${r.n}건`);
      return json({ ok: true, ...r });
    }
    if (a === "snap") {
      const sid = url.searchParams.get("sid") || "";
      const j = await this.snapJson(sid);
      if (!j) return json({ error: "백업 없음" }, 404);
      return new Response(JSON.stringify(j), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="epc-backup-${sid.slice(0, 16).replace(/[:T]/g, "")}.json"`,
          "cache-control": "no-store",
        },
      });
    }
    if (a === "restore-snap" && req.method === "POST") {
      const b = await body();
      const j = await this.snapJson(String(b.sid || ""));
      if (!j) return json({ error: "백업 없음" }, 404);
      await this.snapshot("pre-restore");
      const recs = backupToRecs(j);
      const seq = this.replaceAll(recs, "관리자 복원");
      this.audit("관리자", "백업으로 복원", `${b.sid} · ${recs.length}건 (복원 직전 상태는 'pre-restore' 백업으로 보관)`);
      this.broadcast({ t: "reload" });
      return json({ ok: true, records: recs.length, seq });
    }
    // 시점 복구: 최근 30일 안의 시각으로 저장소 전체(휴지통·백업 포함)를 되돌림. 되돌리기용 현재 북마크를 응답으로 돌려줌
    if (a === "pitr" && req.method === "POST") {
      const b = await body();
      const st: any = this.ctx.storage;
      if (typeof st.getBookmarkForTime !== "function") return json({ error: "이 환경에서는 시점 복구를 지원하지 않음 (로컬 개발 환경 등)" }, 501);
      let target: string;
      if (b.bookmark) target = String(b.bookmark);
      else {
        const t = new Date(String(b.time || ""));
        if (isNaN(t.getTime())) return json({ error: "시각 형식 오류" }, 400);
        if (Date.now() - t.getTime() > 30 * 864e5) return json({ error: "30일 이전 시각은 복구 불가" }, 400);
        if (t.getTime() > Date.now()) return json({ error: "미래 시각" }, 400);
        try {
          target = await st.getBookmarkForTime(t);
        } catch (e: any) {
          return json({ error: "시점 복구를 쓸 수 없음 (로컬 개발 환경은 미지원): " + String(e?.message || e).slice(0, 200) }, 501);
        }
      }
      let undo = "";
      try {
        undo = await st.getCurrentBookmark();
      } catch (e: any) {
        return json({ error: "시점 복구를 쓸 수 없음 (로컬 개발 환경은 미지원): " + String(e?.message || e).slice(0, 200) }, 501);
      }
      this.audit("관리자", "시점 복구", `${b.bookmark ? "북마크 " + target : b.time} · 되돌리기 북마크 ${undo}`);
      await st.onNextSessionRestoreBookmark(target);
      this.broadcast({ t: "reload" });
      // 응답을 보낸 뒤 객체를 다시 시작 → 재시작 시 저장소가 그 시점으로 바뀜. 접속자는 자동 재연결
      setTimeout(() => this.ctx.abort("시점 복구"), 300);
      return json({ ok: true, undo, target });
    }
    if (a === "audit") {
      return json({ rows: this.sql.exec("SELECT at,who,kind,detail FROM audit ORDER BY aid DESC LIMIT 300").toArray() });
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
      // 대량 삭제 차단: 묶음 전체를 거부하고 보낸 사람에게 사유 전달 (보낸 사람 화면은 서버 데이터로 되돌아감)
      const dels = ops.filter((o) => o && o.op === "del" && this.sql.exec("SELECT 1 FROM rec WHERE c=? AND id=?", o.c, String(o.id)).toArray().length);
      const win = this.wins.get(a.cid) || { t0: Date.now(), top: 0, del: 0 };
      this.wins.set(a.cid, win);
      const reason = checkDeletes(dels, (c) => this.count(c), win, Date.now());
      if (reason) {
        this.audit(a.name || a.cid, "대량 삭제 차단", `${reason} · 묶음 ${ops.length}건`);
        this.send(ws, { t: "reject", b: m.b, reason });
        return;
      }
      const seq = this.applyOps(ops, a.name);
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
