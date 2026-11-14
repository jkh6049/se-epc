// React 화면용 실시간 동기화 저장소 (서버 프로토콜은 legacy/live.js 와 같음)
// 컬렉션별 레코드 Map 을 들고 있고, 화면은 useStore() 로 구독
import { useSyncExternalStore } from "react";

export type User = { cid: string; name: string; color?: string; page?: string };
type State = {
  status: "connecting" | "open" | "closed";
  me: string;
  users: User[];
  data: Record<string, Map<string, any>>;
  version: number;
};

let state: State = { status: "connecting", me: "", users: [], data: {}, version: 0 };
const subs = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch, version: state.version + 1 };
  subs.forEach((f) => f());
};

let ws: WebSocket | null = null;
let retry = 0;
let bid = 0;

function col(data: State["data"], c: string) {
  return (data[c] ||= new Map());
}

export function connect(name = "") {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/api/ws`);
  emit({ status: "connecting" });
  ws.onopen = () => {
    retry = 0;
    ws!.send(JSON.stringify({ t: "hello", name, page: "next" }));
  };
  ws.onmessage = (e) => {
    if (e.data === "pong") return;
    const m = JSON.parse(e.data);
    if (m.t === "snap") {
      const data: State["data"] = {};
      for (const r of m.recs) col(data, r.c).set(r.id, r.d);
      emit({ status: "open", me: m.me, data });
    } else if (m.t === "ops") {
      const data = { ...state.data };
      for (const o of m.ops) {
        const map = new Map(col(data, o.c));
        if (o.op === "del") map.delete(String(o.id));
        else map.set(String(o.id), o.d);
        data[o.c] = map;
      }
      emit({ data });
    } else if (m.t === "presence") emit({ users: m.users });
    else if (m.t === "reload") ws!.send(JSON.stringify({ t: "hello", name, page: "next" }));
  };
  ws.onclose = () => {
    emit({ status: "closed" });
    setTimeout(() => connect(name), Math.min(15000, 1000 * 2 ** retry++));
  };
}

// 레코드 저장·삭제 (화면 이전 작업 때 사용)
export function put(c: string, d: any, by = "") {
  const at = new Date().toISOString();
  const rec = { ...d, _at: at, _by: by };
  const data = { ...state.data, [c]: new Map(col(state.data, c)).set(String(d.id), rec) };
  emit({ data });
  ws?.send(JSON.stringify({ t: "ops", b: ++bid, ops: [{ c, op: "put", id: String(d.id), d: rec, at, by }] }));
}
export function del(c: string, id: string, by = "") {
  const map = new Map(col(state.data, c));
  map.delete(String(id));
  emit({ data: { ...state.data, [c]: map } });
  ws?.send(JSON.stringify({ t: "ops", b: ++bid, ops: [{ c, op: "del", id: String(id), at: new Date().toISOString(), by }] }));
}

export function useStore() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );
}
