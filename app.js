/* app.js — Oz Companion (celebrations + lively UX, drop-in)
   - Works with your current index.html/style.css (UMD React, Chart.js, confetti)
   - Splash shows rotating affirmations under Oz, auto-fades
   - Paw-print checklist per phase (Fast/Cleanse/Rebuild)
   - Phase checklists editable from Settings via clean modal popups
   - Add custom checklist items (one place, assignable per phase)
   - Weight input auto-checks “weight” item; iOS zoom suppression for number inputs
   - Notes & photos saved to localStorage and flagged on Calendar
   - Day selector + photo upload live together on Photos
   - Smart Coach: compact header-as-button, better tips/mood logic
   - Confetti + micro-vibrations on 100% daily progress + other wins
*/

(function () {
  "use strict";

  // ---------- Splash / Loader ----------
  var AFFS = [
    "You’ve got this!", "Small habits, big change", "Progress, not perfection",
    "Sip, breathe, reset", "Strong body, calm mind", "Hydration is happiness 🐾",
    "Future-you says thanks", "Gentle + consistent + kind", "Shine time ✨",
    "Keep it playful", "You’re doing the work 💪", "Light, strong, centered",
    "One choice at a time", "Consistency > intensity", "You finish what you start"
  ];

  (function initSplash() {
    var bubble = document.getElementById("ozBubble");
    if (bubble) bubble.textContent = AFFS[Math.floor(Math.random() * AFFS.length)];

    window.addEventListener("load", function () {
      setTimeout(function () {
        var splash = document.getElementById("ozSplash");
        var note = document.getElementById("ozBubble");
        if (splash) splash.classList.add("fadeOut");
        if (note) note.classList.add("fadeOut");
        setTimeout(function () {
          if (splash) splash.style.display = "none";
          if (note) note.style.display = "none";
        }, 650);
      }, 1100);
    });

    // Never hang on splash
    setTimeout(function () {
      var splash = document.getElementById("ozSplash");
      var note = document.getElementById("ozBubble");
      if (splash) splash.style.display = "none";
      if (note) note.style.display = "none";
    }, 4000);
  })();

  // ---------- React wiring ----------
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;

  // ---------- Helpers ----------
  function useLocal(key, initialValue) {
    var pair = useState(function () {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initialValue;
      } catch (_) {
        return initialValue;
      }
    });
    var val = pair[0], setVal = pair[1];
    useEffect(function () {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
    }, [key, val]);
    return [val, setVal];
  }

  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  }

  function defaultDays() {
    var phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    return phases.map(function (ph, i) {
      return { day: i + 1, phase: ph, checks: {}, note: "", weight: null, photos: [] };
    });
  }

  var INITIAL_GOALS = {
    water: "💧 Drink 120–150 oz water",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    juice: "🧃 Juices",
    lmnt: "🧂 Electrolytes",
    exercise: "🏃 Exercise",
    wholefood: "🥗 Whole food meals",
    weight: "👣 Weight check-in"
  };

  var DEFAULT_PHASE_TEMPLATES = {
    fast:    ["water","tea","coffee","lmnt","exercise","weight"],
    cleanse: ["water","tea","coffee","juice","lmnt","exercise","weight"],
    rebuild: ["water","lmnt","exercise","wholefood","weight"]
  };

  // Cleanse shows ONE of each juice across days 4–7, not 4x of the same
  var PLAN_RECIPES = [
    { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4,
      ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}]
    },
    { id:"r-peach",  name:"Peachy Green Glow",  type:"juice", day:5,
      ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6,
      ingredients:[{key:"carrots",name:"Carrots",qty:"14"},{key:"apples",name:"Apples",qty:"2"},{key:"ginger",name:"Ginger",qty:'1"'},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7,
      ingredients:[{key:"grapes",name:"Grapes",qty:"3 cups"},{key:"romaine",name:"Romaine",qty:"3 cups"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    // Rebuild
    { id:"r-smoothie", name:"Smoothie Breakfast", type:"meal", day:8,
      ingredients:[{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}]
    },
    { id:"r-lentil", name:"Lentil Soup", type:"meal", day:8,
      ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{key:"carrots",name:"Carrots",qty:"1/2 cup"},{key:"celery",name:"Celery",qty:"1/2 cup"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"onions",name:"Onion",qty:"1/4"}]
    },
    { id:"r-broth9", name:"Simple Veg Broth", type:"meal", day:9,
      ingredients:[{key:"carrots",name:"Carrots",qty:"2"},{key:"celery",name:"Celery",qty:"2 stalks"},{key:"onions",name:"Onion",qty:"1/2"},{key:"parsley",name:"Parsley",qty:"few sprigs"}]
    },
    { id:"r-sweetpot9", name:"Baked Sweet Potato Bowl", type:"meal", day:9,
      ingredients:[{key:"sweet-potatoes",name:"Sweet potatoes",qty:"2"},{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}]
    },
    { id:"r-oats", name:"Overnight Oats", type:"meal", day:10,
      ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"}]
    },
    { id:"r-quinoa", name:"Quinoa Salad", type:"meal", day:10,
      ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"1/2 cup"},{key:"cucumbers",name:"Cucumber",qty:"1"},{key:"tomatoes",name:"Tomato",qty:"1"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemons",name:"Lemon",qty:"1"}]
    },
    { id:"r-protein", name:"Protein + Broccoli", type:"meal", day:11,
      ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 heads"}]
    }
  ];

  // ---------- Grocery aggregation ----------
  function aggregateGroceries(recipes) {
    function measure(s) {
      if (!s) return { n: 1, u: "" };
      var m = String(s).match(/^(\d+(\.\d+)?)(.*)$/);
      return m ? { n: parseFloat(m[1]), u: (m[3] || "").trim() } : { n: 1, u: "" };
    }
    function fmt(n, u) { return u ? ((Number.isInteger(n) ? n : (+n).toFixed(2)) + " " + u) : String(n); }

    var map = {};
    (recipes || []).forEach(function (r) {
      (r.ingredients || []).forEach(function (it) {
        var id = (it.key || it.name || "").toLowerCase().replace(/\s+/g, "-");
        var q = measure(it.qty || "1");
        if (!map[id]) {
          map[id] = { id: id, name: it.name, qtyNum: q.n, qtyUnit: q.u, checked: false, estCost: null, days: r.day ? [r.day] : [] };
        } else {
          map[id].qtyNum += q.n;
          var set = new Set(map[id].days || []);
          if (r.day) set.add(r.day);
          map[id].days = Array.from(set).sort(function (a, b) { return a - b; });
        }
      });
    });

    return Object.values(map)
      .map(function (g) { return { id: g.id, name: g.name, qty: (g.qtyUnit ? fmt(g.qtyNum, g.qtyUnit) : String(g.qtyNum)), checked: g.checked, estCost: g.estCost, days: g.days }; })
      .sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
  }

  // ---------- Micro-components ----------
  var ProgressBar = function (p) {
    var w = Math.max(0, Math.min(100, p.value || 0));
    return e("div", { className: "prog" }, e("div", { className: "fill", style: { width: w + "%" } }));
  };

  var Checklist = function (p) {
    return e("ul", { className: "list" },
      (p.items || []).map(function (it) {
        var on = !!p.state[it.id];
        return e("li", { key: it.id, className: "item" },
          e("button", { className: "paw" + (on ? " on" : ""), onClick: function () { p.onToggle(it.id); }, "aria-pressed": on }, on ? "🐾" : ""),
          e("label", null, it.label)
        );
      })
    );
  };

  var WeightChart = function (p) {
    var ref = useRef(null);
    var chartRef = useRef(null);
    useEffect(function () {
      var ctx = ref.current && ref.current.getContext("2d");
      if (!ctx) return;
      if (chartRef.current) { try { chartRef.current.destroy(); } catch (_) {} }

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: (p.series || []).map(function (_, i) { return "Day " + (i + 1); }),
          datasets: [{
            data: p.series,
            borderColor: "#ec4899",
            backgroundColor: "rgba(236,72,153,.12)",
            tension: .35, spanGaps: true, pointRadius: 3, pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { bottom: 12, top: 6, left: 6, right: 6 } },
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.25)" } },
            y: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.18)" } }
          },
          animation: { duration: 250 }
        },
        plugins: [{ id: "retina", beforeInit: function (c) { c.options.devicePixelRatio = window.devicePixelRatio || 2; } }]
      });
      return function () { try { chartRef.current && chartRef.current.destroy(); } catch (_) {} };
    }, [p.series]);

    return e("div", { style: { height: 180 } }, e("canvas", { ref: ref }));
  };

  // ---------- Smart Coach ----------
  var COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "Tiny wins add up.","Consistency beats intensity.","Strong body, kind mind."
  ];

  var COACH_RULES = [
    { id:"headache", test:function(ctx){return ctx.syms.has("headache");}, tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest your eyes 5–10 minutes."] },
    { id:"dizziness", test:function(ctx){return ctx.syms.has("dizziness");}, tips:["Sit or lie until steady.","Small juice or a pinch of salt if fasting.","Breathe in 4 / out 6."] },
    { id:"nausea",    test:function(ctx){return ctx.syms.has("nausea");}, tips:["Peppermint/ginger tea.","Fresh air.","Move slowly; avoid sudden changes."] },
    { id:"fatigue",   test:function(ctx){return ctx.syms.has("fatigue");}, tips:["15–20 min rest.","Hydrate or electrolytes.","2 minutes gentle stretching."] },
    { id:"hunger",    test:function(ctx){return ctx.syms.has("hunger");}, tips:["Water first.","Have scheduled juice slowly.","5-min walk as reset."] }
  ];

  function inferMood(text) {
    var score = 6; var t = String(text || "").toLowerCase();
    var neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    var pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    score += pos - 2 * neg; return Math.max(1, Math.min(10, score));
  }

  // ---------- Pages ----------
  var GroceryList = function (p) {
    var budgetPair = useLocal("oz.budget", 0);
    var budget = budgetPair[0], setBudget = budgetPair[1];

    function daysBadge(days) {
      if (!days || !days.length) return "📦 Pantry";
      var min = Math.min.apply(null, days), max = Math.max.apply(null, days);
      return "📅 " + (min === max ? ("Day " + min) : ("Day " + min + "–" + max));
    }

    var totals = (p.groceries || []).reduce(function (acc, g) {
      var line = +g.estCost || 0;
      if (g.checked) acc.checked += line; else acc.remaining += line;
      acc.total += line; return acc;
    }, { checked: 0, remaining: 0, total: 0 });

    function update(idx, patch) {
      p.setGroceries(p.groceries.map(function (g, i) { return i === idx ? Object.assign({}, g, patch) : g; }));
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Groceries & Prices"),
      e("div", { className: "card", style: { margin: "8px 0 12px" } },
        e("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } },
          e("div", null, "Budget $"),
          e("input", { type: "number", step: "0.01", inputMode:"decimal",
            value: budget || "", placeholder: "0.00",
            onChange: function (ev) { setBudget(ev.target.value === "" ? 0 : +ev.target.value); },
            style: { width: 120 }
          })
        ),
        e("div", { style: { marginTop: 8, color: "#64748b", fontSize: 13 } },
          "Checked $", totals.checked.toFixed(2),
          " • Remaining $", totals.remaining.toFixed(2),
          " • Total $", totals.total.toFixed(2),
          budget ? " • Left $" + Math.max(0, (budget - totals.total)).toFixed(2) : ""
        )
      ),
      e("ul", { style: { listStyle: "none", padding: 0 } },
        (p.groceries || []).map(function (g, idx) {
          return e("li", {
            key: g.id, style: {
              display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8,
              padding: "10px 0", borderBottom: "1px solid #f3d0e1", alignItems: "center"
            }
          },
            e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: function () { update(idx, { checked: !g.checked }); vibrate(8); } }, g.checked ? "🐾" : ""),
            e("div", null,
              e("div", null, g.name, " ", e("span", { className: "badge" }, daysBadge(g.days))),
              e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
            ),
            e("input", {
              type: "number", step: "0.01", inputMode:"decimal", placeholder: "$",
              value: (g.estCost == null ? "" : g.estCost),
              onChange: function (ev) { update(idx, { estCost: (ev.target.value === "" ? null : Number(ev.target.value)) }); },
              style: { width: 90, fontSize:"16px" } // 16px prevents iOS zoom
            })
          );
        })
      )
    );
  };

  var Calendar = function (p) {
    function dateFor(dayNum) {
      var dstr = (p.settings.phaseTemplates && p.settings.phaseTemplates.__startDate) || "";
      if (!dstr) return null;
      var base = new Date(dstr + "T00:00:00");
      if (isNaN(base)) return null;
      var dt = new Date(base.getTime() + (dayNum - 1) * 86400000);
      return dt.toLocaleDateString();
    }
    return e("div", { className: "wrap" },
      e("h1", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
        p.days.map(function (d) {
          var dRecipes = (p.recipes || []).filter(function (r) { return r.day === d.day; });
          var dd = dateFor(d.day);
          var hasPhotos = (d.photos && d.photos.length > 0);
          var hasNote = (d.note && d.note.trim().length > 0);
          return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
              e("div", null,
                e("div", { style: { fontWeight: 600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 24 } },
                dRecipes.length
                  ? dRecipes.map(function (r) { return e("span", { key: r.id, className: "badge" }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name); })
                  : e("span", { style: { fontSize: 12, color: "#64748b" } }, "—"),
                hasNote && e("span", { className: "badge" }, "📝 Note"),
                hasPhotos && e("span", { className: "badge" }, "📸 Photos")
              )
            )
          );
        })
      )
    );
  };

  var Photos = function (p) {
    var idxPair = useState(0);
    var idx = idxPair[0], setIdx = idxPair[1];
    var day = p.days[idx] || p.days[0];

    function handleUpload(ev) {
      var files = Array.from(ev.target.files || []);
      if (!files.length) return;
      var readers = files.map(function (f) {
        return new Promise(function (res) {
          var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(f);
        });
      });
      Promise.all(readers).then(function (urls) {
        p.setDays(function (prev) {
          var next = prev.slice();
          var d = Object.assign({}, next[idx]);
          d.photos = (d.photos || []).concat(urls);
          next[idx] = d;
          return next;
        });
        var A = [
          "Looking strong ✨", "Your glow is showing ✨", "Small habits, big change 💪",
          "Oz is proud of you 🐶", "Consistency looks good on you 🌟", "Radiant!"
        ];
        setTimeout(function () { alert(A[Math.floor(Math.random() * A.length)]); }, 50);
        vibrate(15);
        try { if (window.confetti) window.confetti({ particleCount: 150, spread: 65, origin: { y: .6 } }); } catch (_) {}
      });
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Progress Photos"),
      e("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" } },
        e("div", null, e("b", null, "Day "), day.day),
        e("div", null,
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return (i > 0 ? i - 1 : p.days.length - 1); }); } }, "◀"),
          e("span", { className: "badge", style: { margin: "0 8px" } }, "Day " + day.day),
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return (i < p.days.length - 1 ? i + 1 : 0); }); } }, "▶")
        ),
        e("label", { className: "btn peach", style: { cursor: "pointer" } }, "Upload",
          e("input", { type: "file", multiple: true, accept: "image/*", onChange: handleUpload, style: { display: "none" } })
        )
      ),
      e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        (day.photos || []).map(function (url, i) { return e("img", { key: i, src: url, style: { width: 100, height: 100, objectFit: "cover", borderRadius: 8 } }); })
      )
    );
  };

  // ---------- Dashboard ----------
  var Dashboard = function (p) {
    var idxPair = useState(0);
    var idx = idxPair[0], setIdx = idxPair[1];
    var day = p.days[idx] || p.days[0];

    // Checklist
    var templateIds = (p.templates && p.templates[day.phase]) || [];
    var activeIds = (day.order && day.order.length ? day.order : templateIds);
    var items = activeIds.map(function (id) { return ({ id: id, label: p.goals[id] || id }); });
    var checks = day.checks || {};
    var doneCount = items.reduce(function (a, it) { return a + (checks[it.id] ? 1 : 0); }, 0);
    var totalCount = Math.max(1, items.length);
    var progress = (doneCount / totalCount) * 100;
    var weightSeries = p.days.map(function (d) { return (d.weight == null ? null : d.weight); });

    useEffect(function () {
      if (Math.round(progress) === 100) {
        vibrate(20);
        try { if (window.confetti) window.confetti({ particleCount: 250, spread: 80, origin: { y: .6 } }); } catch (_) {}
      }
    }, [progress]);

    function toggleCheck(id) {
      p.setDays(function (prev) {
        var next = prev.slice();
        var d = Object.assign({}, next[idx]);
        var c = Object.assign({}, d.checks || {});
        c[id] = !c[id];
        d.checks = c;
        next[idx] = d;
        return next;
      });
    }

    function changeDay(dir) {
      setIdx(function (cur) {
        var n = cur + dir;
        if (n < 0) n = p.days.length - 1;
        if (n >= p.days.length) n = 0;
        return n;
      });
    }

    // Smart coach
    var coachTextPair = useState("");
    var coachText = coachTextPair[0], setCoachText = coachTextPair[1];

    function runCoach() {
      var text = String(day.note || "").trim();
      if (!text) { setCoachText("Write a quick note below, then tap Smart Coach."); return; }
      var SYM_MATCHERS = [
        { id: "headache", rx: /\b(headache|migraine|head pain)\b/i },
        { id: "dizziness", rx: /\b(dizzy|light[-\s]?headed|vertigo)\b/i },
        { id: "nausea", rx: /\b(nausea|queasy|sick to (my|the) stomach)\b/i },
        { id: "fatigue", rx: /\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i },
        { id: "hunger", rx: /\b(hungry|starv(ed|ing)|crav(ing|es))\b/i }
      ];
      var found = new Set(SYM_MATCHERS.filter(function (m) { return m.rx.test(text); }).map(function (m) { return m.id; }));
      var mood = inferMood(text);
      var hits = COACH_RULES.filter(function (r) { try { return r.test({ syms: found, phase: day.phase }); } catch (_) { return false; } });
      var tips = hits.flatMap(function (h) { return h.tips; }).slice(0, 8);
      var moodBoost = (mood <= 3)
        ? ["You’re not alone — keep it gentle.", "One tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : (mood <= 6)
          ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
          : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];

      var header = found.size ? ("I noticed: " + Array.from(found).join(", ") + ".") : "No specific symptoms spotted — here’s a steady plan.";
      var body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(header + "\n\n" + body + "\n\n" + moodBoost.join(" "));
      vibrate(10);
    }

    // Next 2 days’ ingredients (today+tomorrow or next 2 recipe days)
    function nextTwoDayIngredients(currentDay) {
      function tryDays(d1, d2) {
        var want = new Set([d1, d2]);
        var bag = {};
        (p.recipes || []).forEach(function (r) {
          if (!r.day || !want.has(r.day)) return;
          (r.ingredients || []).forEach(function (it) {
            var key = (it.key || it.name || "").toLowerCase();
            if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
            if (it.qty) bag[key].qtyList.push(it.qty);
            bag[key].days.add(r.day);
          });
        });
        Object.keys(bag).forEach(function (k) {
          bag[k].days = Array.from(bag[k].days).sort(function (a, b) { return a - b; });
        });
        return Object.values(bag).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
      }
      var strict = tryDays(currentDay.day, currentDay.day + 1);
      if (strict.length) return { items: strict, label: "Today + Tomorrow — Ingredients" };

      var futureDays = Array.from(new Set((p.recipes || []).filter(function (r) { return r.day >= currentDay.day; }).map(function (r) { return r.day; }))).sort(function (a, b) { return a - b; });
      var pool = futureDays.slice(0, 2);
      if (pool.length === 0) return { items: [], label: "Upcoming Ingredients" };
      var fb = tryDays(pool[0], pool[1] || pool[0]);
      var label = (pool.length === 2) ? ("Upcoming Ingredients — Day " + pool[0] + " & " + pool[1]) : ("Upcoming Ingredients — Day " + pool[0]);
      return { items: fb, label: label };
    }
    var ni = nextTwoDayIngredients(day);
    var nextItems = ni.items, nextLabel = ni.label;

    return e(React.Fragment, null,
      // Masthead (photo + title + centered day selector in 1 line)
      e("div", { className: "mast card" },
        e("div", { className: "mastRow" },
          e("div", { className: "mastLeft" },
            e("img", { src: "oz.png", alt: "Oz" }),
            e("div", null,
              e("div", { style: { fontSize: 20, fontWeight: 800, letterSpacing: .2 } }, "Oz Companion"),
              e("div", { style: { marginTop: 2, color: "#64748b", fontWeight: 600, letterSpacing: .6, fontSize: 12 } }, day.phase.toUpperCase())
            )
          ),
          e("div", { className: "day-nav", style: { alignItems: "center" } },
            e("button", { className: "day-btn", onClick: function () { changeDay(-1); }, "aria-label": "Previous day" }, "◀"),
            e("span", { className: "day-label" }, "Day " + day.day),
            e("button", { className: "day-btn", onClick: function () { changeDay(1); }, "aria-label": "Next day" }, "▶")
          )
        )
      ),

      e(ProgressBar, { value: progress }),

      // Checklist (paw)
      e("div", { className: "card", style: { marginTop: 12 } },
        e(Checklist, { items: items, state: checks, onToggle: toggleCheck })
      ),

      // Smart Coach — Header is the button; hint below; output box below that
      e("div", { className: "card", style: { marginTop: 16 } },
        e("div", {
          className: "coachCard", role: "button", tabIndex: 0,
          onClick: runCoach, onKeyDown: function (ev) { if (ev.key === "Enter" || ev.key === " ") runCoach(); }
        },
          e("div", { className: "coachHeader" },
            e("div", { className: "coachPill" }, "🧠", e("span", { className: "coachTitle" }, "Smart Coach"))
          ),
          e("div", { className: "coachHint" }, "Tap to analyze your note and get relief + motivation")
        ),
        (coachText ? e("div", { className: "coachOut" }, coachText) : null),
        e("textarea", {
          value: day.note || "",
          onChange: function (ev) {
            var val = ev.target.value;
            p.setDays(function (prev) {
              var next = prev.slice();
              var d = Object.assign({}, next[idx]); d.note = val; next[idx] = d; return next;
            });
          },
          rows: 4, className: "noteArea", style: { marginTop: 10 }
        })
      ),

      // Next ingredients
      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, nextLabel),
        (nextItems.length === 0)
          ? e("p", { style: { color: "#64748b" } }, "No recipes scheduled soon.")
          : e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
            nextItems.map(function (item) {
              var dayBadge = (item.days.length === 1) ? ("Day " + item.days[0]) : ("Day " + item.days[0] + "–" + item.days[item.days.length - 1]);
              return e("li", {
                key: item.name,
                style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3d0e1" }
              },
                e("span", null, item.name, " ", e("span", { className: "badge" }, dayBadge)),
                e("span", { style: { color: "#64748b", fontSize: 12 } }, (item.qtyList || []).join(" + ") || "")
              );
            })
          )
      ),

      // Weight (auto-checks “weight”)
      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, "Weight"),
        e("div", { style: { display: "flex", alignItems: "center", gap: 8, margin: "8px 0" } },
          e("label", null, "Today’s weight"),
          e("input", {
            type: "number", step: "0.1", inputMode: "decimal",
            value: (day.weight == null ? "" : day.weight),
            onChange: function (ev) {
              var v = ev.target.value;
              p.setDays(function (prev) {
                var next = prev.slice();
                var d = Object.assign({}, next[idx]);
                d.weight = (v === "" ? null : Number(v));
                // auto-check when value entered
                if (v !== "") {
                  var c = Object.assign({}, d.checks || {}); c.weight = true; d.checks = c;
                }
                next[idx] = d; return next;
              });
            },
            style: { width: 120, fontSize: "16px" } // 16px to prevent iOS zoom
          }),
          e("span", { className: "badge" }, "Day " + day.day)
        ),
        e(WeightChart, { series: weightSeries })
      )
    );
  };

  // ---------- Settings ----------
  var Settings = function (p) {
    var localPair = useState(p.templates);
    var local = localPair[0], setLocal = localPair[1];

    useEffect(function () { setLocal(p.templates); }, [p.templates]);

    var showModalPair = useState(false);
    var showModal = showModalPair[0], setShowModal = showModalPair[1];
    var modalPhasePair = useState("fast");
    var modalPhase = modalPhasePair[0], setModalPhase = modalPhasePair[1];
    var modalCheckedPair = useState({});
    var modalChecked = modalCheckedPair[0], setModalChecked = modalCheckedPair[1];

    var customIdPair = useState("");
    var customId = customIdPair[0], setCustomId = customIdPair[1];
    var customLabelPair = useState("");
    var customLabel = customLabelPair[0], setCustomLabel = customLabelPair[1];

    function openModal(phase) {
      setModalPhase(phase);
      var sel = new Set((local[phase] || []));
      var all = Object.keys(p.goals).reduce(function (m, id) { m[id] = sel.has(id); return m; }, {});
      setModalChecked(all);
      setShowModal(true);
    }

    function toggleModalId(id) {
      setModalChecked(function (prev) {
        var next = Object.assign({}, prev);
        next[id] = !next[id];
        return next;
      });
    }

    function saveModal() {
      var nextIds = Object.keys(modalChecked).filter(function (id) { return modalChecked[id]; });
      var next = Object.assign({}, local); next[modalPhase] = nextIds; setLocal(next); p.onChange(next);
      setShowModal(false);
      vibrate(8);
    }

    function addCustom() {
      var id = (customId || "").toLowerCase().trim().replace(/[^a-z0-9\-]/g, "");
      if (!id) { alert("Enter a valid ID (letters/numbers/dashes)."); return; }
      if (p.goals[id]) { alert("That goal ID already exists."); return; }
      var label = (customLabel || "").trim();
      if (!label) { alert("Enter a label."); return; }
      p.setGoals(Object.assign({}, p.goals, (function () { var o = {}; o[id] = label; return o; })()));
      setCustomId(""); setCustomLabel("");
      alert("Added ✓ (open a phase to include it)");
      vibrate(8);
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Settings"),

      // Start date
      e("div", { className: "card" },
        e("h2", null, "Start Date"),
        e("input", {
          type: "date",
          value: (p.templates.__startDate || ""),
          onChange: function (ev) {
            var next = Object.assign({}, p.templates, { __startDate: ev.target.value || "" });
            p.onChange(next);
          }
        })
      ),

      // Meal plan import
      e("div", { className: "card" },
        e("h2", null, "Meal Plan"),
        e("div", null,
          e("button", { className: "btn", onClick: p.onImportDefault }, "Import 11-Day Plan"),
          e("button", { className: "btn", style: { marginLeft: 8 }, onClick: p.onImportText }, "Import from ChatGPT Text")
        )
      ),

      // Checklist editing (simple list with EDIT buttons)
      e("div", { className: "card" },
        e("h2", null, "Checklist Templates"),
        e("div", { style: { display: "grid", gap: 8 } },
          ["fast", "cleanse", "rebuild"].map(function (phase) {
            return e("div", { key: phase, style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
              e("div", null,
                e("b", null, phase.charAt(0).toUpperCase() + phase.slice(1))
              ),
              e("button", { className: "btn", onClick: function () { openModal(phase); } }, "Edit")
            );
          })
        ),
        // Add custom item (single spot)
        e("div", { style: { marginTop: 12 } },
          e("h3", null, "Add Custom Checklist Item"),
          e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            e("input", {
              type: "text", placeholder: "ID (e.g., meditation-10)",
              value: customId, onChange: function (ev) { setCustomId(ev.target.value); }
            }),
            e("input", {
              type: "text", placeholder: "Label (e.g., 🧘 Meditation 10 min)",
              value: customLabel, onChange: function (ev) { setCustomLabel(ev.target.value); }, style: { minWidth: 240 }
            }),
            e("button", { className: "btn peach", onClick: addCustom }, "+ Add")
          )
        )
      ),

      // Modal
      e("div", { className: "modal" + (showModal ? " show" : ""), onClick: function (ev) { if (ev.target.classList && ev.target.classList.contains("modal")) setShowModal(false); } },
        e("div", { className: "sheet" },
          e("h2", null, "Edit ", modalPhase.charAt(0).toUpperCase() + modalPhase.slice(1)),
          e("div", { style: { maxHeight: "48vh", overflow: "auto", margin: "8px 0 12px" } },
            Object.keys(p.goals).map(function (id) {
              return e("label", { key: id, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderBottom: "1px solid #f3d0e1" } },
                e("input", { type: "checkbox", checked: !!modalChecked[id], onChange: function () { toggleModalId(id); } }),
                e("span", null, p.goals[id])
              );
            })
          ),
          e("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            e("button", { className: "btn", onClick: function () { setShowModal(false); } }, "Cancel"),
            e("button", { className: "btn primary", onClick: saveModal }, "Save")
          )
        )
      )
    );
  };

  // ---------- Import free-text plan ----------
  function parseFreeTextPlan(text) {
    var days = defaultDays();
    var recipes = [];
    var lines = String(text || "").split(/\r?\n/);
    var curDay = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      var mDay = line.match(/^Day\s+(\d+)/i);
      if (mDay) { curDay = +mDay[1]; return; }
      var mJuice = line.match(/^Juice\s*\d+\s*[-:]\s*(.+)$/i);
      if (mJuice && curDay) { recipes.push({ id: "r-" + recipes.length, name: mJuice[1].trim(), type: "juice", day: curDay, ingredients: [] }); return; }
      var mMeal = line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
      if (mMeal && curDay) { recipes.push({ id: "m-" + recipes.length, name: mMeal[2].trim(), type: "meal", day: curDay, ingredients: [] }); return; }
      var mIng = line.match(/^[•\-]\s*(.+)$/);
      if (mIng && recipes.length) {
        var last = recipes[recipes.length - 1];
        var s = mIng[1].trim();
        var m = s.match(/^(\d+(\.\d+)?\s*\w+)?\s*(.+)$/);
        last.ingredients = last.ingredients || [];
        last.ingredients.push({ key: (m ? m[3] : s).toLowerCase().replace(/\s+/g, "-"), name: (m ? m[3] : s), qty: (m && m[1]) ? m[1] : "" });
      }
    });
    return { days: days, recipes: recipes };
  }

  // ---------- App ----------
  var App = function () {
    var goalsPair = useLocal("oz.goals", INITIAL_GOALS);
    var goals = goalsPair[0], setGoals = goalsPair[1];

    var settingsPair = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    var settings = settingsPair[0], setSettings = settingsPair[1];

    useEffect(function () {
      var pt = settings && settings.phaseTemplates;
      var valid = pt && ["fast", "cleanse", "rebuild"].every(function (k) {
        return Array.isArray(pt[k]) && pt[k].every(function (id) { return !!goals[id]; });
      });
      if (!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goals]);

    var daysPair = useLocal("oz.days", defaultDays());
    var days = daysPair[0], setDays = daysPair[1];

    var recipesPair = useLocal("oz.recipes", PLAN_RECIPES);
    var recipes = recipesPair[0], setRecipes = recipesPair[1];

    var groceriesPair = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
    var groceries = groceriesPair[0], setGroceries = groceriesPair[1];

    var tabPair = useState("dash");
    var tab = tabPair[0], setTab = tabPair[1];

    function importFullPlan() {
      var newDays = defaultDays(); setDays(newDays);
      setRecipes(PLAN_RECIPES);
      setGroceries(aggregateGroceries(PLAN_RECIPES));
      alert("Plan imported ✔");
      vibrate(8);
    }

    function importFromChatGPTPrompt() {
      var txt = prompt("Paste ChatGPT meal-plan text or JSON:");
      if (!txt) return;
      try {
        var plan = JSON.parse(txt);
        if (!Array.isArray(plan.recipes) || !Array.isArray(plan.days)) throw new Error("bad");
        setDays(plan.days); setRecipes(plan.recipes);
        setGroceries(aggregateGroceries(plan.recipes));
        alert("Imported ✔");
      } catch (_) {
        try {
          var parsed = parseFreeTextPlan(txt);
          setDays(parsed.days); setRecipes(parsed.recipes);
          setGroceries(aggregateGroceries(parsed.recipes));
          alert("Imported ✔");
        } catch (e) { alert("Couldn’t parse that text. If possible, paste JSON next time."); }
      }
      vibrate(8);
    }

    var dash = (tab === "dash") ? e(Dashboard, { templates: settings.phaseTemplates, days: days, setDays: setDays, recipes: recipes, goals: goals }) : null;
    var grocery = (tab === "groceries") ? e(GroceryList, { groceries: groceries, setGroceries: setGroceries }) : null;
    var calendar = (tab === "calendar") ? e(Calendar, { days: days, recipes: recipes, settings: settings }) : null;
    var photosView = (tab === "photos") ? e(Photos, { days: days, setDays: setDays }) : null;
    var settingsView = (tab === "settings") ? e(Settings, {
      templates: settings.phaseTemplates,
      onChange: function (next) { setSettings({ phaseTemplates: next }); },
      onImportDefault: importFullPlan,
      onImportText: importFromChatGPTPrompt,
      goals: goals, setGoals: setGoals
    }) : null;

    // Header row (photo + title + centered tabs handled by CSS floating dock)
    var head = e("div", { className: "wrap" },
      e("div", { className: "card", style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          e("img", { src: "oz.png", alt: "Oz", style: { width: 36, height: 36, borderRadius: "9999px", objectFit: "cover" } }),
          e("div", null,
            e("div", { style: { fontWeight: 800, lineHeight: 1, letterSpacing: .2, fontSize: 18 } }, "Oz Cleanse Companion"),
            e("div", { style: { marginTop: 2, color: "#64748b", fontWeight: 600, letterSpacing: .4, fontSize: 12 } }, "Daily momentum, kind discipline")
          )
        ),
        null
      )
    );

    return e(React.Fragment, null,
      head,
      dash,
      grocery,
      calendar,
      photosView,
      settingsView,

      // Floating emoji dock (CSS styles & centers it)
      e("div", { className: "tabs" },
        e("button", { className: "btn" + (tab === "dash" ? " active" : ""), onClick: function () { setTab("dash"); }, "aria-label": "Dashboard" }, "🏠"),
        e("button", { className: "btn" + (tab === "groceries" ? " active" : ""), onClick: function () { setTab("groceries"); }, "aria-label": "Groceries" }, "🛒"),
        e("button", { className: "btn" + (tab === "calendar" ? " active" : ""), onClick: function () { setTab("calendar"); }, "aria-label": "Calendar" }, "📅"),
        e("button", { className: "btn" + (tab === "photos" ? " active" : ""), onClick: function () { setTab("photos"); }, "aria-label": "Photos" }, "📷"),
        e("button", { className: "btn" + (tab === "settings" ? " active" : ""), onClick: function () { setTab("settings"); }, "aria-label": "Settings" }, "⚙️")
      )
    );
  };

  // Mount
  ReactDOM.createRoot(document.getElementById("root")).render(e(App));

  // Global error banner
  window.addEventListener("error", function (ev) {
    var el = document.getElementById("errorBanner");
    if (!el) return;
    var msg = ev.error && ev.error.message ? ev.error.message : ev.message;
    el.textContent = "Error: " + msg;
    el.style.display = "block";
  });
})();
