// 데이터 보호 (2026-11-17)
// 1) 대량 삭제 차단: 한 번에·짧은 시간에 너무 많이 지우는 수정 묶음은 서버가 거부 (관리자 복원은 /admin 에서)
// 2) 관리자 비밀번호 확인: /api/admin/* 은 x-admin-password 헤더 필요 (값은 코드에 두지 않음 — wrangler secret ADMIN_PASSWORD)

const enc = new TextEncoder();

// 길이·내용과 무관하게 같은 시간 비교
export async function same(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

export async function isAdmin(req: Request, adminPassword?: string): Promise<boolean> {
  if (!adminPassword) return false;
  const h = req.headers.get("x-admin-password") || "";
  return h ? same(h, adminPassword) : false;
}

// 상위 레코드 (지우면 하위 자료가 같이 지워지는 것)
export const TOP = new Set(["projects", "plants", "erp", "vendors"]);

// 기준: 현장 1곳 삭제 = 하위 포함 약 150건 (2026-11 데이터). 정상 작업은 통과하도록 여유를 둠
export const LIMIT = {
  batchTop: 2, // 한 묶음에 상위 레코드 삭제 최대
  batchDel: 400, // 한 묶음에 삭제 최대
  shareMin: 20, // 아래 비율 검사를 시작하는 삭제 건수
  share: 0.6, // 한 묶음이 한 종류 전체의 60% 이상을 지우면 거부
  winMs: 60 * 60 * 1000, // 접속자별 1시간 창
  winTop: 5, // 1시간 안 상위 레코드 삭제 최대
  winDel: 1000, // 1시간 안 삭제 최대
};

export type Win = { t0: number; top: number; del: number };

// 거부 사유 (없으면 "")
export function checkDeletes(
  dels: { c: string }[],
  countOf: (c: string) => number,
  win: Win,
  now: number,
): string {
  if (!dels.length) return "";
  const top = dels.filter((d) => TOP.has(d.c)).length;
  if (top > LIMIT.batchTop) return `상위 자료(현장·발전소·업체 등) ${top}건을 한 번에 삭제`;
  if (dels.length > LIMIT.batchDel) return `한 번에 ${dels.length}건 삭제`;
  const by: Record<string, number> = {};
  for (const d of dels) by[d.c] = (by[d.c] || 0) + 1;
  for (const c in by) {
    const n = by[c], cur = countOf(c);
    if (n >= LIMIT.shareMin && cur && n / cur >= LIMIT.share) return `'${c}' 전체 ${cur}건 중 ${n}건(${Math.round((n / cur) * 100)}%)을 한 번에 삭제`;
  }
  if (now - win.t0 > LIMIT.winMs) {
    win.t0 = now;
    win.top = 0;
    win.del = 0;
  }
  if (win.top + top > LIMIT.winTop) return `1시간 안에 상위 자료 ${win.top + top}건 삭제`;
  if (win.del + dels.length > LIMIT.winDel) return `1시간 안에 ${win.del + dels.length}건 삭제`;
  win.top += top;
  win.del += dels.length;
  return "";
}

// gzip 압축/해제 (일일 백업 보관용)
export async function gzip(s: string): Promise<ArrayBuffer> {
  const cs = new CompressionStream("gzip");
  const w = cs.writable.getWriter();
  w.write(enc.encode(s));
  w.close();
  return await new Response(cs.readable).arrayBuffer();
}
export async function gunzip(b: ArrayBuffer): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const w = ds.writable.getWriter();
  w.write(new Uint8Array(b));
  w.close();
  return await new Response(ds.readable).text();
}
