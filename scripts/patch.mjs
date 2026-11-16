// 레코드 단위 패치: 서버 데이터를 통째로 덮어쓰지 않고, 패치 파일에 적힌 레코드만 추가·수정
//
// 사용법
//   node scripts/patch.mjs <사이트 주소> <패치 파일> [--apply]
//   예) node scripts/patch.mjs http://localhost:8787 data/patch/2611-handover.json          ← 미리보기만 (아무것도 안 바뀜)
//       node scripts/patch.mjs https://se-epc.com data/patch/2611-handover.json --apply   ← 실제 반영
//
// 패치 파일 형식 (JSON 배열)
//   { "c": "tasks", "id": "...", "add":   { ...레코드 전체 } }   서버에 없을 때만 추가 (이미 있으면 건너뜀)
//   { "c": "tasks", "id": "...", "set":   { 칸: 값 } }          기존 레코드의 해당 칸만 바꿈 (나머지 칸은 서버 최신값 유지)
//   { "c": "tasks", "id": "...", "append":{ 칸: "문장" } }       기존 글 끝에 줄바꿈 후 덧붙임 (같은 문장이 이미 있으면 건너뜀)
//   set·append 는 한 항목에 같이 쓸 수 있음. 대상 레코드가 서버에 없으면 경고 후 건너뜀
//
// 안전장치
//   - 항상 서버 최신 데이터(/api/export)를 받아서 그 위에 계산 → 그사이 팀원이 고친 다른 칸은 그대로
//   - --apply 때는 반영 직전 서버 전체 백업을 data/backup/before-patch-<시각>.json 으로 저장
//   - 같은 패치를 두 번 돌려도 결과가 같음 (add 는 중복 추가 안 함, append 는 중복 문장 안 붙임)
// 공용 비밀번호: 환경변수 SITE_PASSWORD, 없으면 .dev.vars 의 값을 사용
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || "").replace(/\/$/, "");
const file = args.find((a) => a.endsWith(".json"));
const apply = args.includes("--apply");
const BY = process.env.PATCH_BY || "정건호 대리";
if (!base || !file) {
  console.error("사용법: node scripts/patch.mjs <사이트 주소> <패치 파일.json> [--apply]");
  process.exit(1);
}
let pw = process.env.SITE_PASSWORD || "";
if (!pw && fs.existsSync(".dev.vars")) pw = (fs.readFileSync(".dev.vars", "utf8").match(/^SITE_PASSWORD\s*=\s*"?([^"\r\n]*)"?/m) || [])[1] || "";
const headers = pw ? { "x-site-password": pw } : {};

const COLS = ["projects", "ms", "pay", "tasks", "recur", "events", "plants", "insp", "as", "vendors", "logs", "docs", "bills", "claims", "sites", "weekly", "forms", "subs", "replies"];
const items = JSON.parse(fs.readFileSync(file, "utf8"));

// 1) 서버 최신 데이터
const res = await fetch(`${base}/api/export`, { headers, cache: "no-store" });
if (!res.ok) {
  console.error("서버 데이터 받기 실패:", res.status, (await res.text()).slice(0, 200));
  process.exit(1);
}
const raw = await res.text();
const cur = JSON.parse(raw);
const find = (c, id) => (cur[c] || []).find((o) => o && String(o.id) === String(id));

// 2) 변경분 계산
const now = new Date().toISOString();
const ops = [];
const lines = [];
const short = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return (s ?? "").replace(/\n/g, " / ").slice(0, 90);
};
for (const it of items) {
  if (!COLS.includes(it.c) || it.id == null) {
    lines.push(`  ! 형식 오류 건너뜀: ${JSON.stringify(it).slice(0, 80)}`);
    continue;
  }
  const ex = find(it.c, it.id);
  const label = `${it.c}/${it.id}`;
  if (it.add) {
    if (ex) {
      lines.push(`  = ${label} 이미 있음 → 건너뜀`);
      continue;
    }
    const d = { ...it.add, id: it.id, updatedAt: now, _at: now, _by: BY };
    if (!d.createdAt) d.createdAt = now;
    ops.push({ c: it.c, op: "put", id: String(it.id), d, at: now, by: BY });
    lines.push(`  + ${label} 추가: ${d.title || d.name || d.text?.slice(0, 50) || d.content?.slice(0, 50) || ""}`);
    continue;
  }
  if (!ex) {
    lines.push(`  ! ${label} 서버에 없음 → 건너뜀 (지워졌거나 id가 다름)`);
    continue;
  }
  const d = structuredClone(ex);
  const diffs = [];
  for (const [k, v] of Object.entries(it.set || {})) {
    if (JSON.stringify(d[k]) === JSON.stringify(v)) continue;
    diffs.push(`      ${k}: ${short(d[k])}  →  ${short(v)}`);
    d[k] = v;
  }
  for (const [k, v] of Object.entries(it.append || {})) {
    const old = d[k] == null ? "" : String(d[k]);
    if (old.includes(v)) continue;
    d[k] = old ? `${old}\n${v}` : v;
    diffs.push(`      ${k} += ${short(v)}`);
  }
  if (!diffs.length) {
    lines.push(`  = ${label} 바뀔 내용 없음`);
    continue;
  }
  d.updatedAt = now;
  d._at = now;
  d._by = BY;
  ops.push({ c: it.c, op: "put", id: String(it.id), d, at: now, by: BY });
  lines.push(`  ~ ${label} 수정 (${ex.title || ex.name || ""})`, ...diffs);
}

console.log(`대상 서버: ${base}`);
console.log(lines.join("\n"));
console.log(`\n반영 예정 ${ops.length}건${apply ? "" : " — 미리보기만 했음. 실제 반영은 --apply"}`);
if (!apply || !ops.length) process.exit(0);

// 3) 반영 직전 백업
const stamp = now.replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
const bk = path.join("data", "backup", `before-patch-${stamp}.json`);
fs.mkdirSync(path.dirname(bk), { recursive: true });
fs.writeFileSync(bk, raw);
console.log(`백업 저장: ${bk}`);

// 4) 실시간 동기화 경로(웹소켓)로 전송 → 서버 저장 + 접속 중인 화면에 바로 반영
const wsUrl = base.replace(/^http/, "ws") + "/api/ws";
const ws = new WebSocket(wsUrl, { headers });
const done = new Promise((ok, fail) => {
  const timer = setTimeout(() => fail(new Error("30초 안에 서버 응답 없음")), 30000);
  ws.onopen = () => ws.send(JSON.stringify({ t: "ops", b: 1, ops }));
  ws.onmessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (m.t === "ack" && m.b === 1) {
      clearTimeout(timer);
      ok(m.seq);
    }
  };
  ws.onerror = (e) => {
    clearTimeout(timer);
    fail(new Error("웹소켓 오류 " + (e?.message || "")));
  };
});
try {
  const seq = await done;
  console.log(`반영 완료: ${ops.length}건 (서버 seq ${seq})`);
} catch (e) {
  console.error("반영 실패:", e.message, "\n백업 파일로 상태 확인 가능:", bk);
  process.exitCode = 1;
} finally {
  try {
    ws.close();
  } catch {}
}
