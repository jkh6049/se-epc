// /admin — 데이터 보호·복원 관리자 화면 (공용 비밀번호로 들어온 뒤, 관리자 비밀번호를 한 번 더 입력)
// 관리자 비밀번호는 이 브라우저 탭에서만 기억 (sessionStorage) · 서버 값은 wrangler secret ADMIN_PASSWORD
export function adminPage(): Response {
  return new Response(HTML, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

const HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>데이터 관리 · SE EPC</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
:root{color-scheme:light;--bg:#f3f4f6;--card:#fff;--line:#d9dce2;--text:#111827;--dim:#6b7280;--accent:#2f6fed;--danger:#d7372f;--ok:#15803d;--warn:#b45309}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0f1014;--card:#1a1c22;--line:#2a2d38;--text:#eceef2;--dim:#8a8f9c;--accent:#5b8dff;--danger:#e85a52;--ok:#4ade80;--warn:#fbbf24}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 "Pretendard","Malgun Gothic",system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:20px 16px 60px}h1{font-size:20px;margin:0 0 2px}.dim{color:var(--dim);font-size:12.5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-top:14px}
.card h2{font-size:15px;margin:0 0 4px;display:flex;align-items:center;gap:8px}.card h2 .dim{font-weight:400}
.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px}.kpi div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.kpi b{display:block;font-size:20px}
button,input,select{font:inherit}button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:7px;padding:6px 12px;cursor:pointer}
button.p{background:var(--accent);border-color:var(--accent);color:#fff}button.d{border-color:var(--danger);color:var(--danger)}button:disabled{opacity:.5;cursor:default}
input[type=text],input[type=password],input[type=datetime-local],input[type=search]{border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:7px;padding:6px 10px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{color:var(--dim);font-weight:600;position:sticky;top:0;background:var(--card)}
.scroll{max-height:420px;overflow:auto}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.tag{display:inline-block;font-size:11.5px;border:1px solid var(--line);border-radius:9px;padding:0 7px;color:var(--dim)}
.ok{color:var(--ok)}.bad{color:var(--danger)}.warn{color:var(--warn)}.mono{font-family:Consolas,monospace;font-size:12px;word-break:break-all}
#gate{max-width:380px;margin:80px auto}.msg{margin-top:8px;font-size:13px}
</style></head><body>
<div id="gate" class="card"><h2>데이터 관리 (관리자)</h2><div class="dim">휴지통 복원 · 백업 · 시점 복구. 관리자 비밀번호가 필요합니다.</div>
<div class="row"><input id="pw" type="password" placeholder="관리자 비밀번호" style="flex:1" onkeydown="if(event.key==='Enter')login()"><button class="p" onclick="login()">확인</button></div><div id="gmsg" class="msg bad"></div></div>
<div id="app" class="wrap" style="display:none">
 <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap"><div><h1>데이터 관리</h1><div class="dim">삭제는 모두 휴지통에 남음 · 대량 삭제는 서버가 차단 · 매일 03:00 자동 백업(60일 보관) · 최근 30일 시점 복구</div></div>
 <span style="margin-left:auto"><a href="/" class="dim">대시보드로</a> · <a href="javascript:void 0" class="dim" onclick="logout()">관리자 로그아웃</a></span></div>
 <div class="kpi" id="kpi"></div>

 <div class="card"><h2>1. 휴지통 <span class="dim">지운 레코드 원본 · 누가·언제 · 180일 보관</span></h2>
  <div class="row"><input id="tq" type="search" placeholder="이름·삭제자·종류 검색" oninput="drawTrash()"><button onclick="loadTrash()">새로고침</button><span class="dim" id="tinfo"></span><span style="margin-left:auto"></span><button class="p" id="tbtn" onclick="undelete()" disabled>선택 복원</button></div>
  <div class="scroll"><table><thead><tr><th style="width:28px"><input type="checkbox" onchange="document.querySelectorAll('.tk').forEach(c=>{c.checked=this.checked});pick()"></th><th>삭제 시각</th><th>삭제자</th><th>종류</th><th>이름</th><th>상태</th></tr></thead><tbody id="tbody"></tbody></table></div></div>

 <div class="card"><h2>2. 백업 <span class="dim">매일 03:00 자동 · 수동 · 복원 직전 자동 보관</span></h2>
  <div class="row"><button onclick="snapNow()">지금 백업</button><button onclick="loadSnaps()">새로고침</button><span class="dim">'이 백업으로 복원' = 서버 전체를 그 시점 백업으로 교체 (직전 상태는 자동으로 백업해 둠)</span></div>
  <div class="scroll"><table><thead><tr><th>시각</th><th>종류</th><th>레코드</th><th>크기</th><th></th></tr></thead><tbody id="sbody"></tbody></table></div></div>

 <div class="card"><h2>3. 시점 복구 <span class="dim">Cloudflare 저장소 기능 · 최근 30일 안의 시각으로 전체 되돌림</span></h2>
  <div class="dim">휴지통·백업 목록까지 그 시각으로 돌아갑니다. 그 이후 입력한 정상 데이터도 함께 사라지므로, 먼저 휴지통 복원이나 백업 복원으로 해결되는지 확인하세요. 실행 후 받는 '되돌리기 북마크'를 보관하면 복구 전 상태로 다시 돌아갈 수 있습니다.</div>
  <div class="row"><input id="pt" type="datetime-local"><input id="pc" type="text" placeholder="확인: 복구 라고 입력" style="width:160px"><button class="d" onclick="pitr()">이 시각으로 복구</button></div>
  <div class="row"><input id="pb" type="text" placeholder="되돌리기 북마크 (복구 취소용)" style="flex:1"><button onclick="pitrBm()">북마크로 되돌리기</button></div>
  <div id="pmsg" class="msg"></div></div>

 <div class="card"><h2>4. 백업 파일로 전체 복원 <span class="dim">/api/export 또는 위 백업에서 받은 JSON</span></h2>
  <div class="row"><input id="ff" type="file" accept=".json,application/json"><button class="d" onclick="seedFile()">이 파일로 전체 교체</button><span class="dim">교체 직전 상태는 자동 백업</span></div><div id="fmsg" class="msg"></div></div>

 <div class="card"><h2>5. 관리 기록 <span class="dim">차단된 대량 삭제 · 복원 · 백업</span></h2><div class="scroll"><table><thead><tr><th>시각</th><th>누가</th><th>구분</th><th>내용</th></tr></thead><tbody id="abody"></tbody></table></div></div>
</div>
<script>
const NM={projects:"현장",ms:"마일스톤",pay:"수금·지급",tasks:"Task",recur:"정기 업무",events:"일정",plants:"O&M 발전소",insp:"점검",as:"AS",vendors:"협력사",logs:"진행사항",docs:"서류",bills:"기성",claims:"클레임",sites:"사이트",weekly:"주간보고",forms:"사내 양식",subs:"용역사",replies:"답글",erp:"실적관리 현장",meta:"설정"};
let PW=sessionStorage.getItem("epc-admin")||"",TR=[];
const $=id=>document.getElementById(id);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const kst=s=>s?new Date(s).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"-";
async function api(path,opt={}){const r=await fetch("/api/admin/"+path,Object.assign({},opt,{headers:Object.assign({"x-admin-password":PW},opt.body&&!(opt.body instanceof Blob)?{"content-type":"application/json"}:{},opt.headers||{})}));
 if(r.status===403){logout();throw new Error("관리자 비밀번호가 맞지 않음")}const ct=r.headers.get("content-type")||"";const j=ct.includes("json")&&!(r.headers.get("content-disposition"))?await r.json():r;if(!r.ok)throw new Error((j&&j.error)||("HTTP "+r.status));return j}
async function login(){PW=$("pw").value;$("gmsg").textContent="";try{await api("status");sessionStorage.setItem("epc-admin",PW);start()}catch(e){$("gmsg").textContent=e.message}}
function logout(){sessionStorage.removeItem("epc-admin");PW="";$("app").style.display="none";$("gate").style.display="block"}
async function start(){$("gate").style.display="none";$("app").style.display="block";loadStatus();loadTrash();loadSnaps();loadAudit()}
async function loadStatus(){const s=await api("status");$("kpi").innerHTML=[["현재 레코드",s.records.toLocaleString()],["접속 중",s.online+"명"],["휴지통",s.trash.toLocaleString()+"건"],["백업",s.snaps+"개"],["마지막 백업",s.lastSnap?kst(s.lastSnap.at):"없음"],["7일간 차단된 대량 삭제",s.blocked7d+"건"]].map(([l,v])=>'<div><span class="dim">'+l+'</span><b>'+esc(v)+'</b></div>').join("")}
async function loadTrash(){const j=await api("trash");TR=j.rows;drawTrash()}
function drawTrash(){const q=$("tq").value.trim();const L=TR.filter(r=>!q||(r.label+" "+r.delBy+" "+(NM[r.c]||r.c)).includes(q));$("tinfo").textContent=L.length+"건"+(L.length<TR.length?" / 전체 "+TR.length:"");
 $("tbody").innerHTML=L.slice(0,1500).map(r=>'<tr><td><input type="checkbox" class="tk" value="'+r.tid+'" onchange="pick()" '+(r.alive?"disabled":"")+'></td><td>'+kst(r.delAt)+'</td><td>'+esc(r.delBy||"-")+'</td><td><span class="tag">'+esc(NM[r.c]||r.c)+'</span></td><td>'+esc(r.label)+'</td><td>'+(r.alive?'<span class="ok">이미 있음</span>':'<span class="dim">삭제됨</span>')+'</td></tr>').join("")||'<tr><td colspan="6" class="dim">휴지통 비어 있음</td></tr>';pick()}
function pick(){const n=document.querySelectorAll(".tk:checked").length;$("tbtn").disabled=!n;$("tbtn").textContent=n?"선택 복원 ("+n+")":"선택 복원"}
async function undelete(){const tids=[...document.querySelectorAll(".tk:checked")].map(c=>+c.value);if(!tids.length||!confirm(tids.length+"건을 복원할까요? 접속 중인 화면에 바로 반영됩니다."))return;try{const r=await api("undelete",{method:"POST",body:JSON.stringify({tids})});alert(r.restored+"건 복원");loadTrash();loadStatus();loadAudit()}catch(e){alert(e.message)}}
async function loadSnaps(){const j=await api("snaps");const K={daily:"매일 자동",manual:"수동","pre-restore":"복원 직전"};
 $("sbody").innerHTML=j.rows.map(r=>'<tr><td>'+kst(r.at)+'</td><td><span class="tag">'+(K[r.kind]||r.kind)+'</span></td><td>'+Number(r.n).toLocaleString()+'</td><td>'+Math.round(r.size/1024)+' KB</td><td style="text-align:right"><button onclick="dl(\\''+r.sid+'\\')">받기</button> <button class="d" onclick="restoreSnap(\\''+r.sid+'\\',\\''+kst(r.at)+'\\')">이 백업으로 복원</button></td></tr>').join("")||'<tr><td colspan="5" class="dim">백업 없음 · 매일 03:00 자동 생성 (지금 백업으로 바로 만들 수 있음)</td></tr>'}
async function snapNow(){try{const r=await api("snap-now",{method:"POST"});alert("백업 완료 · "+r.n+"건");loadSnaps();loadStatus();loadAudit()}catch(e){alert(e.message)}}
async function dl(sid){try{const r=await api("snap?sid="+encodeURIComponent(sid));const b=await r.blob();const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="epc-backup-"+sid.slice(0,16).replace(/[:T-]/g,"")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}catch(e){alert(e.message)}}
async function restoreSnap(sid,label){if(prompt(label+" 백업으로 서버 전체를 교체합니다.\\n그 이후 입력한 내용은 사라집니다 (직전 상태는 자동 백업).\\n진행하려면 '복원' 이라고 입력")!=="복원")return;try{const r=await api("restore-snap",{method:"POST",body:JSON.stringify({sid})});alert("복원 완료 · "+r.records+"건 · 접속 중인 화면은 자동 새로고침");loadStatus();loadSnaps();loadTrash();loadAudit()}catch(e){alert(e.message)}}
async function pitr(){const v=$("pt").value;if(!v){alert("시각 입력");return}if($("pc").value.trim()!=="복구"){alert("확인 칸에 '복구' 입력");return}const t=new Date(v);if(!confirm(kst(t)+" 시점으로 저장소 전체를 되돌릴까요?"))return;await doPitr({time:t.toISOString()})}
async function pitrBm(){const b=$("pb").value.trim();if(!b){alert("북마크 입력");return}if(!confirm("이 북마크 시점으로 되돌릴까요?"))return;await doPitr({bookmark:b})}
async function doPitr(body){$("pmsg").innerHTML="실행 중…";try{const r=await api("pitr",{method:"POST",body:JSON.stringify(body)});$("pmsg").innerHTML='<span class="ok">요청 완료.</span> 서버가 다시 시작되며 그 시점으로 바뀝니다 (수 초).<br><b>되돌리기 북마크</b> (복구 전 상태로 돌아갈 때 사용 · 꼭 따로 보관): <div class="mono">'+esc(r.undo)+'</div>';$("pb").value=r.undo;setTimeout(()=>{loadStatus();loadTrash();loadSnaps();loadAudit()},4000)}catch(e){$("pmsg").innerHTML='<span class="bad">'+esc(e.message)+'</span>'}}
async function seedFile(){const f=$("ff").files[0];if(!f){alert("파일 선택");return}let j;try{j=JSON.parse(await f.text())}catch(e){alert("JSON 파일이 아님");return}
 const n=["projects","ms","tasks","docs"].map(k=>(NM[k]||k)+" "+((j[k]||[]).length)).join(", ");if(prompt("파일: "+f.name+"\\n"+n+"\\n이 파일로 서버 전체를 교체합니다. 진행하려면 '복원' 이라고 입력")!=="복원")return;
 try{const r=await fetch("/api/seed?force=1",{method:"POST",headers:{"content-type":"application/json","x-admin-password":PW},body:JSON.stringify(j)});const o=await r.json();if(!r.ok)throw new Error(o.error||r.status);$("fmsg").innerHTML='<span class="ok">교체 완료 · '+o.records+'건</span>';loadStatus();loadSnaps();loadAudit()}catch(e){$("fmsg").innerHTML='<span class="bad">'+esc(e.message)+'</span>'}}
async function loadAudit(){const j=await api("audit");$("abody").innerHTML=j.rows.map(r=>'<tr><td>'+kst(r.at)+'</td><td>'+esc(r.who)+'</td><td><span class="tag">'+esc(r.kind)+'</span></td><td>'+esc(r.detail)+'</td></tr>').join("")||'<tr><td colspan="4" class="dim">기록 없음</td></tr>'}
if(PW)api("status").then(start).catch(()=>logout());
</script></body></html>`;
