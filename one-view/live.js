// One View — the live page. One animated scene: every branch's file travels through its system's
// reader and the checks into the company's number. Files that fail are held for a person.
// Everything shown comes from the API; the scene only draws it. The full dashboard (view.js) is at "#/".
(function () {
  "use strict";
  var O = window.ONEVIEW, base = O.api + "/api/" + O.tenant, V = null, files = null, L = null, played = false, busy = false, sel = null, test = null;
  var app = document.getElementById("app"), bar = document.getElementById("guidebar");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function track(name, data) { try { window.va && window.va("event", { name: name, data: data || {} }); } catch (e) {} }
  function get(path) { return fetch(base + path).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function post(path, body) { return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function sum(l, f) { return l.reduce(function (t, x) { return t + f(x); }, 0); }
  var STATUS = { ok: "Checked this morning", ask: "Waiting on a person", stale: "No fresh file", manual: "Uploaded by hand" };
  var COLOR = { ok: "#54d6a0", ask: "#f0b849", stale: "#ff6b5e", manual: "#c7c7cc" };
  var SYS = { A: { c: "#5aa9ff", what: "one row per order" }, B: { c: "#c58bff", what: "a monthly summary" }, C: { c: "#4fd1c5", what: "a JSON export" }, X: { c: "#a1a1a6", what: "an uploaded spreadsheet" } };
  var ORDER = ["A", "B", "C", "X"];

  // ---------- where everything sits (a wide scene, or a tall one on a phone) ----------
  function layout() {
    var wide = (app.clientWidth || window.innerWidth) >= 760, by = {};
    V.units.forEach(function (u) { (by[u.sys] = by[u.sys] || []).push(u); });
    var P = { wide: wide, W: wide ? 1120 : 400, H: wide ? 468 : 640, dot: {}, cl: {}, rd: {} };
    var per = wide ? 5 : 10, gap = wide ? 34 : 31, x0 = wide ? 44 : 34, y = wide ? 34 : 26;
    ORDER.forEach(function (k, i) {
      var l = by[k] || [], rows = Math.ceil(l.length / per);
      P.cl[k] = { x: x0 - 12, y: y, n: l.length, states: l.map(function (u) { return u.country; }).filter(function (c, j, a) { return a.indexOf(c) === j; }) };
      l.forEach(function (u, j) { P.dot[u.slug] = { x: x0 + (j % per) * gap, y: y + 30 + Math.floor(j / per) * gap }; });
      var mid = y + 30 + (rows - 1) * gap / 2;
      P.rd[k] = wide ? { x: 440, y: mid - 27, w: 196, h: 54 } : { x: 12 + i * 96, y: 330, w: 88, h: 40 };
      P.cl[k].ax = wide ? x0 + (Math.min(l.length, per) - 1) * gap + 22 : x0 + (Math.min(l.length, per) - 1) * gap / 2;
      P.cl[k].ay = wide ? mid : y + 30 + (rows - 1) * gap + 16;
      y += 30 + rows * gap + (wide ? 22 : 12);
    });
    P.gate = wide ? { x: 742, y: 226, r: 48 } : { x: 200, y: 432, r: 36 };
    P.tot = wide ? { x: 858, y: 126, w: 238, h: 200 } : { x: 50, y: 506, w: 300, h: 116 };
    P.exit = wide ? { x: 742, y: 452 } : { x: 384, y: 470 };
    return P;
  }
  function route(u, held) {
    var d = L.dot[u.slug], r = L.rd[u.sys], g = L.gate, t = L.tot;
    var a = L.wide ? [{ x: r.x, y: r.y + r.h / 2 }, { x: r.x + r.w, y: r.y + r.h / 2 }] : [{ x: r.x + r.w / 2, y: r.y }, { x: r.x + r.w / 2, y: r.y + r.h }];
    return [d, a[0], a[1], g, held ? L.exit : (L.wide ? { x: t.x, y: t.y + t.h / 2 } : { x: t.x + t.w / 2, y: t.y })];
  }

  // ---------- the page ----------
  function page() {
    if (location.hash.indexOf("#/") === 0) {
      bar.innerHTML = '<div class="shell g-explore"><a href="#">‹ Back to the demo</a><span>You are exploring the full dashboard. Click a state, then a branch.</span></div>';
      window.OneView({ live: true, asOf: V.asOf, units: V.units, systems: V.systems, words: V.words, noPlaceholderTag: true, sysOverride: function () { return null; } });
      window.scrollTo(0, 0);
      return;
    }
    window.__route = function () {};
    bar.innerHTML = ""; $("crumbs").innerHTML = "";
    var n = V.units.length;
    app.innerHTML = '<div class="s-hero"><div class="who">A two-minute demo</div>' +
      "<h1>" + n + " branches. Three systems. <em>One number you can trust.</em></h1>" +
      '<p class="sub">A made-up distributor that grew by buying two others. Its branches run three different systems, and nobody trusted the monthly numbers. Watch what happens to each branch\'s file now.</p></div>' +
      '<div class="stage" id="stage"><div id="svgwrap"></div>' +
      '<div class="s-bar"><div class="s-cap" id="cap" aria-live="polite"></div><div class="s-act" id="act"></div></div>' +
      '<div class="s-tray" id="tray"></div></div>' +
      '<div id="detail"></div>' +
      '<div class="s-end"><h2>Nothing wrong reached that number without a flag.</h2>' +
      '<p class="sub">That is the difference between a dashboard and numbers you can trust. Nobody replaced a system to get it. The branches kept what they run.</p>' +
      '<div class="steps"><div><i>1</i><b>Agree the definitions</b>One short page per number. What counts as shipped, and on which date.</div>' +
      "<div><i>2</i><b>Connect each system</b>A reader written once per system handles every branch that runs it.</div>" +
      "<div><i>3</i><b>Check every file</b>Anything that does not add up goes to a named person. It is never guessed.</div>" +
      "<div><i>4</i><b>One number</b>The company, a state and a branch, all counted the same way.</div></div>" +
      '<div class="go"><a class="btn" href="' + (O.site || "") + '/#contact">Talk about your version</a><a href="#/">Explore the full dashboard ›</a></div></div>';
    draw();
    if (still) finish(); else setTimeout(play, 500);
  }

  function draw() {
    L = layout();
    var s = '<svg class="' + (L.wide ? "wide" : "tall") + '" viewBox="0 0 ' + L.W + " " + L.H + '" role="img" aria-label="Each branch sends a file through its system\'s reader and six checks into one company number. Files that fail are held for a person.">';
    ORDER.forEach(function (k) {
      var c = L.cl[k], r = L.rd[k], g = L.gate; if (!c.n) return;
      s += '<text class="cl-n" x="' + c.x + '" y="' + (c.y + 4) + '" fill="' + SYS[k].c + '">' + esc(V.systems[k].name) + '<tspan class="cl-s" dx="10">' + esc(k === "X" ? c.n + " small branches" : c.states.join(", ")) + "</tspan></text>";
      var rin = L.wide ? [r.x, r.y + r.h / 2] : [r.x + r.w / 2, r.y], rout = L.wide ? [r.x + r.w, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h];
      s += (L.wide ? '<path class="wire" d="M' + c.ax + " " + c.ay + " L" + rin[0] + " " + rin[1] + '"/>' : "") + '<path class="wire" d="M' + rout[0] + " " + rout[1] + " L" + g.x + " " + g.y + '"/>';
      s += '<rect class="rd" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="12" stroke="' + SYS[k].c + '"/>' +
        (L.wide ? '<text class="rd-n" x="' + (r.x + 16) + '" y="' + (r.y + 23) + '">Reads ' + esc(V.systems[k].name === "Spreadsheets only" ? "spreadsheets" : V.systems[k].name) + '</text><text class="rd-s" x="' + (r.x + 16) + '" y="' + (r.y + 41) + '">' + SYS[k].what + "</text>"
          : '<text class="rd-n" text-anchor="middle" x="' + (r.x + r.w / 2) + '" y="' + (r.y + 25) + '">' + esc(k === "X" ? "Sheets" : V.systems[k].name) + "</text>");
    });
    var g = L.gate, t = L.tot;
    s += '<path class="wire" d="M' + g.x + " " + g.y + " L" + (L.wide ? t.x + " " + (t.y + t.h / 2) : (t.x + t.w / 2) + " " + t.y) + '"/>' +
      '<path class="wire held" d="M' + g.x + " " + g.y + " L" + L.exit.x + " " + L.exit.y + '"/>' +
      '<circle class="gate" id="gate" cx="' + g.x + '" cy="' + g.y + '" r="' + g.r + '"/>' +
      '<text class="gt-n" text-anchor="middle" x="' + g.x + '" y="' + (g.y - 2) + '">6 checks</text><text class="gt-s" text-anchor="middle" x="' + g.x + '" y="' + (g.y + 16) + '">on every file</text>' +
      '<text class="held-l" text-anchor="' + (L.wide ? "start" : "end") + '" x="' + (L.wide ? L.exit.x + 14 : L.exit.x) + '" y="' + (L.exit.y + (L.wide ? -4 : 22)) + '">held for a person ↓</text>' +
      '<rect class="tot" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="20"/>' +
      '<text class="tot-l" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 40 : 30)) + '">Orders shipped this month</text>' +
      '<text class="tot-v" id="tot" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 104 : 76)) + '">0</text>' +
      '<text class="tot-s" id="tots" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 138 : 100)) + '">0 of ' + V.units.length + " branches in</text>" +
      (L.wide ? '<text class="tot-s" id="totu" x="' + (t.x + 22) + '" y="' + (t.y + 162) + '"></text>' : '<text class="tot-s" id="totu" x="' + (t.x + t.w - 22) + '" y="' + (t.y + 100) + '" text-anchor="end"></text>');
    V.units.forEach(function (u) {
      var d = L.dot[u.slug];
      s += '<circle class="dot" data-s="' + u.slug + '" cx="' + d.x + '" cy="' + d.y + '" r="10" stroke="' + SYS[u.sys].c + '" tabindex="0" role="button" aria-label="' + esc(u.name) + '"><title>' + esc(u.name) + "</title></circle>";
    });
    s += '<g id="fx"></g></svg>';
    $("svgwrap").innerHTML = s;
    [].forEach.call(document.querySelectorAll(".dot"), function (el) {
      var pick = function () { select(el.getAttribute("data-s"), true); };
      el.addEventListener("click", pick);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
    if (played) { paint(); totals(V.units.length, sum(V.units, function (u) { return u.enr; })); }
  }
  function cap(html) { var m = /^<b>(\d)<\/b> ?/.exec(html); $("cap").innerHTML = (m ? "<b>" + m[1] + "</b>" : "") + "<span>" + html.replace(/^<b>\d<\/b> ?/, "") + "</span>"; }
  function dotEl(slug) { return document.querySelector('.dot[data-s="' + slug + '"]'); }
  function status(u) { return test && u.slug === test.site ? test.status : u.status; }
  function fill(el, c) { el.style.fill = c; el.style.stroke = c; el.classList.add("in"); }
  function paint() { V.units.forEach(function (u) { fill(dotEl(u.slug), COLOR[status(u)]); }); if (sel) dotEl(sel).classList.add("sel"); }
  function totals(nIn, total) {
    $("tot").textContent = num(total);
    $("tots").textContent = nIn + " of " + V.units.length + " branches in";
  }

  // ---------- one file flying along its route ----------
  function fly(pts, color, onGate, onEnd) {
    var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 5); c.setAttribute("fill", color); c.setAttribute("class", "p");
    $("fx").appendChild(c);
    var legs = [620, 200, 380, 430], pause = 130, i = 0, t0 = null;
    function leg(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / legs[i]), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, a = pts[i], b = pts[i + 1];
      c.setAttribute("cx", a.x + (b.x - a.x) * e); c.setAttribute("cy", a.y + (b.y - a.y) * e);
      if (k < 1) return requestAnimationFrame(leg);
      i++; t0 = null;
      if (i === 3) { var res = onGate ? onGate(c) : null; return setTimeout(function () { if (res) pts[4] = res; requestAnimationFrame(leg); }, pause); }
      if (i < 4) return requestAnimationFrame(leg);
      c.parentNode && c.parentNode.removeChild(c); if (onEnd) onEnd();
    }
    requestAnimationFrame(leg);
  }
  function pulse(bad) { var g = $("gate"); g.classList.remove("ok", "bad"); void g.getBoundingClientRect(); g.classList.add(bad ? "bad" : "ok"); }

  // ---------- beat 1: every branch's latest file comes in ----------
  function play() {
    if (busy) return; busy = true; played = false; test = null;
    $("tray").innerHTML = ""; $("act").innerHTML = "";
    cap("<b>1</b> Each dot is a branch. Here comes each one's latest file.");
    draw(); totals(0, 0);
    var seq = V.units.slice().sort(function (a, b) { var r = function (u) { return u.status === "stale" ? 3 : u.status === "manual" ? 2 : 1; }; return r(a) - r(b) || (V.units.indexOf(a) * 7) % 24 - (V.units.indexOf(b) * 7) % 24; });
    var nIn = 0, total = 0, left = seq.length;
    seq.forEach(function (u, i) {
      setTimeout(function () {
        var held = u.status === "ask";
        fly(route(u, false), SYS[u.sys].c, function () { pulse(held || u.status === "stale"); if (held) chip(u); return null; }, function () {
          nIn++; total += u.enr; totals(nIn, total);
          fill(dotEl(u.slug), COLOR[u.status]);
          if (u.status === "stale") chip(u);
          if (--left === 0) { busy = false; finish(); }
        });
      }, i * 150);
    });
    track("oneview_play");
  }
  function chip(u, mine) {
    var q = u.question, el = document.createElement("button");
    el.type = "button"; el.className = "chip " + (q ? "ask" : "stale") + (mine ? " mine" : ""); el.setAttribute("data-s", u.slug);
    el.innerHTML = "<b>" + esc(u.name) + (mine ? " · your test file" : "") + "</b>" + (q ? esc(q.text) + "<span>Asked: " + esc(q.who.toLowerCase()) + "</span>" : "No file for " + u.staleDays + " days. Its last good numbers are kept.<span>Asked: the branch's system owner</span>");
    el.onclick = function () { select(u.slug, true); };
    var tray = $("tray");
    if (!tray.firstChild) tray.innerHTML = '<div class="tray-h">Held for a person</div>';
    tray.appendChild(el);
  }
  function finish() {
    played = true;
    if (!$("tray").firstChild) V.units.forEach(function (u) { if (u.status === "ask" || u.status === "stale") chip(u); });
    paint(); totals(V.units.length, sum(V.units, function (u) { return u.enr; }));
    var c = { ok: 0, ask: 0, stale: 0, manual: 0 }; V.units.forEach(function (u) { c[u.status]++; });
    $("totu").textContent = c.ask + " marked unverified";
    cap("<b>2</b> " + (c.ok + c.manual) + " files passed. " + c.ask + " did not add up, so a person was asked. Click an amber dot to see why.");
    acts();
    [].forEach.call(document.querySelectorAll(".dot"), function (el) { var u = unit(el.getAttribute("data-s")); if (u.status === "ask") el.classList.add("beat"); });
  }
  function unit(slug) { return V.units.filter(function (u) { return u.slug === slug; })[0]; }
  function acts() {
    $("act").innerHTML = '<button type="button" class="ghost" id="replay">Replay</button><button type="button" class="hot" id="break">Send a bad file yourself ›</button>';
    $("replay").onclick = function () { sel = null; $("detail").innerHTML = ""; play(); };
    $("break").onclick = chooser;
  }

  // ---------- beat 2: look at one branch ----------
  function select(slug, scroll) {
    var u = unit(slug); if (!u) return;
    if (sel && dotEl(sel)) dotEl(sel).classList.remove("sel");
    sel = slug; dotEl(slug).classList.add("sel");
    [].forEach.call(document.querySelectorAll(".dot.beat"), function (el) { el.classList.remove("beat"); });
    var q = u.question, st = u.status;
    var note = q ? '<div class="openq"><b>Its file did not add up, so a person was asked</b><p>' + esc(q.text) + "</p><small>Asked " + (u.askedDays === 0 ? "today" : u.askedDays + " day" + (u.askedDays === 1 ? "" : "s") + " ago") + " · " + esc(q.who) + " · its numbers still count, marked unverified, until someone answers</small></div>"
      : st === "stale" ? '<div class="openq"><b>No file has arrived for ' + u.staleDays + " days</b><p>The numbers shown are from the last good file. The branch's system owner has been asked why the export stopped.</p></div>"
      : st === "manual" ? '<div class="openq"><b>This branch has no system</b><p>Someone fills in a spreadsheet each month and uploads it. It goes through the same checks as every other file.</p></div>'
      : '<div class="openq good"><b>Nothing to chase</b><p>Every file from this branch arrived on time and passed its checks.</p></div>';
    var bands = u.bands.map(function (b) { return '<div class="band' + (b.over ? " over" : "") + '"><div>' + esc(b.name) + '</div><div class="track"><i style="width:' + Math.min(100, b.enr / b.cap * 100).toFixed(0) + '%"></i></div><div class="t">' + num(b.enr) + " of " + num(b.cap) + "</div></div>"; }).join("");
    var SP = { ok: "p-ok", question: "p-ask", stale: "p-stale", manual: "p-manual" };
    var src = u.sources.map(function (x) {
      var label = x.state === "question" ? "Open question" : x.state === "stale" ? "No fresh file" : x.passed + " of " + x.total + " checks passed";
      return "<tr><td class='name'>" + esc(x.label) + "</td><td>" + esc(x.from) + "<small>" + esc(x.file) + "</small></td><td class='hide-s'>" + esc(x.when) + "</td><td><span class='pill " + SP[x.state] + "'>" + label + "</span></td></tr>"; }).join("");
    $("detail").innerHTML = '<div class="g-card"><div class="g-head"><div><h2>' + esc(u.name) + "</h2><span>" + esc(u.country) + " · runs " + esc(V.systems[u.sys].name) + '</span></div><span class="pill p-' + st + '">' + STATUS[st] + "</span></div>" + note +
      '<div class="cols2"><div><h3>Orders by product line</h3><div class="hint">Shipped, of orders due this month.</div><div class="bands">' + bands + "</div></div>" +
      "<div><h3>Where its numbers come from</h3><table class='src'><tr><th>Number</th><th>File</th><th class='hide-s'>Arrived</th><th>Result</th></tr>" + src + "</table></div></div></div>";
    if (scroll) { track("oneview_branch", { branch: slug }); $("detail").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" }); }
  }

  // ---------- beat 3: send a file yourself ----------
  function chooser() {
    var show = function () {
      cap("<b>3</b> Pick a file for the Shreveport branch to send. It goes through the real system.");
      $("act").innerHTML = files.files.filter(function (f) { return f.key !== "good"; }).map(function (f) { return '<button type="button" class="hot" data-k="' + f.key + '">' + esc(f.title) + "</button>"; }).join("");
      [].forEach.call($("act").querySelectorAll("button"), function (b) { b.onclick = function () { send(b.getAttribute("data-k")); }; });
    };
    if (files) show(); else get("/demo/files").then(function (f) { files = f; show(); });
  }
  function send(key) {
    if (busy) return; busy = true;
    var u = unit(files.slug || "shreveport"), f = files.files.filter(function (x) { return x.key === key; })[0];
    cap("<b>3</b> Sending <i>" + esc(f.filename) + "</i>…");
    $("act").innerHTML = "";
    [].forEach.call(document.querySelectorAll(".chip.mine"), function (c) { c.parentNode.removeChild(c); });
    track("oneview_run", { file: key });
    $("stage").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
    post("/demo/run", { scenario: key }).then(function (r) {
      var bad = r.status !== "accepted";
      var land = function () {
        test = { site: u.slug, status: r.unit.status }; paint(); busy = false;
        if (bad) chip({ slug: u.slug, name: u.name, question: { text: r.questions[0].text, who: r.questions[0].owner } }, true);
        cap(bad ? "<b>3</b> <strong>Caught.</strong> It never reached the number unflagged. Nobody has to spot it in a meeting three weeks later."
          : "<b>3</b> <strong>Clean.</strong> The corrected file passed all six checks and went straight through.");
        $("act").innerHTML = (bad ? '<button type="button" class="hot" id="fix">Send the corrected file ›</button>' : "") + '<button type="button" class="ghost" id="again">Try another file</button>';
        if (bad) $("fix").onclick = function () { send("good"); };
        $("again").onclick = chooser;
        report(f, r);
      };
      if (still) return land();
      fly(route(u, bad), SYS[u.sys].c, function () { pulse(bad); return null; }, land);
    }).catch(function (e) { busy = false;
      cap("<b>3</b> " + (String(e.message) === "429" ? "That is a lot of runs in a minute. Give it a moment." : "The run did not come back. Try again.")); acts(); });
  }
  function report(f, r) {
    var rows = r.trace.map(function (t) {
      if (t.step === "asked") return '<li class="asked bad in"><span class="ic">?</span><span><b>A question goes to the ' + esc(t.owner.toLowerCase()) + "</b><small>" + esc(t.text) + "</small></span></li>";
      if (t.step === "accepted") return '<li class="done in"><span class="ic">✓</span><span><b>Accepted</b><small>' + esc(t.text) + "</small></span></li>";
      var title = t.step === "check" ? "Check: " + t.label : { received: "The file arrives", recognised: "The system works out who sent it", mapped: "It is translated into the company's terms", held: "Held for a person", rejected: "Rejected" }[t.step] || t.step;
      return '<li class="in ' + (t.bad ? "bad" : "") + '"><span class="ic">' + (t.bad ? "✕" : "✓") + "</span><span><b>" + esc(title) + "</b><small>" + esc(t.text) + "</small></span></li>";
    }).join("");
    $("detail").innerHTML = '<div class="g-card"><div class="g-head"><div><h2>What just happened</h2><span>That ran for real, in ' + r.ms + " milliseconds, and was then undone so the next visitor starts clean.</span></div></div>" +
      '<div class="run-grid"><div><h3>The file, exactly as it arrived</h3><div class="raw"><span class="fn">' + esc(f.filename) + "</span>" + esc(f.content) + "</div><p class=\"hint\">" + esc(f.blurb) + "</p></div>" +
      '<div><h3>What the system did with it</h3><ol class="trace">' + rows + "</ol></div></div></div>";
  }

  // redraw when the page crosses between the wide and the tall scene (also covers a pane that was hidden at load)
  function refit() { if (V && L && $("svgwrap") && !busy && layout().wide !== L.wide) { draw(); if (played) finish(); } }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(refit, 200); });
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rz); rz = setTimeout(refit, 200); }).observe(app);
  window.addEventListener("hashchange", function () { if (V) page(); });
  get("/view").then(function (v) { V = v; $("asof").textContent = ""; page(); })
    .catch(function () { app.innerHTML = '<p class="loading">The demo\'s server did not answer. It may be restarting; try again in a minute.</p>'; });
})();
