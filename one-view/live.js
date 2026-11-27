// One View — the live page. A guided demo in three steps, built on numbers fetched from the API.
// The full dashboard (view.js) is still there for anyone who wants to explore: any hash starting "#/".
(function () {
  "use strict";
  var O = window.ONEVIEW, base = O.api + "/api/" + O.tenant, V = null, files = null, picked = "overcap", lastRun = null, branch = "baton-rouge";
  var app = document.getElementById("app"), bar = document.getElementById("guidebar");
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function track(name, data) { try { window.va && window.va("event", { name: name, data: data || {} }); } catch (e) {} }
  function get(path) { return fetch(base + path).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function post(path, body) { return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function pct(x, d) { return (x * 100).toFixed(d || 0) + "%"; }
  function money(k) { return k >= 1000 ? "$" + (k / 1000).toFixed(1) + "m" : "$" + Math.round(k) + "k"; }
  function sum(l, f) { return l.reduce(function (t, x) { return t + f(x); }, 0); }
  var STATUS = { ok: "Checked this morning", ask: "Waiting on a person", stale: "No fresh file", manual: "Uploaded by hand" };
  function pill(st) { return '<span class="pill p-' + st + '">' + STATUS[st] + "</span>"; }
  function signed(v, unit) { return (Math.abs(v) < 0.05 ? "Level" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(1) + unit); }

  // ---------- which screen ----------
  var STEPS = [["1", "The whole company"], ["2", "One branch"], ["3", "Break it"]];
  function where() { var h = location.hash; return h.indexOf("#/") === 0 ? "explore" : ({ "#1": "1", "#2": "2", "#3": "3", "#done": "done" }[h] || "intro"); }
  function go(h) { location.hash = h; }
  function render() {
    if (!V) return;
    var w = where();
    window.scrollTo(0, 0);
    if (w === "explore") {
      bar.innerHTML = '<div class="shell g-explore"><a href="#1">‹ Back to the guided demo</a><span>You are exploring the full dashboard. Click a state, then a branch.</span></div>';
      window.OneView({ live: true, asOf: V.asOf, units: V.units, systems: V.systems, words: V.words, noPlaceholderTag: true, sysOverride: function () { return null; } });
      return;
    }
    window.__route = function () {};                       // the full dashboard stays out of the way while the guide is showing
    document.getElementById("crumbs").innerHTML = "";
    bar.innerHTML = w === "intro" ? "" : '<div class="shell g-prog">' + STEPS.map(function (s) {
      return '<a href="#' + s[0] + '" class="' + (w === s[0] ? "on" : "") + '"><i>' + s[0] + "</i>" + s[1] + "</a>"; }).join('<b aria-hidden="true"></b>') + "</div>";
    ({ intro: intro, "1": step1, "2": step2, "3": step3, done: done })[w]();
    track("oneview_step", { step: w });
  }
  function nav(back, next, label) {
    return '<div class="g-nav">' + (back ? '<a class="g-back" href="' + back + '">‹ Back</a>' : "<span></span>") + '<a class="g-next" href="' + next + '">' + label + " ›</a></div>";
  }

  // ---------- intro ----------
  function intro() {
    var n = V.units.length;
    app.innerHTML = '<div class="g-intro"><div class="who">A two-minute demo</div>' +
      "<h1>" + n + " branches. Three systems. Nobody trusts the monthly numbers.</h1>" +
      '<p class="sub">That is the problem at this made-up distributor. It grew by buying two other companies, so its branches run three different systems, and each one counts things its own way. Here is what fixing that looks like.</p>' +
      '<ol class="g-list">' +
      "<li><i>1</i><div><b>See the whole company on one screen</b><span>Every branch, added up the same way.</span></div></li>" +
      "<li><i>2</i><div><b>Look inside one branch</b><span>Where each of its numbers came from.</span></div></li>" +
      "<li><i>3</i><div><b>Send in a bad file</b><span>And watch it get caught before it reaches the screen.</span></div></li></ol>" +
      '<a class="g-start" href="#1">Start the demo ›</a>' +
      '<p class="g-fine">The company and every figure are made up. The system behind them is real: it reads the files, checks them and stores the results.</p></div>';
  }

  // ---------- step 1: the whole company ----------
  function step1() {
    var U = V.units, enr = sum(U, function (u) { return u.enr; }), cap = sum(U, function (u) { return u.cap; }), bud = sum(U, function (u) { return u.bud; });
    var billed = sum(U, function (u) { return u.billed; }), col = sum(U, function (u) { return u.col * u.billed; }) / billed, overdue = sum(U, function (u) { return u.overdue; });
    var rev = sum(U, function (u) { return u.rev; }), margin = sum(U, function (u) { return u.margin * u.rev; }) / rev, mb = sum(U, function (u) { return u.marginBud * u.rev; }) / rev;
    var tiles = [
      ["Orders shipped this month", num(enr), signed((enr / bud - 1) * 100, "%") + " against plan"],
      ["Orders due that have shipped", pct(enr / cap), num(cap - enr) + " still open"],
      ["Invoices collected", pct(col), money(overdue) + " overdue"],
      ["Gross margin", pct(margin, 1), signed((margin - mb) * 100, " pts") + " against budget"]];
    var rows = V.groups.map(function (g) {
      var l = U.filter(function (u) { return u.country === g; });
      var sys = V.systems[(l.filter(function (u) { return u.sys !== "X"; })[0] || l[0]).sys].name;
      var e = sum(l, function (u) { return u.enr; }), c = sum(l, function (u) { return u.cap; }), x = e / c;
      return "<tr><td class='name'>" + esc(g) + "</td><td>" + esc(sys) + "</td><td class='n hide-s'>" + num(e) + '</td><td><span class="bar ' + (x < 0.78 ? "lo" : x < 0.86 ? "mid" : "") + '"><i style="width:' + (x * 100).toFixed(0) + '%"></i></span>' + pct(x) +
        '</td><td><span class="dots">' + l.map(function (u) { return '<i class="s-' + u.status + '" title="' + esc(u.name) + ": " + STATUS[u.status] + '"></i>'; }).join("") + "</span></td></tr>";
    }).join("");
    var c = { ok: 0, ask: 0, stale: 0, manual: 0 }; U.forEach(function (u) { c[u.status]++; });
    app.innerHTML = '<div class="who">Step 1 of 3</div><h1>The whole company on one screen.</h1>' +
      '<p class="sub">Three systems feed this page, and each exports its numbers in its own format. They are added up here the same way for every branch.</p>' +
      '<div class="tiles">' + tiles.map(function (t) { return '<div class="tile"><div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div><div class="d">' + t[2] + "</div></div>"; }).join("") + "</div>" +
      "<table><tr><th>State</th><th>System</th><th class='n hide-s'>Orders shipped</th><th>Due orders shipped</th><th>Its branches</th></tr>" + rows + "</table>" +
      '<p class="g-key"><b>Each dot is a branch:</b><span class="k-ok">' + c.ok + " checked this morning</span><span class=\"k-ask\">" + c.ask + ' waiting on a person</span><span class="k-stale">' + c.stale + ' with no fresh file</span><span class="k-manual">' + c.manual + " uploaded by hand</span></p>" +
      '<div class="g-notice"><b>What to notice</b>Three different systems, one set of columns. And the page says which branches\' numbers can be trusted today, which most dashboards never do.</div>' +
      nav("#", "#2", "Next: look inside one branch");
  }

  // ---------- step 2: one branch ----------
  var PICKS = [["baton-rouge", "A branch with a problem"], ["dallas", "A healthy branch"], ["pueblo", "A branch gone quiet"], ["lawton", "A branch with no system"]];
  function step2() {
    var u = V.units.filter(function (x) { return x.slug === branch; })[0] || V.units[0], q = u.question;
    var note = q ? '<div class="openq"><b>Its file did not add up, so a person was asked</b><p>' + esc(q.text) + "</p><small>Asked " + (u.askedDays === 0 ? "today" : u.askedDays + " day" + (u.askedDays === 1 ? "" : "s") + " ago") + " · " + esc(q.who) + " · its numbers still show, marked unverified, until someone answers</small></div>"
      : u.status === "stale" ? '<div class="openq"><b>No file has arrived for ' + u.staleDays + " days</b><p>The numbers shown are from the last good file. The branch's system owner has been asked why the export stopped.</p></div>"
      : u.status === "manual" ? '<div class="openq"><b>This branch has no system</b><p>Someone fills in a spreadsheet each month and uploads it. It goes through the same checks as every other file.</p></div>'
      : '<div class="openq good"><b>Nothing to chase</b><p>Every file from this branch arrived on time and passed its checks.</p></div>';
    var bands = u.bands.map(function (b) { return '<div class="band' + (b.over ? " over" : "") + '"><div>' + esc(b.name) + '</div><div class="track"><i style="width:' + Math.min(100, b.enr / b.cap * 100).toFixed(0) + '%"></i></div><div class="t">' + num(b.enr) + " of " + num(b.cap) + "</div></div>"; }).join("");
    var SP = { ok: "p-ok", question: "p-ask", stale: "p-stale", manual: "p-manual" };
    var src = u.sources.map(function (x) {
      var label = x.state === "question" ? "Open question" : x.state === "stale" ? "No fresh file" : x.passed + " of " + x.total + " checks passed";
      return "<tr><td class='name'>" + esc(x.label) + "</td><td>" + esc(x.from) + "<small>" + esc(x.file) + "</small></td><td class='hide-s'>" + esc(x.when) + "</td><td><span class='pill " + SP[x.state] + "'>" + label + "</span></td></tr>"; }).join("");
    app.innerHTML = '<div class="who">Step 2 of 3</div><h1>Every number traces back to a file.</h1>' +
      '<p class="sub">Pick a branch. You will see the files it sent, when they arrived, and whether they passed their checks.</p>' +
      '<div class="chips">' + PICKS.map(function (p) { return '<button type="button" data-b="' + p[0] + '" aria-pressed="' + (p[0] === u.slug) + '">' + p[1] + "</button>"; }).join("") + "</div>" +
      '<div class="g-card"><div class="g-head"><div><h2>' + esc(u.name) + "</h2><span>" + esc(u.country) + " · runs " + esc(V.systems[u.sys].name) + "</span></div>" + pill(u.status) + "</div>" + note +
      '<h3>Orders by product line</h3><div class="hint">Shipped, of orders due this month.</div><div class="bands">' + bands + "</div>" +
      "<h3>Where its numbers come from</h3><table class='src'><tr><th>Number</th><th>File</th><th class='hide-s'>Arrived</th><th>Result</th></tr>" + src + "</table></div>" +
      nav("#1", "#3", "Next: try to break it");
    [].forEach.call(app.querySelectorAll(".chips button"), function (b) { b.onclick = function () { branch = b.getAttribute("data-b"); track("oneview_branch", { branch: branch }); step2(); }; });
  }

  // ---------- step 3: send a file ----------
  function step3() {
    app.innerHTML = '<div class="who">Step 3 of 3</div><h1>Send in a bad file. See what happens.</h1>' +
      '<p class="sub">This is the part most dashboards skip. Below are files the Shreveport branch might send. Pick one and send it.</p><div id="runbox"></div>' +
      nav("#2", "#done", "Finish");
    if (!files) { get("/demo/files").then(function (f) { files = f; draw(); }); } else draw();
  }
  function draw() {
    var box = document.getElementById("runbox"); if (!box) return;
    var f = files.files.filter(function (x) { return x.key === picked; })[0];
    var list = files.files.filter(function (x) { return x.key !== "good" || picked === "good"; });
    box.innerHTML = '<div class="run-grid"><div><div class="files">' + list.map(function (x) {
        return '<button type="button" data-k="' + x.key + '" aria-pressed="' + (x.key === picked) + '"><b>' + esc(x.title) + "</b><span>" + esc(x.blurb) + "</span></button>"; }).join("") + "</div>" +
      '<div class="raw"><span class="fn">The file, exactly as it arrives: ' + esc(f.filename) + "</span>" + esc(f.content) + "</div>" +
      '<button type="button" class="send" id="send">Send this file</button></div>' +
      '<div id="trace"><p class="empty">Each step the system takes will appear here.</p></div></div>';
    [].forEach.call(box.querySelectorAll(".files button"), function (b) { b.onclick = function () { picked = b.getAttribute("data-k"); lastRun = null; draw(); }; });
    document.getElementById("send").onclick = run;
    if (lastRun) show(lastRun, true);
  }
  function run() {
    var btn = document.getElementById("send");
    btn.disabled = true; btn.textContent = "Running…";
    track("oneview_run", { file: picked });
    post("/demo/run", { scenario: picked }).then(function (r) { lastRun = r; btn.disabled = false; btn.textContent = "Send it again"; show(r, false); })
      .catch(function (e) { btn.disabled = false; btn.textContent = "Send this file";
        document.getElementById("trace").innerHTML = '<p class="empty">' + (String(e.message) === "429" ? "That is a lot of runs in a minute. Give it a moment." : "The run did not come back. Try again.") + "</p>"; });
  }
  function show(r, instant) {
    var rows = r.trace.map(function (t) {
      if (t.step === "asked") return '<li class="asked bad"><span class="ic">?</span><span><b>A question goes to the ' + esc(t.owner.toLowerCase()) + "</b><small>" + esc(t.text) + "</small></span></li>";
      if (t.step === "accepted") return '<li class="done"><span class="ic">✓</span><span><b>Accepted</b><small>' + esc(t.text) + "</small></span></li>";
      var title = t.step === "check" ? "Check: " + t.label : { received: "The file arrives", recognised: "The system works out who sent it", mapped: "It is translated into the company's terms", held: "Held for a person", rejected: "Rejected" }[t.step] || t.step;
      return '<li class="' + (t.bad ? "bad" : "") + '"><span class="ic">' + (t.bad ? "✕" : "✓") + "</span><span><b>" + esc(title) + "</b><small>" + esc(t.text) + "</small></span></li>";
    }).join("");
    var u = r.unit, bad = r.status !== "accepted";
    document.getElementById("trace").innerHTML = '<ol class="trace">' + rows + "</ol>" +
      '<div class="outcome"><b>' + (bad ? "Caught." : "Clean.") + "</b> " + esc(u.name) + " would now show " + pill(u.status) + " on the company screen. " +
      (bad ? "Nobody has to spot the problem in a meeting three weeks later." : "Its numbers go straight through.") +
      '<small>That ran for real, in ' + r.ms + " milliseconds, and was then undone so the next visitor starts clean.</small>" +
      (bad ? '<button type="button" id="fix">Now send the corrected file ›</button>' : "") + "</div>";
    [].forEach.call(document.querySelectorAll(".trace li"), function (el, i) { if (instant) el.classList.add("in"); else setTimeout(function () { el.classList.add("in"); }, 130 * i); });
    var fix = document.getElementById("fix");
    if (fix) fix.onclick = function () { picked = "good"; lastRun = null; draw(); run(); };
  }

  // ---------- the end ----------
  function done() {
    app.innerHTML = '<div class="g-intro"><div class="who">That is the demo</div><h1>Nothing wrong reached the screen without a flag.</h1>' +
      '<p class="sub">That is the difference between a dashboard and numbers you can trust. Nobody replaced a system to get it. The branches kept what they run.</p>' +
      '<div class="steps"><div><i>1</i><b>Agree the definitions</b>One short page per number. What counts as shipped, and on which date.</div>' +
      "<div><i>2</i><b>Connect each system</b>A mapping written once per system reads every branch that runs it.</div>" +
      "<div><i>3</i><b>Check every file</b>Anything that does not add up goes to a named person. It is never guessed.</div>" +
      "<div><i>4</i><b>One screen</b>The company, a state and a branch, all on the same numbers.</div></div>" +
      '<div class="go"><a class="btn" href="' + (O.site || "") + '/#contact">Talk about your version</a><a href="#/">Explore the full dashboard ›</a><a href="#">Start again</a></div></div>';
  }

  window.addEventListener("hashchange", render);
  get("/view").then(function (v) { V = v; document.getElementById("asof").textContent = ""; render(); })
    .catch(function () { app.innerHTML = '<p class="loading">The demo\'s server did not answer. It may be restarting; try again in a minute.</p>'; });
})();
