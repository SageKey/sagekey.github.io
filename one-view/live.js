// One View — the live page. One animated scene: every site's file travels through its system's
// reader and the checks into the organisation's number. Files that fail are held for a person.
// Everything shown, including every word about the organisation, comes from the API; this file only
// draws it. The full dashboard (view.js) is at "#/".
(function () {
  "use strict";
  var O = window.ONEVIEW, V = null, S = null, W = null, files = null, aif = null, joined = null, L = null, played = false, busy = false, calling = false, sel = null, test = null;
  var m = /[?&]for=([a-z]+)/.exec(location.search); if (m) O.tenant = m[1];
  var app = document.getElementById("app"), bar = document.getElementById("guidebar");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function base() { return O.api + "/api/" + O.tenant; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tx(s, o) { return s.replace(/\{(\w+)\}/g, function (mm, k) { return o[k]; }); }
  function track(name, data) { data = data || {}; data.sector = O.tenant; try { window.va && window.va("event", { name: name, data: data }); } catch (e) {} }
  function get(path) { return fetch(base() + path).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function post(path, body) { return fetch(base() + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) {
    if (r.ok) return r.json();
    return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error(String(r.status)); e.detail = typeof j.detail === "string" ? j.detail : ""; throw e; }); }); }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function sum(l, f) { return l.reduce(function (t, x) { return t + f(x); }, 0); }
  var STATUS = { ok: "Checked this morning", ask: "Waiting on a person", stale: "No fresh file", manual: "Uploaded by hand" };
  var COLOR = { ok: "#54d6a0", ask: "#f0b849", stale: "#ff6b5e", manual: "#c7c7cc" };
  var SYSC = { A: "#5aa9ff", B: "#c58bff", C: "#4fd1c5", X: "#a1a1a6", N: "#ff9f6b" };
  function order() { return joined ? ["A", "B", "C", "X", "N"] : ["A", "B", "C", "X"]; }
  function sysName(k) { return k === "N" ? "New system" : V.systems[k].name; }
  function what(k) { return k === "N" ? "never seen before" : S.readers[k]; }
  // every site on the scene: the organisation's own, plus one that has just joined (if any)
  function all() { return joined ? V.units.concat([{ slug: "joined", name: joined.name, country: joined.place, sys: "N", enr: joined.enr || 0, status: joined.mapped ? "ok" : "new" }]) : V.units; }
  function unit(slug) { return V.units.filter(function (u) { return u.slug === slug; })[0]; }

  // ---------- where everything sits (a wide scene, or a tall one on a phone) ----------
  function layout() {
    var wide = (app.clientWidth || window.innerWidth) >= 760, by = {};
    all().forEach(function (u) { (by[u.sys] = by[u.sys] || []).push(u); });
    var sh = joined && !wide ? 74 : 0, rw = joined ? 70 : 88, rstep = joined ? 76 : 96;
    var P = { wide: wide, W: wide ? 1120 : 400, H: wide ? (joined ? 552 : 468) : 640 + sh, dot: {}, cl: {}, rd: {} };
    var per = wide ? 5 : 10, gap = wide ? 34 : 31, x0 = wide ? 44 : 34, y = wide ? 34 : 26;
    order().forEach(function (k, i) {
      var l = by[k] || [], rows = Math.ceil(l.length / per);
      P.cl[k] = { x: x0 - 12, y: y, n: l.length, states: l.map(function (u) { return u.country; }).filter(function (c, j, a) { return a.indexOf(c) === j; }) };
      l.forEach(function (u, j) { P.dot[u.slug] = { x: x0 + (j % per) * gap, y: y + 30 + Math.floor(j / per) * gap }; });
      var mid = y + 30 + (rows - 1) * gap / 2;
      P.rd[k] = wide ? { x: 440, y: mid - 27, w: 204, h: 54 } : { x: 12 + i * rstep, y: 330 + sh, w: rw, h: 40 };
      P.cl[k].ax = wide ? x0 + (Math.min(l.length, per) - 1) * gap + 22 : x0 + (Math.min(l.length, per) - 1) * gap / 2;
      P.cl[k].ay = wide ? mid : y + 30 + (rows - 1) * gap + 16;
      y += 30 + rows * gap + (wide ? 22 : 12);
    });
    if (wide && y + 20 > P.H) P.H = y + 20;
    P.gate = wide ? { x: 750, y: 226, r: 50 } : { x: 200, y: 432 + sh, r: 40 };
    P.tot = wide ? { x: 858, y: 116, w: 244, h: 220 } : { x: 40, y: 506 + sh, w: 320, h: 122 };
    P.exit = wide ? { x: 750, y: P.H - 16 } : { x: 384, y: 474 + sh };
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
      bar.innerHTML = '<div class="shell g-explore"><a href="#">‹ Back to the demo</a><span>You are exploring the full dashboard. Click a ' + esc(W.group) + ", then a " + esc(W.unit) + ".</span></div>";
      window.OneView({ live: true, asOf: V.asOf, units: V.units, systems: V.systems, words: V.words, noPlaceholderTag: true, sysOverride: function () { return null; } });
      window.scrollTo(0, 0);
      return;
    }
    window.__route = function () {};
    bar.innerHTML = ""; $("crumbs").innerHTML = "";
    var n = V.units.length, p = S.p;
    app.innerHTML = '<div class="s-hero"><div class="sect" role="group" aria-label="Kind of organisation"><span>Show this for</span>' +
      V.sectors.map(function (x) { return '<button type="button" data-t="' + x.id + '" aria-pressed="' + (x.id === O.tenant) + '">' + esc(x.tab) + "</button>"; }).join("") + "</div>" +
      "<h1>" + tx(S.h1, { n: n }) + "</h1>" + '<p class="sub">' + esc(S.sub) + "</p></div>" +
      '<div class="stage" id="stage" style="--glow:' + S.glow + '">' +
      '<div class="s-bar"><div class="s-cap" id="cap" aria-live="polite"></div><div class="s-act" id="act"></div></div>' +
      '<div class="legend"><span class="k-ok">Checked this morning</span><span class="k-ask">Waiting on a person</span><span class="k-stale">No fresh file</span><span class="k-manual">Uploaded by hand</span></div>' +
      '<div id="svgwrap"></div><div class="s-tray" id="tray"></div></div>' +
      '<div id="detail"></div>' +
      '<div class="s-end"><h2>Nothing wrong reached that number without a flag.</h2>' +
      '<p class="sub">That is the difference between a dashboard and numbers you can trust. Nobody replaced a system to get it. Every ' + esc(W.unit) + " kept what it runs.</p>" +
      '<div class="steps"><div><i>1</i><b>Agree the definitions</b>One short page per number. ' + esc(S.defs) + "</div>" +
      "<div><i>2</i><b>Connect each system</b>A reader written once per system handles every " + esc(W.unit) + " that runs it. AI drafts the reader for a system nobody has seen.</div>" +
      "<div><i>3</i><b>Check every file</b>Anything that does not add up goes to a named person. It is never guessed.</div>" +
      "<div><i>4</i><b>One number</b>The " + esc(p.org) + ", a " + esc(W.group) + " and a " + esc(W.unit) + ", all counted the same way.</div></div>" +
      '<div class="go"><a class="btn" href="' + (O.site || "") + '/#contact">Talk about your version</a><a href="' + (O.site || "") + '/#services">What it costs and how long it takes ›</a>' +
      '<a href="' + (O.site || "") + '/#about">Who builds it ›</a><a href="#/">Explore the full dashboard ›</a></div></div>';
    [].forEach.call(app.querySelectorAll(".sect button"), function (b) { b.onclick = function () { sector(b.getAttribute("data-t")); }; });
    draw();
    if (still) finish(); else setTimeout(play, 500);
  }
  function sector(id) {
    if (calling || id === O.tenant) return;
    O.tenant = id; busy = false; files = null; aif = null; joined = null; test = null; sel = null; played = false;
    try { history.replaceState(null, "", location.pathname + (id === "distributor" ? "" : "?for=" + id)); } catch (e) {}
    track("oneview_sector");
    load();
  }

  function draw() {
    L = layout();
    var p = S.p, s = '<svg class="' + (L.wide ? "wide" : "tall") + '" viewBox="0 0 ' + L.W + " " + L.H + '" role="img" aria-label="Each ' + esc(W.unit) + " sends a file through its system's reader and a set of checks into one number. Files that fail are held for a person.\">";
    order().forEach(function (k) {
      var c = L.cl[k], r = L.rd[k], g = L.gate; if (!c.n) return;
      s += '<text class="cl-n" x="' + c.x + '" y="' + (c.y + 4) + '" fill="' + SYSC[k] + '">' + esc(sysName(k)) + '<tspan class="cl-s" dx="10">' + esc(k === "X" ? c.n + " small " + W.units : k === "N" ? joined.name + ", " + joined.place + " · just joined" : c.states.join(", ")) + "</tspan></text>";
      var rin = L.wide ? [r.x, r.y + r.h / 2] : [r.x + r.w / 2, r.y], rout = L.wide ? [r.x + r.w, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h];
      s += (L.wide ? '<path class="wire" d="M' + c.ax + " " + c.ay + " L" + rin[0] + " " + rin[1] + '"/>' : "") + '<path class="wire" d="M' + rout[0] + " " + rout[1] + " L" + g.x + " " + g.y + '"/>';
      s += '<rect class="rd' + (k === "N" && !joined.mapped ? " unk" : "") + '" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="12" stroke="' + SYSC[k] + '"/>' +
        (L.wide ? '<text class="rd-n" x="' + (r.x + 16) + '" y="' + (r.y + 23) + '">' + esc(k === "N" ? (joined.mapped ? "Reads it now" : "Cannot read it yet") : "Reads " + (k === "X" ? "spreadsheets" : sysName(k))) + '</text><text class="rd-s" x="' + (r.x + 16) + '" y="' + (r.y + 41) + '">' + esc(k === "N" && joined.mapped ? "mapped by AI, checked by code" : what(k)) + "</text>"
          : '<text class="rd-n" text-anchor="middle" x="' + (r.x + r.w / 2) + '" y="' + (r.y + 25) + '">' + esc(k === "X" ? "Sheets" : k === "N" ? "New" : "Sys " + k) + "</text>");
    });
    var g = L.gate, t = L.tot;
    s += '<path class="wire" d="M' + g.x + " " + g.y + " L" + (L.wide ? t.x + " " + (t.y + t.h / 2) : (t.x + t.w / 2) + " " + t.y) + '"/>' +
      '<path class="wire held" d="M' + g.x + " " + g.y + " L" + L.exit.x + " " + L.exit.y + '"/>' +
      '<circle class="gate" id="gate" cx="' + g.x + '" cy="' + g.y + '" r="' + g.r + '"/>' +
      '<text class="gt-n" text-anchor="middle" x="' + g.x + '" y="' + (g.y - 1) + '">Checks</text><text class="gt-s" text-anchor="middle" x="' + g.x + '" y="' + (g.y + 17) + '">on every file</text>' +
      '<text class="held-l" text-anchor="' + (L.wide ? "start" : "end") + '" x="' + (L.wide ? L.exit.x + 14 : L.exit.x) + '" y="' + (L.exit.y + (L.wide ? -4 : 24)) + '">flagged for a person ↓</text>' +
      '<rect class="tot" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="20"/>' +
      '<text class="tot-l" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 40 : 30)) + '">' + esc(S.total) + "</text>" +
      '<text class="tot-v" id="tot" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 104 : 74)) + '">0</text>' +
      '<text class="tot-s" id="tots" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 138 : 96)) + '"></text>' +
      '<text class="tot-s warn" id="totu" x="' + (t.x + 22) + '" y="' + (t.y + (L.wide ? 164 : 114)) + '"></text>' +
      (L.wide ? '<text class="tot-s" x="' + (t.x + 22) + '" y="' + (t.y + 196) + '">As of ' + esc(V.asOfShort) + "</text>" : "");
    all().forEach(function (u) {
      var d = L.dot[u.slug];
      s += '<circle class="dot' + (u.status === "new" ? " new" : "") + '" data-s="' + u.slug + '" cx="' + d.x + '" cy="' + d.y + '" r="11" stroke="' + SYSC[u.sys] + '" tabindex="0" role="button" aria-label="' + esc(u.name) + '"></circle>';
    });
    s += '<g id="fx"></g><g id="tip" class="tip" style="display:none"><rect rx="6" height="22"></rect><text y="15"></text></g></svg>';
    $("svgwrap").innerHTML = s;
    [].forEach.call(document.querySelectorAll(".dot"), function (el) {
      var sl = el.getAttribute("data-s"), pick = function () { if (sl !== "joined") select(sl, true); };
      el.addEventListener("click", pick);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      el.addEventListener("mouseenter", function () { tip(sl); }); el.addEventListener("focus", function () { tip(sl); });
      el.addEventListener("mouseleave", function () { tip(null); }); el.addEventListener("blur", function () { tip(null); });
    });
    if (played) { paint(); settle(); } else totals(0, 0);
  }
  // a name tag over the dot under the pointer
  function tip(slug) {
    var g = $("tip"); if (!g) return;
    if (!slug) { g.style.display = "none"; return; }
    var u = all().filter(function (x) { return x.slug === slug; })[0], d = L.dot[slug], text = g.querySelector("text"), rect = g.querySelector("rect");
    text.textContent = u.name; g.style.display = "";
    var w = text.getComputedTextLength() + 16, x = Math.max(4, Math.min(L.W - w - 4, d.x - w / 2));
    rect.setAttribute("width", w); text.setAttribute("x", 8); g.setAttribute("transform", "translate(" + x + "," + (d.y - 38) + ")");
  }
  function cap(html) { var mm = /^<b>(\d)<\/b> ?/.exec(html); $("cap").innerHTML = (mm ? "<b>" + mm[1] + "</b>" : "") + "<span>" + html.replace(/^<b>\d<\/b> ?/, "") + "</span>"; }
  function dotEl(slug) { return document.querySelector('.dot[data-s="' + slug + '"]'); }
  function status(u) { return test && u.slug === test.site ? test.status : u.status; }
  function fill(el, c) { el.style.fill = c; el.style.stroke = c; el.classList.add("in"); }
  function paint() { all().forEach(function (u) { if (status(u) !== "new") fill(dotEl(u.slug), COLOR[status(u)]); }); if (sel && dotEl(sel)) dotEl(sel).classList.add("sel"); }
  function totals(nIn, total) {
    $("tot").textContent = num(total);
    $("tots").textContent = nIn + " of " + all().length + " " + W.units + " in";
  }
  // the number as it stands, and how much of it is still waiting on a person
  function settle() {
    var inn = all().filter(function (u) { return u.status !== "new"; });
    totals(inn.length, sum(inn, function (u) { return u.enr; }));
    var open = inn.filter(function (u) { return status(u) === "ask" || status(u) === "stale"; });
    $("totu").textContent = open.length ? "of which " + num(sum(open, function (u) { return u.enr; })) + " not yet confirmed" : "all of it confirmed";
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
      if (i === 3) { if (onGate) onGate(c); return setTimeout(function () { requestAnimationFrame(leg); }, pause); }
      if (i < 4) return requestAnimationFrame(leg);
      c.parentNode && c.parentNode.removeChild(c); if (onEnd) onEnd();
    }
    requestAnimationFrame(leg);
  }
  function pulse(bad) { var g = $("gate"); if (!g) return; g.classList.remove("ok", "bad"); void g.getBoundingClientRect(); g.classList.add(bad ? "bad" : "ok"); }

  // ---------- beat 1: every site's latest file comes in ----------
  function play() {
    if (busy) return; busy = true; played = false; test = null; joined = null;
    var mine = O.tenant;
    $("tray").innerHTML = ""; $("act").innerHTML = ""; $("act").className = "s-act";
    cap("<b>1</b> Each dot is a " + esc(W.unit) + ". Here comes each one's latest file.");
    draw();
    var seq = V.units.slice().sort(function (a, b) { var r = function (u) { return u.status === "stale" ? 3 : u.status === "manual" ? 2 : 1; }; return r(a) - r(b) || (V.units.indexOf(a) * 7) % 24 - (V.units.indexOf(b) * 7) % 24; });
    var nIn = 0, total = 0, left = seq.length;
    seq.forEach(function (u, i) {
      setTimeout(function () {
        if (O.tenant !== mine || !dotEl(u.slug)) return;
        var held = u.status === "ask";
        fly(route(u, false), SYSC[u.sys], function () { pulse(held || u.status === "stale"); if (held && O.tenant === mine) chip(u); }, function () {
          if (O.tenant !== mine || !dotEl(u.slug)) return;
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
    el.innerHTML = "<b>" + esc(u.name) + (mine ? " · your test file" : "") + "</b>" + (q ? esc(q.text) + "<span>Asked: " + esc(q.who.toLowerCase()) + "</span>" : "No file for " + u.staleDays + " days. Its last good numbers are kept.<span>Asked: the " + esc(W.unit) + "'s system owner</span>");
    el.onclick = function () { select(u.slug, true); };
    var tray = $("tray");
    if (!tray.firstChild) tray.innerHTML = '<div class="tray-h">Flagged for a person</div>';
    tray.appendChild(el);
  }
  function finish() {
    played = true; busy = false;
    if (!$("tray").firstChild) V.units.forEach(function (u) { if (u.status === "ask" || u.status === "stale") chip(u); });
    paint(); settle();
    var c = { ok: 0, ask: 0, stale: 0, manual: 0 }; V.units.forEach(function (u) { c[u.status]++; });
    cap("<b>2</b> " + (c.ok + c.manual) + " files passed. " + c.ask + " did not add up, so a person was asked." + (c.stale ? " " + c.stale + " sent nothing new." : "") + " Click an amber dot to see why.");
    acts();
    [].forEach.call(document.querySelectorAll(".dot"), function (el) { var u = unit(el.getAttribute("data-s")); if (u && u.status === "ask") el.classList.add("beat"); });
  }
  function acts() {
    $("act").className = "s-act";
    $("act").innerHTML = '<button type="button" class="ghost" id="replay">Replay</button><button type="button" class="hot" id="break">Send a bad file ›</button>' +
      '<button type="button" class="hot ai" id="join"><i>AI</i>A new ' + esc(W.unit) + ' joins ›</button><button type="button" class="hot ai" id="askb"><i>AI</i>Ask it a question ›</button>';
    $("replay").onclick = function () { sel = null; $("detail").innerHTML = ""; play(); };
    $("break").onclick = chooser;
    $("join").onclick = joinChooser;
    $("askb").onclick = askUI;
  }
  function menu() { cap("Three things to try. Each one runs for real."); acts(); }

  // ---------- beat 2: look at one site ----------
  function select(slug, scroll) {
    var u = unit(slug); if (!u) return;
    if (sel && dotEl(sel)) dotEl(sel).classList.remove("sel");
    sel = slug; dotEl(slug).classList.add("sel");
    [].forEach.call(document.querySelectorAll(".dot.beat"), function (el) { el.classList.remove("beat"); });
    var q = u.question, st = u.status;
    var note = q ? '<div class="openq"><b>Its file did not add up, so a person was asked</b><p>' + esc(q.text) + "</p><small>Asked " + (u.askedDays === 0 ? "today" : u.askedDays + " day" + (u.askedDays === 1 ? "" : "s") + " ago") + " · " + esc(q.who) + " · its numbers still count, marked as not yet confirmed, until someone answers</small></div>"
      : st === "stale" ? '<div class="openq"><b>No file has arrived for ' + u.staleDays + " days</b><p>" + esc(W.staleText) + "</p></div>"
      : st === "manual" ? '<div class="openq"><b>This ' + esc(W.unit) + " has no system</b><p>Someone fills in a spreadsheet each month and uploads it. It goes through the same checks as every other file.</p></div>"
      : '<div class="openq good"><b>Nothing to chase</b><p>Every file from this ' + esc(W.unit) + " arrived on time and passed its checks.</p></div>";
    var bands = u.bands.map(function (b) { return '<div class="band' + (b.over ? " over" : "") + '"><div>' + esc(b.name) + '</div><div class="track"><i style="width:' + Math.min(100, b.enr / b.cap * 100).toFixed(0) + '%"></i></div><div class="t">' + num(b.enr) + " of " + num(b.cap) + "</div></div>"; }).join("");
    var SP = { ok: "p-ok", question: "p-ask", stale: "p-stale", manual: "p-manual" };
    var src = u.sources.map(function (x) {
      var label = x.state === "question" ? "Open question" : x.state === "stale" ? "No fresh file" : x.passed + " of " + x.total + " checks passed";
      return "<tr><td class='name'>" + esc(x.label) + "</td><td>" + esc(x.from) + "<small>" + esc(x.file) + "</small></td><td class='hide-s'>" + esc(x.when) + "</td><td><span class='pill " + SP[x.state] + "'>" + label + "</span></td></tr>"; }).join("");
    $("detail").innerHTML = '<div class="g-card"><div class="g-head"><div><h2>' + esc(u.name) + "</h2><span>" + esc(u.country) + " · runs " + esc(V.systems[u.sys].name) + '</span></div><span class="pill p-' + st + '">' + STATUS[st] + "</span></div>" + note +
      '<div class="cols2"><div><h3>' + esc(W.bandsTitle) + '</h3><div class="hint">' + esc(W.bandsHint) + '</div><div class="bands">' + bands + "</div></div>" +
      "<div><h3>Where its numbers come from</h3><table class='src'><tr><th>Number</th><th>File</th><th class='hide-s'>Arrived</th><th>Result</th></tr>" + src + "</table></div></div></div>";
    if (scroll) { track("oneview_branch"); $("detail").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" }); }
  }

  // ---------- beat 3: send a file yourself ----------
  function chooser() {
    var show = function () {
      cap("<b>3</b> Pick a file for the " + esc(files.site) + " " + esc(W.unit) + " to send. It goes through the real system.");
      $("act").innerHTML = files.files.filter(function (f) { return f.key !== "good"; }).map(function (f) { return '<button type="button" class="hot" data-k="' + f.key + '">' + esc(f.title) + "</button>"; }).join("") + '<button type="button" class="ghost" id="more">Back</button>';
      [].forEach.call($("act").querySelectorAll("button[data-k]"), function (b) { b.onclick = function () { send(b.getAttribute("data-k")); }; });
      $("more").onclick = menu;
    };
    if (files) show(); else get("/demo/files").then(function (f) { files = f; show(); });
  }
  function send(key) {
    if (busy) return; busy = true;
    var u = unit(files.slug), f = files.files.filter(function (x) { return x.key === key; })[0];
    cap("<b>3</b> Sending <i>" + esc(f.filename) + "</i>…");
    $("act").innerHTML = "";
    [].forEach.call(document.querySelectorAll(".chip.mine"), function (c) { c.parentNode.removeChild(c); });
    track("oneview_run", { file: key });
    $("stage").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
    calling = true;
    post("/demo/run", { scenario: key }).then(function (r) {
      calling = false;
      var bad = r.status !== "accepted";
      var land = function () {
        test = { site: u.slug, status: r.unit.status }; paint(); settle(); busy = false;
        if (bad) chip({ slug: u.slug, name: u.name, question: { text: r.questions[0].text, who: r.questions[0].owner } }, true);
        cap(bad ? "<b>3</b> <strong>Caught.</strong> It never reached the number unflagged. Nobody has to spot it in a meeting three weeks later."
          : "<b>3</b> <strong>Clean.</strong> The corrected file passed every check and went straight through.");
        $("act").innerHTML = (bad ? '<button type="button" class="hot" id="fix">Send the corrected file ›</button>' : "") + '<button type="button" class="ghost" id="again">Try another file</button><button type="button" class="ghost" id="more">Back</button>';
        if (bad) $("fix").onclick = function () { send("good"); };
        $("again").onclick = chooser;
        $("more").onclick = menu;
        report(f, r);
      };
      if (still) return land();
      fly(route(u, bad), SYSC[u.sys], function () { pulse(bad); }, land);
    }).catch(function (e) { oops(3, e); });
  }
  function report(f, r) {
    var rows = r.trace.map(function (t) {
      if (t.step === "asked") return '<li class="asked bad in"><span class="ic">?</span><span><b>A question goes to the ' + esc(t.owner.toLowerCase()) + "</b><small>" + esc(t.text) + "</small></span></li>";
      if (t.step === "accepted") return '<li class="done in"><span class="ic">✓</span><span><b>Accepted</b><small>' + esc(t.text) + "</small></span></li>";
      var title = t.step === "check" ? "Check: " + t.label : { received: "The file arrives", recognised: "The system works out who sent it", mapped: "It is translated into the " + S.p.org + "'s terms", held: "Flagged for a person", rejected: "Rejected" }[t.step] || t.step;
      return '<li class="in ' + (t.bad ? "bad" : "") + '"><span class="ic">' + (t.bad ? "✕" : "✓") + "</span><span><b>" + esc(title) + "</b><small>" + esc(t.text) + "</small></span></li>";
    }).join("");
    $("detail").innerHTML = '<div class="g-card"><div class="g-head"><div><h2>What just happened</h2><span>That ran for real, in ' + r.ms + " milliseconds, and was then undone so the next visitor starts clean.</span></div></div>" +
      '<div class="run-grid"><div><h3>The file, exactly as it arrived</h3><div class="raw"><span class="fn">' + esc(f.filename) + "</span>" + esc(f.content) + '</div><p class="hint">' + esc(f.blurb) + "</p></div>" +
      '<div><h3>What the system did with it</h3><ol class="trace">' + rows + "</ol></div></div></div>";
  }
  function oops(n, e) { busy = false; calling = false; cap("<b>" + n + "</b> " + esc(e && e.detail ? e.detail : e && e.message === "429" ? "That is a lot in a short time. Give it a moment." : "That did not come back. Try again.")); acts(); }

  // ---------- beat 4: a site joins on a system nobody has seen; AI works out how to read it ----------
  function joinChooser() {
    var show = function () {
      if (!aif.enabled) { cap("<b>4</b> The AI features are switched off on this copy of the demo."); return acts(); }
      cap("<b>4</b> The " + esc(S.p.org) + " has just added a " + esc(W.unit) + " that runs a system nobody here has seen. Pick one.");
      $("act").innerHTML = aif.files.map(function (f) { return '<button type="button" class="hot ai" data-k="' + f.key + '">' + esc(f.name) + ", " + esc(f.place) + "</button>"; }).join("") + '<button type="button" class="ghost" id="more">Back</button>';
      [].forEach.call($("act").querySelectorAll("button[data-k]"), function (b) { b.onclick = function () { join(b.getAttribute("data-k")); }; });
      $("more").onclick = menu;
    };
    if (aif) show(); else get("/ai/files").then(function (f) { aif = f; show(); }).catch(function (e) { oops(4, e); });
  }
  function fileCard(f, right) {
    return '<div class="run-grid"><div><h3>The file, exactly as it arrived</h3><div class="raw"><span class="fn">' + esc(f.filename) + "</span>" + esc(f.content) + '</div><p class="hint">' + esc(f.blurb || "") + "</p></div><div>" + right + "</div></div>";
  }
  function join(key) {
    if (busy) return; busy = true;
    var f = aif.files.filter(function (x) { return x.key === key; })[0];
    joined = { key: key, name: f.name, place: f.place, mapped: false }; sel = null;
    draw(); track("oneview_join", { file: key });
    $("act").innerHTML = "";
    cap("<b>4</b> " + esc(f.name) + " has joined. AI is reading its file and working out how it fits the " + esc(S.p.org) + "'s definitions<span class=\"dots3\"></span>");
    $("detail").innerHTML = '<div class="g-card">' + fileCard(f, '<h3>What the AI worked out</h3><p class="empty">Working on it. This is a live call to ' + esc(aif.model) + " and takes a few seconds.</p>") + "</div>";
    $("stage").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
    calling = true;
    post("/ai/map", { file: key }).then(function (d) {
      calling = false;
      var done = function () {
        busy = false; settle(); paint();
        cap(d.ok ? "<b>4</b> <strong>Mapped.</strong> AI worked out how to read it" + (d.cached ? " on an earlier run" : " in " + (d.ms / 1000).toFixed(0) + " seconds") + ". Ordinary code then ran the checks, and all of them passed. A person approves the mapping before it is used."
          : "<b>4</b> The AI's proposal did not pass the checks, so nothing was added to the number. A person would sort this one out by hand.");
        $("act").innerHTML = '<button type="button" class="hot ai" id="other">Try the other ' + esc(W.unit) + '</button><button type="button" class="ghost" id="more">Back</button>';
        $("other").onclick = function () { joined = null; draw(); joinChooser(); };
        $("more").onclick = menu;
      };
      var cols = d.proposal.columns.map(function (c) { return "<tr><td class='name'>" + esc(c.theirs) + "</td><td>→ " + esc(c.ours) + "<small>" + esc(c.why) + "</small></td></tr>"; }).join("");
      var lines = d.proposal.lines.map(function (c) { return "<tr><td class='name'>" + esc(c.theirs) + "</td><td>→ " + (c.ours ? esc(c.ours) : "<i>no match</i>") + "</td></tr>"; }).join("");
      var probs = d.problems.length ? '<div class="openq"><b>Not usable as it stands</b><p>' + d.problems.map(esc).join("<br>") + "</p></div>" : "";
      var checks = d.checks.length ? '<p class="verdict ' + (d.ok ? "ok" : "bad") + '">' + (d.ok ? "✓" : "✕") + " Then ordinary code read the file with that mapping and ran the checks: <b>" + d.passed + " of " + d.total + " passed</b>. " + esc(tx(S.found, { done: num(d.done), due: num(d.due) })) + "</p>" : "";
      $("detail").innerHTML = '<div class="g-card"><div class="g-head"><div><h2>' + esc(d.branch) + ", " + esc(d.place) + "</h2><span>" + (d.cached ? "Today's AI budget is used up, so this is the answer " + esc(d.model) + " gave on an earlier run." : "A live call to " + esc(d.model) + ", " + (d.ms / 1000).toFixed(1) + " seconds.") + "</span></div></div>" +
        fileCard(f, "<h3>What the AI worked out</h3><p class=\"hint\">" + esc(d.proposal.summary) + "</p>" + probs +
          "<table class='map'><tr><th>Their column</th><th>" + esc(S.ourCol) + "</th></tr>" + cols + "</table>" +
          "<table class='map'><tr><th>Their label</th><th>" + esc(S.ourLine) + "</th></tr>" + lines + "</table>" + checks) + "</div>";
      if (!d.ok) { joined.mapped = false; return done(); }
      joined.mapped = true; joined.enr = d.done; draw(); paint();
      var u = all().filter(function (x) { return x.slug === "joined"; })[0], el = dotEl("joined");
      el.style.fill = "transparent"; el.style.stroke = SYSC.N;
      if (still) return done();
      totals(V.units.length, sum(V.units, function (x) { return x.enr; }));   // hold the number until the new file lands
      fly(route(u, false), SYSC.N, function () { pulse(false); }, done);
    }).catch(function (e) { joined = null; draw(); $("detail").innerHTML = ""; oops(4, e); });
  }

  // ---------- beat 5: ask about the numbers in plain English ----------
  function askUI() {
    var show = function () {
      if (!aif.enabled) { cap("<b>5</b> The AI features are switched off on this copy of the demo."); return acts(); }
      cap("<b>5</b> Ask about this month's numbers, in your own words.");
      $("act").className = "s-act full";
      $("act").innerHTML = '<form id="askf"><input id="askq" maxlength="200" autocomplete="off" placeholder="' + esc(S.asks[0]) + '" aria-label="Your question"><button type="submit" class="hot ai">Ask</button><button type="button" class="ghost" id="more">Back</button></form>' +
        '<div class="sugg">' + S.asks.map(function (q) { return '<button type="button" class="ghost">' + esc(q) + "</button>"; }).join("") + "</div>";
      $("askf").onsubmit = function (e) { e.preventDefault(); askIt($("askq").value); };
      [].forEach.call($("act").querySelectorAll(".sugg button"), function (b) { b.onclick = function () { askIt(b.textContent); }; });
      $("more").onclick = menu;
    };
    if (aif) show(); else get("/ai/files").then(function (f) { aif = f; show(); }).catch(function (e) { oops(5, e); });
  }
  function askIt(q) {
    q = (q || "").trim(); if (busy || q.length < 3) return; busy = true;
    track("oneview_ask");
    cap("<b>5</b> Reading the numbers<span class=\"dots3\"></span>");
    [].forEach.call($("act").querySelectorAll("button, input"), function (b) { b.disabled = true; });
    calling = true;
    post("/ai/ask", { question: q }).then(function (d) {
      busy = false; calling = false; askUI();
      cap("<b>5</b> " + (d.can_answer ? "Answered from the stored numbers. Ask another, or click a " + esc(W.unit) + " it mentions." : "It only answers questions about this " + esc(S.p.org) + "'s numbers."));
      [].forEach.call(document.querySelectorAll(".dot.beat"), function (el) { el.classList.remove("beat"); });
      d.branches.forEach(function (sl) { var el = dotEl(sl); if (el) el.classList.add("beat"); });
      var chips = d.branches.map(function (sl) { var u = unit(sl); return u ? '<button type="button" class="bchip" data-s="' + sl + '">' + esc(u.name) + "</button>" : ""; }).join("");
      var badge = !d.can_answer ? "" : d.unverified.length
        ? '<p class="verdict bad">✕ ' + d.unverified.length + " figure" + (d.unverified.length === 1 ? "" : "s") + " in that answer could not be matched to the stored numbers: " + d.unverified.map(esc).join(", ") + ". Treat it with care.</p>"
        : '<p class="verdict ok">✓ Every figure in that answer was checked against the stored numbers.</p>';
      $("detail").innerHTML = '<div class="g-card ans"><div class="who">You asked</div><h2>' + esc(d.question) + '</h2><p class="answer">' + esc(d.answer) + "</p>" + badge +
        (chips ? '<div class="bchips"><span>' + esc(W.unitsTitle) + " it mentions:</span>" + chips + "</div>" : "") +
        '<p class="hint">Answered by ' + esc(d.model) + " in " + (d.ms / 1000).toFixed(1) + " seconds, reading a table prepared from the database. Questions are sent to the AI model, so do not type anything private.</p></div>";
      [].forEach.call($("detail").querySelectorAll(".bchip"), function (b) { b.onclick = function () { select(b.getAttribute("data-s"), true); }; });
      $("detail").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
    }).catch(function (e) { busy = false; calling = false; askUI(); cap("<b>5</b> " + esc(e && e.detail ? e.detail : "That did not come back. Try again.")); });
  }

  // redraw when the page crosses between the wide and the tall scene (also covers a pane that was hidden at load)
  function refit() { if (V && L && $("svgwrap") && !busy && layout().wide !== L.wide) { draw(); if (played) finish(); } }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(refit, 200); });
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rz); rz = setTimeout(refit, 200); }).observe(app);
  window.addEventListener("hashchange", function () { if (V) page(); });
  function load() {
    busy = false;
    return get("/view").then(function (v) { V = v; S = v.scene; W = v.words; $("asof").textContent = ""; page(); })
      .catch(function () { if (O.tenant !== "distributor") { O.tenant = "distributor"; return load(); }
        app.innerHTML = '<p class="loading">The demo\'s server did not answer. It may be restarting; try again in a minute.</p>'; });
  }
  load();
})();
