/* app.js – Oz Cleanse Companion (V14)
   - Mobile-friendly splash with tight bubble
   - One-line mast (avatar + title + day selector)
   - Progress bar, checklist with paws
   - Notes + Smart Coach (UI only)
   - Calendar: Cleanse shows 4 juices (not x4 of one)
   - Photos, Groceries, Settings (light)
*/

/* ---------- Splash: copy, fade-out ---------- */
(function () {
  var lines = [
    "Hydration is happiness 🐾",
    "Small habits, big change",
    "Progress, not perfection",
    "Sip, breathe, reset",
    "Strong body, calm mind",
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

/* ---------- Error banner ---------- */
window.addEventListener("error", function (ev) {
  var b = document.getElementById("errorBanner");
  if (!b) return;
  var msg = ev.error && ev.error.message ? ev.error.message : ev.message;
  b.textContent = "Error: " + msg;
  b.style.display = "block";
});

/* ---------- React helpers ---------- */
var e = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;

/* ---------- Local storage hook ---------- */
function useLocal(key, initialValue) {
  var pair = useState(function () {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });
  var v = pair[0], setV = pair[1];
  useEffect(function () {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }, [key, v]);
  return [v, setV];
}

/* ---------- Plan data ---------- */
function defaultDays() {
  var phases = ["Water Fast","Water Fast","Water Fast","Juice Cleanse","Juice Cleanse","Juice Cleanse","Juice Cleanse","Rebuild","Rebuild","Rebuild","Rebuild"];
  var out = [];
  for (var i = 0; i < phases.length; i++) {
    out.push({ day: i + 1, phase: phases[i], checks: {}, note: "", weight: null, photos: [] });
  }
  return out;
}

var PLAN_RECIPES = [
  { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:1,
    ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}]
  },
  { id:"r-peach",  name:"Peachy Green Glow",  type:"juice", day:5, servings:1,
    ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}]
  },
  { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:1,
    ingredients:[{key:"carrots",name:"Carrots",qty:"14"},{key:"apples",name:"Apples",qty:"2"},{key:"ginger",name:"Ginger",qty:'1"'},{key:"lemons",name:"Lemons",qty:"1"}]
  },
  { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:1,
    ingredients:[{key:"grapes",name:"Grapes",qty:"3 cups"},{key:"romaine",name:"Romaine",qty:"3 cups"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"lemons",name:"Lemons",qty:"1"}]
  },
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

/* ---------- Grocery aggregation (simple) ---------- */
function aggregateGroceries(recipes) {
  var map = {};
  function add(day, it) {
    var id = (it.key || it.name).toLowerCase().replace(/\s+/g, "-");
    if (!map[id]) map[id] = { id: id, name: it.name, qty: it.qty || "", checked: false, estCost: null, days: [] };
    if (day && map[id].days.indexOf(day) === -1) map[id].days.push(day);
  }
  (recipes || []).forEach(function (r) {
    (r.ingredients || []).forEach(function (it) { add(r.day, it); });
  });
  return Object.values(map).sort(function (a,b){ return (a.name||"").localeCompare(b.name||""); });
}

/* ---------- Small atoms ---------- */
function ProgressBar(props) {
  return e("div", { className: "prog" }, e("i", { style: { width: Math.max(0, Math.min(100, props.value || 0)) + "%" } }));
}

function Checklist(props) {
  return e("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
    props.items.map(function (it) {
      var on = !!props.state[it.id];
      return e("li", { key: it.id, style: { display: "flex", alignItems: "center", gap: 8, padding: "4px 0" } },
        e("button", { className: "paw" + (on ? " on" : ""), onClick: function () { props.onToggle(it.id); }, "aria-pressed": on }, on ? "🐾" : ""),
        e("label", null, it.label)
      );
    })
  );
}

/* Weight chart (small, resilient) */
function WeightChart(props) {
  var ref = useRef(null);
  var chartRef = useRef(null);
  useEffect(function () {
    if (!ref.current || !window.Chart) return;
    var ctx = ref.current.getContext("2d");
    if (chartRef.current) { try { chartRef.current.destroy(); } catch (e) {} }
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: props.series.map(function (_, i) { return "Day " + (i + 1); }),
        datasets: [{ data: props.series, borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,.12)", tension: .35, spanGaps: true, pointRadius: 3 }]
      },
      options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false, scales: { x: { display: true }, y: { display: true } } }
    });
    return function () { try { chartRef.current && chartRef.current.destroy(); } catch (e) {} };
  }, [props.series]);
  return e("div", { style: { height: 180 } }, e("canvas", { ref: ref }));
}

/* ---------- Pages ---------- */

/* Mast (top bar) */
function Mast(props) {
  return e("div", { className: "card mast" },
    e("div", { className: "mast-row" },
      e("div", { className: "mast-left" },
        e("img", { src: "oz.png", alt: "Oz" }),
        e("div", null,
          e("div", { className: "mast-title" }, "Oz Companion"),
          e("div", { className: "mast-sub" }, props.phase.toUpperCase())
        )
      ),
      e("div", { className: "day-nav" },
        e("button", { className: "day-btn", onClick: props.prev, "aria-label": "Previous day" }, "◀"),
        e("div", { className: "day-chip" }, "Day ", props.day),
        e("button", { className: "day-btn", onClick: props.next, "aria-label": "Next day" }, "▶")
      )
    )
  );
}

/* Dashboard */
function Dashboard(props) {
  var day = props.day;
  var templateLabels = {
    water: "💧 Drink 120–150 oz water",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    lmnt: "🧂 Electrolytes",
    exercise: "🏃 Exercise",
    wholefood: "🍽️ Whole food meals",
    weight: "👣 Weight check-in"
  };
  var templateIds = (function (phase) {
    if (/Juice Cleanse/i.test(phase)) return ["water","tea","coffee","lmnt","exercise","weight"];
    if (/Rebuild/i.test(phase)) return ["water","lmnt","exercise","wholefood","weight"];
    return ["water","tea","coffee","lmnt","exercise","weight"];
  })(day.phase);
  var items = templateIds.map(function (id) { return { id: id, label: templateLabels[id] }; });
  var checks = day.checks || {};
  var done = items.reduce(function (a, it) { return a + (checks[it.id] ? 1 : 0); }, 0);
  var progress = (done / Math.max(1, items.length)) * 100;

  function toggle(id) { props.setDays(function (prev) {
    var next = prev.slice(); var d = Object.assign({}, next[props.idx]); var c = Object.assign({}, d.checks || {});
    c[id] = !c[id]; d.checks = c; next[props.idx] = d; return next;
  }); }

  /* Coach (simple) */
  var coachText = props.coachText, setCoachText = props.setCoachText;
  function runCoach() {
    var t = (day.note || "").toLowerCase();
    if (!t) { setCoachText("Write a quick note below, then tap Smart Coach."); return; }
    var found = [];
    if (/\b(headache|migraine)\b/.test(t)) found.push("headache");
    if (/\b(dizzy|light[-\s]?headed)\b/.test(t)) found.push("dizziness");
    if (/\bnausea|queasy\b/.test(t)) found.push("nausea");
    if (/\btired|fatigue|exhaust/.test(t)) found.push("fatigue");
    var header = found.length ? ("I noticed: " + found.join(", ") + ".") : "No specific symptoms—here’s a steady plan.";
    var tips = found.length
      ? ["Sip 12–16 oz water + electrolytes.", "Dim screens and rest eyes 5–10 min.", "Slow breaths: in 4 / out 6."]
      : ["Hydrate now, 5 slow breaths, short walk, then reassess."];
    setCoachText(header + "\n\n• " + tips.join("\n• "));
  }

  return e(React.Fragment, null,
    e(Mast, { phase: day.phase, day: day.day, prev: props.prev, next: props.next }),
    e(ProgressBar, { value: progress }),

    e("div", { className: "card", style: { margin: "12px 16px 0" } },
      e(Checklist, { items: items, state: checks, onToggle: toggle })
    ),

    e("div", { className: "card", style: { margin: "16px", padding: 16 } },
      e("div", { className: "badge", style: { background: "linear-gradient(90deg,#ffe4ef,#e9d5ff)" } }, "🧠 Smart Coach"),
      e("div", { style: { marginTop: 6, color: "#64748b" } }, "Tap to analyze your note and get relief + motivation"),
      e("div", { style: { marginTop: 10 } },
        e("button", { className: "day-btn", onClick: runCoach }, "Coach")
      ),
      coachText && e("pre", { className: "card", style: { marginTop: 10, whiteSpace: "pre-wrap", padding: 10 } }, coachText),
      e("textarea", {
        className: "noteArea",
        value: day.note || "",
        onChange: function (ev) {
          var val = ev.target.value;
          props.setDays(function (prev) {
            var next = prev.slice(); var d = Object.assign({}, next[props.idx]); d.note = val; next[props.idx] = d; return next;
          });
        }
      })
    ),

    e("div", { className: "card", style: { margin: "16px", padding: 16 } },
      e("h2", null, "Weight"),
      e("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
        e("label", null, "Today’s weight"),
        e("input", {
          type: "number",
          step: "0.1",
          value: (day.weight == null ? "" : day.weight),
          onChange: function (ev) {
            var v = ev.target.value;
            props.setDays(function (prev) {
              var next = prev.slice(); var d = Object.assign({}, next[props.idx]);
              d.weight = (v === "" ? null : Number(v)); next[props.idx] = d; return next;
            });
          },
          style: { width: 120 }
        }),
        e("span", { className: "badge" }, "Day ", day.day)
      ),
      e(WeightChart, { series: props.days.map(function (d) { return d.weight == null ? null : d.weight; }) })
    )
  );
}

/* Calendar */
function CalendarView(props) {
  function dayRow(d) {
    var dRecipes = props.recipes.filter(function (r) { return r.day === d.day; });

    // Cleanse fallback: show 4 juices if none explicitly assigned
    var isCleanse = (d.phase || "").toLowerCase().indexOf("cleanse") >= 0;
    if (isCleanse && dRecipes.length === 0) {
      var names = ["Melon Mint Morning","Peachy Green Glow","Carrot Apple Ginger","Grape Romaine Cooler"];
      dRecipes = names.map(function (name, i) { return { id: "cj-" + d.day + "-" + i, type: "juice", name: name, day: d.day }; });
    }

    return e("li", { key: d.day, className: "card", style: { marginBottom: 10, padding: 12 } },
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
        e("div", null,
          e("div", { style: { fontWeight: 700 } }, "Day ", d.day, " — ", d.phase),
          e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, minHeight: 24 } },
            (dRecipes.length
              ? dRecipes.map(function (r) { return e("span", { key: r.id, className: "badge" }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name); })
              : e("span", { style: { fontSize: 12, color: "#64748b" } }, "—")
            )
          )
        ),
        e("span", null, (d.note && d.note.trim().length ? e("span", { className: "badge" }, "📝 Note") : null), " ",
          (d.photos && d.photos.length ? e("span", { className: "badge" }, "📸 Photos") : null))
      )
    );
  }

  return e("div", { className: "wrap" },
    e("h2", null, "Calendar"),
    e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } }, props.days.map(dayRow))
  );
}

/* Groceries */
function Groceries(props) {
  return e("div", { className: "wrap" },
    e("h2", null, "Groceries & Prices"),
    e("ul", { style: { listStyle: "none", padding: 0, marginTop: 10 } },
      props.groceries.map(function (g, idx) {
        return e("li", { key: g.id, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3d0e1" } },
          e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: function () {
            props.setGroceries(function (prev) { return prev.map(function (x, i) { return i === idx ? Object.assign({}, x, { checked: !x.checked }) : x; }); });
          } }, g.checked ? "🐾" : ""),
          e("div", { style: { flex: 1 } },
            e("div", null, g.name, " ", e("span", { className: "badge" }, (g.days && g.days.length ? ("📅 Day " + (g.days.length === 1 ? g.days[0] : (Math.min.apply(null, g.days) + "–" + Math.max.apply(null, g.days)))) : "📦 Pantry"))),
            e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
          ),
          e("input", {
            type: "number", step: "0.01", placeholder: "$",
            value: (g.estCost == null ? "" : g.estCost),
            onChange: function (ev) {
              var v = ev.target.value;
              props.setGroceries(function (prev) { return prev.map(function (x, i) { return i === idx ? Object.assign({}, x, { estCost: (v === "" ? null : Number(v)) }) : x; }); });
            },
            style: { width: 90 }
          })
        );
      })
    )
  );
}

/* Photos (simple) */
function Photos(props) {
  function upload(ev) {
    var files = Array.from(ev.target.files || []);
    if (!files.length) return;
    var readers = files.map(function (f) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(f); }); });
    Promise.all(readers).then(function (urls) {
      props.setDays(function (prev) {
        var next = prev.slice(); var d = Object.assign({}, next[props.idx]);
        d.photos = (d.photos || []).concat(urls); next[props.idx] = d; return next;
      });
      alert("Looking strong ✨");
    });
  }
  var day = props.days[props.idx];

  return e("div", { className: "wrap" },
    e("h2", null, "Progress Photos — Day ", day.day),
    e("label", { className: "badge", style: { display: "inline-block", padding: "8px 12px", cursor: "pointer" } }, "Upload",
      e("input", { type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: upload })
    ),
    e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12, marginTop: 12 } },
      (day.photos || []).map(function (url, i) { return e("img", { key: i, src: url, style: { width: "100%", height: 120, objectFit: "cover", borderRadius: 12, border: "1px solid #f3d0e1" } }); })
    )
  );
}

/* ---------- App ---------- */
function App() {
  var profilePic = "oz.png";
  var _days = useLocal("oz.days", defaultDays());
  var days = _days[0], setDays = _days[1];

  var _recipes = useLocal("oz.recipes", PLAN_RECIPES);
  var recipes = _recipes[0], setRecipes = _recipes[1];

  var _gro = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
  var groceries = _gro[0], setGroceries = _gro[1];

  var _tab = useState("dashboard");
  var tab = _tab[0], setTab = _tab[1];

  var idxState = useState(0);
  var idx = idxState[0], setIdx = idxState[1];
  var day = days[idx] || days[0];

  function prevDay() { setIdx(function (i) { var n = i - 1; return n < 0 ? days.length - 1 : n; }); }
  function nextDay() { setIdx(function (i) { var n = i + 1; return n >= days.length ? 0 : n; }); }

  var coachState = useState("");
  var coachText = coachState[0], setCoachText = coachState[1];

  /* Views */
  var head = e("div", { className: "wrap" },
    e(Dashboard, { days: days, setDays: setDays, idx: idx, day: day, prev: prevDay, next: nextDay, coachText: coachText, setCoachText: setCoachText })
  );

  var calendar = e(CalendarView, { days: days, recipes: recipes });
  var grocery = e(Groceries, { groceries: groceries, setGroceries: setGroceries });
  var photos = e(Photos, { days: days, setDays: setDays, idx: idx });

  return e("div", null,
    (tab === "dashboard") && head,
    (tab === "calendar") && calendar,
    (tab === "grocery") && grocery,
    (tab === "photos") && photos,

    // Floating emoji dock
    e("nav", { className: "tabs" },
      [
        { id: "dashboard", icon: "🏠" },
        { id: "grocery", icon: "🛒" },
        { id: "calendar", icon: "📅" },
        { id: "photos", icon: "📷" },
        { id: "settings", icon: "⚙️" }
      ].map(function (t) { return e("button", {
        key: t.id,
        className: "btn" + (tab === t.id ? " active" : ""),
        onClick: function () { setTab(t.id); },
        "aria-label": t.id
      }, t.icon); })
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
