// 공용 비밀번호 입장
// - 비밀번호는 코드에 두지 않음 (저장소 공개). 운영: wrangler secret put SITE_PASSWORD / 로컬: .dev.vars
// - 맞으면 쿠키(se_auth = 비밀번호로 만든 서명값)를 30일간 발급. 비밀번호를 바꾸면 기존 쿠키는 전부 무효
// - 화면 파일·/api 전부 이 검사를 거침. 스크립트(seed)는 x-site-password 헤더로 통과

const COOKIE = "se_auth";
const MAX_AGE = 60 * 60 * 24 * 30;
const enc = new TextEncoder();
const TITLE = "SE EPC 사업부 관리 시스템";
// 로그인 전에도 열리는 파일 (로고·파비콘·홈 화면 아이콘). 회사 데이터 없음
const PUBLIC = new Set(["/robots.txt", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/site.webmanifest"]);

async function sign(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode("se-epc/v1"));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 길이·내용과 무관하게 같은 시간 비교 (양쪽을 해시해 고정 길이로 맞춤)
async function same(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

function readCookie(req: Request, name: string): string {
  const h = req.headers.get("cookie") || "";
  for (const part of h.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

// 로그인 후 돌아갈 주소: 같은 사이트 내부 경로만 허용 (외부 주소로 튕기는 것 방지)
function safeNext(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.startsWith("/login")) return "/";
  return v;
}

export async function isAuthed(req: Request, password: string): Promise<boolean> {
  const header = req.headers.get("x-site-password");
  if (header) return same(header, password);
  const c = readCookie(req, COOKIE);
  return c ? same(c, await sign(password)) : false;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(next: string, error = "", status = 200): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${TITLE}</title>
<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="theme-color" content="#004c7f">
<style>
:root{color-scheme:light;--bg:#f3f4f6;--card:#fff;--line:#d9dce2;--text:#111827;--dim:#6b7280;--accent:#2f6fed;--accent-dim:#e3ecfd;--danger:#d7372f;--danger-dim:#fde5e3}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0f1014;--card:#1a1c22;--line:#2a2d38;--text:#eceef2;--dim:#8a8f9c;--accent:#5b8dff;--accent-dim:#2a3a5e;--danger:#e85a52;--danger-dim:#4a1a18}}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif}
.card{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:32px 28px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
.brand{text-align:center;margin-bottom:28px}
.brand picture,.brand img{display:block;height:44px;width:auto;margin:0 auto 14px}
.brand h1{font-size:17px;font-weight:700;letter-spacing:-.2px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
input{width:100%;height:46px;padding:0 14px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text);font-size:16px;font-family:inherit}
input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
input.bad{border-color:var(--danger)}
.err{display:flex;gap:8px;align-items:flex-start;margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--danger-dim);color:var(--danger);font-size:13px;font-weight:600;line-height:1.45}
button{width:100%;height:46px;margin-top:18px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}
button:hover{filter:brightness(1.06)}
.hint{margin-top:16px;font-size:12px;color:var(--dim);text-align:center}
</style></head><body>
<form class="card" method="post" action="/login" autocomplete="off">
 <div class="brand"><picture><source srcset="/brand/logo-white.svg" media="(prefers-color-scheme: dark)"><img src="/brand/logo.svg" alt="S-Energy"></picture><h1>${TITLE}</h1></div>
 <label for="pw">공용 비밀번호</label>
 <input id="pw" name="password" type="password" inputmode="text" autocomplete="current-password" required autofocus${error ? ' class="bad" aria-invalid="true" aria-describedby="err"' : ""}>
 ${error ? `<div class="err" id="err" role="alert">${esc(error)}</div>` : ""}
 <input type="hidden" name="next" value="${esc(next)}">
 <button type="submit">들어가기</button>
 <p class="hint">팀 공용 비밀번호를 입력하세요.</p>
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

function cookie(req: Request, value: string, maxAge: number): string {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// 로그인이 필요한 요청 처리. 통과면 null, 아니면 보낼 응답
export async function gate(req: Request, password: string | undefined): Promise<Response | null> {
  const url = new URL(req.url);

  if (!password) {
    return new Response("서버에 공용 비밀번호(SITE_PASSWORD)가 설정되지 않았습니다.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (url.pathname === "/logout") {
    return new Response(null, { status: 303, headers: { location: "/login", "set-cookie": cookie(req, "", 0) } });
  }

  if (url.pathname === "/login" && req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const input = String(form?.get("password") ?? "");
    const next = safeNext(String(form?.get("next") ?? "/"));
    if (input && (await same(input, password))) {
      return new Response(null, { status: 303, headers: { location: next, "set-cookie": cookie(req, await sign(password), MAX_AGE) } });
    }
    // 틀리면 1초 지연 (무차별 대입 속도 늦춤)
    await new Promise((r) => setTimeout(r, 1000));
    return page(next, "비밀번호가 틀렸습니다. 다시 입력해 주세요.", 401);
  }

  const ok = await isAuthed(req, password);

  if (url.pathname === "/login") {
    return ok ? Response.redirect(new URL(safeNext(url.searchParams.get("next")), url).toString(), 303) : page(safeNext(url.searchParams.get("next")));
  }
  if (ok) return null;

  // 미인증: API는 401, 화면은 비밀번호 입력창
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (PUBLIC.has(url.pathname) || url.pathname.startsWith("/brand/")) return null;
  return page(safeNext(url.pathname + url.search), "", 401);
}
