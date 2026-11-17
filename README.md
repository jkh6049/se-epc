# se-epc — 에스에너지 EPC 사업관리 대시보드

Cloudflare Workers 위에서 도는 팀 공용 사업관리 대시보드. 모든 접속자가 같은 데이터를 실시간으로 공유한다.

| 주소 | 화면 |
|---|---|
| `/` | 기존 대시보드 (단일 HTML, 실시간 동기화 연결) |
| `/next/` | React + Tailwind 신규 화면 (화면 단위로 이전 중) |
| `/api/export` | 서버 데이터 전체 백업(JSON). 대시보드의 '백업 불러오기'로 복원 가능 |
| `/api/health` | 레코드 수·접속자 수 확인 |

## 공용 비밀번호

- 모든 화면·API는 공용 비밀번호를 입력해야 열림 (맞으면 30일 유지, `/logout` 으로 로그아웃)
- 비밀번호는 코드에 넣지 않음 (저장소 공개). 운영: `npx wrangler secret put SITE_PASSWORD` / 로컬: `.dev.vars` 에 `SITE_PASSWORD="..."` (git 제외)
- 비밀번호를 바꾸면 기존 로그인은 전부 풀림
- seed 스크립트는 SITE_PASSWORD 환경변수 또는 .dev.vars 값을 `x-site-password` 헤더로 보냄

## 개발 방향

EPC사업부 파이프라인(영업팀 → 사업지원팀 → 사업관리팀) 기준·단계·인계·지표 정의: [docs/PIPELINE.md](docs/PIPELINE.md)

## 구조

```
app/        React 신규 화면 (Vite, Tailwind) → 빌드 시 dist/next
legacy/     기존 대시보드 (index.html, 데이터 제외) + live.js (서버 동기화)
worker/     서버: Worker + Durable Object "Hub" (SQLite 저장 + 웹소켓 중계)
scripts/    legacy 가져오기 · 빌드 복사 · 초기 데이터 넣기
data/       초기 데이터 (git 제외 — 회사 데이터는 저장소에 올리지 않음)
```

## 동기화 방식

- 팀 전체 데이터 = Durable Object 1개. 레코드(컬렉션 + id) 단위로 SQLite에 저장
- 접속하면 서버 전체 데이터로 브라우저 데이터를 맞춤 (서버가 정본)
- 수정하면 바뀐 레코드만 서버로 전송 → 서버가 도착 순서대로 번호를 붙여 저장 후 다른 접속자에게 전달
- 같은 레코드를 동시에 고치면 나중에 도착한 수정이 최종본 (칸 단위 병합은 React 이전 때 적용 예정)
- 연결이 끊긴 동안 고친 내용은 브라우저에 보관했다가 재연결 시 전송
- 개인 설정(테마·보기 방식·메뉴 접힘·내 정보·가이드 주소)은 공유하지 않음

## 작업 방법

```bash
npm install
# 처음 한 번: .dev.vars 파일에 SITE_PASSWORD="공용비밀번호" 작성
npm run dev              # 빌드 후 로컬 서버 실행 http://localhost:8787 (서버·DB·실시간 동기화 전부)
npm run dev:next         # React 신규 화면만 Vite로 개발 (http://localhost:5173/next/, 8787 서버 같이 켜둘 것)
npm run seed -- http://localhost:8787   # 로컬 서버에 초기 데이터 넣기
```

운영 서버에 일부 레코드만 추가·수정할 때 (서버 전체를 덮어쓰지 않음 — 그사이 팀원이 고친 다른 칸은 유지):

```bash
node scripts/patch.mjs https://se-epc.com data/patch/<파일>.json           # 미리보기만 (아무것도 안 바뀜)
node scripts/patch.mjs https://se-epc.com data/patch/<파일>.json --apply   # 반영 (직전 백업: data/backup/before-patch-*.json)
```

- 패치 항목: `add`(없을 때만 추가) · `set`(지정한 칸만 수정) · `append`(글 끝에 덧붙임) — 형식은 scripts/patch.mjs 상단 주석
- 미리보기에 "서버에 없음 → 건너뜀"이 나오면 id 확인 후 반영. 같은 패치를 두 번 돌려도 중복 반영 안 됨

구분손익(재무 월별 배포 엑셀): 평소에는 주간보고 › 실적관리 — 프로젝트별 월별 의 [구분손익 업로드] 버튼으로 올림.
로컬에서 먼저 올려 검증한 반영분(월별 구분손익 + 프로젝트 코드 연결)을 운영에 그대로 옮길 때:

```bash
node scripts/segpl-push.mjs http://localhost:8787 https://se-epc.com           # 미리보기
node scripts/segpl-push.mjs http://localhost:8787 https://se-epc.com --apply   # 반영 (직전 백업: data/backup/before-segpl-*.json)
```

기존 HTML을 새 버전으로 바꿀 때:

```bash
npm run legacy:import -- "C:/경로/epc_새버전.html"   # 데이터 빼고 legacy/index.html 갱신 + data/seed.json
```

운영 서버 데이터를 파일 데이터로 통째로 덮어쓸 때 (주의: 서버의 현재 데이터가 사라짐 — 먼저 /api/export 로 백업):

```bash
npm run seed -- https://se-epc.com --force
```

## 배포

```bash
npm run deploy           # 빌드 + Cloudflare 배포 (wrangler login 필요)
```

도메인 se-epc.com / www.se-epc.com 은 wrangler.jsonc 의 routes(custom_domain)로 연결.
(예정) Cloudflare 대시보드에서 이 저장소를 Workers Builds 로 연결하면 `main` push 시 자동 배포: 빌드 `npm run build`, 배포 `npx wrangler deploy`.
