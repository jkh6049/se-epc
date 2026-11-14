// React 신규 화면 시작점. 지금은 서버 연결 확인용 — 화면 이전은 여기서부터 하나씩 추가
import { useStore } from "./sync";

const LABEL: Record<string, string> = {
  projects: "현장", ms: "마일스톤", tasks: "Task", logs: "진행사항", docs: "서류",
  vendors: "협력사", pay: "수금", erp: "ERP 현장", subs: "용역사", plants: "발전소",
};

export default function App() {
  const s = useStore();
  const projects = [...(s.data.projects?.values() ?? [])];
  const dot = s.status === "open" ? "bg-emerald-500" : s.status === "connecting" ? "bg-slate-400" : "bg-amber-500";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500">S-ENERGY · EPC 사업관리</p>
          <h1 className="text-2xl font-bold">신규 화면 (React) 준비 중</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm ring-1 ring-slate-200">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {s.status === "open" ? `실시간 연결 · 접속 ${s.users.length}명` : s.status === "connecting" ? "연결 중…" : "연결 끊김 · 재연결 중"}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(LABEL).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">{v}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.data[k]?.size ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">현장 (서버 실시간 데이터)</h2>
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-slate-500">{p.stage}</span>
            </li>
          ))}
          {!projects.length && <li className="px-4 py-6 text-center text-sm text-slate-400">데이터 없음</li>}
        </ul>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        현재 업무 화면은 <a className="text-blue-600 hover:underline" href="/">기존 대시보드</a>에서 사용. 같은 서버 데이터를 공유함.
      </p>
    </div>
  );
}
