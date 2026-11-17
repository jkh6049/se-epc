/* 기존 대시보드(legacy) ↔ 서버 실시간 동기화
 * - 접속하면 서버 데이터(snap)로 이 브라우저 데이터를 통째로 맞춤 (서버가 정본)
 * - 이후 내가 고친 레코드만 서버로 보내고(SYNC.tick → ops), 다른 사람 수정은 바로 반영
 * - 연결이 끊긴 동안 고친 내용은 보관했다가 다시 연결되면 전송 (새로고침해도 유지)
 * 기존 코드의 전역(SYNC, settings, tpl, ERPDB, renderAll …)을 그대로 사용함 */
(function () {
  if (typeof SYNC === "undefined" || !location.host) return;

  var PKEY = "epc-live-pending";
  var L = { ws: null, ready: false, everReady: false, me: "", users: [], pending: [], bid: 0, retry: 0, lastName: "" };
  try { L.pending = JSON.parse(localStorage.getItem(PKEY) || "[]") || []; } catch (e) { L.pending = []; }
  L.bid = L.pending.reduce(function (m, p) { return Math.max(m, p.b || 0); }, 0);

  function savePending() { try { localStorage.setItem(PKEY, JSON.stringify(L.pending)); } catch (e) {} }
  function myName() { try { return meName() || ""; } catch (e) { return ""; } }
  function raw(o) { try { if (L.ws && L.ws.readyState === 1) L.ws.send(JSON.stringify(o)); } catch (e) {} }

  // ---------- 화면 반영 ----------
  function applyMeta(d) {
    if (!d) return;
    if (d.settings) {
      var keep = {};
      SYNC_PERSONAL.forEach(function (k) { if (k in settings) keep[k] = settings[k]; });
      Object.keys(settings).forEach(function (k) { if (SYNC_PERSONAL.indexOf(k) < 0) delete settings[k]; });
      Object.assign(settings, d.settings, keep);
    }
    if (d.tpl) tpl = d.tpl;
    if (d.erpMeta && ERPDB) ["weeks", "issues", "settings"].forEach(function (k) { if (d.erpMeta[k] != null) ERPDB[k] = d.erpMeta[k]; });
  }

  function finish(erpChanged) {
    SYNC.persist();
    SYNC.muted = true;
    try { erpPersist(); } catch (e) {}
    SYNC.scan(true);
    var f = document.getElementById("erpFrame");
    if (erpChanged && f && f.contentWindow && f.contentWindow.ERPAPP) try { f.contentWindow.ERPAPP.setDB(ERPDB); } catch (e) {}
    try { renderAll(); } catch (e) { console.error("[live] renderAll", e); }
  }

  // 서버 전체 데이터로 교체
  function applySnap(recs) {
    SYNC.muted = true;
    try {
      if (!ERPDB && typeof erpBlank === "function") ERPDB = erpBlank();
      var by = {};
      recs.forEach(function (r) { (by[r.c] = by[r.c] || []).push(r.d); });
      var C = SYNC.cols();
      Object.keys(C).forEach(function (c) {
        var arr = C[c];
        if (!Array.isArray(arr)) return;
        arr.length = 0;
        (by[c] || []).forEach(function (d) { arr.push(d); });
      });
      applyMeta((by.meta || [])[0]);
      finish(true);
    } finally { SYNC.muted = false; }
  }

  // 변경분 반영 (서버가 순서를 정하므로 받은 그대로 적용)
  function applyOps(ops) {
    SYNC.muted = true;
    try {
      var C = SYNC.cols(), erp = false;
      ops.forEach(function (op) {
        if (op.c === "meta") { if (op.op === "put") applyMeta(op.d); return; }
        var arr = C[op.c];
        if (!arr) return;
        if (op.c === "erp") erp = true;
        var i = -1;
        for (var k = 0; k < arr.length; k++) if (arr[k] && String(arr[k].id) === String(op.id)) { i = k; break; }
        if (op.op === "del") { if (i >= 0) arr.splice(i, 1); return; }
        if (i >= 0) arr[i] = op.d; else arr.push(op.d);
      });
      finish(erp);
    } finally { SYNC.muted = false; }
  }

  // ---------- 보내기 ----------
  SYNC.connect({
    send: function (ops) {
      // 첫 서버 데이터를 받기 전에 생긴 변경 = 예전 브라우저 데이터 정리 과정 → 보내지 않음 (서버 데이터를 덮어쓰지 않게)
      if (!L.everReady) return;
      var b = ++L.bid;
      L.pending.push({ b: b, ops: ops });
      savePending();
      if (L.ready) raw({ t: "ops", b: b, ops: ops });
      paint();
    },
  });

  // ---------- 연결 ----------
  function connect() {
    var proto = location.protocol === "https:" ? "wss" : "ws";
    var ws;
    try { ws = new WebSocket(proto + "://" + location.host + "/api/ws"); } catch (e) { return retry(); }
    L.ws = ws;
    ws.onopen = function () { L.retry = 0; L.lastName = myName(); raw({ t: "hello", name: L.lastName }); };
    ws.onmessage = function (e) {
      if (e.data === "pong") return;
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.t === "snap") {
        L.me = m.me;
        applySnap(m.recs || []);
        L.ready = true; L.everReady = true;
        // 끊긴 동안 고친 내용: 내 화면에 다시 적용하고 서버로 재전송
        if (L.pending.length) {
          var all = [];
          L.pending.forEach(function (p) { all = all.concat(p.ops); });
          applyOps(all);
          L.pending.forEach(function (p) { raw({ t: "ops", b: p.b, ops: p.ops }); });
        }
        // 서버 데이터를 받은 뒤에만 돌려야 하는 데이터 맞춤(마이그레이션) — 받기 전 로컬 데이터는 오래됐을 수 있음
        try { if (typeof window.onLiveSnap === "function") window.onLiveSnap(); } catch (x) { console.error("[live] onLiveSnap", x); }
      } else if (m.t === "ack") {
        L.pending = L.pending.filter(function (p) { return p.b !== m.b; });
        savePending();
      } else if (m.t === "ops") {
        applyOps(m.ops || []);
      } else if (m.t === "presence") {
        L.users = m.users || [];
      } else if (m.t === "reload") {
        L.pending = []; savePending();
        raw({ t: "hello", name: myName() });
      }
      paint();
    };
    ws.onclose = function () { L.ready = false; L.ws = null; paint(); retry(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  function retry() {
    var t = Math.min(15000, 1000 * Math.pow(2, L.retry++));
    setTimeout(function () {
      // 로그인(공용 비밀번호)이 풀렸으면 새로고침 → 비밀번호 입력창으로
      fetch("/api/health", { cache: "no-store" }).then(function (r) {
        if (r.status === 401) location.reload(); else connect();
      }, connect);
    }, t);
  }

  // 끊김 감지·이름 변경 반영
  setInterval(function () {
    if (L.ws && L.ws.readyState === 1) {
      try { L.ws.send("ping"); } catch (e) {}
      var n = myName();
      if (n !== L.lastName) { L.lastName = n; raw({ t: "me", name: n }); }
    }
  }, 20000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && (!L.ws || L.ws.readyState > 1)) { L.retry = 0; connect(); }
  });

  // ---------- 상태 표시 (오른쪽 아래) ----------
  var css = document.createElement("style");
  css.textContent =
    "#livePill{position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;" +
    "background:rgba(17,24,39,.88);color:#f9fafb;font:500 12px/1.2 Pretendard,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.18);cursor:default;user-select:none}" +
    "#livePill .dot{width:8px;height:8px;border-radius:50%;background:#9ca3af}#livePill.on .dot{background:#22c55e}#livePill.off .dot{background:#f59e0b}" +
    "#livePill a{color:#93c5fd;text-decoration:none;margin-left:4px}#livePill a:hover{text-decoration:underline}" +
    "#livePop{position:absolute;right:0;bottom:calc(100% + 8px);min-width:180px;padding:10px 12px;border-radius:10px;background:rgba(17,24,39,.95);display:none;line-height:1.7}" +
    "#livePill:hover #livePop{display:block}@media print{#livePill{display:none}}";
  document.head.appendChild(css);
  var pill = document.createElement("div");
  pill.id = "livePill";
  pill.innerHTML = '<span class="dot"></span><span class="txt">연결 중…</span><div id="livePop"></div>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function paint() {
    if (!document.body) return;
    if (!pill.parentNode) document.body.appendChild(pill);
    var wait = L.pending.length;
    pill.className = L.ready ? "on" : "off";
    pill.querySelector(".txt").textContent = L.ready
      ? "실시간 연결 · 접속 " + L.users.length + "명" + (wait ? " · 전송 중" : "")
      : (L.everReady ? "연결 끊김 · 재연결 중" + (wait ? " (미전송 " + wait + "건 보관)" : "") : "서버 연결 중…");
    pill.querySelector("#livePop").innerHTML = L.users.length
      ? "<b>지금 접속 중</b><br>" + L.users.map(function (u) { return esc(u.name || "이름 미설정") + (u.cid === L.me ? " (나)" : ""); }).join("<br>")
      : "접속자 정보 없음";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { paint(); connect(); });
  else { paint(); connect(); }
})();
