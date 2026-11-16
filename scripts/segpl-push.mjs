// 구분손익(재무 월별 배포) 반영분을 다른 서버로 옮김 — 로컬에서 올려 검증한 뒤 운영에 그대로 반영할 때
//
// 사용법
//   node scripts/segpl-push.mjs <원본 서버> <대상 서버> [--apply]
//   예) node scripts/segpl-push.mjs http://localhost:8787 https://se-epc.com            ← 미리보기만
//       node scripts/segpl-push.mjs http://localhost:8787 https://se-epc.com --apply    ← 실제 반영
//
// 옮기는 것: 실적관리 설정(erpMeta.settings)의 segPL(월별 구분손익) · segLink(프로젝트 코드 → 현장 연결)
//   - 대상 서버의 나머지 설정·Task·현장 데이터는 건드리지 않음 (대상 서버 최신값 위에 두 칸만 바꿔서 전송)
//   - segPL 은 월 단위로 합침: 원본에 있는 달만 덮어쓰고, 대상에만 있는 달은 그대로 둠 (수기 입력 man 은 대상 값 유지)
//   - segLink 연결 대상 현장이 대상 서버에 없으면 경고 후 그 연결은 건너뜀
//   - --apply 때는 반영 직전 대상 서버 전체 백업을 data/backup/before-segpl-<시각>.json 으로 저장
// 공용 비밀번호: 환경변수 SITE_PASSWORD, 없으면 .dev.vars 의 값을 사용 (원본·대상 같은 비밀번호 사용)
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const urls = args.filter((a) => /^https?:\/\//.test(a)).map((u) => u.replace(/\/$/, ""));
const apply = args.includes("--apply");
const BY = process.env.PATCH_BY || "정건호 대리";
if (urls.length !== 2) {
  console.error("사용법: node scripts/segpl-push.mjs <원본 서버> <대상 서버> [--apply]");
  process.exit(1);
}
const [src, dst] = urls;
let pw = process.env.SITE_PASSWORD || "";
if (!pw && fs.existsSync(".dev.vars")) pw = (fs.readFileSync(".dev.vars", "utf8").match(/^SITE_PASSWORD\s*=\s*"?([^"\r\n]*)"?/m) || [])[1] || "";
const headers = pw ? { "x-site-password": pw } : {};

async function exp(base) {
  const r = await fetch(`${base}/api/export`, { headers, cache: "no-store" });
  if (!r.ok) throw new Error(`${base} 데이터 받기 실패: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const raw = await r.text();
  return { raw, b: JSON.parse(raw) };
}
const eok = (v) => (Number(v || 0) / 1e8).toFixed(2);

const S = (await exp(src)).b;
const { raw: dstRaw, b: D } = await exp(dst);
const sSet = S.erp?.settings || {};
const dSet = structuredClone(D.erp?.settings || {});
const sPL = sSet.segPL || {};
if (!Object.keys(sPL).length) {
  console.error("원본 서버에 구분손익 반영분이 없음");
  process.exit(1);
}

const lines = [];
const plOld = dSet.segPL || {};
const plNew = { ...plOld };
for (const [ym, m] of Object.entries(sPL).sort()) {
  const rev = Object.values(m.rev || {}).reduce((a, v) => a + Number(v || 0), 0);
  const was = plOld[ym];
  const next = { ...m, ...(was && was.man ? { man: was.man } : {}) };
  if (was && JSON.stringify(was) === JSON.stringify(next)) {
    lines.push(`  = ${ym} 같음`);
    continue;
  }
  plNew[ym] = next;
  lines.push(`  ${was ? "~" : "+"} ${ym} ${m.file} · EPC사업부(국내) 매출 ${eok(rev)}억${m.chk && m.chk.rev != null ? ` (파일 합계 ${eok(m.chk.rev)}억)` : ""}`);
}
const ids = new Set((D.erp?.projects || []).map((e) => e.id));
const nm = (id) => {
  const e = (D.erp?.projects || []).find((x) => x.id === id);
  return e ? e.short || e.name : id;
};
const lkNew = { ...(dSet.segLink || {}) };
for (const [code, id] of Object.entries(sSet.segLink || {})) {
  if (!ids.has(id)) {
    lines.push(`  ! 연결 ${code} → ${id}: 대상 서버에 그 현장 없음 → 건너뜀`);
    continue;
  }
  if (lkNew[code] === id) continue;
  lkNew[code] = id;
  lines.push(`  + 연결 ${code} → ${nm(id)}`);
}
dSet.segPL = plNew;
dSet.segLink = lkNew;
const changed = JSON.stringify(dSet) !== JSON.stringify(D.erp?.settings || {});

console.log(`원본 ${src} → 대상 ${dst}`);
console.log(lines.join("\n"));
console.log(`\n${changed ? "반영 예정" : "바뀔 내용 없음"}${changed && !apply ? " — 미리보기만 했음. 실제 반영은 --apply" : ""}`);
if (!apply || !changed) process.exit(0);

const now = new Date().toISOString();
const stamp = now.replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
const bk = path.join("data", "backup", `before-segpl-${stamp}.json`);
fs.mkdirSync(path.dirname(bk), { recursive: true });
fs.writeFileSync(bk, dstRaw);
console.log(`백업 저장: ${bk}`);

// meta 레코드 = {id:"settings", settings, tpl, erpMeta:{weeks,issues,settings}} (worker/shape.ts recsToBackup 의 역)
const d = { id: "settings", settings: D.settings || {}, tpl: D.tpl ?? null, erpMeta: { weeks: D.erp?.weeks || {}, issues: D.erp?.issues || [], settings: dSet } };
const ops = [{ c: "meta", op: "put", id: "settings", d, at: now, by: BY }];
const ws = new WebSocket(dst.replace(/^http/, "ws") + "/api/ws", { headers });
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
  console.log(`반영 완료 (서버 seq ${await done})`);
} catch (e) {
  console.error("반영 실패:", e.message, "\n백업 파일:", bk);
  process.exitCode = 1;
} finally {
  try {
    ws.close();
  } catch {}
}
