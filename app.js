/* app.js — Oz Companion (stable UMD build)
   - Splash (Oz + bubble) centered; auto-hide on load
   - Masthead in one straight line (Oz • title • centered day selector)
   - Paw checklist; customizable per phase in Settings
   - Notes & Photos saved per-day; badges on Calendar
   - Smart Coach (click header); mood + symptom hints
   - Weight entry (no iOS zoom) + mini chart; big confetti at 100%
   - Next 2 days ingredients
   - Cleanse days show all 4 juices (1 of each) on Calendar
   - Floating emoji dock
*/

(function () {
  "use strict";

  // ---- UMD globals ----
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // ---- Splash: pick line & auto-hide ----
  (function initSplash() {
    var LINES = [
      "You’ve got this!","Small habits, big change","Progress, not perfection",
      "Sip, breathe, reset","Strong body, calm mind","Hydration is happiness 🐾",
      "Future-you says thanks","Gentle + consistent + kind","Shine time ✨",
      "Keep it playful","You’re doing the work 💪"
    ];
    var bubble = document.getElementById("ozBubble");
    if (bubble) bubble.textContent = LINES[Math.floor(Math.random() * LINES.length)];

    function hideSplash() {
      var s = document.getElementById("ozSplash");
      var b = document.getElementById("ozBubble");
      if (s) s.style.display = "none";
      if (b) b.style.display = "none";
    }
    window.addEventListener("load", function () {
      setTimeout(hideSplash, 1400);
    });
    // failsafe
    setTimeout(hideSplash, 4000);
  })();

  // ---- Helpers ----
  function useLocal(key, initialValue) {
    var pair = useState(function () {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initialValue;
      } catch (e) {
        return initialValue;
      }
    });
    var val = pair[0], setVal = pair[1];
    useEffect(function () {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }, [key, val]);
    return [val, setVal];
  }

  function defaultDays() {
    var phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    var out = [];
    for (var i = 0; i < phases.length; i++) {
      out.push({ day: i + 1, phase: phases[i], order: null, checks: {}, note: "", weight: null, photos: [] });
    }
    return out;
  }

  // ---- Goals & Phase templates ----
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
    fast: ["water","tea","coffee","lmnt","exercise","weight"],
    cleanse: ["water","tea","coffee","juice","lmnt","exercise","weight"],
    rebuild: ["water","lmnt","exercise","wholefood","weight"]
  };

  // ---- Recipes ----
  // Juices (used every cleanse day; calendar shows 1 of each)
  var JUICE_RECIPES = [
    { id:"r-melon",  name:"Melon Mint Morning",
      ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}]
    },
    { id:"r-peach",  name:"Peachy Green Glow",
      ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-carrot", name:"Carrot Apple Ginger",
      ingredients:[{key:"carrots",name:"Carrots",qty:"14"},{key:"apples",name:"Apples",qty:"2"},{key:"ginger",name:"Ginger",qty:'1"'},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-grape",  name:"Grape Romaine Cooler",
      ingredients:[{key:"grapes",name:"Grapes",qty:"3 cups"},{key:"romaine",name:"Romaine",qty:"3 cups"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"lemons",name:"Lemons",qty:"1"}]
    }
  ];
  // Meals for rebuild days (assigned by day)
  var MEAL_RECIPES = [
    { id:"m-smoothie", name:"Smoothie Breakfast", day:8,
      ingredients:[{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}]
    },
    { id:"m-lentil", name:"Lentil Soup", day:8,
      ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{key:"carrots",name:"Carrots",qty:"1/2 cup"},{key:"celery",name:"Celery",qty:"1/2 cup"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"onions",name:"Onion",qty:"1/4"}]
    },
    { id:"m-broth9", name:"Simple Veg Broth", day:9,
      ingredients:[{key:"carrots",name:"Carrots",qty:"2"},{key:"celery",name:"Celery",qty:"2 stalks"},{key:"onions",name:"Onion",qty:"1/2"},{key:"parsley",name:"Parsley",qty:"few sprigs"}]
    },
    { id:"m-sweetpot9", name:"Baked Sweet Potato Bowl", day:9,
      ingredients:[{key:"sweet-potatoes",name:"Sweet potatoes",qty:"2"},{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}]
    },
    { id:"m-oats", name:"Overnight Oats", day:10,
      ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"}]
    },
    { id:"m-quinoa", name:"Quinoa Salad", day:10,
      ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"1/2 cup"},{key:"cucumbers",name:"Cucumber",qty:"1"},{key:"tomatoes",name:"Tomato",qty:"1"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemons",name:"Lemon",qty:"1"}]
    },
    { id:"m-protein", name:"Protein + Broccoli", day:11,
      ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 heads"}]
    }
  ];

  // ---- Grocery aggregation ----
  // For juices: 4 juices/day × 4 cleanse days = 16 total juices (1 of each per day)
  var UNIT_LIST = ["each","head","lb","cup","oz","fl-oz","bunch","qt"];
  function parseQty(q) {
    if (!q) return { n: 1, u: "each" };
    var m = String(q).match(/^(\d+(\.\d+)?)\s*(\w+)?/);
    return { n: m ? +m[1] : 1, u: (m && m[3]) ? m[3].toLowerCase() : "each" };
  }
  function convert(n, from, to, name) {
    if (from === to) return n;
    var cupToLb = { spinach: 0.0625, romaine: 0.05, grapes: 0.33, parsley: 0.06, mint: 0.06 };
    if (from === "cup" && to === "lb") {
      var key = Object.keys(cupToLb).find(function (k) { return (name||"").toLowerCase().includes(k); });
      return key ? n * cupToLb[key] : n * 0.1;
    }
    if (from === "oz" && to === "lb") return n / 16;
    if (from === "fl-oz" && to === "qt") return n / 32;
    if (from === "qt" && to === "fl-oz") return n * 32;
    return n;
  }
  function fmtQty(n, u) {
    if (!u) return String(n);
    return (Number.isInteger(n) ? n : (+n).toFixed(2)) + " " + u;
  }
  function aggregateGroceries(days) {
    var cleanseDays = days.filter(function (d) { return d.phase === "cleanse"; }).length; // usually 4
    var map = {}; // key -> {name, qtyNum, qtyUnit, days:Set}
    function addIng(ing, dayTag, mult) {
      var id = (ing.key || ing.name || "").toLowerCase().replace(/\s+/g, "-");
      var m = parseQty(ing.qty || "1");
      var scaledN = m.n * (mult || 1);
      if (!map[id]) {
        map[id] = { name: ing.name, qtyNum: 0, qtyUnit: m.u, days: new Set() };
      }
      // Try to keep same unit; if unit differs, we won't try to merge cross-units (KISS)
      if (map[id].qtyUnit !== m.u && m.u) {
        // naive: leave as-is; prefer the first unit. This keeps UI simple.
      }
      map[id].qtyNum += scaledN;
      if (dayTag != null) map[id].days.add(dayTag);
    }
    // Juices: all four recipes per cleanse day → multiply each recipe once per cleanse day
    JUICE_RECIPES.forEach(function (r) {
      (r.ingredients || []).forEach(function (ing) {
        addIng(ing, null, cleanseDays); // tag pantry if used across many days
      });
    });
    // Meals
    MEAL_RECIPES.forEach(function (r) {
      (r.ingredients || []).forEach(function (ing) {
        addIng(ing, r.day, 1);
      });
    });
    // Finalize
    return Object.keys(map).map(function (id) {
      var obj = map[id];
      return {
        id: id,
        name: obj.name,
        qty: obj.qtyUnit ? fmtQty(obj.qtyNum, obj.qtyUnit) : String(obj.qtyNum),
        checked: false,
        estCost: null,
        days: Array.from(obj.days).sort(function (a, b) { return a - b; })
      };
    }).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
  }

  // ---- UI atoms ----
  function ProgressBar(p) {
    return e("div", { className: "prog" },
      e("div", { className: "fill", style: { width: Math.max(0, Math.min(100, p.value || 0)) + "%" } })
    );
  }
  function Checklist(p) {
    return e("ul", { className: "list" },
      (p.items || []).map(function (it) {
        var on = !!p.state[it.id];
        return e("li", { key: it.id, className: "item" },
          e("button", {
            className: "paw" + (on ? " on" : ""),
            onClick: function () { p.onToggle(it.id); },
            "aria-pressed": on
          }, on ? "🐾" : ""),
          e("label", null, it.label)
        );
      })
    );
  }
  function WeightChart(p) {
    var canvasRef = useRef(null);
    var chartRef = useRef(null);
    useEffect(function () {
      var el = canvasRef.current;
      if (!el || !window.Chart) return;
      try { if (chartRef.current) chartRef.current.destroy(); } catch (e) {}
      var labels = (p.series || []).map(function (_, i) { return "Day " + (i + 1); });
      var chart = new Chart(el.getContext("2d"), {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            data: p.series || [],
            borderColor: "#ec4899",
            backgroundColor: "rgba(236,72,153,.12)",
            tension: 0.35,
            spanGaps: true,
            pointRadius: 3,
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.25)" } },
            y: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.18)" } }
          },
          animation: { duration: 250 }
        }
      });
      chartRef.current = chart;
      return function () { try { chart.destroy(); } catch (e) {} };
    }, [p.series]);
    return e("div", { style: { height: 180 } }, e("canvas", { ref: canvasRef }));
  }

  // ---- Smart Coach data ----
  var COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "One step at a time — you’re doing amazing.","Keep going, your future self will thank you.",
    "Tiny wins add up.","Consistency beats intensity.","You’re building something real.","Strong body, kind mind.",
    "Calm is a superpower.","Momentum looks good on you.","You’re in the arena."
  ];
  var COACH_RULES = [
    { id:"headache", test:function(ctx){return ctx.syms.has("headache");},
      tips:["Sip 8–12 oz water over 15 minutes.","Pinch of sea salt / electrolyte.","Dim screens; rest eyes 5–10 min."] },
    { id:"dizziness", test:function(ctx){return ctx.syms.has("dizziness");},
      tips:["Sit or lie until steady.","Small juice or electrolyte if fasting.","Breathe 4 in / 6 out."] },
    { id:"nausea", test:function(ctx){return ctx.syms.has("nausea");},
      tips:["Peppermint/ginger tea.","Step into fresh air.","Move slowly."] },
    { id:"fatigue", test:function(ctx){return ctx.syms.has("fatigue");},
      tips:["15–20 min rest.","Hydrate + electrolytes.","2 min gentle stretching."] },
    { id:"hunger", test:function(ctx){return ctx.syms.has("hunger");},
      tips:["Water first.","Have a scheduled juice slowly.","5-min walk reset."] }
  ];
  function inferMood(text) {
    var score = 6; var t = (text || "").toLowerCase();
    var neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    var pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    score += pos - 2 * neg; return Math.max(1, Math.min(10, score));
  }

  // ---- Pages ----
  function GroceryList(p) {
    var budgetPair = useLocal("oz.budget", 0);
    var budget = budgetPair[0], setBudget = budgetPair[1];

    function update(idx, patch) {
      p.setGroceries((p.groceries || []).map(function (g, i) { return i === idx ? Object.assign({}, g, patch) : g; }));
    }
    var totals = (p.groceries || []).reduce(function (acc, g) {
      var m = parseQty(g.qty || "0");
      var u = g.unit || m.u || "each";
      var n = convert(m.n, m.u, u, g.name);
      var line = (+g.price || +g.estCost || 0) * (isFinite(n) ? n : 0);
      if (g.checked) acc.checked += line; else acc.remaining += line;
      acc.total += line; return acc;
    }, { checked: 0, remaining: 0, total: 0 });

    function daysBadge(days) {
      if (!days || !days.length) return "📦 Pantry";
      var min = Math.min.apply(null, days), max = Math.max.apply(null, days);
      return "📅 " + (min === max ? ("Day " + min) : ("Day " + min + "–" + max));
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Groceries & Prices"),
      e("div", { className: "card", style: { margin: "8px 0 12px" } },
        e("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } },
          e("div", null, "Budget $"),
          e("input", {
            type: "number", step: "0.01", value: budget || "", placeholder: "0.00",
            onChange: function (ev) { setBudget(ev.target.value === "" ? 0 : +ev.target.value); },
            style: { width: 120, fontSize: 16 }
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
              display: "grid", gridTemplateColumns: "32px 1fr auto auto", gap: 8,
              padding: "10px 0", borderBottom: "1px solid #f3d0e1", alignItems: "center"
            }
          },
            e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: function () { update(idx, { checked: !g.checked }); } }, g.checked ? "🐾" : ""),
            e("div", null,
              e("div", null, g.name, " ", e("span", { className: "badge" }, daysBadge(g.days))),
              e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
            ),
            e("input", {
              type: "number", step: "0.01", value: (g.estCost == null ? "" : g.estCost),
              onChange: function (ev) { update(idx, { estCost: (ev.target.value === "" ? null : Number(ev.target.value)) }); },
              style: { width: 90, fontSize: 16 }
            }),
            e("div", { style: { textAlign: "right", minWidth: 70, fontWeight: 600 } },
              "$" + (function () {
                var m = parseQty(g.qty || "0");
                var u = g.unit || m.u || "each";
                var n = convert(m.n, m.u, u, g.name);
                var price = (+g.price || +g.estCost || 0);
                return (price * (isFinite(n) ? n : 0)).toFixed(2);
              })()
            )
          );
        })
      )
    );
  }

  function Calendar(p) {
    return e("div", { className: "wrap" },
      e("h1", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
        (p.days || []).map(function (d) {
          var dd = null; // optional date support (settings could add later)
          var hasPhotos = d.photos && d.photos.length > 0;
          var hasNote = d.note && d.note.trim().length > 0;
          // For cleanse, show all juices (1 each)
          var badges = [];
          if (d.phase === "cleanse") {
            badges = JUICE_RECIPES.map(function (r) {
              return e("span", { key: r.id, className: "badge" }, "🧃 ", r.name);
            });
          } else {
            // show meals assigned to that day
            badges = MEAL_RECIPES.filter(function (r) { return r.day === d.day; }).map(function (r) {
              return e("span", { key: r.id, className: "badge" }, "🍽️ ", r.name);
            });
          }
          if (badges.length === 0) badges = [e("span", { key: "none", style: { fontSize: 12, color: "#64748b" } }, "—")];

          return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
              e("div", null,
                e("div", { style: { fontWeight: 600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 24 } },
                badges,
                hasNote && e("span", { className: "badge" }, "📝 Note"),
                hasPhotos && e("span", { className: "badge" }, "📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  function Photos(p) {
    var pair = useState(0);
    var idx = pair[0], setIdx = pair[1];
    var day = (p.days || [])[idx] || p.days[0];

    function handleUpload(ev) {
      var files = Array.from(ev.target.files || []);
      if (!files.length) return;
      var readers = files.map(function (f) { return new Promise(function (res) {
        var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(f);
      });});
      Promise.all(readers).then(function (urls) {
        p.setDays(function (prev) {
          var next = prev.slice();
          var d = Object.assign({}, next[idx]);
          d.photos = (d.photos || []).concat(urls);
          next[idx] = d; return next;
        });
        var A = [
          "Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪",
          "Oz is proud of you 🐶","Consistency looks good on you 🌟","Radiant!"
        ];
        setTimeout(function () { alert(A[Math.floor(Math.random() * A.length)]); }, 30);
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
        e("label", { className: "btn peach" },
          "Upload Photo",
          e("input", { type: "file", multiple: true, accept: "image/*", onChange: handleUpload, style: { display: "none" } })
        )
      ),
      e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        (day.photos || []).map(function (url, i) { return e("img", { key: i, src: url, style: { width: 100, height: 100, objectFit: "cover", borderRadius: 8 } }); })
      )
    );
  }

  // ---- Dashboard ----
  function Dashboard(p) {
    var pair = useState(0);
    var idx = pair[0], setIdx = pair[1];
    var d = p.days[idx] || p.days[0];

    // checklist items by phase
    var templateIds = p.templates[d.phase] || [];
    var activeIds = (d.order && d.order.length ? d.order : templateIds);
    var items = activeIds.map(function (id) { return ({ id: id, label: p.goals[id] || id }); });
    var checks = d.checks || {};
    var doneCount = items.reduce(function (a, it) { return a + (checks[it.id] ? 1 : 0); }, 0);
    var totalCount = Math.max(1, items.length);
    var progress = (doneCount / totalCount) * 100;

    // confetti on 100%
    useEffect(function () {
      if (Math.round(progress) === 100 && window.confetti) {
        window.confetti({ particleCount: 180, spread: 80, startVelocity: 35, scalar: 1.1, origin: { y: 0.7 } });
        setTimeout(function () {
          window.confetti({ particleCount: 140, spread: 70, startVelocity: 30, scalar: 1.0, origin: { x: 0.2, y: 0.6 } });
          window.confetti({ particleCount: 140, spread: 70, startVelocity: 30, scalar: 1.0, origin: { x: 0.8, y: 0.6 } });
        }, 250);
      }
    }, [progress]);

    function toggleCheck(id) {
      p.setDays(function (prev) {
        var next = prev.slice();
        var cur = Object.assign({}, next[idx]);
        var c = Object.assign({}, cur.checks || {});
        c[id] = !c[id];
        cur.checks = c;
        next[idx] = cur;
        return next;
      });
    }
    function changeDay(delta) {
      setIdx(function (cur) {
        var n = cur + delta;
        if (n < 0) n = p.days.length - 1;
        if (n >= p.days.length) n = 0;
        return n;
      });
    }

    // coach
    var coachTextPair = useState("");
    var coachText = coachTextPair[0], setCoachText = coachTextPair[1];
    function runCoach() {
      var text = (d.note || "").trim();
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
      var hits = COACH_RULES.filter(function (r) { try { return r.test({ syms: found, phase: d.phase }); } catch (e) { return false; } });
      var tips = hits.flatMap(function (h) { return h.tips; }).slice(0, 8);
      var moodBoost = (mood <= 3)
        ? ["You’re not alone — make today gentle.", "Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : (mood <= 6)
          ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
          : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave; stay kind to yourself."];

      var header = found.size ? ("I noticed: " + Array.from(found).join(", ") + ".") : "No specific symptoms spotted — here’s a steady plan.";
      var body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(header + "\n\n" + body + "\n\n" + moodBoost.join(" "));
    }

    // next two days ingredients
    function nextTwoDays(dNow) {
      // If cleanse → list all 4 juices (1 each). Otherwise, recipes for today+tomorrow.
      if (dNow.phase === "cleanse") {
        return { label: "Today + Tomorrow — Cleanse Juices (1 of each)", items: JUICE_RECIPES.map(function (r) {
          return { name: r.name, qtyList: (r.ingredients || []).map(function (it) { return it.qty || ""; }), days: [dNow.day, Math.min(dNow.day + 1, p.days.length)] };
        }) };
      }
      var dayNums = [dNow.day, Math.min(dNow.day + 1, p.days.length)];
      var bag = {};
      MEAL_RECIPES.forEach(function (r) {
        if (!r.day || dayNums.indexOf(r.day) === -1) return;
        (r.ingredients || []).forEach(function (it) {
          var k = (it.key || it.name || "").toLowerCase();
          if (!bag[k]) bag[k] = { name: it.name, qtyList: [], days: new Set() };
          if (it.qty) bag[k].qtyList.push(it.qty);
          bag[k].days.add(r.day);
        });
      });
      Object.keys(bag).forEach(function (k) {
        bag[k].days = Array.from(bag[k].days).sort(function (a, b) { return a - b; });
      });
      var arr = Object.keys(bag).map(function (k) { return bag[k]; })
        .sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
      return { label: "Today + Tomorrow — Ingredients", items: arr };
    }
    var nextInfo = nextTwoDays(d);

    // weight series
    var series = p.days.map(function (row) { return (row.weight == null ? null : row.weight); });

    // Masthead (one straight line)
    var head = e("div", { className: "mast card" },
      e("div", { className: "mastRow" },
        e("div", { className: "mastLeft" },
          e("img", { src: "oz.png", alt: "Oz" }),
          e("div", { className: "mastTitle" },
            e("b", null, "Oz Companion"),
            e("small", null, d.phase.toUpperCase())
          )
        ),
        e("div", { className: "day-nav" },
          e("button", { className: "day-btn", onClick: function () { changeDay(-1); }, "aria-label": "Previous day" }, "◀"),
          e("span", { className: "day-label" }, "Day " + d.day),
          e("button", { className: "day-btn", onClick: function () { changeDay(1); }, "aria-label": "Next day" }, "▶")
        )
      )
    );

    var dash = e("div", { className: "wrap" },
      head,
      e(ProgressBar, { value: progress }),

      e("div", { className: "card", style: { marginTop: 12 } },
        e(Checklist, { items: items, state: checks, onToggle: toggleCheck })
      ),

      e("div", { className: "card", style: { marginTop: 16 } },
        // Smart Coach header is the button
        e("div", {
          role: "button", tabIndex: 0,
          onKeyDown: function (ev) { if (ev.key === "Enter" || ev.key === " ") runCoach(); },
          onClick: runCoach,
          className: "coachHead"
        },
          e("div", { className: "title" }, "🧠 Smart Coach"),
          e("div", { className: "coachBtns" }, e("span", { className: "badge" }, "Tap to analyze your note"))
        ),
        coachText && e("div", { className: "coachOut", style: { marginTop: 10 } }, coachText),
        // Note box
        e("textarea", {
          value: d.note || "",
          onChange: function (ev) {
            var val = ev.target.value;
            p.setDays(function (prev) {
              var next = prev.slice();
              var dd = Object.assign({}, next[idx]); dd.note = val; next[idx] = dd; return next;
            });
          },
          rows: 4, className: "noteArea", style: { marginTop: 10, fontSize: 16 }
        })
      ),

      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, nextInfo.label),
        nextInfo.items.length === 0
          ? e("p", { style: { color: "#64748b" } }, "No recipes scheduled soon.")
          : e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
            nextInfo.items.map(function (item, i) {
              return e("li", {
                key: item.name + "-" + i,
                style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3d0e1" }
              },
                e("span", null,
                  item.name, " ",
                  e("span", { className: "badge" },
                    item.days
                      ? (item.days.length === 1 ? ("Day " + item.days[0]) : ("Day " + item.days[0] + "–" + item.days[item.days.length - 1]))
                      : "Cleanse"
                  )
                ),
                e("span", { style: { color: "#64748b", fontSize: 12 } }, (item.qtyList || []).join(" + "))
              );
            })
          )
      ),

      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, "Weight"),
        e("div", { style: { display: "flex", alignItems: "center", gap: 8, margin: "8px 0" } },
          e("label", null, "Today’s weight"),
          e("input", {
            type: "number", step: "0.1",
            value: (d.weight == null ? "" : d.weight),
            onChange: function (ev) {
              var v = ev.target.value;
              p.setDays(function (prev) {
                var next = prev.slice();
                var dd = Object.assign({}, next[idx]);
                dd.weight = (v === "" ? null : Number(v));
                if (v !== "" && ((dd.checks && "weight" in dd.checks) || activeIds.indexOf("weight") !== -1)) {
                  var c = Object.assign({}, dd.checks || {}); c.weight = true; dd.checks = c;
                }
                next[idx] = dd; return next;
              });
            },
            style: { width: 120, fontSize: 16 } // no iOS zoom
          }),
          e("span", { className: "badge" }, "Day " + d.day)
        ),
        e(WeightChart, { series: series })
      )
    );

    return dash;
  }

  function Settings(p) {
    var localPair = useState(p.templates);
    var local = localPair[0], setLocal = localPair[1];
    var showPair = useState(false);
    var show = showPair[0], setShow = showPair[1];
    var phasePair = useState("fast");
    var phase = phasePair[0], setPhase = phasePair[1];
    var checkedPair = useState({});
    var checked = checkedPair[0], setChecked = checkedPair[1];

    useEffect(function () { setLocal(p.templates); }, [p.templates]);

    function openModal(ph) {
      setPhase(ph);
      var sel = new Set((local[ph] || []));
      var all = Object.keys(p.goals).reduce(function (m, id) { m[id] = sel.has(id); return m; }, {});
      setChecked(all);
      setShow(true);
    }
    function toggleId(id) { setChecked(function (prev) { var out = Object.assign({}, prev); out[id] = !out[id]; return out; }); }
    function saveModal() {
      var nextIds = Object.keys(checked).filter(function (id) { return checked[id]; });
      var next = Object.assign({}, local); next[phase] = nextIds;
      setLocal(next); p.onChange(next); setShow(false);
    }
    function createGoal() {
      var idRaw = prompt("New goal ID (letters, dashes): e.g., meditation");
      if (!idRaw) return;
      var id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "");
      if (!id) return alert("Invalid ID.");
      if (p.goals[id]) return alert("That goal ID already exists.");
      var label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if (!label) return;
      p.setGoals(function (prev) { var o = Object.assign({}, prev); o[id] = label; return o; });
      setChecked(function (prev) { var o = Object.assign({}, prev); o[id] = true; return o; });
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Settings"),
      e("div", { className: "card", style: { marginBottom: 12 } },
        e("h2", null, "Phase Templates"),
        e("p", { style: { margin: "6px 0 12px", color: "#64748b" } }, "Choose which goals appear by default in each phase."),
        ["fast", "cleanse", "rebuild"].map(function (ph) {
          return e("div", { key: ph, style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 } },
            e("div", null, e("b", null, ph.charAt(0).toUpperCase() + ph.slice(1)), " — ",
              (local[ph] || []).map(function (id) { return e("span", { key: id, className: "badge", style: { marginRight: 6 } }, p.goals[id] || id); })
            ),
            e("button", { className: "btn", onClick: function () { openModal(ph); } }, "Edit Goals")
          );
        })
      ),
      // Modal
      e("div", { className: "modal" + (show ? " show" : ""), onClick: function (ev) { if (ev.target.classList && ev.target.classList.contains("modal")) setShow(false); } },
        e("div", { className: "sheet" },
          e("h2", null, "Edit Goals — ", phase.charAt(0).toUpperCase() + phase.slice(1)),
          e("div", { style: { maxHeight: "48vh", overflow: "auto", margin: "8px 0 12px" } },
            Object.keys(p.goals).map(function (id) {
              return e("label", { key: id, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderBottom: "1px solid #f3d0e1" } },
                e("input", { type: "checkbox", checked: !!checked[id], onChange: function () { toggleId(id); } }),
                e("span", null, p.goals[id])
              );
            })
          ),
          e("div", { style: { display: "flex", gap: 8, justifyContent: "space-between" } },
            e("button", { className: "btn", onClick: createGoal }, "+ New Goal"),
            e("div", null,
              e("button", { className: "btn", onClick: function () { setShow(false); } }, "Cancel"),
              e("button", { className: "btn primary", onClick: saveModal, style: { marginLeft: 8 } }, "Save")
            )
          )
        )
      )
    );
  }

  // ---- App ----
  function App() {
    var goalsPair = useLocal("oz.goals", INITIAL_GOALS);
    var goals = goalsPair[0], setGoals = goalsPair[1];

    var settingsPair = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    var settings = settingsPair[0], setSettings = settingsPair[1];

    // Validate templates vs goals
    useEffect(function () {
      var pt = settings && settings.phaseTemplates;
      var valid = pt && ["fast", "cleanse", "rebuild"].every(function (k) { return Array.isArray(pt[k]) && pt[k].every(function (id) { return !!goals[id]; }); });
      if (!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    }, [goals]); // eslint-disable-line

    var daysPair = useLocal("oz.days", defaultDays());
    var days = daysPair[0], setDays = daysPair[1];

    var groceriesPair = useLocal("oz.groceries", aggregateGroceries(days));
    var groceries = groceriesPair[0], setGroceries = groceriesPair[1];

    // Recompute groceries whenever days change (e.g., if phases change later)
    useEffect(function () {
      setGroceries(aggregateGroceries(days));
    }, [days]); // eslint-disable-line

    var tabPair = useState("dash");
    var tab = tabPair[0], setTab = tabPair[1];

    // Views
    var dash = e(Dashboard, { templates: settings.phaseTemplates, days: days, setDays: setDays, goals: goals });
    var groc = e(GroceryList, { groceries: groceries, setGroceries: setGroceries });
    var cal = e(Calendar, { days: days });
    var pho = e(Photos, { days: days, setDays: setDays });
    var setv = e(Settings, { templates: settings.phaseTemplates, onChange: function (next) { setSettings({ phaseTemplates: next }); }, goals: goals, setGoals: setGoals });

    return e(React.Fragment, null,
      // Topbar is inside Dashboard layout (wanted on that screen mainly)
      (tab === "dash") && dash,
      (tab === "groceries") && groc,
      (tab === "calendar") && cal,
      (tab === "photos") && pho,
      (tab === "settings") && setv,

      // Floating emoji dock
      e("nav", { className: "tabs" },
        [
          { id: "dash", icon: "🏠", label: "Dashboard" },
          { id: "groceries", icon: "🛒", label: "Groceries" },
          { id: "calendar", icon: "📅", label: "Calendar" },
          { id: "photos", icon: "📷", label: "Photos" },
          { id: "settings", icon: "⚙️", label: "Settings" }
        ].map(function (t) {
          return e("button", {
            key: t.id,
            className: "btn" + (tab === t.id ? " active" : ""),
            onClick: function () { setTab(t.id); },
            "aria-label": t.label
          }, t.icon);
        })
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
