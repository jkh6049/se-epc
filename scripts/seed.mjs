// 사용법: npm run seed -- <사이트 주소> [--force] [데이터 파일]
//   예) npm run seed -- http://localhost:8787
//       npm run seed -- https://se-epc.com --force
// 서버가 비어 있을 때만 들어감. 이미 데이터가 있으면 --force 로 덮어씀 (접속 중인 화면은 자동 새로 맞춤)
import fs from "node:fs";

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:\/\//.test(a));
const force = args.includes("--force");
const file = args.find((a) => a.endsWith(".json")) || "data/seed.json";
if (!base) {
  console.error("주소를 넣어줘: npm run seed -- http://localhost:8787");
  process.exit(1);
}
const body = fs.readFileSync(file, "utf8");
const res = await fetch(`${base.replace(/\/$/, "")}/api/seed${force ? "?force=1" : ""}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
});
console.log(res.status, await res.text());
