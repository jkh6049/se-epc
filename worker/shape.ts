// 백업 파일 형태(기존 대시보드 exportBackup) <-> 서버 레코드 형태 변환
// 레코드 = { c: 컬렉션, id, d: 내용 }. 컬렉션 이름은 기존 SYNC.cols() 와 같음

export type Rec = { c: string; id: string; d: any; by?: string; at?: string };

// 백업 키 = 레코드 컬렉션 이름 (기존 코드에서 그대로 같음)
export const COLS = [
  "projects", "ms", "pay", "tasks", "recur", "events", "plants", "insp", "as",
  "vendors", "logs", "docs", "bills", "claims", "sites", "weekly", "forms", "subs", "replies",
] as const;

// 사람마다 다른 개인 설정 (공유 안 함) — 기존 SYNC_PERSONAL 과 같게 유지
export const PERSONAL = ["theme", "view", "sbGroups", "formMe", "formGuides"];

export function backupToRecs(b: any): Rec[] {
  const out: Rec[] = [];
  for (const c of COLS) {
    const arr = b?.[c];
    if (!Array.isArray(arr)) continue;
    for (const o of arr) if (o && o.id != null) out.push({ c, id: String(o.id), d: o });
  }
  const erp = b?.erp;
  if (erp && Array.isArray(erp.projects)) {
    for (const o of erp.projects) if (o && o.id != null) out.push({ c: "erp", id: String(o.id), d: o });
  }
  const settings: any = {};
  for (const k of Object.keys(b?.settings || {})) if (!PERSONAL.includes(k)) settings[k] = b.settings[k];
  out.push({
    c: "meta",
    id: "settings",
    d: {
      id: "settings",
      settings,
      tpl: b?.tpl ?? null,
      erpMeta: erp ? { weeks: erp.weeks, issues: erp.issues, settings: erp.settings } : null,
    },
  });
  return out;
}

export function recsToBackup(recs: Rec[]): any {
  const b: any = {
    exportedAt: new Date().toISOString(),
    note: "EPC 사업관리 대시보드 백업본 (서버 내보내기)",
    req: [],
    memo: [],
  };
  for (const c of COLS) b[c] = [];
  const erp: any = { v: 4, settings: {}, weeks: {}, issues: [], projects: [] };
  for (const r of recs) {
    if (r.c === "meta") {
      if (r.id !== "settings") continue;
      b.settings = r.d?.settings || {};
      b.tpl = r.d?.tpl ?? null;
      const m = r.d?.erpMeta;
      if (m) {
        if (m.weeks) erp.weeks = m.weeks;
        if (m.issues) erp.issues = m.issues;
        if (m.settings) erp.settings = m.settings;
      }
    } else if (r.c === "erp") erp.projects.push(r.d);
    else if (b[r.c]) b[r.c].push(r.d);
  }
  b.erp = erp;
  return b;
}
