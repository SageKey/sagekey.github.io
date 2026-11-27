// One view — a demo of a company-level view of every site, fed from the systems each site already runs.
// The page that loads this supplies the sites, the wording and the systems (window.VIEW).
// Every figure is generated here from the site's name, so it is stable between visits and obviously not real.
(function () {
  "use strict";
  var C = window.VIEW, app = document.getElementById("app");
  // Every word a reader sees. The defaults describe a school group; a config can replace any of them
  // (C.words) so the same view can describe branches, plants or clinics.
  var W = {
    unit: "school", units: "schools", group: "country", groupsTitle: "By country", groupCol: "Country", unitCol: "School", unitsTitle: "Schools",
    allUnits: "All schools", allGroups: "All countries", cur: "€",
    whoTop: "Group level · for owners and executives", whoMid: "Country level · for regional leaders", whoUnit: "School level · where each number comes from",
    h1: "{n} schools, one set of numbers.",
    sub: "The same definition in every school and country. Pick a country to see its schools, then a school to see where each number comes from.",
    midSub: "on the same definitions as every other country.",
    t1: "Students enrolled", t1bud: "against budget", t1ly: "on last year",
    t2: "Seats filled", t2rest: "{n} seats empty", t3: "Accepted for next year", t3ly: "on this date last year", t3from: "from {n} enquiries",
    t4: "Re-enrollment confirmed", t4ly: "on this date last year", t5: "Fees collected", t5rest: "{o} overdue of {b} billed",
    t6: "Staff", t6per: "{x} students per teacher", perAllStaff: false, t7: "Profit margin", t8: "Parent satisfaction",
    flagFill: "Only {p} full", flagRe: "Re-enrollment {n} points behind last year", flagAcc: "Acceptances for next year down {n}%", flagFees: "{o} in fees overdue",
    q1: "Which schools are less than 80% full?", q1a: "{p} full", q2: "Where is re-enrollment behind last year?", q3: "Where are overdue fees highest?", q4: "Which schools' numbers need checking today?",
    cEnr: "Enrolled", cFill: "Seats filled", cRe: "Re-enrollment", cCol: "Fees collected", cSat: "Parents",
    bandsTitle: "Seats by stage", bandsHint: "Enrolled against capacity.", bands: ["Early years", "Primary", "Lower secondary", "Upper secondary"],
    funnelTitle: "Admissions for next year", funnelLy: "acceptances on this date last year", funnel: ["Enquiries", "Visits", "Offers", "Accepted"],
    srcHint: "The school keeps its own systems. An agent reads each one and translates it into the group definition. This school records enrollment as \"{term}\", which maps to Students enrolled.",
    srcRows: ["Enrolled, seats, re-enrollment", "Admissions pipeline", "Fees billed and collected", "Staff", "Parent satisfaction"],
    srcFrom: ["", "Admissions list", "Finance system, {g}", "Payroll, {g}", "Survey"],
    qCap: "{band} shows {n} enrolled against a capacity of {c}. Is the capacity list out of date?", qFees: "Fees collected fell {n} points in one load. Was a billing run reversed?",
    qYear: "{n} students have no year group. Can you assign them?", owners: { cap: "School business manager", fees: "Finance lead", year: "Admissions officer" },
    healthHint: "Every load is checked. A school with an open question is marked until someone answers it.",
    openQ: "Open question for this school", staleText: "The numbers shown are from the last good load. The school's system owner has been asked why the export stopped.",
    manualTitle: "This school uploads a file by hand each month", manualText: "It has no system to connect to yet. The next upload is due on 3 December.",
    sizeHint: "An agent is built once per system. What differs between schools is the set-up, and that is a mapping. On these assumptions: {s} connections and {n} mappings, not {n} separate builds."
  };
  Object.keys(C.words || {}).forEach(function (k) { W[k] = C.words[k]; });
  var GUESS = C.noPlaceholderTag ? "" : '<span class="guess">Placeholder</span>';
  function tx(str, o) { return str.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  document.getElementById("asof").textContent = "As of " + C.asOf;

  // ---------- helpers ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slug(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function pct(x, d) { return (x * 100).toFixed(d || 0) + "%"; }
  function eur(k) { return k >= 1000 ? W.cur + (k / 1000).toFixed(1) + "m" : W.cur + Math.round(k) + "k"; }
  function sum(list, f) { var t = 0; for (var i = 0; i < list.length; i++) t += f(list[i]); return t; }
  // a change, in words: "+2.1 pts vs last year"
  function delta(v, unit, what, goodHigh) {
    var a = Math.abs(v), flat = a < (unit === "pts" ? 0.3 : 0.5);
    var cls = flat ? "flat" : ((v > 0) === (goodHigh !== false) ? "up" : "down");
    var txt = flat ? "Level" : (v > 0 ? "+" : "−") + a.toFixed(1) + (unit === "pts" ? " pts" : "%");
    return '<span class="' + cls + '">' + txt + "</span> " + what;
  }
  function spark(pts, good) {
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), w = 200, h = 34, r = hi - lo || 1;
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + (i * w / (pts.length - 1)).toFixed(1) + " " + (h - 3 - (p - lo) / r * (h - 6)).toFixed(1); }).join(" ");
    return '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + (good ? "#27a376" : "#d0574c") + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  // ---------- sample data ----------
  var BANDS = [[W.bands[0], 0.14], [W.bands[1], 0.36], [W.bands[2], 0.28], [W.bands[3], 0.22]];
  var OWNERS = W.owners;
  function build(s) {
    var r = rng(hash(s.name)), k = C.countries[s.country];
    var target = s.students || Math.round((k.lo + r() * (k.hi - k.lo)) * (C.scale || 1));
    var fill = 0.70 + r() * 0.28;
    var bands = BANDS.map(function (b) {
      var cap = Math.max(10, Math.round(target / fill * b[1] / 5) * 5);
      return { name: b[0], cap: cap, enr: Math.round(cap * Math.min(0.99, Math.max(0.5, fill + (r() - 0.5) * 0.16))) };
    });
    var x = r(), status = x < 0.80 ? "ok" : x < 0.89 ? "ask" : x < 0.95 ? "stale" : "manual";
    var qkind = ["cap", "fees", "year"][Math.floor(r() * 3)], question = null;
    if (status === "ask" && qkind === "cap") { var b = bands[1 + Math.floor(r() * 3)]; b.enr = b.cap + 2 + Math.floor(r() * 4); b.over = true;
      question = { text: tx(W.qCap, { band: b.name, n: b.enr, c: b.cap }), who: OWNERS.cap, src: "records" }; }
    var enr = sum(bands, function (b) { return b.enr; }), cap = sum(bands, function (b) { return b.cap; });
    var ly = Math.round(enr * (0.925 + r() * 0.10)), bud = Math.round(enr * (0.985 + r() * 0.06));
    var enq = Math.round(enr * (0.25 + r() * 0.25)), vis = Math.round(enq * (0.45 + r() * 0.2)), off = Math.round(vis * (0.6 + r() * 0.2)), acc = Math.round(off * (0.55 + r() * 0.25));
    var accLY = Math.round(acc * (0.78 + r() * 0.36));
    var re = 0.55 + r() * 0.30, reLY = Math.min(0.95, Math.max(0.4, re + (r() - 0.36) * 0.14));
    var billed = enr * k.fee * 0.42, col = 0.86 + r() * 0.12, overdue = billed * (1 - col) * 0.6;
    var staff = Math.max(4, Math.round(enr / ((C.perStaffLo || 5.5) + r() * (C.perStaffSpan || 3)))), teachers = Math.round(staff * 0.62), vac = Math.floor(r() * 4);
    var margin = 0.16 + r() * 0.18, marginBud = margin + (r() - 0.36) * 0.06;
    var parent = 7.2 + r() * 1.9, parentPrev = parent + (r() - 0.72) * 0.6;
    var trend = []; for (var i = 0; i < 12; i++) trend.push(Math.round(ly + (enr - ly) * (i / 11) + (r() - 0.5) * enr * 0.012)); trend[11] = enr;
    if (status === "ask" && qkind === "fees") question = { text: tx(W.qFees, { n: 12 + Math.floor(r() * 9) }), who: OWNERS.fees, src: "fees" };
    if (status === "ask" && qkind === "year") question = { text: tx(W.qYear, { n: 4 + Math.floor(r() * 14) }), who: OWNERS.year, src: "records" };
    var days = 1 + Math.floor(r() * 4), stale = 6 + Math.floor(r() * 9);
    var sys = status === "manual" ? "X" : (C.sysOverride(s) || k.sys);
    return { name: s.name, country: s.country, city: s.city || "", slug: slug(s.name), bands: bands, enr: enr, cap: cap, ly: ly, bud: bud,
      enq: enq, vis: vis, off: off, acc: acc, accLY: accLY, re: re, reLY: reLY, billed: billed, col: col, overdue: overdue, rev: enr * k.fee,
      staff: staff, teachers: teachers, vac: vac, margin: margin, marginBud: marginBud, parent: parent, parentPrev: parentPrev, trend: trend,
      status: status, question: question, askedDays: days, staleDays: stale, sys: sys, term: (C.systems[sys] && C.systems[sys].term) || k.term };
  }
  var U = (C.units || window.SCHOOLS || SCHOOLS).map(build);   // data.js declares SCHOOLS with const, so it is not on window
  var COUNTRIES = Object.keys(C.countries).filter(function (c) { return U.some(function (u) { return u.country === c; }); })
    .sort(function (a, b) { return sum(of(b), function (u) { return u.enr; }) - sum(of(a), function (u) { return u.enr; }); });
  function of(c) { return U.filter(function (u) { return u.country === c; }); }

  function agg(list) {
    var enr = sum(list, function (u) { return u.enr; }), cap = sum(list, function (u) { return u.cap; }), ly = sum(list, function (u) { return u.ly; });
    var billed = sum(list, function (u) { return u.billed; }), rev = sum(list, function (u) { return u.rev; });
    var w = function (f) { return sum(list, function (u) { return f(u) * u.enr; }) / enr; };
    var trend = []; for (var i = 0; i < 12; i++) trend.push(sum(list, function (u) { return u.trend[i]; }));
    return { n: list.length, enr: enr, cap: cap, ly: ly, bud: sum(list, function (u) { return u.bud; }), fill: enr / cap,
      fillLY: ly / cap, acc: sum(list, function (u) { return u.acc; }), accLY: sum(list, function (u) { return u.accLY; }),
      enq: sum(list, function (u) { return u.enq; }), vis: sum(list, function (u) { return u.vis; }), off: sum(list, function (u) { return u.off; }),
      re: w(function (u) { return u.re; }), reLY: w(function (u) { return u.reLY; }), billed: billed,
      col: sum(list, function (u) { return u.col * u.billed; }) / billed, overdue: sum(list, function (u) { return u.overdue; }),
      staff: sum(list, function (u) { return u.staff; }), teachers: sum(list, function (u) { return u.teachers; }), vac: sum(list, function (u) { return u.vac; }),
      margin: sum(list, function (u) { return u.margin * u.rev; }) / rev, marginBud: sum(list, function (u) { return u.marginBud * u.rev; }) / rev,
      parent: w(function (u) { return u.parent; }), parentPrev: w(function (u) { return u.parentPrev; }), trend: trend,
      ok: list.filter(function (u) { return u.status === "ok"; }).length, ask: list.filter(function (u) { return u.status === "ask"; }).length,
      stale: list.filter(function (u) { return u.status === "stale"; }).length, manual: list.filter(function (u) { return u.status === "manual"; }).length };
  }

  // things worth a conversation, worst first
  function flags(list) {
    var out = [];
    list.forEach(function (u) {
      if (u.enr / u.cap < 0.76) out.push({ u: u, score: (0.76 - u.enr / u.cap) * 300, msg: tx(W.flagFill, { p: pct(u.enr / u.cap) }) });
      if (u.re - u.reLY < -0.04) out.push({ u: u, score: (u.reLY - u.re) * 260, msg: tx(W.flagRe, { n: Math.round((u.reLY - u.re) * 100) }) });
      if (u.acc / u.accLY < 0.86) out.push({ u: u, score: (1 - u.acc / u.accLY) * 90, msg: tx(W.flagAcc, { n: Math.round((1 - u.acc / u.accLY) * 100) }) });
      if (u.col < 0.885) out.push({ u: u, score: (0.885 - u.col) * 420, msg: tx(W.flagFees, { o: eur(u.overdue) }) });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }
  var STATUS = { ok: "Checked today", ask: "Waiting on a person", stale: "No fresh data", manual: "Uploaded by hand" };
  function pill(u) { return '<span class="pill p-' + u.status + '">' + STATUS[u.status] + "</span>"; }
  function bar(x) { return '<span class="bar ' + (x < 0.78 ? "lo" : x < 0.86 ? "mid" : "") + '"><i style="width:' + Math.min(100, x * 100).toFixed(0) + '%"></i></span>'; }
  function link(u) { return '<a href="#/s/' + u.slug + '">' + esc(u.name) + "</a>"; }

  function tiles(a, level) {
    var t = [
      [W.t1, num(a.enr), delta((a.enr / a.bud - 1) * 100, "%", W.t1bud) + " · " + delta((a.enr / a.ly - 1) * 100, "%", W.t1ly), spark(a.trend, a.enr >= a.ly)],
      [W.t2, pct(a.fill), tx(W.t2rest, { n: num(a.cap - a.enr) }) + " · " + delta((a.fill - a.fillLY) * 100, "pts", W.t1ly), ""],
      [W.t3, num(a.acc), delta((a.acc / a.accLY - 1) * 100, "%", W.t3ly) + " · " + tx(W.t3from, { n: num(a.enq) }), ""],
      [W.t4, pct(a.re), delta((a.re - a.reLY) * 100, "pts", W.t4ly), ""],
      [W.t5, pct(a.col), tx(W.t5rest, { o: eur(a.overdue), b: eur(a.billed) }), ""],
      [W.t6, num(a.staff), a.vac + " open post" + (a.vac === 1 ? "" : "s") + " · " + tx(W.t6per, { x: (a.enr / (W.perAllStaff ? a.staff : a.teachers)).toFixed(1) }), ""],
      [W.t7, pct(a.margin, 1), delta((a.margin - a.marginBud) * 100, "pts", "against budget"), ""],
      [W.t8, a.parent.toFixed(1) + "<small>/ 10</small>", (Math.abs(a.parent - a.parentPrev) < 0.05 ? '<span class="flat">Level</span> with' : '<span class="' + (a.parent > a.parentPrev ? "up" : "down") + '">' + (a.parent > a.parentPrev ? "+" : "−") + Math.abs(a.parent - a.parentPrev).toFixed(1) + "</span> on") + " the last survey", ""]
    ];
    return '<div class="tiles">' + t.map(function (x) { return '<div class="tile"><div class="l">' + x[0] + '</div><div class="v">' + x[1] + '</div><div class="d">' + x[2] + "</div>" + x[3] + "</div>"; }).join("") + "</div>";
  }
  function health(a, list, limit) {
    var seg = function (k, n) { return n ? '<i class="s-' + k + '" style="flex:' + n + '"></i>' : ""; };
    var qs = list.filter(function (u) { return u.status === "ask"; }).slice(0, limit || 3);
    return '<div class="panel"><h3>Can these numbers be trusted today?</h3><div class="hint">' + W.healthHint + "</div>" +
      '<div class="hbar">' + seg("ok", a.ok) + seg("ask", a.ask) + seg("stale", a.stale) + seg("manual", a.manual) + "</div>" +
      '<div class="hkey"><span class="k-ok"><b><em>' + a.ok + '</em></b><em>checked today</em></span><span class="k-ask"><b><em>' + a.ask + '</em></b><em>waiting on a person</em></span>' +
      '<span class="k-stale"><b><em>' + a.stale + '</em></b><em>no fresh data</em></span><span class="k-manual"><b><em>' + a.manual + '</em></b><em>uploaded by hand</em></span></div>' +
      (qs.length ? '<ul class="qs">' + qs.map(function (u) { return "<li>" + link(u) + ": " + esc(u.question.text) + "<small>Asked " + u.askedDays + " day" + (u.askedDays === 1 ? "" : "s") + " ago · " + u.question.who + "</small></li>"; }).join("") + "</ul>" : "") + "</div>";
  }
  function flagPanel(list, limit, title) {
    var f = flags(list).slice(0, limit);
    return '<div class="panel"><h3>' + title + '</h3><div class="hint">Compared with the same date last year. These are comparisons, not forecasts.</div>' +
      (f.length ? '<ul class="flags">' + f.map(function (x) { return '<li><div class="w">' + link(x.u) + "<span>" + esc(x.u.country) + '</span></div><div class="m">' + x.msg + "</div></li>"; }).join("") + "</ul>"
        : '<p class="note">Nothing flagged.</p>') + "</div>";
  }

  // ---------- group ----------
  var QUESTIONS = [
    [W.q1, function () { return U.filter(function (u) { return u.enr / u.cap < 0.8; }).sort(function (a, b) { return a.enr / a.cap - b.enr / b.cap; }).map(function (u) { return [u, tx(W.q1a, { p: pct(u.enr / u.cap) })]; }); }],
    [W.q2, function () { return U.filter(function (u) { return u.re < u.reLY - 0.02; }).sort(function (a, b) { return (a.re - a.reLY) - (b.re - b.reLY); }).map(function (u) { return [u, Math.round((u.reLY - u.re) * 100) + " pts behind"]; }); }],
    [W.q3, function () { return U.slice().sort(function (a, b) { return b.overdue - a.overdue; }).map(function (u) { return [u, eur(u.overdue)]; }); }],
    [W.q4, function () { return U.filter(function (u) { return u.status !== "ok"; }).map(function (u) { return [u, STATUS[u.status]]; }); }]
  ];
  function group() {
    var a = agg(U);
    crumbs([]);
    var rows = COUNTRIES.map(function (c) {
      var l = of(c), x = agg(l);
      return '<tr class="row"><td class="name"><a href="#/c/' + encodeURIComponent(c) + '">' + esc(c) + "</a></td><td class='n'>" + x.n + "</td><td class='n'>" + num(x.enr) + "</td><td>" + bar(x.fill) + pct(x.fill) +
        "</td><td class='hide-s'>" + pct(x.re) + " " + delta((x.re - x.reLY) * 100, "pts", "") + "</td><td class='n hide-s'>" + pct(x.col) + "</td><td>" +
        '<span class="dots">' + l.map(function (u) { return '<i class="s-' + u.status + '" title="' + esc(u.name) + ": " + STATUS[u.status] + '"></i>'; }).join("") + "</span></td></tr>";
    }).join("");
    var sys = {}; U.forEach(function (u) { sys[u.sys] = (sys[u.sys] || 0) + 1; });
    var srows = Object.keys(C.systems).filter(function (k) { return sys[k]; }).map(function (k) {
      var s = C.systems[k]; return "<tr><td class='name'>" + s.name + "<small>" + s.note + "</small></td><td class='n'>" + sys[k] + "</td><td>" + s.link + "</td></tr>"; }).join("");
    var nsys = Object.keys(sys).filter(function (k) { return k !== "X"; }).length;
    app.innerHTML =
      '<div class="who">' + W.whoTop + "</div><h1>" + tx(W.h1, { n: a.n }) + "</h1>" +
      '<p class="sub">' + W.sub + "</p>" +
      tiles(a) +
      '<div class="two">' + flagPanel(U, 6, "Needs a conversation") + health(a, U, 3) + "</div>" +
      '<div class="ask"><h3>Ask the numbers</h3><div class="hint">Example questions, answered from the figures on this page. In the real thing you type your own.</div>' +
        '<div class="chips">' + QUESTIONS.map(function (q, i) { return '<button type="button" data-q="' + i + '" aria-pressed="false">' + q[0] + "</button>"; }).join("") + '</div><div id="ans"></div></div>' +
      "<h2>" + W.groupsTitle + "</h2>" +
      "<table><tr><th>" + W.groupCol + "</th><th class='n'>" + W.unitsTitle + "</th><th class='n'>" + W.cEnr + "</th><th>" + W.cFill + "</th><th class='hide-s'>" + W.cRe + "</th><th class='n hide-s'>" + W.cCol + "</th><th>Data health</th></tr>" + rows + "</table>" +
      '<h2>The size of the job' + GUESS + '</h2><p class="hint">' + tx(W.sizeHint, { s: nsys, n: a.n }) + "</p>" +
      "<table><tr><th>System</th><th class='n'>" + W.unitsTitle + "</th><th>How it connects</th></tr>" + srows + "</table>";
    [].forEach.call(app.querySelectorAll(".chips button"), function (b) {
      b.onclick = function () {
        [].forEach.call(app.querySelectorAll(".chips button"), function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        var q = QUESTIONS[+b.getAttribute("data-q")], res = q[1](), top = res.slice(0, 8);
        document.getElementById("ans").innerHTML = '<div class="ans"><p>' + (res.length === U.length ? "The eight highest:" : res.length ? res.length + " " + (res.length === 1 ? W.unit : W.units) + (res.length > 8 ? ". The first eight:" : ":") : "None today.") + "</p>" +
          (top.length ? "<ol>" + top.map(function (r) { return "<li><b>" + r[1] + "</b>" + link(r[0]) + " <span>" + esc(r[0].country) + "</span></li>"; }).join("") + "</ol>" : "") + "</div>";
      };
    });
  }

  // ---------- country ----------
  function country(c) {
    var l = of(c); if (!l.length) return group();
    var a = agg(l);
    crumbs([[c]]);
    var rows = l.slice().sort(function (x, y) { return y.enr - x.enr; }).map(function (u) {
      return '<tr class="row"><td class="name">' + link(u) + "<small>" + esc(u.city) + "</small></td><td class='n'>" + num(u.enr) + "</td><td>" + bar(u.enr / u.cap) + pct(u.enr / u.cap) +
        "</td><td class='hide-s'>" + pct(u.re) + " " + delta((u.re - u.reLY) * 100, "pts", "") + "</td><td class='n hide-s'>" + pct(u.col) + "</td><td class='n hide-s'>" + u.parent.toFixed(1) + "</td><td>" + pill(u) + "</td></tr>";
    }).join("");
    app.innerHTML = '<div class="who">' + W.whoMid + "</div><h1>" + esc(c) + "</h1>" +
      '<p class="sub">' + a.n + " " + (a.n === 1 ? W.unit : W.units) + ", " + W.midSub + "</p>" + tiles(a) +
      '<div class="two">' + flagPanel(l, 5, "Needs a conversation") + health(a, l, 4) + "</div>" +
      "<h2>" + W.unitsTitle + "</h2><table><tr><th>" + W.unitCol + "</th><th class='n'>" + W.cEnr + "</th><th>" + W.cFill + "</th><th class='hide-s'>" + W.cRe + "</th><th class='n hide-s'>" + W.cCol + "</th><th class='n hide-s'>" + W.cSat + "</th><th>Data</th></tr>" + rows + "</table>" +
      '<a class="back" href="#/">‹ ' + W.allGroups + "</a>";
  }

  // ---------- school ----------
  function school(sl) {
    var u = U.filter(function (x) { return x.slug === sl; })[0]; if (!u) return group();
    var a = agg([u]), s = C.systems[u.sys];
    crumbs([[u.country, "#/c/" + encodeURIComponent(u.country)], [u.name]]);
    var bands = u.bands.map(function (b) { return '<div class="band' + (b.over ? " over" : "") + '"><div>' + b.name + '</div><div class="track"><i style="width:' + Math.min(100, b.enr / b.cap * 100).toFixed(0) + '%"></i></div><div class="t">' + b.enr + " of " + b.cap + "</div></div>"; }).join("");
    var f = [[W.funnel[0], u.enq], [W.funnel[1], u.vis], [W.funnel[2], u.off], [W.funnel[3], u.acc]];
    var funnel = f.map(function (x) { return '<div class="fstep"><div>' + x[0] + '</div><div class="track"><i style="width:' + (x[1] / u.enq * 100).toFixed(0) + '%"></i></div><div class="t">' + num(x[1]) + "</div></div>"; }).join("");
    var when = u.status === "manual" ? "Uploaded 3 Nov" : u.status === "stale" ? "Last good load " + u.staleDays + " days ago" : "Today 06:10";
    var q = u.question, bad = function (src) { return q && q.src === src; };
    var st = function (src, t) { return bad(src) ? '<span class="pill p-ask">Open question</span>' : u.status === "stale" && src === "records" ? '<span class="pill p-stale">No fresh data</span>' : u.status === "manual" && src === "records" ? '<span class="pill p-manual">By hand</span>' : '<span class="pill p-ok">' + t + "</span>"; };
    var src = "<table><tr><th>Number</th><th>Where it comes from</th><th class='hide-s'>Last pulled</th><th>Checks</th></tr>" +
      "<tr><td class='name'>" + W.srcRows[0] + "</td><td>" + s.name + "</td><td class='hide-s'>" + when + "</td><td>" + st("records", "6 of 6 passed") + "</td></tr>" +
      "<tr><td class='name'>" + W.srcRows[1] + "</td><td>" + W.srcFrom[1] + "</td><td class='hide-s'>Today 06:12</td><td>" + st("adm", "4 of 4 passed") + "</td></tr>" +
      "<tr><td class='name'>" + W.srcRows[2] + "</td><td>" + tx(W.srcFrom[2], { g: esc(u.country) }) + "</td><td class='hide-s'>Today 05:40</td><td>" + st("fees", "5 of 5 passed") + "</td></tr>" +
      "<tr><td class='name'>" + W.srcRows[3] + "</td><td>" + tx(W.srcFrom[3], { g: esc(u.country) }) + "</td><td class='hide-s'>Monday 05:30</td><td>" + st("hr", "3 of 3 passed") + "</td></tr>" +
      "<tr><td class='name'>" + W.srcRows[4] + "</td><td>" + W.srcFrom[4] + "</td><td class='hide-s'>Last survey, October</td><td>" + st("survey", "2 of 2 passed") + "</td></tr></table>";
    var note = q ? '<div class="openq"><b>' + W.openQ + "</b><p>" + esc(q.text) + "</p><small>Asked " + u.askedDays + " day" + (u.askedDays === 1 ? "" : "s") + " ago · " + q.who + " · the affected number stays marked until it is answered</small></div>"
      : u.status === "stale" ? '<div class="openq"><b>No file has arrived for ' + u.staleDays + " days</b><p>" + W.staleText + "</p></div>"
      : u.status === "manual" ? '<div class="openq"><b>' + W.manualTitle + "</b><p>" + W.manualText + "</p></div>" : "";
    app.innerHTML = '<div class="who">' + W.whoUnit + "</div><h1>" + esc(u.name) + "</h1>" +
      '<p class="sub">' + esc(u.city ? u.city + ", " : "") + esc(u.country) + " · " + pill(u) + "</p>" + tiles(a) + note +
      '<div class="cols2"><div class="panel"><h3>' + W.bandsTitle + '</h3><div class="hint">' + W.bandsHint + '</div><div class="bands">' + bands + "</div></div>" +
      '<div class="panel"><h3>' + W.funnelTitle + '</h3><div class="hint">' + delta((u.acc / u.accLY - 1) * 100, "%", W.funnelLy) + '</div><div class="funnel">' + funnel + "</div></div></div>" +
      '<h2>Where these numbers come from' + GUESS + '</h2><p class="hint">' + tx(W.srcHint, { term: esc(u.term) }) + "</p>" + src +
      '<a class="back" href="#/c/' + encodeURIComponent(u.country) + '">‹ ' + esc(u.country) + "</a>";
  }

  // ---------- routing ----------
  function crumbs(parts) {
    var h = parts.length ? '<a href="#/">' + W.allUnits + "</a>" : "<span>" + W.allUnits + "</span>";
    parts.forEach(function (p) { h += "<i>›</i>" + (p[1] ? '<a href="' + p[1] + '">' + esc(p[0]) + "</a>" : "<span>" + esc(p[0]) + "</span>"); });
    document.getElementById("crumbs").innerHTML = h;
  }
  function route() {
    var h = location.hash.replace(/^#\/?/, ""), p = h.split("/");
    if (p[0] === "c" && p[1]) country(decodeURIComponent(p[1]));
    else if (p[0] === "s" && p[1]) school(p[1]);
    else group();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  window.__view = { U: U, agg: agg };
})();
