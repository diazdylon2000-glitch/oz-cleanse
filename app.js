/* app.js — Oz Companion (stable build)
   - Splash loader (Oz + bubble)
   - Masthead: Oz avatar, title on one line, phase as smaller subtitle, centered day selector
   - Paw-print checklist
   - Streamlined Smart Coach (header is the button; doesn't copy into note)
   - Notes & Photos badges on Calendar
   - Groceries: budget + editable prices + light unit conversion
   - Weight chart (Chart.js), iPhone crisp; weight input font-size 16px (prevents iOS zoom)
*/

(function () {
  "use strict";

  // --- Splash: set friendly line + fade out ---
(function () {
  var lines = [
    "Hydration is happiness 🐾",
    "Small habits, big change",
    "Progress, not perfection",
    "Sip, breathe, reset",
    "Strong body, calm mind"
  ];
  var bubble = document.getElementById("ozBubble");
  if (bubble) bubble.textContent = lines[Math.floor(Math.random() * lines.length)];

  window.addEventListener("load", function () {
    setTimeout(function () {
      var splash = document.getElementById("ozSplash");
      if (splash) splash.classList.add("hide");
      setTimeout(function () {
        if (splash) splash.style.display = "none";
      }, 380);
    }, 1100);
  });
})();

  /* -------- React helpers -------- */
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  function useLocal(key, initialValue) {
    var s = useState(function () {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initialValue;
      } catch (e) { return initialValue; }
    });
    var val = s[0], setVal = s[1];
    useEffect(function () {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }, [key, val]);
    return [val, setVal];
  }

  /* -------- Data -------- */
  function defaultDays() {
    var phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    var out = [];
    for (var i = 0; i < phases.length; i++) {
      out.push({ day: i + 1, phase: phases[i], order: null, checks: {}, note: "", weight: null, photos: [] });
    }
    return out;
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

  // Recipes (same as prior good state)
  var PLAN_RECIPES = [
    { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:4,
      ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}]
    },
    { id:"r-peach",  name:"Peachy Green Glow",  type:"juice", day:5, servings:4,
      ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:4,
      ingredients:[{key:"carrots",name:"Carrots",qty:"14"},{key:"apples",name:"Apples",qty:"2"},{key:"ginger",name:"Ginger",qty:'1"'},{key:"lemons",name:"Lemons",qty:"1"}]
    },
    { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:4,
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

  /* -------- Grocery aggregation -------- */
  function aggregateGroceries(recipes) {
    var factor = function (r) { return r.type === "juice" ? (r.servings || 4) : 1; };
    var measure = function (s) {
      if (!s) return { n: 1, u: "" };
      var m = String(s).match(/^(\d+(\.\d+)?)(.*)$/);
      return m ? { n: parseFloat(m[1]), u: (m[3] || "").trim() } : { n: 1, u: "" };
    };
    var fmt = function (n, u) { return u ? (Number.isInteger(n) ? n : (+n).toFixed(2)) + " " + u : String(n); };
    var map = {};
    (recipes || []).forEach(function (r) {
      var mult = factor(r);
      (r.ingredients || []).forEach(function (it) {
        var id = (it.key || it.name || "").toLowerCase().replace(/\s+/g, "-");
        var q = measure(it.qty || "1");
        var scaled = { n: q.n * mult, u: q.u };
        if (!map[id]) {
          map[id] = { id: id, name: it.name, qtyNum: scaled.n, qtyUnit: scaled.u, checked: false, estCost: null, days: r.day ? [r.day] : [] };
        } else {
          map[id].qtyNum += scaled.n;
          var set = new Set(map[id].days || []);
          if (r.day) set.add(r.day);
          map[id].days = Array.from(set).sort(function (a, b) { return a - b; });
        }
      });
    });
    return Object.values(map)
      .map(function (g) {
        return { id: g.id, name: g.name, qty: (g.qtyUnit ? fmt(g.qtyNum, g.qtyUnit) : String(g.qtyNum)), checked: g.checked, estCost: g.estCost, days: g.days };
      })
      .sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
  }

  /* -------- Default price book -------- */
  var DEFAULT_PRICES = {
    carrots: { unit: "each", price: 0.40 },
    cucumbers: { unit: "each", price: 0.75 },
    lemons: { unit: "each", price: 0.60 },
    limes: { unit: "each", price: 0.50 },
    peaches: { unit: "each", price: 0.90 },
    grapes: { unit: "lb", price: 2.50 },
    romaine: { unit: "head", price: 2.00 },
    spinach: { unit: "lb", price: 4.00 },
    melons: { unit: "each", price: 3.50 },
    apples: { unit: "each", price: 0.90 },
    ginger: { unit: "oz", price: 0.25 },
    parsley: { unit: "bunch", price: 1.75 },
    mint: { unit: "bunch", price: 1.50 },
    "rolled-oats": { unit: "lb", price: 1.80 },
    "almond-milk": { unit: "qt", price: 3.50 },
    lentils: { unit: "lb", price: 1.60 },
    quinoa: { unit: "lb", price: 4.50 },
    "olive-oil": { unit: "fl-oz", price: 0.30 },
    broccoli: { unit: "head", price: 2.25 }
  };
  var UNITS = ["each","head","lb","cup","oz","fl-oz","bunch","qt"];

  function parseQty(q) {
    if (!q) return { n: 1, u: "each" };
    var m = String(q).match(/^(\d+(\.\d+)?)\s*(\w+)?/);
    return { n: m ? +m[1] : 1, u: m && m[3] ? m[3].toLowerCase() : "each" };
  }
  function convert(n, from, to, name) {
    if (from === to) return n;
    var cupToLb = { spinach: 0.0625, romaine: 0.05, grapes: 0.33, parsley: 0.06, mint: 0.06 };
    name = name || "";
    if (from === "cup" && to === "lb") {
      var key = Object.keys(cupToLb).find(function (k) { return name.toLowerCase().includes(k); });
      return key ? n * cupToLb[key] : n * 0.1;
    }
    if (from === "oz" && to === "lb") return n / 16;
    if (from === "fl-oz" && to === "qt") return n / 32;
    if (from === "qt" && to === "fl-oz") return n * 32;
    return n;
  }

  /* -------- UI atoms -------- */
  function ProgressBar(props) {
    var v = Math.max(0, Math.min(100, props.value || 0)) + "%";
    return e("div", { className: "prog" },
      e("div", { className: "fill", style: { width: v } })
    );
  }

  function Checklist(props) {
    var items = props.items || [];
    var state = props.state || {};
    var onToggle = props.onToggle || function () {};
    return e("ul", { className: "list" },
      items.map(function (it) {
        return e("li", { key: it.id, className: "item" },
          e("button", {
            className: "paw" + (state[it.id] ? " on" : ""),
            onClick: function () { onToggle(it.id); },
            "aria-pressed": !!state[it.id]
          }, state[it.id] ? "🐾" : ""),
          e("label", null, it.label)
        );
      })
    );
  }

  function WeightChart(props) {
    var series = props.series || [];
    var canvasRef = useRef(null);
    var chartRef = useRef(null);

    useEffect(function () {
      if (!window.Chart) return;
      var ctx = canvasRef.current.getContext("2d");
      if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: series.map(function (_, i) { return "Day " + (i + 1); }),
          datasets: [{
            data: series,
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
          layout: { padding: { bottom: 12, top: 6, left: 6, right: 6 } },
          plugins: { legend: { display: false } },
          scales: {
            x: { display: true, ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.25)" } },
            y: { display: true, ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.18)" } }
          },
          animation: { duration: 250 },
          devicePixelRatio: window.devicePixelRatio || 2
        }
      });
      return function () { try { chartRef.current && chartRef.current.destroy(); } catch (e) {} };
    }, [series]);

    return e("div", { style: { height: 180 } }, e("canvas", { ref: canvasRef }));
  }

  /* -------- Pages -------- */
  function GroceryList(props) {
    var groceries = props.groceries || [];
    var setGroceries = props.setGroceries || function () {};
    var budgetState = useLocal("oz.budget", 0);
    var budget = budgetState[0], setBudget = budgetState[1];

    var enriched = groceries.map(function (g) {
      var base = DEFAULT_PRICES[g.id] || {};
      return Object.assign({}, g, {
        unit: g.unit || base.unit || "each",
        price: (g.price != null ? g.price : (base.price || 0))
      });
    });

    function update(idx, patch) {
      setGroceries(enriched.map(function (g, i) { return i === idx ? Object.assign({}, g, patch) : g; }));
    }

    var totals = enriched.reduce(function (acc, g) {
      var q = parseQty(g.qty);
      var qtyIn = convert(q.n, q.u, g.unit, g.name);
      var line = (g.price || 0) * (isFinite(qtyIn) ? qtyIn : 0);
      if (g.checked) acc.checked += line; else acc.remaining += line;
      acc.total += line;
      return acc;
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
            style: { width: 120, fontSize: "16px" }
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
        enriched.map(function (g, idx) {
          return e("li", {
            key: g.id,
            style: {
              display: "grid",
              gridTemplateColumns: "32px 1fr auto auto auto",
              gap: 8, padding: "10px 0", borderBottom: "1px solid #f3d0e1", alignItems: "center"
            }
          },
            e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: function () { update(idx, { checked: !g.checked }); } }, g.checked ? "🐾" : ""),
            e("div", null,
              e("div", null, g.name, " ", e("span", { className: "badge" }, daysBadge(g.days))),
              e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
            ),
            e("select", { value: g.unit, onChange: function (ev) { update(idx, { unit: ev.target.value }); } },
              UNITS.map(function (u) { return e("option", { key: u, value: u }, u); })),
            e("input", {
              type: "number", step: "0.01", value: (g.price == null ? "" : g.price),
              onChange: function (ev) { update(idx, { price: (ev.target.value === "" ? 0 : +ev.target.value) }); },
              style: { width: 80, fontSize: "16px" }
            }),
            e("div", { style: { textAlign: "right", minWidth: 70, fontWeight: 600 } }, "$" + (function () {
              var q = parseQty(g.qty);
              var qtyIn = convert(q.n, q.u, g.unit, g.name);
              return ((g.price || 0) * (isFinite(qtyIn) ? qtyIn : 0)).toFixed(2);
            })())
          );
        })
      )
    );
  }

  function Calendar(props) {
    var days = props.days || [];
    var recipes = props.recipes || [];
    var settings = props.settings || { phaseTemplates: {} };

    function dateFor(dayNum) {
      var dstr = settings.phaseTemplates && settings.phaseTemplates.__startDate;
      if (!dstr) return null;
      var base = new Date(dstr + "T00:00:00");
      if (isNaN(base)) return null;
      var dt = new Date(base.getTime() + (dayNum - 1) * 86400000);
      return dt.toLocaleDateString();
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
        days.map(function (d) {
          var dRecipes = recipes.filter(function (r) { return r.day === d.day; });
          var dd = dateFor(d.day);
          var hasPhotos = d.photos && d.photos.length > 0;
          var hasNote = d.note && d.note.trim().length > 0;
          return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
              e("div", null,
                e("div", { style: { fontWeight: 600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 24 } },
                dRecipes.length
                  ? dRecipes.map(function (r) {
                      return e("span", { key: r.id, className: "badge" },
                        (r.type === "juice" ? "🧃 " : "🍽️ "), r.name, (r.type === "juice" && r.servings ? (" ×" + r.servings) : "")
                      );
                    })
                  : e("span", { style: { fontSize: 12, color: "#64748b" } }, "—"),
                hasNote && e("span", { className: "badge" }, "📝 Note"),
                hasPhotos && e("span", { className: "badge" }, "📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  function Photos(props) {
    var days = props.days || [];
    var setDays = props.setDays || function () {};
    var idxState = useState(0);
    var idx = idxState[0], setIdx = idxState[1];
    var day = days[idx] || days[0] || { day: 1, photos: [] };

    function handleUpload(ev) {
      var files = Array.from(ev.target.files || []);
      if (!files.length) return;
      var readers = files.map(function (f) {
        return new Promise(function (res) {
          var r = new FileReader();
          r.onload = function () { res(r.result); };
          r.readAsDataURL(f);
        });
      });
      Promise.all(readers).then(function (urls) {
        setDays(function (prev) {
          var next = prev.slice();
          var d = Object.assign({}, next[idx]);
          d.photos = (d.photos || []).concat(urls);
          next[idx] = d;
          return next;
        });
        setTimeout(function () {
          var A = ["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶","Consistency looks good on you 🌟"];
          alert(A[Math.floor(Math.random() * A.length)]);
        }, 50);
      });
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Progress Photos"),
      e("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" } },
        e("div", null, e("b", null, "Day "), day.day),
        e("div", null,
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return (i > 0 ? i - 1 : days.length - 1); }); } }, "◀"),
          e("span", { className: "badge", style: { margin: "0 8px" } }, "Day " + day.day),
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return (i < days.length - 1 ? i + 1 : 0); }); } }, "▶")
        ),
        e("input", { type: "file", multiple: true, accept: "image/*", onChange: handleUpload })
      ),
      e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        (day.photos || []).map(function (url, i) {
          return e("img", { key: i, src: url, style: { width: 100, height: 100, objectFit: "cover", borderRadius: 8 } });
        })
      )
    );
  }

  /* -------- Smart Coach -------- */
  var COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "One step at a time — you’re doing amazing.","Keep going, your future self will thank you.",
    "Tiny wins add up.","Consistency beats intensity.","You’re building something real.","Strong body, kind mind."
  ];
  var COACH_RULES = [
    { id:"headache", test:function(ctx){return ctx.syms.has("headache");},
      tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest your eyes 5–10 minutes."] },
    { id:"dizziness", test:function(ctx){return ctx.syms.has("dizziness");},
      tips:["Sit or lie until steady.","Small juice or a pinch of salt if fasting.","Breathe in 4 / out 6."] },
    { id:"nausea", test:function(ctx){return ctx.syms.has("nausea");},
      tips:["Sip cool water or peppermint/ginger tea.","Step into fresh air.","Move slowly; avoid sudden changes."] },
    { id:"fatigue", test:function(ctx){return ctx.syms.has("fatigue");},
      tips:["Take a 15–20 min rest.","Hydrate or take electrolytes.","2 minutes of gentle stretching."] },
    { id:"hunger", test:function(ctx){return ctx.syms.has("hunger");},
      tips:["Drink water first.","Have scheduled juice slowly.","5-min walk as a reset."] }
  ];
  function inferMood(text) {
    var score = 6;
    var t = (text || "").toLowerCase();
    var neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    var pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/]
      .reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    score += pos - 2 * neg;
    return Math.max(1, Math.min(10, score));
  }

  /* -------- Dashboard -------- */
  function Dashboard(props) {
    var templates = props.templates || DEFAULT_PHASE_TEMPLATES;
    var days = props.days || [];
    var setDays = props.setDays || function () {};
    var recipes = props.recipes || [];
    var goals = props.goals || INITIAL_GOALS;

    var idxState = useState(0);
    var idx = idxState[0], setIdx = idxState[1];
    var day = days[idx] || days[0] || { day: 1, phase: "fast", checks: {}, note: "", weight: null };

    var templateIds = templates[day.phase] || [];
    var activeIds = (day.order && day.order.length ? day.order : templateIds);
    var items = activeIds.map(function (id) { return { id: id, label: goals[id] || id }; });
    var checks = day.checks || {};
    var doneCount = items.reduce(function (a, it) { return a + (checks[it.id] ? 1 : 0); }, 0);
    var totalCount = Math.max(1, items.length);
    var progress = (doneCount / totalCount) * 100;
    var weightSeries = days.map(function (d) { return d.weight == null ? null : d.weight; });

    useEffect(function () {
      if (Math.round(progress) === 100 && window.confetti) {
        try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
      }
    }, [progress]);

    function toggleCheck(id) {
      setDays(function (prev) {
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
        if (n < 0) n = days.length - 1;
        if (n >= days.length) n = 0;
        return n;
      });
    }

    // Smart coach
    var coachTextState = useState("");
    var coachText = coachTextState[0], setCoachText = coachTextState[1];

    function runCoach() {
      var text = (day.note || "").trim();
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
      var hits = COACH_RULES.filter(function (r) { try { return r.test({ syms: found, phase: day.phase }); } catch (e) { return false; } });
      var tips = hits.flatMap(function (h) { return h.tips; }).slice(0, 8);
      var moodBoost = (mood <= 3)
        ? ["You’re not alone — let’s make today gentle.", "Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : (mood <= 6)
          ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
          : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];
      var header = found.size ? ("I noticed: " + Array.from(found).join(", ") + ".") : "No specific symptoms spotted — here’s a steady plan.";
      var body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(header + "\n\n" + body + "\n\n" + moodBoost.join(" "));
    }

    function nextTwoDayIngredients(currentDay) {
      function tryDays(d1, d2) {
        var want = new Set([d1, d2]);
        var bag = {};
        (recipes || []).forEach(function (r) {
          if (!r.day || !want.has(r.day)) return;
          (r.ingredients || []).forEach(function (it) {
            var key = (it.key || it.name || "").toLowerCase();
            if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
            if (it.qty) bag[key].qtyList.push(it.qty + (r.type === "juice" && r.servings ? (" ×" + r.servings) : ""));
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

      var futureDays = Array.from(new Set((recipes || []).filter(function (r) { return r.day >= currentDay.day; }).map(function (r) { return r.day; }))).sort(function (a, b) { return a - b; });
      var pool = futureDays.slice(0, 2);
      if (pool.length === 0) return { items: [], label: "Upcoming Ingredients" };
      var fb = tryDays(pool[0], pool[1] || pool[0]);
      var label = pool.length === 2 ? ("Upcoming Ingredients — Day " + pool[0] + " & " + pool[1]) : ("Upcoming Ingredients — Day " + pool[0]);
      return { items: fb, label: label };
    }
    var nextInfo = nextTwoDayIngredients(day);
    var nextItems = nextInfo.items, nextLabel = nextInfo.label;

    return e(React.Fragment, null,
      // Masthead (title on one line; phase below; centered day selector)
      e("div", { className: "mast card" },
        e("div", { className: "mastRow" },
          e("div", { className: "mastLeft" },
            e("img", { src: "oz.png", alt: "Oz" }),
            e("div", null,
              e("div", { style: { fontSize: 22, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" } }, "Oz Companion"),
              e("div", { style: { marginTop: 4, color: "#64748b", fontWeight: 600, letterSpacing: .6, fontSize: "12px" } }, day.phase.toUpperCase())
            )
          ),
          e("div", { className: "day-nav", style: { alignItems: "center", margin: "0 auto" } },
            e("button", { className: "day-btn", onClick: function () { changeDay(-1); }, "aria-label": "Previous day" }, "◀"),
            e("span", { className: "day-label" }, "Day " + day.day),
            e("button", { className: "day-btn", onClick: function () { changeDay(1); }, "aria-label": "Next day" }, "▶")
          )
        )
      ),

      e(ProgressBar, { value: progress }),

      // Checklist
      e("div", { className: "card", style: { marginTop: 12 } },
        e(Checklist, { items: items, state: checks, onToggle: toggleCheck })
      ),

      // Notes + Smart Coach (streamlined)
      e("div", { className: "card", style: { marginTop: 16 } },
        e("div", {
          role: "button", tabIndex: 0,
          onClick: runCoach,
          onKeyDown: function (ev) { if (ev.key === "Enter" || ev.key === " ") runCoach(); },
          style: {
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, padding: "10px 12px",
            border: "1px solid #f3d0e1", borderRadius: 12,
            background: "linear-gradient(90deg,#ffe4ef,#e9d5ff)", cursor: "pointer"
          }
        },
          e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            e("span", { style: { fontSize: 18 } }, "🧠"),
            e("span", { style: { fontWeight: 800 } }, "Smart Coach"),
            e("span", { style: { color: "#475569", fontSize: 13 } }, " — Tap to analyze your note & get relief + motivation")
          )
        ),
        coachText && e("div", { className: "coachOut", style: { marginTop: 10 } }, coachText),
        e("textarea", {
          value: day.note || "",
          onChange: function (ev) {
            var val = ev.target.value;
            setDays(function (prev) {
              var next = prev.slice();
              var d = Object.assign({}, next[idx]);
              d.note = val;
              next[idx] = d;
              return next;
            });
          },
          rows: 5,
          className: "noteArea",
          style: { marginTop: 10 }
        })
      ),

      // Upcoming ingredients
      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, nextLabel),
        nextItems.length === 0
          ? e("p", { style: { color: "#64748b" } }, "No recipes scheduled soon.")
          : e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
              nextItems.map(function (item) {
                return e("li", {
                  key: item.name,
                  style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3d0e1" }
                },
                  e("span", null,
                    item.name, " ",
                    e("span", { className: "badge" },
                      item.days.length === 1 ? ("Day " + item.days[0]) : ("Day " + item.days[0] + "–" + item.days[item.days.length - 1])
                    )
                  ),
                  e("span", { style: { color: "#64748b", fontSize: 12 } }, item.qtyList.join(" + ") || "")
                );
              })
            )
      ),

      // Weight
      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, "Weight"),
        e("div", { style: { display: "flex", alignItems: "center", gap: 8, margin: "8px 0" } },
          e("label", null, "Today’s weight"),
          e("input", {
            type: "number", step: "0.1",
            value: (day.weight == null ? "" : day.weight),
            onChange: function (ev) {
              var v = ev.target.value;
              setDays(function (prev) {
                var next = prev.slice();
                var d = Object.assign({}, next[idx]);
                d.weight = (v === "" ? null : Number(v));
                // auto-check weight if present
                var activeIds = templates[d.phase] || [];
                if (v !== "" && (("weight" in (d.checks || {})) || activeIds.indexOf("weight") !== -1)) {
                  var c = Object.assign({}, d.checks || {});
                  c.weight = true;
                  d.checks = c;
                }
                next[idx] = d;
                return next;
              });
            },
            style: { width: 120, fontSize: "16px" } // 16px prevents iOS zoom
          }),
          e("span", { className: "badge" }, "Day " + day.day)
        ),
        e(WeightChart, { series: weightSeries })
      )
    );
  }

  function Settings(props) {
    var templates = props.templates || DEFAULT_PHASE_TEMPLATES;
    var onChange = props.onChange || function () {};
    var onImportPlan = props.onImportPlan || function () {};
    var goals = props.goals || INITIAL_GOALS;
    var setGoals = props.setGoals || function () {};
    var onImportText = props.onImportText || function () {};

    var localState = useState(templates);
    var local = localState[0], setLocal = localState[1];
    var showModalState = useState(false);
    var showModal = showModalState[0], setShowModal = showModalState[1];
    var modalPhaseState = useState("fast");
    var modalPhase = modalPhaseState[0], setModalPhase = modalPhaseState[1];
    var modalCheckedState = useState({});
    var modalChecked = modalCheckedState[0], setModalChecked = modalCheckedState[1];

    useEffect(function () { setLocal(templates); }, [templates]);

    function openModal(phase) {
      setModalPhase(phase);
      var sel = new Set(local[phase] || []);
      var all = Object.keys(goals).reduce(function (m, id) { m[id] = sel.has(id); return m; }, {});
      setModalChecked(all);
      setShowModal(true);
    }
    function saveModal() {
      var nextIds = Object.keys(modalChecked).filter(function (id) { return modalChecked[id]; });
      var next = Object.assign({}, local);
      next[modalPhase] = nextIds;
      setLocal(next);
      onChange(next);
      setShowModal(false);
    }
    function toggleModalId(id) {
      setModalChecked(function (prev) {
        var x = Object.assign({}, prev);
        x[id] = !x[id];
        return x;
      });
    }
    function createGoal() {
      var idRaw = prompt("New goal ID (letters, dashes): e.g., meditation");
      if (!idRaw) return;
      var id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "");
      if (!id) return alert("Invalid ID.");
      if (goals[id]) return alert("That goal ID already exists.");
      var label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if (!label) return;
      setGoals(function (prev) {
        var x = Object.assign({}, prev);
        x[id] = label;
        return x;
      });
      setModalChecked(function (prev) {
        var x = Object.assign({}, prev);
        x[id] = true;
        return x;
      });
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Settings"),
      e("div", { className: "card", style: { marginBottom: 12 } },
        e("h2", null, "Phase Templates"),
        e("p", { style: { margin: "6px 0 12px", color: "#64748b" } }, "Choose which goals appear by default in each phase."),
        ["fast", "cleanse", "rebuild"].map(function (phase) {
          return e("div", { key: phase, style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 } },
            e("div", null,
              e("b", null, phase.charAt(0).toUpperCase() + phase.slice(1)), " — ",
              (local[phase] || []).map(function (id) { return e("span", { key: id, className: "badge", style: { marginRight: 6 } }, goals[id] || id); })
            ),
            e("button", { className: "btn", onClick: function () { openModal(phase); } }, "Edit Goals")
          );
        })
      ),
      e("div", { className: "card", style: { marginTop: 8 } },
        e("h2", null, "Import 11-Day Plan"),
        e("p", { style: { color: "#64748b", margin: "6px 0 12px" } }, "Reloads all juices/meals and rebuilds the grocery list."),
        e("button", { className: "btn", onClick: onImportPlan }, "Import Default Plan"),
        e("button", { className: "btn", style: { marginLeft: 8 }, onClick: onImportText }, "Import plan from ChatGPT text")
      ),
      // Modal
      e("div", {
        className: "modal" + (showModal ? " show" : ""),
        onClick: function (ev) { if (ev.target.classList && ev.target.classList.contains("modal")) setShowModal(false); }
      },
        e("div", { className: "sheet" },
          e("h2", null, "Edit Goals — ", modalPhase.charAt(0).toUpperCase() + modalPhase.slice(1)),
          e("div", { style: { maxHeight: "48vh", overflow: "auto", margin: "8px 0 12px" } },
            Object.keys(goals).map(function (id) {
              return e("label", {
                key: id,
                style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderBottom: "1px solid #f3d0e1" }
              },
                e("input", { type: "checkbox", checked: !!modalChecked[id], onChange: function () { toggleModalId(id); } }),
                e("span", null, goals[id])
              );
            })
          ),
          e("div", { style: { display: "flex", gap: 8, justifyContent: "space-between" } },
            e("button", { className: "btn", onClick: createGoal }, "+ New Goal"),
            e("div", null,
              e("button", { className: "btn", onClick: function () { setShowModal(false); } }, "Cancel"),
              e("button", { className: "btn primary", onClick: saveModal, style: { marginLeft: 8 } }, "Save")
            )
          )
        )
      )
    );
  }

  /* -------- Importer (text) -------- */
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
      if (mJuice && curDay) { recipes.push({ id: "r-" + recipes.length, name: mJuice[1].trim(), type: "juice", day: curDay, servings: 4, ingredients: [] }); return; }
      var mMeal = line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
      if (mMeal && curDay) { recipes.push({ id: "m-" + recipes.length, name: mMeal[2].trim(), type: "meal", day: curDay, ingredients: [] }); return; }
      var mIng = line.match(/^[•\-]\s*(.+)$/);
      if (mIng && recipes.length) {
        var last = recipes[recipes.length - 1];
        var s = mIng[1].trim();
        var m = s.match(/^(\d+(\.\d+)?\s*\w+)?\s*(.+)$/);
        last.ingredients.push({ key: (m ? m[3] : s).toLowerCase().replace(/\s+/g, "-"), name: (m ? m[3] : s), qty: (m && m[1]) ? m[1] : "" });
      }
    });
    return { days: days, recipes: recipes };
  }

  /* -------- App -------- */
  function App() {
    var goalsState = useLocal("oz.goals", INITIAL_GOALS);
    var goals = goalsState[0], setGoals = goalsState[1];

    var settingsState = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    var settings = settingsState[0], setSettings = settingsState[1];
    useEffect(function () {
      var pt = settings && settings.phaseTemplates;
      var valid = pt && ["fast", "cleanse", "rebuild"].every(function (k) { return Array.isArray(pt[k]) && pt[k].every(function (id) { return !!goals[id]; }); });
      if (!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goals]);

    var daysState = useLocal("oz.days", defaultDays());
    var days = daysState[0], setDays = daysState[1];
    var recipesState = useLocal("oz.recipes", PLAN_RECIPES);
    var recipes = recipesState[0], setRecipes = recipesState[1];
    var groceriesState = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
    var groceries = groceriesState[0], setGroceries = groceriesState[1];

    var tabState = useState("dash");
    var tab = tabState[0], setTab = tabState[1];

    function importFullPlan() {
      var newDays = defaultDays();
      setDays(newDays);
      setRecipes(PLAN_RECIPES);
      setGroceries(aggregateGroceries(PLAN_RECIPES));
      alert("Plan imported ✔");
    }
    function importFromChatGPTPrompt() {
      var txt = prompt("Paste ChatGPT meal-plan text or JSON:");
      if (!txt) return;
      try {
        var plan = JSON.parse(txt);
        if (!Array.isArray(plan.recipes) || !Array.isArray(plan.days)) throw new Error("bad");
        setDays(plan.days);
        setRecipes(plan.recipes);
        setGroceries(aggregateGroceries(plan.recipes));
        alert("Imported ✔");
      } catch (e) {
        try {
          var parsed = parseFreeTextPlan(txt);
          setDays(parsed.days);
          setRecipes(parsed.recipes);
          setGroceries(aggregateGroceries(parsed.recipes));
          alert("Imported ✔");
        } catch (err) {
          alert("Couldn’t parse that text. If possible, paste JSON next time.");
        }
      }
    }

    return e("div", null,
      (tab === "dash") && e(Dashboard, { templates: settings.phaseTemplates, days: days, setDays: setDays, recipes: recipes, goals: goals }),
      (tab === "groceries") && e(GroceryList, { groceries: groceries, setGroceries: setGroceries }),
      (tab === "calendar") && e(Calendar, { days: days, recipes: recipes, settings: settings }),
      (tab === "photos") && e(Photos, { days: days, setDays: setDays }),
      (tab === "settings") && e(Settings, {
        templates: settings.phaseTemplates,
        onChange: function (next) { setSettings({ phaseTemplates: next }); },
        onImportPlan: importFullPlan,
        goals: goals, setGoals: setGoals,
        onImportText: importFromChatGPTPrompt
      }),

      // Floating emoji dock (centered, simple)
      e("nav", { className: "tabs" },
        [
          { id: "dash", icon: "🏠" },
          { id: "groceries", icon: "🛒" },
          { id: "calendar", icon: "📅" },
          { id: "photos", icon: "📷" },
          { id: "settings", icon: "⚙️" }
        ].map(function (t) {
          return e("button", {
            key: t.id,
            className: "btn" + (tab === t.id ? " active" : ""),
            onClick: function () { setTab(t.id); },
            "aria-label": t.id
          }, t.icon);
        })
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
