// 빌드 마지막 단계: 기존 대시보드를 사이트 첫 화면(/)으로 복사 + 로고·파비콘(legacy/public) 복사
import fs from "node:fs";

fs.mkdirSync("dist", { recursive: true });
for (const f of ["index.html", "live.js", "ui.js", "mgr.js"]) fs.copyFileSync(`legacy/${f}`, `dist/${f}`);
fs.cpSync("legacy/public", "dist", { recursive: true });
fs.writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
console.log("legacy → dist 복사 완료");
