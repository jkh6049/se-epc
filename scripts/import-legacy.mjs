// 사용법: npm run legacy:import -- "<건호 최신 HTML 경로>"
// 1) 내장 데이터(EMBEDDED_BACKUP_DATA)를 빼서 data/seed.json 으로 저장 (저장소에 안 올라감)
// 2) 데이터를 뺀 화면을 legacy/index.html 로 저장 + 실시간 동기화 스크립트(/live.js) 연결
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) {
  console.error('경로를 넣어줘: npm run legacy:import -- "C:/.../epc_1113g.html"');
  process.exit(1);
}
let html = fs.readFileSync(src, "utf8");

const KEY = "var EMBEDDED_BACKUP_DATA = ";
const i0 = html.indexOf(KEY + "{");
let data = null;
if (i0 >= 0) {
  const s = i0 + KEY.length;
  let depth = 0, inStr = false, esc = false, j = s;
  for (; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) { j++; break; }
  }
  data = JSON.parse(html.slice(s, j));
  html = html.slice(0, s) + "null" + html.slice(j);
} else {
  console.warn("내장 데이터 없음 (이미 null) → 화면만 가져옴");
}

const TAG = '<script src="/live.js"></script>';
if (!html.includes(TAG)) {
  const k = html.lastIndexOf("</body>");
  if (k < 0) throw new Error("</body> 를 찾지 못함");
  html = html.slice(0, k) + TAG + "\n" + html.slice(k);
}

fs.mkdirSync("legacy", { recursive: true });
fs.writeFileSync(path.join("legacy", "index.html"), html);
console.log(`legacy/index.html 저장 (${(html.length / 1024).toFixed(0)} KB)`);

if (data) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", "seed.json"), JSON.stringify(data));
  const n = Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k} ${v.length}`).join(", ");
  console.log(`data/seed.json 저장 (내보낸 시각 ${data.exportedAt})\n  ${n}`);
}
