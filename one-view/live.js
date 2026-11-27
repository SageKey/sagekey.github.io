// One View — the live page. Fetches the numbers from the API, lets the visitor pick who they are
// signed in as, and sends sample files through the real pipeline.
(function () {
  "use strict";
  var O = window.ONEVIEW, base = O.api + "/api/" + O.tenant, token = null, last = null, files = null, picked = "overcap", lastRun = null;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function track(name, data) { try { window.va && window.va("event", { name: name, data: data || {} }); } catch (e) {} }
  function get(path) { return fetch(base + path, { headers: token ? { Authorization: "Bearer " + token } : {} }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function post(path, body) { return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function load() {
    return get("/view").then(function (v) {
      last = v;
      document.getElementById("asof").textContent = "As of " + v.asOf;
      window.OneView({ live: true, asOf: v.asOf, units: v.units, systems: v.systems, words: v.words, noPlaceholderTag: true,
        sysOverride: function () { return null; }, onRender: afterRender });
      roles(v);
    }).catch(function () {
      document.getElementById("app").innerHTML = '<p class="loading">The demo\'s server did not answer. It may be restarting; try again in a minute.</p>';
    });
  }

  // ---- who you are signed in as: the server decides what each role is sent ----
  function roles(v) {
    var w = v.viewer, g = v.groups, first = g[0];
    var regionSel = '<select id="r-region" aria-label="Region">' + g.map(function (x) { return "<option" + (w.role === "region" && w.scope === x ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>";
    document.getElementById("rolebar").innerHTML =
      '<span class="l">Signed in as</span>' +
      '<button type="button" data-role="company" aria-pressed="' + (w.role === "company") + '">Owner</button>' +
      '<button type="button" data-role="region" aria-pressed="' + (w.role === "region") + '">Regional manager</button>' + (w.role === "region" ? regionSel : "") +
      '<span class="sees">' + (w.role === "company" ? "Sees all " + w.of + " " + v.words.units + "."
        : "The server sent " + w.sees + " of " + w.of + " " + v.words.units + ". The rest never reach this browser.") + " In a real install, your sign-in sets this.</span>";
    function as(role, scope) {
      track("oneview_role", { role: role });
      (role === "company" ? Promise.resolve({ token: null }) : post("/session", { role: role, scope: scope })).then(function (s) {
        token = s.token; location.hash = "#/"; load();
      });
    }
    [].forEach.call(document.querySelectorAll("#rolebar button"), function (b) {
      b.onclick = function () { as(b.getAttribute("data-role"), w.role === "region" ? w.scope : first); };
    });
    var sel = document.getElementById("r-region");
    if (sel) sel.onchange = function () { as("region", sel.value); };
  }

  // ---- send a file through the pipeline ----
  function afterRender() {
    var box = document.getElementById("runbox");
    if (!box) return;
    if (!files) { box.innerHTML = ""; get("/demo/files").then(function (f) { files = f; draw(box); }); return; }
    draw(box);
  }
  function draw(box) {
    var f = files.files.filter(function (x) { return x.key === picked; })[0];
    box.innerHTML = '<div class="run"><h3>Send a file and watch what happens</h3>' +
      '<div class="hint">These are the kind of files the ' + esc(files.site) + " branch sends from " + esc(files.system) + ". Each one goes through the real pipeline and database. The run is then undone, so the next visitor starts clean.</div>" +
      '<div class="run-grid"><div><div class="files">' + files.files.map(function (x) {
        return '<button type="button" data-k="' + x.key + '" aria-pressed="' + (x.key === picked) + '"><b>' + esc(x.title) + "</b><span>" + esc(x.blurb) + "</span></button>"; }).join("") + "</div>" +
      '<div class="raw"><span class="fn">' + esc(f.filename) + "</span>" + esc(f.content) + "</div>" +
      '<button type="button" class="send" id="send">Send this file</button></div>' +
      '<div id="trace"><p class="empty">Pick a file and send it. Each step the pipeline takes will appear here.</p></div></div></div>';
    [].forEach.call(box.querySelectorAll(".files button"), function (b) { b.onclick = function () { picked = b.getAttribute("data-k"); lastRun = null; draw(box); }; });
    document.getElementById("send").onclick = function () { run(box); };
    if (lastRun) show(lastRun, true);
  }
  function run(box) {
    var btn = document.getElementById("send");
    btn.disabled = true; btn.textContent = "Running…";
    track("oneview_run", { file: picked });
    post("/demo/run", { scenario: picked }).then(function (r) { lastRun = r; btn.disabled = false; btn.textContent = "Send it again"; show(r, false); })
      .catch(function (e) { btn.disabled = false; btn.textContent = "Send this file";
        document.getElementById("trace").innerHTML = '<p class="empty">' + (String(e.message) === "429" ? "That's a lot of runs in a minute. Give it a moment." : "The run did not come back. Try again.") + "</p>"; });
  }
  function show(r, instant) {
    var rows = r.trace.map(function (t) {
      if (t.step === "asked") return '<li class="asked bad"><span class="ic">?</span><span><b>Asked: ' + esc(t.owner) + "</b><small>" + esc(t.text) + "</small></span></li>";
      if (t.step === "accepted") return '<li class="done"><span class="ic">✓</span><span><b>Accepted</b><small>' + esc(t.text) + "</small></span></li>";
      var title = t.step === "check" ? t.label : { received: "File received", recognised: "Source recognised", mapped: "Translated to the company's definitions", held: "Held for a person", rejected: "Rejected" }[t.step] || t.step;
      return '<li class="' + (t.bad ? "bad" : "") + '"><span class="ic">' + (t.bad ? "✕" : "✓") + "</span><span><b>" + esc(title) + "</b><small>" + esc(t.text) + "</small></span></li>";
    }).join("");
    var u = r.unit, st = { ok: "Checked today", ask: "Waiting on a person", stale: "No fresh data", manual: "Uploaded by hand" }[u.status];
    document.getElementById("trace").innerHTML = '<ol class="trace">' + rows + "</ol>" +
      '<div class="outcome">' + esc(u.name) + ' would now show <span class="pill p-' + u.status + '">' + st + "</span> on the dashboard. Ran in " + r.ms + " ms, then undone." +
      (r.status !== "accepted" ? ' <button type="button" id="fix">Now send the corrected file ›</button>' : "") + "</div>";
    var li = document.querySelectorAll(".trace li");
    [].forEach.call(li, function (el, i) { if (instant) el.classList.add("in"); else setTimeout(function () { el.classList.add("in"); }, 140 * i); });
    var fix = document.getElementById("fix");
    if (fix) fix.onclick = function () { picked = "good"; lastRun = null; draw(document.getElementById("runbox")); run(); };
  }
  load();
})();
