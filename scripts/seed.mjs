// 사용법: npm run seed -- <사이트 주소> [--force] [데이터 파일]
//   예) npm run seed -- http://localhost:8787
//       npm run seed -- https://se-epc.com --force
// 서버가 비어 있을 때만 들어감. 이미 데이터가 있으면 --force 로 덮어씀 (접속 중인 화면은 자동 새로 맞춤)
// 공용 비밀번호: 환경변수 SITE_PASSWORD, 없으면 .dev.vars 의 값을 사용
import fs from "node:fs";

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a));
const force = args.includes("--force");
const file = args.find((a) => a.endsWith(".json")) || "data/seed.json";
if (!base) {
  console.error("주소를 넣어줘: npm run seed -- http://localhost:8787");
  process.exit(1);
}
let pw = process.env.SITE_PASSWORD || "";
if (!pw && fs.existsSync(".dev.vars")) pw = (fs.readFileSync(".dev.vars", "utf8").match(/^SITE_PASSWORD\s*=\s*"?([^"\r\n]*)"?/m) || [])[1] || "";
if (!pw) {
  console.error("공용 비밀번호가 필요해: SITE_PASSWORD 환경변수 또는 .dev.vars");
  process.exit(1);
}
const body = fs.readFileSync(file, "utf8");
const res = await fetch(`${base.replace(/\/$/, "")}/api/seed${force ? "?force=1" : ""}`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-site-password": pw },
  body,
});
console.log(res.status, await res.text());
