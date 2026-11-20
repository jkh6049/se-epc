// 화면 디자인 공통 (2026-11-18) — 시안 1안 '레이어드 엘리베이션' + 정리안 규칙
// index.html 안의 v59·v59g·v59h·v59i 블록을 파일로 분리 (사업지원 기능과 분리해서 main 에 디자인만 반영하기 위함)
// 기능 코드는 건드리지 않음: 색 변수·카드 그림자·경계·띠 제거·입력칸·표 규칙·? 툴팁만. 없는 화면의 클래스 규칙은 아무 영향 없음
(function(){
// ===================== v59 (2026-11-18): 입력칸 일괄 통일 — 표 안 입력칸도 상단 폼(현장명 등)과 같은 모양 · 표 칸 비율 정리 =====================
// 표 안 input/select/textarea 가 브라우저 기본 모양(회색·각진 테두리)으로 나오던 문제 → 공통 규칙. :where() 라 기존 개별 스타일이 있으면 그쪽이 우선
(()=>{const st=document.createElement("style");st.textContent=`
:where(input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]),select,textarea){padding:7px 10px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-input);color:var(--text);font-family:inherit;font-size:13px;line-height:1.35}
:where(textarea){resize:vertical}
:where(input,select,textarea):hover{border-color:var(--border-hover)}
:where(input,select,textarea):disabled{opacity:.6;cursor:not-allowed}
/* 표 안 입력칸: 같은 모양, 행 높이에 맞춰 살짝 촘촘하게 · 칸 가운데 정렬 */
.b57-kv input,.b57-kv textarea,.b57-t input,.b57-t textarea,.b57-t select,.ho-t input,.ho-t select{width:100%;min-width:0;box-sizing:border-box;padding:6px 9px;font-size:12.5px;border-radius:6px}
.b57-t td,.b57-kv td,.b57-kv th{vertical-align:middle}
.bz57.bz57-ed .b57-t td,#nb57 .b57-t td{padding:3px 4px}.bz57.bz57-ed .b57-kv td,#nb57 .b57-kv td{padding:3px 6px}
.b57-t textarea,.b57-kv textarea,.ho-t textarea{display:block;min-height:32px;height:auto;field-sizing:content;max-height:220px}
.ho-t{border-collapse:collapse}.ho-t td{padding:6px 8px}.ho-t th:nth-child(2){width:130px!important}.ho-t select{min-width:0}
#hoPanel input{padding:5px 8px;font-size:12.5px}
`;document.head.appendChild(st)})();

// ===================== v59g (2026-11-18): 화면 스타일 = 시안 1안 '레이어드 엘리베이션' (docs/ui-sian.html) =====================
// 테두리 대신 여러 겹의 얇은 그림자(1px 링 + 짧은 그림자 + 넓은 그림자)로 카드를 띄움 · 누를 수 있는 카드는 마우스를 올리면 떠오름
// 색 변수만 바꾸고 기존 화면 구조는 그대로 → 실적관리(ERP) 프레임도 erpSkin 이 같은 변수를 받아 감
(()=>{const st=document.createElement("style");st.id="skin59";st.textContent=`
:root{--bg:#f3f5f8;--bg-elev:#ffffff;--bg-elev2:#f4f6f9;--bg-input:#f6f7f9;--border:#e6e9ef;--border-strong:#dde1e8;--border-hover:#b9c0cc;
 --text:#0f172a;--text-dim:#475569;--text-faint:#64748b;--accent:#2f6fed;--accent-dim:#eaf1fe;--danger:#dc2626;--danger-dim:#fde8e8;--success:#16a34a;--warning:#b7791f;
 --shadow:0 0 0 1px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.05),0 6px 16px -4px rgba(16,24,40,.08);
 --shadow-h:0 0 0 1px rgba(16,24,40,.07),0 4px 8px rgba(16,24,40,.06),0 18px 32px -8px rgba(16,24,40,.18);
 --card-bd:transparent;--row-h:#f7f9fc;--fill:linear-gradient(90deg,#2f6fed,#6c9bff);--trk:#eef1f5;
 --sb-bg:#ffffff;--sb-bg2:#f4f6f9;--sb-line:#e6e9ef}
:root[data-theme="dark"]{--bg:#0b0d12;--bg-elev:#151922;--bg-elev2:#191e29;--bg-input:#0f1218;--border:#1e2331;--border-strong:#262c3b;--border-hover:#3a4255;
 --text:#e8ebf2;--text-dim:#aab2c3;--text-faint:#7f889a;--accent:#6b9bff;--accent-dim:rgba(107,155,255,.13);--danger:#f87171;--danger-dim:rgba(248,113,113,.13);--success:#4ade80;--warning:#fbbf24;
 --shadow:inset 0 1px 0 rgba(255,255,255,.05),0 1px 2px rgba(0,0,0,.45),0 8px 24px -6px rgba(0,0,0,.6);
 --shadow-h:inset 0 1px 0 rgba(255,255,255,.08),0 2px 4px rgba(0,0,0,.45),0 20px 40px -10px rgba(0,0,0,.75);
 --card-bd:rgba(255,255,255,.06);--row-h:#191e29;--fill:linear-gradient(90deg,#4f86ff,#8db1ff);--trk:#1f2431;
 --sb-bg:#10131a;--sb-bg2:#191e29;--sb-line:#1c2130}
/* 카드: 테두리 → 그림자 링 */
.panel,.hl-box,.tgrp,.pc2,.fm-card,.fm-ed,.td-box,.h18-c,.pf-box,.rx-c,.stat,.pcard,.kcard,.lg-it,.sk24,.m59-k,.st59,.h57-ban,.s59-l,.m59-lane,.hl-kpi .k,.modal,.f59{background:var(--bg-elev);border-color:var(--card-bd)!important;box-shadow:var(--shadow);border-radius:12px}
.panel{border-left-width:0;border-style:solid;border-width:1px}
.panel.bz57{border-left:3px solid #7c3aed!important}.st59{border-left:4px solid var(--c)!important}.h57-ban{border-left:4px solid var(--c)!important}.m59-lane{border-top:3px solid var(--c)!important}
.pc2,.stat,.pcard,.kcard,.m59-k.go,.sk24[onclick],.h57-k,.rx-c[onclick],.hl-kpi .k[onclick],.stage-tile{transition:transform .22s ease,box-shadow .22s ease}
.pc2:hover,.stat:hover,.pcard:hover,.kcard:hover,.m59-k.go:hover,.sk24[onclick]:hover,.h57-k:hover,.rx-c[onclick]:hover,.hl-kpi .k[onclick]:hover{box-shadow:var(--shadow-h);transform:translateY(-2px)}
.modal{box-shadow:var(--shadow-h)}
/* 카드 안 칸 (요약 8칸·흐름 칸) */
.f59{gap:0;background:var(--bg-elev)}.f59>div{background:transparent;border-right:1px solid var(--border);border-bottom:1px solid var(--border)}
.m59-st button{background:var(--bg-elev2)}
/* 상단 바 · 사이드바 */
.topbar{background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(160%) blur(8px);-webkit-backdrop-filter:saturate(160%) blur(8px);border-bottom:1px solid var(--border)}
.sidebar{background:var(--sb-bg);border-right:1px solid var(--sb-line)}
.sb-item{border-radius:9px}.sb-item.active{background:var(--accent-dim)!important;color:var(--accent)!important;font-weight:700}
.sb-item.active .ic{color:var(--accent)}
/* 버튼 */
.btn{border-radius:8px;box-shadow:0 1px 2px rgba(16,24,40,.08)}.btn-secondary{background:var(--bg-elev);border-color:var(--border-strong);box-shadow:0 1px 2px rgba(16,24,40,.05)}
.btn:hover{filter:brightness(1.04)}.btn-secondary:hover{background:var(--bg-elev2)}
/* 입력칸 */
:where(input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]),select,textarea){border-radius:8px}
/* 진행 막대 */
.m59-bar,.ho-bar,.stg .pbar{background:var(--trk);border-radius:99px}.m59-bar i,.ho-bar i,.stg .pbar i{background:var(--fill)!important;border-radius:99px}
/* 표 */
.m59-t th,.h59-t th,.b57-kv th{background:transparent;color:var(--text-faint)}.m59-t tbody tr:hover td,.h59-t tbody tr:hover td{background:var(--row-h)}
.m59-t td,.h59-t td{border-color:var(--border)}
`;document.head.appendChild(st)})();
// 실적관리(주간보고·경영보고) 프레임에도 같은 카드 그림자
{const _sk59=erpSkin;erpSkin=function(){const r=_sk59.apply(this,arguments);try{const doc=$("erpFrame").contentDocument;if(!doc||!doc.head)return r;let s=doc.getElementById("skin59");if(!s){s=doc.createElement("style");s.id="skin59";doc.head.appendChild(s)}
 s.textContent=`.card,.panel,.box{border-color:transparent!important;border-radius:12px!important;box-shadow:0 0 0 1px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.05),0 6px 16px -4px rgba(16,24,40,.08)}
:root[data-theme=dark] .card,:root[data-theme=dark] .panel,:root[data-theme=dark] .box{border-color:rgba(255,255,255,.06)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 1px 2px rgba(0,0,0,.45),0 8px 24px -6px rgba(0,0,0,.6)}
@media print{.card,.panel,.box{box-shadow:none!important;border-color:#ccc!important}}`}catch(e){}return r}}

// ===================== v59h (2026-11-18): 카드 경계 명확하게 — 바깥 카드 · 안쪽 상자 · 칸(타일) 3단계 면 =====================
// 다크에서 카드 안 카드가 같은 바탕·흐린 선이라 구분이 안 되던 문제 (건호 피드백) → 단계마다 바탕을 한 칸씩 밝게 + 선을 또렷하게
(()=>{const st=document.createElement("style");st.id="skin59h";st.textContent=`
:root{--border:#e2e6ed;--border-strong:#d5dae3;--bd-card:rgba(16,24,40,.10);--bg-inner:#f7f9fb;--bd-inner:#e2e6ed;--bg-tile:#ffffff;--bd-tile:#dfe4eb;
 --shadow:0 0 0 1px rgba(16,24,40,.09),0 1px 2px rgba(16,24,40,.05),0 6px 16px -4px rgba(16,24,40,.08);
 --shadow-h:0 0 0 1px rgba(16,24,40,.12),0 4px 8px rgba(16,24,40,.06),0 18px 32px -8px rgba(16,24,40,.18)}
:root[data-theme="dark"]{--border:#272d3c;--border-strong:#333a4c;--card-bd:rgba(255,255,255,.10);--bd-card:rgba(255,255,255,.10);--bg-inner:#1b2030;--bd-inner:rgba(255,255,255,.10);--bg-tile:#232a3b;--bd-tile:rgba(255,255,255,.12);
 --shadow:inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px rgba(255,255,255,.07),0 8px 24px -6px rgba(0,0,0,.6);
 --shadow-h:inset 0 1px 0 rgba(255,255,255,.08),0 0 0 1px rgba(255,255,255,.12),0 20px 40px -10px rgba(0,0,0,.75)}
/* 카드 안의 카드 = 안쪽 상자: 그림자 없이 한 칸 다른 바탕 + 또렷한 선 */
:is(.panel,.hl-box,.tgrp,.pf-box,.rx-c,.fm-ed,.td-box,.h18-c,.s59-l,.modal) :is(.panel,.hl-box,.tgrp,.pf-box,.rx-c,.td-box,.h18-c,.sk24,.stat,.pcard,.lg-it,.s59-l,.m59-lane,.f59,.bz57-m>div,.st59-s li,.g59s li){box-shadow:none!important;background:var(--bg-inner)!important;border:1px solid var(--bd-inner)!important}
.m59-lane{background:var(--bg-inner)!important;border:1px solid var(--bd-inner)!important;border-top:3px solid var(--c)!important;box-shadow:none!important}
/* 안쪽 상자 안의 칸 = 타일: 다시 한 칸 다른 바탕 + 선 */
.m59-st button{background:var(--bg-tile)!important;border:1px solid var(--bd-tile)!important;border-radius:9px}
.m59-st button:hover{outline:2px solid var(--c);outline-offset:-1px}
.f59>div{border-color:var(--bd-inner)!important}
.s59{border-top:1px solid var(--bd-inner)!important}.s59.on>.s59-h{background:var(--bg-tile)}
.st59-s li,.g59s li{background:var(--bg-tile)!important;border:1px solid var(--bd-tile)!important}
.st59-s li.cur,.g59s li.cur{border-color:var(--c,var(--accent))!important}
/* 바깥 카드 (화면 바탕 위) */
.panel,.hl-box,.tgrp,.pc2,.fm-card,.fm-ed,.td-box,.h18-c,.pf-box,.rx-c,.stat,.pcard,.kcard,.lg-it,.sk24,.m59-k,.st59,.h57-ban,.modal{border:1px solid var(--card-bd)}
.panel.bz57{border-left:3px solid #7c3aed!important}.st59,.h57-ban{border-left:4px solid var(--c)!important}
/* 카드 안 구분선 · 표 줄 */
.m59-u,.m59-i{border-top-color:var(--bd-inner)!important}.m59-t td,.h59-t td,.b57-t td,.b57-kv td,.b57-kv th{border-color:var(--bd-inner)!important}
.m59-t th,.h59-t th{border-color:var(--bd-inner)!important;background:var(--bg-inner)!important}
`;document.head.appendChild(st)})();

// ===================== v59i (2026-11-18): 카드 색 띠 전부 제거 — 모든 카드 같은 모양 (건호 피드백: 어떤 카드는 띠가 있고 어떤 카드는 없어 통일 안 됨) =====================
// 팀·상태 구분은 띠 대신 카드 안의 색 글씨·태그로 (사업 흐름 팀 이름 색, 구간 태그 등은 그대로)
const NOSTRIPE59=`
.panel,.bz57,.panel.bz57,.h57-ban,.st59,.pcard.partner,.lg-it.wait,.ps22-info{border-left:1px solid var(--card-bd)!important}
.pp51-t,.rs35d,.sc24-c.all,.sc24-sub,.cl-banner,.t59-sel{border-left:1px solid var(--border)!important}
.m59-lane,.h57-k,.kp36 .k36,.kp36 .k36.bad,.kp36 .k36.good,.kp36 .k36.warn{border-top:1px solid var(--bd-inner,var(--border))!important}
.sk24::before,.stage-tile::before,.sk::before{display:none!important}
.kcard,.kcard.compact{border-left:1px solid var(--card-bd)!important}.pcard.vg46-card{border-top:1px solid var(--card-bd)!important}.pp51-st{border-top:1px solid var(--border)!important}
.sk24{padding-left:12px}`;
(()=>{const st=document.createElement("style");st.id="skin59i";st.textContent=NOSTRIPE59;document.head.appendChild(st)})();
// 실적관리(주간보고·경영보고) 프레임: STEP 카드·안내 상자·숫자 칸 띠도 제거
{const _sk59i=erpSkin;erpSkin=function(){const r=_sk59i.apply(this,arguments);try{const doc=$("erpFrame").contentDocument;if(!doc||!doc.head)return r;let s=doc.getElementById("skin59i");if(!s){s=doc.createElement("style");s.id="skin59i";doc.head.appendChild(s)}
 s.textContent=`.step,.step.ok,.step.warn,.step.err,.ins,.rm34h,.rs35b,.rs35d{border-left:1px solid var(--line)!important}.pc{border-top:1px solid var(--line)!important}.kpi::before,.sk::before{display:none!important}`}catch(e){}return r}}
try{erpSkin()}catch(e){}

})();
// ===================== 정리안 규칙 전 화면 (2026-11-18) =====================
// 홈 사업부 현황에서 확정한 규칙을 모든 표·제목에 적용: 표 제목줄(칠한 바탕·진한 굵은 글씨·가운데) · 줄/열 구분선 · 숫자 오른쪽 정렬(자동 판별)
// · 긴 설명 문구(40자 이상, 글자만 있는 것) → '?' 툴팁 · 다크에서 팀·단계 칩 밝게
(function(){
const css=`
:root{--tbl-line:#d7dde6;--tbl-vline:#e7ebf1;--tbl-head:#e6ecf4;--tbl-head-tx:#0f172a;--tbl-head-line:#c3cbd7}
:root[data-theme="dark"]{--tbl-line:rgba(255,255,255,.12);--tbl-vline:rgba(255,255,255,.06);--tbl-head:#2a3247;--tbl-head-tx:#f1f4fa;--tbl-head-line:rgba(255,255,255,.22)}
.q59{display:inline-grid;place-items:center;flex:0 0 auto;width:17px;height:17px;border-radius:50%;border:1px solid var(--border-strong);font-size:10.5px;font-weight:700;font-style:normal;color:var(--text-faint);cursor:help;vertical-align:middle;margin-left:6px;line-height:1}
.q59:hover{color:var(--accent);border-color:var(--accent)}
/* 표: 제목줄 */
.main table:not(.m59-t) :is(thead th,tr.hd59>th){background:var(--tbl-head)!important;color:var(--tbl-head-tx)!important;font-size:13px!important;font-weight:800!important;text-align:center!important;border-bottom:2px solid var(--tbl-head-line)!important;padding-top:9px;padding-bottom:9px}
/* 표: 줄·열 구분선 · 글자 크기 */
.main table:not(.m59-t):not(.b57-kv) td{border-bottom:1px solid var(--tbl-line)}
.main table:not(.m59-t) td{font-size:13.5px}
.main table:not(.m59-t):not(.b57-kv) :is(thead th,tr.hd59>th)+:is(th){border-left:1px solid color-mix(in srgb,var(--tbl-head-line) 55%,transparent)}
.main table:not(.m59-t):not(.b57-kv) td+td{border-left:1px solid var(--tbl-vline)}
.main table:not(.m59-t) tbody tr:hover>td{background:var(--row-h)}
/* 숫자 칸 (자동 판별) = 오른쪽 · 자릿수 맞춤 */
td.num59{text-align:right!important;font-variant-numeric:tabular-nums;white-space:nowrap}
/* 칸·표 이름표 (세로 제목: 사업 개요 등) */
.main .b57-kv th{color:var(--tbl-head-tx);font-weight:700;background:var(--tbl-head)!important}
/* 다크: 팀·단계 칩 밝게 */
:root[data-theme="dark"] :is(.ph57,.t57-t,.m59-tm,.ho59){color:color-mix(in srgb,var(--c,var(--accent)) 55%,#fff)}
/* 인쇄·미리보기 종이(흰 바탕)는 제외 */
:is(.pp50,.bp57,.bg23-paper,#printSheet) table :is(th,td){background:initial;color:inherit}
`;
const st=document.createElement("style");st.id="ui-rules";st.textContent=css;document.head.appendChild(st);
// 실적관리(주간보고·경영보고) 프레임: 제목줄 진하게 · 칠한 바탕 · 다크 격자선
{const _sk=erpSkin;erpSkin=function(){const r=_sk.apply(this,arguments);try{const doc=$("erpFrame").contentDocument;if(!doc||!doc.head)return r;let s=doc.getElementById("ui-rules");if(!s){s=doc.createElement("style");s.id="ui-rules";doc.head.appendChild(s)}
 s.textContent=`:root{--th:#e6ecf4}:root[data-theme=dark]{--th:#2a3247;--grid:rgba(255,255,255,.13);--grid2:rgba(255,255,255,.24)}
table.t th{color:var(--text)!important;font-weight:800!important;font-size:12.5px!important}
table.t td{font-size:13px}
@media print{:root,:root[data-theme]{--th:#eef1f5}}`}catch(e){}return r}}
try{erpSkin()}catch(e){}
// 화면이 바뀔 때마다: 제목줄 표시 · 숫자 칸 판별 · 긴 설명 → ?
const NUM=/^[-+−]?\(?[\d,]+(\.\d+)?\)?\s*(억|억원|원|만|만원|%|%p|건|곳|개|명|일|kW|kWp|MW|회|차)?$/;
function pass(root){
 root.querySelectorAll("table:not([data-u59])").forEach(t=>{t.dataset.u59=1;if(!t.tHead){const tr=t.rows[0];if(tr&&tr.cells.length>1&&[...tr.cells].every(c=>c.tagName==="TH"))tr.classList.add("hd59")}});
 root.querySelectorAll("td:not([data-u59])").forEach(td=>{td.dataset.u59=1;if(td.querySelector(":scope>.hl-bar")){td.classList.add("bar60");[...td.childNodes].forEach(n=>{if(n.nodeType===3&&n.textContent.trim()){const sp=document.createElement("span");sp.className="pc60";sp.textContent=n.textContent.trim();n.replaceWith(sp)}});return}if(td.children.length>1)return;const x=td.textContent.trim();if(x&&x!=="-"&&NUM.test(x))td.classList.add("num59")});
 root.querySelectorAll(".panel .hint:not([data-u59]),.pf-box h4 .hint:not([data-u59]),.hl-box .hint:not([data-u59]),.bz57-h .hint:not([data-u59]),.m59-h .hint:not([data-u59])").forEach(h=>{h.dataset.u59=1;
  if(h.children.length||h.closest("td,li,label,button,.modal-actions,.s59-b,.form-row"))return;const x=h.textContent.trim();if(x.length<40)return;
  if(h.tagName!=="SPAN")return;const head=h.parentElement,rest=head?head.textContent.trim().length-x.length:0;if(!head||rest<2||rest>60)return;if(!/^H[1-6]$/.test(head.tagName)&&!head.querySelector(":scope > b,:scope > strong,:scope > h2,:scope > h3,:scope > h4")&&![...head.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;// 제목 줄 옆 설명만 (본문 문단은 그대로)
  const q=document.createElement("span");q.className="q59";q.textContent="?";q.title=x;h.replaceWith(q)})}
const run=()=>{try{pass(document.querySelector(".main")||document.body)}catch(e){console.error("[ui]",e)}};// 그리기 직전 (마이크로태스크) — 늦게 적용하면 표가 한 번 움직여 보임
new MutationObserver(run).observe(document.body,{childList:true,subtree:true});run();
})();
// ===================== 실무 화면도 사업부 현황과 같은 모양 (2026-11-18 v60b) =====================
// 숫자 칸 4종(.hl-kpi .k · .stat · .sk24 · .kpi) = 색 아이콘 블록 + 옅은 색조 + 28px 숫자 · 카드 제목 15.5px + 개수는 오른쪽 둥근 칩
// 막대 6종 = 같은 7px 둥근 막대 + 0%도 보이는 바탕 · 일자 칸 줄바꿈 금지
(function(){
const css=`
:root{--trk:#e3e8ef;--trk-bd:rgba(16,24,40,.06)}
:root[data-theme="dark"]{--trk:rgba(255,255,255,.10);--trk-bd:rgba(255,255,255,.08)}
/* 숫자 칸 */
:is(.hl-kpi .k,.pf-kpi .k,.stat,.sk24,.main .kpi){background:color-mix(in srgb,var(--tc,var(--accent)) 5%,var(--bg-elev))!important;padding:14px 16px!important;border-radius:12px!important;display:flex;flex-direction:column;gap:2px;min-width:0}
:is(.hl-kpi .k>.l,.pf-kpi .k>.l,.stat>.label,.sk24>.l,.main .kpi>.k){display:flex;align-items:center;font-size:12.5px!important;font-weight:600!important;color:var(--text-dim)!important;letter-spacing:0;text-transform:none}
:is(.hl-kpi .k>.v,.pf-kpi .k>.v,.stat>.value,.sk24>.v,.main .kpi>.v){font-size:28px!important;font-weight:800!important;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin-top:8px;line-height:1.15}
:is(.hl-kpi .k>.s,.pf-kpi .k>.s,.sk24>.s,.main .kpi>.s){font-size:12px!important;color:var(--text-dim)!important;line-height:1.45}
.ic59{flex:0 0 26px;width:26px;height:26px;border-radius:8px;display:inline-grid;place-items:center;background:var(--tc,var(--accent));color:#fff;font-style:normal;font-size:13px;font-weight:800;box-shadow:0 4px 10px -3px color-mix(in srgb,var(--tc,var(--accent)) 70%,transparent);margin-right:9px}
/* 카드 제목 · 개수 칩 */
.td-box>.h{display:flex;align-items:center;gap:8px;font-size:15px!important;font-weight:800!important;color:var(--text);margin-bottom:8px}
.td-box>.h>b{margin-left:auto;min-width:28px;height:24px;padding:0 9px;border-radius:99px;background:var(--bg-elev2);border:1px solid var(--border);display:inline-grid;place-items:center;font-size:13px!important;font-weight:800;font-variant-numeric:tabular-nums}
:is(.pf-box>h4,.pg-ch>b,.rx-h>b){font-size:15.5px!important;font-weight:800!important;color:var(--text)}
/* 막대 */
:is(.hl-bar,.pbar,.kb36,.bl38b,.ho-bar,.m59-bar){height:7px!important;border-radius:99px!important;background:var(--trk)!important;box-shadow:inset 0 0 0 1px var(--trk-bd);overflow:hidden}
:is(.hl-bar,.pbar,.kb36,.bl38b,.ho-bar,.m59-bar)>i{border-radius:99px!important;height:100%}
:is(.hl-bar,.kb36,.bl38b,.ho-bar,.m59-bar)>i:not([style*="background"]){background:var(--fill)!important}
/* 일자 칸 */
td.dt59{white-space:nowrap;text-align:center;font-variant-numeric:tabular-nums}td.sh59{white-space:nowrap}
.hl-box>.sec-h{font-size:15.5px!important;font-weight:800!important;color:var(--text);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
`;
const st=document.createElement("style");st.id="ui-rules-b";st.textContent=css;document.head.appendChild(st);
const IC=[[/미수|연체|지연|마감 지남|긴급|재계획|초과/,"!","#dc2626"],[/수주/,"★","#d97706"],[/매출/,"↗","#4f46e5"],[/수금|입금/,"₩","#16a34a"],[/잔고|잔액/,"◫","#0e9fb8"],[/기성|청구|계산서/,"₩","#0e9fb8"],[/현장|건수/,"▣","#2f6fed"],[/계약/,"◫","#0e9fb8"],[/마진|원가율|이익|률|%/,"%","#7c3aed"],[/Task|할 일|업무/,"☑","#2f6fed"],[/일정|마일스톤|예정/,"▦","#0891b2"],[/발전소|O&M|점검|보증|AS/,"⚙","#0f8a7e"],[/업체|협력|파트너/,"☷","#64748b"],[/공정|CPI|SPI/,"◔","#4f46e5"]];
const DATE=/^(\d{4}-)?\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}$/;
function deco(root){
 root.querySelectorAll(".hl-kpi .k:not([data-i60]),.pf-kpi .k:not([data-i60]),.stat:not([data-i60]),.sk24:not([data-i60]),.main .kpi:not([data-i60])").forEach(k=>{k.dataset.i60=1;const lb=k.querySelector(":scope>.l,:scope>.label,:scope>.k");if(!lb||lb.querySelector(".ic59"))return;const t=lb.textContent;const m=IC.find(x=>x[0].test(t))||[0,"•","#2f6fed"];k.style.setProperty("--tc",m[2]);lb.insertAdjacentHTML("afterbegin",`<i class="ic59" aria-hidden="true">${m[1]}</i>`)});
 root.querySelectorAll("td:not([data-d60])").forEach(td=>{td.dataset.d60=1;if(td.children.length)return;const x=td.textContent.trim();if(DATE.test(x))td.classList.add("dt59");else if(x.length&&x.length<=5&&!/s/.test(x))td.classList.add("sh59")})}
// 화면이 그려질 때 바로 (그린 뒤 늦게 바꾸면 테마 전환 때 표가 한 번 움직여 보임)
new MutationObserver(()=>{try{deco(document.querySelector(".main")||document.body)}catch(e){}}).observe(document.body,{childList:true,subtree:true});
try{deco(document.querySelector(".main")||document.body)}catch(e){}
})();
// ===================== 실적관리 프레임(주간보고·경영보고)도 같은 숫자 칸·막대 (v60c) =====================
(function(){
const IC=[[/미수|연체|지연|초과/,"!","#dc2626"],[/수주/,"★","#d97706"],[/매출/,"↗","#4f46e5"],[/수금|입금/,"₩","#16a34a"],[/잔고|잔액/,"◫","#0e9fb8"],[/기성|청구|계산서/,"₩","#0e9fb8"],[/현장|건수/,"▣","#2f6fed"],[/계약/,"◫","#0e9fb8"],[/마진|원가율|이익|률|%/,"%","#7c3aed"],[/공정|RAG/,"◔","#4f46e5"]];
const css=`.kpi{background:color-mix(in srgb,var(--tc,var(--brand)) 5%,var(--card))!important;padding:14px 16px!important;border-radius:12px!important}
.kpi::before{display:none!important}
.kpi>.k,.kpi>.l{display:flex;align-items:center;font-size:12.5px!important;font-weight:600!important;color:var(--sub)!important}
.kpi>.v{font-size:28px!important;font-weight:800!important;letter-spacing:-.03em;font-variant-numeric:tabular-nums;margin-top:8px}
.kpi>.s{font-size:12px!important}
.ic59{flex:0 0 26px;width:26px;height:26px;border-radius:8px;display:inline-grid;place-items:center;background:var(--tc,var(--brand));color:#fff;font-style:normal;font-size:13px;font-weight:800;box-shadow:0 4px 10px -3px color-mix(in srgb,var(--tc,var(--brand)) 70%,transparent);margin-right:9px}
.kpi{background:var(--card)!important}.ic59{background:color-mix(in srgb,currentColor 13%,transparent)!important;color:inherit!important;box-shadow:none!important}
@media print{.ic59{display:none}.kpi{background:#fff!important}}`;
function deco(doc){doc.querySelectorAll(".kpi:not([data-i60])").forEach(k=>{k.dataset.i60=1;const lb=k.querySelector(":scope>.k,:scope>.l");if(!lb||lb.querySelector(".ic59"))return;const m=IC.find(x=>x[0].test(lb.textContent))||[0,"•","#2f6fed"];k.style.setProperty("--tc",m[2]);lb.insertAdjacentHTML("afterbegin",`<i class="ic59" aria-hidden="true">${m[1]}</i>`)})}
const _sk=erpSkin;erpSkin=function(){const r=_sk.apply(this,arguments);try{const doc=$("erpFrame").contentDocument;if(!doc||!doc.head)return r;let s=doc.getElementById("ui-kpi");if(!s){s=doc.createElement("style");s.id="ui-kpi";doc.head.appendChild(s);new MutationObserver(()=>{try{deco(doc)}catch(e){}}).observe(doc.body,{childList:true,subtree:true})}s.textContent=css;deco(doc)}catch(e){}return r};
try{erpSkin()}catch(e){}
})();
// ===================== 현장·협력사 카드 · 막대 칸 · 다크 막대 (v60d) =====================
(function(){const st=document.createElement("style");st.id="ui-cards";st.textContent=`
/* 막대 칸: 막대는 왼쪽부터 같은 길이 · % 는 오른쪽 고정 폭 */
td.bar60{text-align:left!important;white-space:nowrap}
td.bar60>.hl-bar{display:inline-block!important;vertical-align:middle;width:calc(100% - 50px)!important;min-width:40px}
.pc60{display:inline-block;width:44px;text-align:right;vertical-align:middle;font-weight:700;font-variant-numeric:tabular-nums}
/* 다크 막대 더 또렷하게 */
:root[data-theme="dark"]{--trk:rgba(255,255,255,.17);--trk-bd:rgba(255,255,255,.14);--fill:linear-gradient(90deg,#5b8dff,#a9c4ff)}
:root[data-theme="dark"] :is(.hl-bar,.pbar,.kb36,.bl38b,.ho-bar,.m59-bar)>i{box-shadow:0 0 8px rgba(107,155,255,.55)}
/* 현장 카드 */
.pc2{padding:16px!important;gap:10px!important}
.pc2 .hd{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pc2 .hd>span:not(:empty){border-radius:99px!important;font-size:11.5px!important;font-weight:700!important;padding:2px 9px!important;line-height:1.5}
.pc2 .hd .tg{background:var(--bg-tile)!important;border:1px solid var(--bd-tile)!important;color:var(--text-dim)!important}
.pc2 .nm{font-size:15.5px!important;font-weight:800!important;line-height:1.35;color:var(--text)}
.pc2 .sub{font-size:12.5px!important;color:var(--text-dim)!important;margin-top:2px}
.pc2 .kv3{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px!important;border:0!important;padding:0!important;background:none!important}
.pc2 .kv3>div{background:var(--bg-tile)!important;border:1px solid var(--bd-tile)!important;border-radius:9px;padding:8px 10px!important;min-width:0}
.pc2 .kv3 .l{font-size:11.5px!important;color:var(--text-dim)!important;line-height:1.35;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:keep-all}
.pc2 .kv3>div::before,.pc2 .kv3>div::after{display:none!important}.pc2 .kv3 .l,.pc2 .kv3 .v{border:0!important;padding:0!important}.pc2 .kv3>div{border-left:1px solid var(--bd-tile)!important;border-right:1px solid var(--bd-tile)!important}
.pc2 .kv3 .v{font-size:15px!important;font-weight:800!important;font-variant-numeric:tabular-nums;margin-top:3px;line-height:1.3;overflow-wrap:anywhere}.pc2 .kv3 .v span{display:block;font-size:11.5px!important}
.pc2 .stg{display:flex!important;align-items:center;gap:8px;font-size:13px}
.pc2 .stg>b{flex:0 0 auto;padding:2px 10px;border-radius:99px;background:var(--accent-dim);color:var(--accent);font-size:12px;font-weight:800;white-space:nowrap}
.pc2 .stg .pbar{flex:1 1 auto;min-width:40px}
.pc2 .stg>span:not(.pbar):not(.hint){font-weight:800;font-variant-numeric:tabular-nums}
.pc2 .ln{font-size:12.5px!important;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc2 .ft{border-top:1px solid var(--bd-inner)!important;padding-top:8px!important;margin-top:2px;display:flex;flex-direction:column;gap:2px}
/* 협력사(발주처·시공·설계·기자재) 카드 */
.vg46-card{padding:16px!important}
.vg46-card .vg46-k{border-radius:99px!important;font-size:11.5px!important;font-weight:800!important;padding:2px 10px!important;background:color-mix(in srgb,currentColor 12%,transparent)!important;border-color:transparent!important}
.vg46-card .title{font-size:15.5px!important;font-weight:800!important;margin-top:6px;color:var(--text)}
.vg46-card .meta{font-size:12.5px!important;color:var(--text-dim)!important}
.vg46-card .st{border-radius:99px!important;font-size:11.5px!important;font-weight:700!important;padding:2px 9px!important;border-color:transparent!important}
:root[data-theme="dark"] .pc2 .hd>span:not(:empty):not(.tg){filter:brightness(1.25) saturate(1.1)}
`;document.head.appendChild(st)})();
// ===================== 화면 배경 선택 (2026-11-18 v60e) — 기본 단색 · 5안(은은한 빛) · 2안(컬러 그라데이션) =====================
// 카드·표·글자는 그대로, 화면 바탕만. 개인 설정(이 브라우저만). 상단 바 [배경] 버튼
(function(){
const st=document.createElement("style");st.id="ui-bg";st.textContent=`
html[data-bg="mix"][data-theme="dark"] body{background:radial-gradient(90% 70% at 50% -15%,rgba(79,134,255,.42),transparent 72%),radial-gradient(65% 80% at 0% 100%,rgba(99,102,241,.34),transparent 72%),radial-gradient(60% 75% at 100% 40%,rgba(45,212,191,.22),transparent 72%),radial-gradient(55% 55% at 8% 18%,rgba(79,134,255,.24),transparent 72%),radial-gradient(60% 60% at 75% 100%,rgba(139,92,246,.18),transparent 72%),#0a0d16!important;background-attachment:fixed!important}
html[data-bg="5"][data-theme="dark"] body{background:radial-gradient(1000px 360px at 50% -100px,rgba(79,134,255,.20),transparent 70%),radial-gradient(520px 420px at 0 0,rgba(79,134,255,.14),transparent 70%),radial-gradient(800px 300px at 100% 0,rgba(45,212,191,.08),transparent 70%),#07080c!important;background-attachment:fixed!important}
html[data-bg="mix"]:not([data-theme="dark"]) body{background:radial-gradient(at 10% 15%,#d2e0fc 0,transparent 45%),radial-gradient(at 92% 8%,#d4f1ec 0,transparent 42%),radial-gradient(at 70% 95%,#e6def9 0,transparent 48%),radial-gradient(at 35% 70%,#e3eefb 0,transparent 40%),#f0f3f8;background-attachment:fixed}
html[data-bg="5"] body{background:radial-gradient(900px 320px at 50% -80px,rgba(47,111,237,.13),transparent 70%),radial-gradient(700px 260px at 100% 0,rgba(34,184,207,.07),transparent 70%),#f5f6fa;background-attachment:fixed}
html[data-bg="5"][data-theme="dark"] body{background:radial-gradient(1000px 360px at 50% -100px,rgba(79,134,255,.20),transparent 70%),radial-gradient(800px 300px at 100% 0,rgba(45,212,191,.08),transparent 70%),#07080c;background-attachment:fixed}
html[data-bg="2"] body{background:radial-gradient(at 10% 15%,#d2e0fc 0,transparent 45%),radial-gradient(at 92% 8%,#d4f1ec 0,transparent 42%),radial-gradient(at 70% 95%,#e6def9 0,transparent 48%),radial-gradient(at 35% 70%,#e3eefb 0,transparent 40%),#f0f3f8;background-attachment:fixed}
html[data-bg="2"][data-theme="dark"] body{background:radial-gradient(at 8% 12%,rgba(37,84,214,.55) 0,transparent 45%),radial-gradient(at 95% 10%,rgba(13,148,136,.40) 0,transparent 42%),radial-gradient(at 70% 100%,rgba(109,40,217,.45) 0,transparent 50%),#060a15;background-attachment:fixed}
html[data-bg] .main{background:transparent!important}
html[data-bg] .sidebar{background:color-mix(in srgb,var(--sb-bg) 55%,transparent)!important;backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border-right-color:color-mix(in srgb,var(--sb-line) 70%,transparent)!important}
html[data-bg] .sidebar :is(.sb-brand,.sb-today,.sb-group,.sb-nav,.sb-grp,.sb-collapse,.sb-item:not(.active)){background-color:transparent!important}
html[data-bg] .sb-item:not(.active):hover{background:color-mix(in srgb,var(--text) 6%,transparent)!important}
html[data-bg] .layout,html[data-bg] .main{background:transparent!important}
html[data-bg] .topbar{background:color-mix(in srgb,var(--bg-elev) 55%,transparent)!important;backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%)}
html[data-bg] #tab-erp,html[data-bg] .erp-frame{background:transparent!important}
.bg60m{position:absolute;right:0;top:calc(100% + 6px);z-index:60;min-width:230px;padding:6px;border-radius:12px;background:var(--bg-elev);box-shadow:var(--shadow-h);display:none}
.bg60m.on{display:block}.bg60m button{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;font-size:13px}
.bg60m button:hover{background:var(--bg-elev2)}.bg60m button.on{background:var(--accent-dim);color:var(--accent);font-weight:700}
.bg60m i{flex:0 0 34px;height:22px;border-radius:6px;border:1px solid var(--border)}
`;document.head.appendChild(st);
const OPT=[["mix","자동 · 화이트 2안 / 다크 5안","background:linear-gradient(90deg,#c4d6ff 50%,#0b1328 50%)"],["","기본 (단색)","background:var(--bg)"],["5","5안 · 은은한 빛","background:radial-gradient(40px 14px at 50% 0,rgba(47,111,237,.45),transparent),var(--bg)"],["2","2안 · 컬러 그라데이션","background:radial-gradient(at 10% 20%,#9dbcff,transparent 60%),radial-gradient(at 90% 10%,#9fe6da,transparent 60%),radial-gradient(at 70% 100%,#c9b6ff,transparent 60%),#eef2f8"]];
let bg="mix";try{const v=localStorage.getItem("epc-bg61");if(v!==null)bg=v}catch(e){}// 기본값 = 혼합 (키를 바꿔 이전 선택은 초기화)
function apply(){const H=document.documentElement;if(bg)H.setAttribute("data-bg",bg);else H.removeAttribute("data-bg");
 try{const doc=$("erpFrame").contentDocument;if(doc&&doc.head){let s=doc.getElementById("ui-bg");if(!s){s=doc.createElement("style");s.id="ui-bg";doc.head.appendChild(s)}s.textContent=bg?"html,body{background:transparent!important}":""}}catch(e){}
 const m=document.getElementById("bg60m");if(m)m.innerHTML=OPT.map(([k,l,sw])=>`<button class="${bg===k?"on":""}" onclick="bg60Set('${k}')"><i style="${sw}"></i>${l}</button>`).join("")}
window.bg60Set=function(k){bg=k;try{localStorage.setItem("epc-bg61",k)}catch(e){}apply();const m=document.getElementById("bg60m");if(m)m.classList.remove("on")};
const tb=document.querySelector(".tb-right");if(tb&&!document.getElementById("bg60b")){const th=document.getElementById("tbTheme");const w=document.createElement("div");w.style.position="relative";w.innerHTML='<button class="tb-icon" id="bg60b" title="화면 배경 (이 브라우저만)">◐</button><div class="bg60m" id="bg60m"></div>';(th||tb.lastElementChild).before(w);
 w.querySelector("#bg60b").onclick=e=>{e.stopPropagation();document.getElementById("bg60m").classList.toggle("on")};document.addEventListener("click",e=>{const m=document.getElementById("bg60m");if(m&&!w.contains(e.target))m.classList.remove("on")})}
const _sk=erpSkin;erpSkin=function(){const r=_sk.apply(this,arguments);try{apply()}catch(e){}return r};
apply();
})();

// 숫자 칸 아이콘 무채색 (2026-11-20) — 칸마다 다른 장식 색을 빼고 회색 한 가지. 색은 상태(주의·지연)에만
(function(){const st=document.createElement("style");st.id="ic62";st.textContent=`
:is(.hl-kpi .k,.pf-kpi .k,.stat,.sk24,.main .kpi,.m59-k){background:var(--bg-elev)!important}
.ic59{background:color-mix(in srgb,currentColor 13%,transparent)!important;color:inherit!important;box-shadow:none!important}
.m59-k:is(.warn,.bad){background:color-mix(in srgb,var(--tc) 7%,var(--bg-elev))!important}
.m59-k:is(.warn,.bad) .ic59{background:var(--tc)!important;color:#fff!important}
`;(document.head||document.documentElement).appendChild(st)})();
