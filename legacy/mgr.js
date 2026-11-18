// 홈 '사업부 현황' (관리자·팀장·임원용) — 2026-11-18 (v59f~m 정리안을 파일로 분리)
// 구성: ① 숫자 6칸 (회사 합계 = 주간보고 실적관리 계산 엔진 wkNums58 과 같은 값) ② 사업 흐름 (영업 → 사업지원 → 사업관리)
//       ③ 현장별 현황 표 (신호등) ④ 2주 주요 일정
// 사업지원·영업 기능(v57, phase57)이 있으면 흐름·구간을 실제 값으로, 없으면(main) 같은 틀에 빈칸 '—' (데이터 연결 없음)
// 표시 위치: v57 = 홈 '보는 팀 › 전체' / main = 홈 위 [실무 화면 | 사업부 현황] 전환
(function(){
const V57=()=>typeof phase57==="function";
const TCM={sales:"#b26a00",support:"#7c3aed",pm:"#2f6fed",om:"#0f8a7e"};
const tc=t=>(typeof TC57!=="undefined"&&TC57[t])||TCM[t]||"var(--text-dim)";
const E=v=>eokH(v||0);
const amt=p=>{const n=v=>{if(v==null||v==="")return 0;const x=Number(String(v).replace(/[^\d.-]/g,""));return isFinite(x)?x:0};return n(p.amount)||n((p.bid57||{}).est)};
const q=t=>`<span class="q59" title="${esc(t)}">?</span>`;
const go=x=>V57()?`team57Set('all');ph57='${x}';switchTab('projects')`:`switchTab('projects')`;
let view="mgr";try{view=localStorage.getItem("epc-homeview")||"work"}catch(e){}
window.mgrView=function(v){view=v;try{localStorage.setItem("epc-homeview",v)}catch(e){}renderHome()};
// 사업 흐름: 팀 상자 3개 같은 폭 · 단계 카드 · 팀 사이 원형 화살표
function flow(){const L=[["sales","영업",["dev","bid","pref"],["사업개발","입찰","우선협상"]],["support","사업지원",["won","prep","wait"],["계약 완료","착공 준비","인계 대기"]],["pm","사업관리",["pm","done"],["사업관리","종료"]]];
 const on=V57(),ph=x=>on?projects.filter(p=>phase57(p)===x):[];
 const arrow='<div class="fl61-a" aria-hidden="true"><i><svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></i></div>';
 const lanes=L.map(([t,l,ks,names])=>{const act=ks.filter(x=>x!=="done");const tot=act.reduce((s,x)=>s+ph(x).length,0),a=act.reduce((s,x)=>s+ph(x).reduce((u,p)=>u+amt(p),0),0);
  return`<div class="fl61-l" style="--c:${tc(t)}"><div class="fl61-h"><b>${l}</b><span>${on?`${tot}곳 진행${a?` · ${E(a)}`:""}`:"—"}</span></div><div class="fl61-s" style="grid-template-columns:repeat(${ks.length},minmax(0,1fr))">${ks.map((x,i)=>{const P=ph(x),n=P.length,s=P.reduce((u,p)=>u+amt(p),0);const nm=on&&typeof ph57L==="function"?ph57L(x):names[i];
   return on?`<button class="${n?"":"z"}" onclick="${go(x)}" title="${esc(((typeof PH57!=="undefined"?PH57:[]).find(h=>h.k===x)||{}).d||"")} · 누르면 목록"><span>${nm}</span><b>${n}</b><em>${s?E(s):"-"}</em></button>`:`<button class="z" disabled title="사업지원·영업 기능 반영 후 표시"><span>${nm}</span><b>—</b><em>&nbsp;</em></button>`}).join("")}</div></div>`});
 const lost=on?projects.filter(p=>phase57(p)==="lost").length:0;
 return`<div class="fl61">${lanes.join(arrow)}</div>${!on?'<div class="hint" style="margin-top:8px">사업지원·영업 기능 반영 후 단계별 건수·금액 표시</div>':lost?`<div class="hint" style="margin-top:8px">수주 실패 ${lost}건 → 현장 › 수주 실패</div>`:""}`}
function html(){const D=pp50Data(),k=D.k,W=wkNums58(),on=V57(),d=W?W.D.slice(5).replace("-","/"):"";
 // 올해 수주: v57 = 파이프라인 집계 · main = 계약일이 올해인 현장
 const Y=todayStr().slice(0,4);let wn=D.win;if(!wn){const won=projects.filter(p=>(p.contractDate||"").startsWith(Y));wn={Y,won:won.length,wonC:won.reduce((s,p)=>s+amt(p),0),lost:null,rate:null}}
 const kp=(ic,col,l,v,s,cls,tip,g)=>`<div class="m59-k ${cls||""} ${g?"go":""}" style="--tc:${cls==="warn"?"#d97706":cls==="bad"?"#dc2626":col}" title="${esc([tip,s.replace(/<[^>]+>/g,"")].filter(Boolean).join("\n"))}" ${g?`onclick="${g}"`:""}><span><i class="ic59" aria-hidden="true">${ic}</i>${l}</span><b>${v}</b><em>${s}</em></div>`;
 const kpis=[kp("▣","#2f6fed","수행 중 현장",`${k.n}<small>곳</small>`,`계약 ${E(k.C)} · 종료·계약 전 제외`,"","계약 이후 ~ 준공 전 현장",go("all")),
  kp("◫","#0e9fb8","수주잔고",W?E(W.contract-W.rev):"계산 중",W?`계약 − 누적 진행매출 · 기준일 ${d}`:"주간보고 계산 엔진 불러오는 중","","앞으로 매출로 잡힐 금액 · 주간보고 실적관리 '계약 잔액' 합계와 같은 값","switchTab('erp:weekly')"),
  kp("↗","#4f46e5","누적 진행매출",W?E(W.rev):"계산 중",W?`계약 대비 ${W.contract?(W.rev/W.contract*100).toFixed(1):"-"}% · 기준일 ${d}`:"","","공정률 × 계약금액 (구분손익 올린 달은 재무 숫자) · 주간보고 실적관리 누적 매출액과 같은 값 (종료 현장 포함)","switchTab('erp:weekly')"),
  kp("₩","#16a34a","수금",W?E(W.coll):"계산 중",W?`미수 ${E(W.ar)} · VAT·선급금 포함`:"",W&&W.ar>0?"warn":"","주간보고 실적관리 누적 수금액·미수금과 같은 값","switchTab('erp:weekly')"),
  kp("%","#7c3aed","계획 마진",k.margin==null?"-":k.margin.toFixed(1)+"<small>%</small>","(계약 − 실행예산) ÷ 계약 · 수행 중",k.margin!=null&&k.margin<0?"bad":"","실행예산이 있는 수행 중 현장 기준","switchTab('perf')"),
  kp("★","#d97706",`${wn.Y}년 수주`,`${wn.won||0}<small>건</small>`,`${E(wn.wonC)}${wn.lost==null?"":wn.lost?` · 실패 ${wn.lost}건 · 수주율 ${Math.round(wn.rate)}%`:" · 수주 실패 0건"}`,"","계약일이 올해인 현장"+(on?" · 수주 실패 = 실주·입찰 포기·우선협상 취소·보류":""),on?go("lost"):"")];
 // 2주 주요 일정
 const up=[];projects.filter(p=>!isClosed(p)).forEach(p=>milestones.filter(m=>m.projectId===p.id&&m.status!=="완료"&&m.status!=="해당없음"&&m.planDate).forEach(m=>{const dd=daysUntil(m.planDate);if(dd!=null&&dd>=0&&dd<=14)up.push({p,m,dd})}));up.sort((a,b)=>a.dd-b.dd||String(a.p.name).localeCompare(String(b.p.name)));
 const upH=up.slice(0,15).map(x=>`<div class="m59-u" onclick="openDetail('${x.p.id}')"><span class="m59-d">${x.m.planDate.slice(5).replace("-","/")}<em>${x.dd===0?"오늘":"D-"+x.dd}</em></span><span class="m59-un"><b>${esc(x.m.name)}</b><span>${esc(pname(x.p))}</span></span><span class="m59-tm" style="--c:${tc(teamOf48(x.p))}">${esc(x.m.bid57?"입찰":teamLabel48(teamOf48(x.p))||"")}</span></div>`).join("")+(up.length>15?`<div class="hint" style="padding:8px 0;grid-column:1/-1">외 ${up.length-15}건 · <a href="javascript:void 0" onclick="switchTab('calendar')">일정에서 보기</a></div>`:"")||'<div class="hint" style="padding:10px 0">2주 안 예정 일정 없음</div>';
 // 현장별 현황
 const ord={sales:0,support:1,pm:2};const rows=D.rows.slice().sort((a,b)=>(ord[teamOf48(a.p)]??3)-(ord[teamOf48(b.p)]??3)||b.C-a.C);
 const sig=r=>r.late||r.re||(r.margin!=null&&r.margin<0)?["r","■ 지연·위험"]:(r.ar>0||(r.paused||[]).length||(on&&phase57(r.p)==="wait"))?["a","▲ 주의"]:["g","● 정상"];
 const tr=rows.map(r=>{const s=sig(r),pr=r.C&&!r.pre?r.rev/r.C*100:null;const team=teamOf48(r.p);
  const seg=on?`<span class="m59-tm" style="--c:${tc(team)}">${esc(ph57L(phase57(r.p)))}</span><div class="hint">${esc(stageName(r.p.stage))}</div>`:`<span class="m59-tm" style="--c:${tc(team)}">${esc(stageName(r.p.stage))}</span>`;
  return`<tr onclick="openDetail('${r.p.id}')"><td><b>${esc(r.name)}</b><div class="hint">${esc(r.client||"-")}</div></td><td>${seg}</td><td class="n">${r.C?E(r.C):"-"}${r.pre&&r.C?'<div class="hint">추정</div>':""}</td><td>${pr==null?'<span class="hint">-</span>':`<div class="m59-bar" title="누적 진행매출 ${E(r.rev)} ÷ 계약 ${E(r.C)}"><i style="width:${Math.min(100,Math.max(0,pr))}%"></i></div><div class="m59-bt"><b>${pr.toFixed(0)}%</b><span>${E(r.rev)}</span></div>`}</td><td class="n ${r.margin!=null&&r.margin<0?"c-r":""}">${r.margin==null?'<span class="hint">-</span>':r.margin.toFixed(1)+"%"}</td><td class="n ${r.ar>0?"c-a":""}">${r.ar>0?E(r.ar):'<span class="hint">-</span>'}</td><td>${r.next?`${esc(r.next)}<div class="hint">${esc(r.nextD||"")}${r.nextD?" ("+dLabel(r.nextD)+")":""}</div>`:'<span class="hint">-</span>'}</td><td><span class="m59-sg c-${s[0]}">${s[1]}</span></td></tr>`}).join("");
 const act=D.rows.filter(r=>!r.pre),sC=act.reduce((s,r)=>s+r.C,0),sR=act.reduce((s,r)=>s+(r.rev||0),0),sA=act.reduce((s,r)=>s+(r.ar||0),0);
 const nS=rows.reduce((o,r)=>{o[sig(r)[0]]++;return o},{r:0,a:0,g:0});
 return`<div class="m59 b">
 <div class="m59-top"><div><b>사업부 현황</b><span class="m59-asof">금액 기준일 ${d||"-"} ${q(`오늘 ${todayStr()} · 금액은 주간보고 실적관리와 같은 값 (기준일 ${W?W.D:"-"}) · 칸·행을 누르면 해당 화면`)}</span></div><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-sm btn-secondary" onclick="switchTab('pipe')">사업부 파이프라인</button><button class="btn btn-sm btn-secondary" onclick="switchTab('erp:weekly')">주간보고</button></span></div>
 <div class="m59-ks">${kpis.join("")}</div>
 <div class="panel m59-p"><div class="m59-h"><b>사업 흐름</b>${q("영업 → 사업지원 → 사업관리 · 건수 / 금액 (계약금액, 계약 전은 추정가) · 칸을 누르면 그 구간 현장 목록")}</div>${flow()}</div>
 <div class="panel m59-p" style="padding:0;overflow:hidden"><div class="m59-h" style="padding:14px 16px 10px"><b>현장별 현황</b>${q(`${rows.length}곳 · ● 정상 ${nS.g} · ▲ 주의 ${nS.a} · ■ 지연·위험 ${nS.r}\n진행률 = 누적 진행매출 ÷ 계약 (주간보고와 같은 값)\n■ 지연·위험 = 지연 마일스톤·적자 예상 / ▲ 주의 = 미수·사이트 선정 대기·인계 대기`)}<span class="m59-cnt"><i class="c-g">● ${nS.g}</i><i class="c-a">▲ ${nS.a}</i><i class="c-r">■ ${nS.r}</i></span></div>
 <div style="overflow-x:auto"><table class="m59-t"><colgroup><col style="width:24%"><col style="width:10%"><col style="width:8%"><col style="width:15%"><col style="width:7%"><col style="width:7%"><col style="width:18%"><col style="width:11%"></colgroup>
 <thead><tr><th>현장 · 발주처</th><th>${on?"구간":"단계"}</th><th>계약</th><th>진행률 · 누적 진행매출</th><th>계획 마진</th><th>미수</th><th>다음 일정</th><th>상태</th></tr></thead><tbody>${tr||'<tr><td colspan="8" class="empty">진행 중인 현장 없음</td></tr>'}</tbody>
 <tfoot><tr><td>합계 (수행 중 ${act.length}곳)</td><td></td><td class="n">${E(sC)}</td><td>${sC?`<b>${(sR/sC*100).toFixed(0)}%</b> <span class="hint">${E(sR)}</span>`:""}</td><td class="n">${k.margin==null?"":k.margin.toFixed(1)+"%"}</td><td class="n">${sA?E(sA):""}</td><td colspan="2" class="hint">종료 현장은 빠짐 → 회사 전체 누적 진행매출은 위 숫자 칸 (${W?E(W.rev):"-"})</td></tr></tfoot></table></div></div>
 <div class="panel m59-p"><div class="m59-h"><b>2주 주요 일정</b>${q(`마일스톤·입찰 · ${up.length}건 · 누르면 현장 상세`)}</div><div class="m59-ul">${upH}</div></div>
 </div>`}
window.mgrHtml=html;
// ---------- 붙이기 ----------
if(V57()){
 const _h=h57Panel;h57Panel=function(){return team57==="all"?html():_h.apply(this,arguments)};
 const _rh=renderHome;renderHome=function(){const r=_rh.apply(this,arguments);try{const t=$("tab-home");if(t)t.classList.toggle("mgr59",team57==="all");const h=document.querySelector("#h57 .t57-row > .hint");if(h&&team57==="all")h.textContent="관리자용 사업부 현황 (팀장·임원) · 실무 화면은 팀을 고르면 나옴"}catch(e){console.error("[mgr]",e)}return r};
}else{
 const _rh=renderHome;renderHome=function(){const r=_rh.apply(this,arguments);try{const L=$("homeLead"),t=$("tab-home");if(!L||!t)return r;let b=$("h57");if(!b){b=document.createElement("div");b.id="h57"}if(L.previousElementSibling!==b)L.before(b);
  const M=view==="mgr";b.innerHTML=`<div class="t57-row" style="margin-bottom:12px"><span class="v59t"><button class="${M?"":"on"}" onclick="mgrView('work')">실무 화면</button><button class="${M?"on":""}" onclick="mgrView('mgr')">사업부 현황</button></span><span class="hint">${M?"관리자용 요약 (팀장·임원)":"오늘 할 일·확인할 것 중심"}</span></div>${M?html():""}`;t.classList.toggle("mgr59",M)}catch(e){console.error("[mgr]",e)}return r};
}
try{if(typeof curTab!=="undefined"&&curTab==="home")renderHome()}catch(e){}
// ---------- 스타일 ----------
const st=document.createElement("style");st.id="mgr-css";st.textContent=`
#tab-home.mgr59>:not(#h57){display:none!important}
.v59t{display:inline-flex;padding:3px;border-radius:9px;background:var(--bg-elev2);border:1px solid var(--border);margin-right:6px}
.v59t button{all:unset;cursor:pointer;font-size:12.5px;font-weight:600;padding:4px 12px;border-radius:7px;color:var(--text-dim)}.v59t button.on{background:var(--bg-elev);color:var(--text);box-shadow:0 1px 2px rgba(16,24,40,.12)}
.m59-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 12px}.m59-top b{font-size:17px;margin-right:8px}
.m59-asof{font-size:12px;color:var(--text-faint);display:inline-flex;gap:6px;align-items:center}
.m59-ks{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:12px}
.m59-k{background:color-mix(in srgb,var(--tc) 5%,var(--bg-elev));border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:2px;min-width:0}.m59-k.go{cursor:pointer}
.m59-k span{display:flex;align-items:center;font-size:12.5px;color:var(--text-dim);font-weight:600}
.ic59{flex:0 0 26px;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--tc);color:#fff;font-style:normal;font-size:13px;font-weight:800;box-shadow:0 4px 10px -3px color-mix(in srgb,var(--tc) 70%,transparent);margin-right:9px}
.m59-k b{font-size:28px;font-weight:800;letter-spacing:-.03em;line-height:1.15;margin-top:8px;font-variant-numeric:tabular-nums}.m59-k b small{font-size:14px;font-weight:600;margin-left:2px;color:var(--text-dim)}
.m59-k em{font-style:normal;font-size:12px;color:var(--text-dim);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m59-k.warn b{color:var(--warning)}.m59-k.bad b{color:var(--danger)}
.m59-p{margin-bottom:12px}.m59-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}.m59-h b{font-size:15.5px;font-weight:800}
.m59-cnt{margin-left:auto;display:flex;gap:10px;font-size:12.5px;font-weight:700}.m59-cnt i{font-style:normal}
/* 사업 흐름 */
.fl61{display:grid;grid-template-columns:minmax(0,1fr) 52px minmax(0,1fr) 52px minmax(0,1fr);align-items:stretch}
.fl61-l{border:1px solid var(--bd-inner,var(--border));background:var(--bg-inner,var(--bg-elev2));border-radius:12px;padding:10px}
.fl61-h{display:flex;align-items:center;gap:8px;padding:0 4px 9px}
.fl61-h b{display:inline-flex;align-items:center;gap:7px;font-size:14px}.fl61-h b::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 22%,transparent)}
.fl61-h span{margin-left:auto;font-size:12px;color:var(--text-dim)}
.fl61-s{display:grid;gap:6px}
.fl61-s button{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;height:66px;border-radius:9px;background:color-mix(in srgb,var(--c) 9%,var(--bg-tile,var(--bg-elev)));border:1px solid color-mix(in srgb,var(--c) 28%,var(--bd-tile,var(--border)));transition:transform .15s,box-shadow .15s;min-width:0}
.fl61-s button:not([disabled]):hover{transform:translateY(-2px);box-shadow:0 6px 14px -6px color-mix(in srgb,var(--c) 60%,transparent)}
.fl61-s span{font-size:12px;font-weight:700;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;padding:0 6px}
.fl61-s b{font-size:22px;font-weight:800;line-height:1.15;color:color-mix(in srgb,var(--c) 85%,var(--text));font-variant-numeric:tabular-nums}
.fl61-s em{font-style:normal;font-size:11.5px;color:var(--text-dim)}
.fl61-s button.z{background:var(--bg-tile,var(--bg-elev));border-color:var(--bd-tile,var(--border))}.fl61-s button.z b{color:var(--text-faint);opacity:.5}.fl61-s button.z span,.fl61-s button.z em{color:var(--text-faint)}.fl61-s button[disabled]{cursor:default}
.fl61-a{display:grid;place-items:center}.fl61-a i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;box-shadow:0 6px 14px -4px color-mix(in srgb,var(--accent) 65%,transparent)}
:root[data-theme="dark"] .fl61-s button{background:color-mix(in srgb,var(--c) 20%,var(--bg-tile,var(--bg-elev)));border-color:color-mix(in srgb,var(--c) 45%,transparent)}
:root[data-theme="dark"] .fl61-s b{color:color-mix(in srgb,var(--c) 45%,#fff)}
:root[data-theme="dark"] .fl61-s button.z{background:var(--bg-tile,var(--bg-elev));border-color:var(--bd-tile,var(--border))}
/* 현장별 현황 표 */
.m59-t{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;min-width:980px}
.m59-t td{padding:12px;border-bottom:1px solid var(--tbl-line,var(--border));vertical-align:middle;font-size:14px;overflow-wrap:anywhere}.m59-t td+td{border-left:1px solid var(--tbl-vline,var(--border))}
.m59-t tbody tr{cursor:pointer}.m59-t tbody tr:hover td{background:var(--row-h,var(--bg-elev2))}.m59-t tbody tr:last-child td{border-bottom:2px solid var(--tbl-head-line,var(--border))}
.m59-t td b{font-size:14.5px}.m59-t td .hint{font-size:12.5px}.m59-t td.n{text-align:right;white-space:nowrap;font-size:14.5px;font-weight:600;font-variant-numeric:tabular-nums}
.m59-t tfoot td{font-weight:700;font-size:14px;background:var(--tbl-head,var(--bg-elev2));border-bottom:0}
.m59-t :is(th,td):nth-child(1),.m59-t :is(th,td):nth-child(7){text-align:left}.m59-t td:nth-child(2),.m59-t td:nth-child(4),.m59-t td:nth-child(8){text-align:center}.m59-t td:nth-child(3),.m59-t td:nth-child(5),.m59-t td:nth-child(6){text-align:right}
.m59-t th{text-align:center!important}
.m59-bar{height:7px;border-radius:99px;background:var(--trk,var(--bg-elev2));overflow:hidden}.m59-bar i{display:block;height:100%;background:var(--fill,var(--accent));border-radius:99px}
.m59-bt{display:flex;justify-content:space-between;font-size:13px;margin-top:4px}.m59-bt b{font-size:14px}.m59-bt span{color:var(--text-dim)}
.m59-tm{display:inline-block;font-size:12px;padding:2px 9px;border-radius:9px;background:color-mix(in srgb,var(--c) 13%,transparent);color:var(--c);font-weight:700;white-space:nowrap}
.m59-sg{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12.5px;font-weight:700;white-space:nowrap;background:color-mix(in srgb,currentColor 13%,transparent)}
.c-r{color:var(--danger)!important}.c-a{color:var(--warning)!important}.c-g{color:var(--success)!important}
:root[data-theme="dark"] .m59-tm{color:color-mix(in srgb,var(--c) 50%,#fff)!important;background:color-mix(in srgb,var(--c) 26%,transparent)!important}
:root[data-theme="dark"] .m59-sg{background:color-mix(in srgb,currentColor 18%,transparent)}
/* 2주 일정 */
.m59-ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));column-gap:24px}
.m59-u{display:flex;align-items:center;gap:10px;padding:9px 4px;border-top:1px solid var(--tbl-line,var(--border));cursor:pointer;min-width:0}.m59-u:hover{background:var(--row-h,var(--bg-elev2))}
.m59-d{flex:0 0 64px;display:flex;flex-direction:column;align-items:flex-start;font-weight:700;font-size:14px}.m59-d em{display:inline-block;margin-top:2px;padding:0 7px;border-radius:99px;background:var(--bg-elev2);font-style:normal;font-size:11px;color:var(--text-dim);font-weight:400}
.m59-un{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}.m59-un b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m59-un span{font-size:12.5px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:1200px){.m59-ks{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1100px){.fl61{grid-template-columns:1fr;gap:4px}.fl61-a i{transform:rotate(90deg)}}
@media(max-width:900px){.m59-ks{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(st);
})();
