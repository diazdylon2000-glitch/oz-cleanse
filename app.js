/* app.js — Oz Companion (header inline + groceries + calendar fix)
   - Header stays one line (nowrap) with avatar, title/phase, and day selector
   - Calendar shows 4 different juices per Cleanse day (Days 4–7)
   - Groceries tab restored (simple, editable $ per line)
   - Splash bubble text + fade-out wired to existing HTML/CSS
*/

/* ---------- Splash text + fade out ---------- */
(function () {
  var LINES = [
    "Hydration is happiness 🐾",
    "Strong body, calm mind",
    "Small habits, big change",
    "Progress > perfection",
    "Sip, breathe, reset"
  ];
  var b = document.getElementById("ozBubble");
  if (b) b.textContent = LINES[Math.floor(Math.random() * LINES.length)];
  window.addEventListener("load", function () {
    setTimeout(function () {
      var s = document.getElementById("ozSplash");
      if (s) s.classList.add("fade-out");
      if (b) b.classList.add("fade-out");
      setTimeout(function () {
        if (s) s.style.display = "none";
        if (b) b.style.display = "none";
      }, 500);
    }, 1000);
  });
})();

/* ---------- React setup ---------- */
const e = React.createElement;
const { useState, useEffect, useRef } = React;

/* ---------- tiny localStorage hook ---------- */
function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

/* ---------- default days (11-day plan) ---------- */
function defaultDays() {
  const phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
  return phases.map((ph, i) => ({
    day: i + 1,
    phase: ph,
    checks: {},
    note: "",
    weight: null
  }));
}

/* ---------- Goals shown in checklist ---------- */
const GOALS = {
  water: "💧 Drink 120–150 oz water",
  tea: "🍵 Tea",
  coffee: "☕ Coffee",
  lmnt: "🧂 Electrolytes",
  exercise: "🏃‍♂️ Exercise",
  whole: "🥗 Whole food meals",
  weight: "👣 Weight check-in"
};

const PHASE_TEMPLATE = {
  fast:    ["water","tea","coffee","lmnt","exercise","weight"],
  cleanse: ["water","tea","coffee","lmnt","exercise","weight"],
  rebuild: ["water","lmnt","exercise","whole","weight"]
};

/* ---------- Plan recipes
   Cleanse days (4–7) now have FOUR different juices each day.
   Calendar will show one of each (no “×4”).
   Ingredient amounts are per-drink; groceries aggregate across all.
----------------------------------------------- */
const PLAN_RECIPES = [
  // Day 4 – four different juices
  { id:"j-4a", day:4, type:"juice", name:"Melon Mint",  ingredients:[{id:"melon",name:"Melon",qty:"1/2"},{id:"mint",name:"Mint",qty:"1/4 cup"},{id:"lime",name:"Lime",qty:"1"}]},
  { id:"j-4b", day:4, type:"juice", name:"Cucumber Lime",  ingredients:[{id:"cucumber",name:"Cucumber",qty:"1"},{id:"lime",name:"Lime",qty:"1"}]},
  { id:"j-4c", day:4, type:"juice", name:"Ginger Apple",   ingredients:[{id:"apple",name:"Apple",qty:"1"},{id:"ginger",name:"Ginger",qty:'1"'}]},
  { id:"j-4d", day:4, type:"juice", name:"Romaine Grape",  ingredients:[{id:"romaine",name:"Romaine",qty:"2 cups"},{id:"grapes",name:"Grapes",qty:"1 cup"}]},

  // Day 5
  { id:"j-5a", day:5, type:"juice", name:"Peach Spinach", ingredients:[{id:"peach",name:"Peach",qty:"1"},{id:"spinach",name:"Spinach",qty:"2 cups"}]},
  { id:"j-5b", day:5, type:"juice", name:"Cucumber Apple",ingredients:[{id:"cucumber",name:"Cucumber",qty:"1"},{id:"apple",name:"Apple",qty:"1"}]},
  { id:"j-5c", day:5, type:"juice", name:"Lemon Ginger",  ingredients:[{id:"lemon",name:"Lemon",qty:"1"},{id:"ginger",name:"Ginger",qty:'1"'}]},
  { id:"j-5d", day:5, type:"juice", name:"Grape Mint",    ingredients:[{id:"grapes",name:"Grapes",qty:"1 cup"},{id:"mint",name:"Mint",qty:"1/4 cup"}]},

  // Day 6
  { id:"j-6a", day:6, type:"juice", name:"Carrot Apple",  ingredients:[{id:"carrot",name:"Carrots",qty:"4"},{id:"apple",name:"Apple",qty:"1"}]},
  { id:"j-6b", day:6, type:"juice", name:"Cuke Romaine",  ingredients:[{id:"cucumber",name:"Cucumber",qty:"1"},{id:"romaine",name:"Romaine",qty:"2 cups"}]},
  { id:"j-6c", day:6, type:"juice", name:"Spinach Lemon", ingredients:[{id:"spinach",name:"Spinach",qty:"2 cups"},{id:"lemon",name:"Lemon",qty:"1"}]},
  { id:"j-6d", day:6, type:"juice", name:"Grape Ginger",  ingredients:[{id:"grapes",name:"Grapes",qty:"1 cup"},{id:"ginger",name:"Ginger",qty:'1"'}]},

  // Day 7
  { id:"j-7a", day:7, type:"juice", name:"Citrus Mint",   ingredients:[{id:"orange",name:"Orange",qty:"1"},{id:"mint",name:"Mint",qty:"1/4 cup"}]},
  { id:"j-7b", day:7, type:"juice", name:"Carrot Lime",   ingredients:[{id:"carrot",name:"Carrots",qty:"4"},{id:"lime",name:"Lime",qty:"1"}]},
  { id:"j-7c", day:7, type:"juice", name:"Apple Romaine", ingredients:[{id:"apple",name:"Apple",qty:"1"},{id:"romaine",name:"Romaine",qty:"2 cups"}]},
  { id:"j-7d", day:7, type:"juice", name:"Spinach Cuke",  ingredients:[{id:"spinach",name:"Spinach",qty:"2 cups"},{id:"cucumber",name:"Cucumber",qty:"1"}]},

  // Rebuild sample meals
  { id:"m-8a", day:8, type:"meal", name:"Smoothie Breakfast", ingredients:[{id:"spinach",name:"Spinach",qty:"1 cup"},{id:"almond-milk",name:"Almond milk",qty:"1 cup"},{id:"chia",name:"Chia",qty:"1 tbsp"}]},
  { id:"m-8b", day:8, type:"meal", name:"Lentil Soup", ingredients:[{id:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{id:"carrot",name:"Carrots",qty:"1/2 cup"},{id:"celery",name:"Celery",qty:"1/2 cup"},{id:"onion",name:"Onion",qty:"1/4"}]},
  { id:"m-10a", day:10, type:"meal", name:"Overnight Oats", ingredients:[{id:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{id:"almond-milk",name:"Almond milk",qty:"1 cup"}]},
  { id:"m-11a", day:11, type:"meal", name:"Protein + Broccoli", ingredients:[{id:"protein",name:"Salmon/Chicken",qty:"12 oz"},{id:"broccoli",name:"Broccoli",qty:"2 heads"}]}
];

/* ---------- Groceries aggregation (simple) ---------- */
function parseQty(q) {
  if (!q) return { n: 1, u: "" };
  const m = String(q).trim().match(/^(\d+(\.\d+)?|\d+\/\d+)\s*([a-zA-Z"’-]+)?/);
  if (!m) return { n: 1, u: "" };
  let num = m[1];
  if (num.includes("/")) { const [a, b] = num.split("/"); num = (+a) / (+b); } else { num = +num; }
  return { n: num, u: (m[3] || "").toLowerCase() };
}
function fmt(n, u) { return (u ? (Number.isInteger(n) ? n : n.toFixed(2)) + " " + u : String(n)); }

function aggregateGroceries(recipes) {
  const map = {};
  (recipes || []).forEach(r => {
    (r.ingredients || []).forEach(it => {
      const id = (it.id || it.name || "").toLowerCase().replace(/\s+/g, "-");
      const { n, u } = parseQty(it.qty || "1");
      if (!map[id]) {
        map[id] = { id, name: it.name, qtyNum: n, qtyUnit: u, days: r.day ? [r.day] : [], checked: false, estCost: null };
      } else {
        map[id].qtyNum += n;
        if (r.day) { const s = new Set(map[id].days || []); s.add(r.day); map[id].days = Array.from(s).sort((a,b)=>a-b); }
      }
    });
  });
  return Object.values(map).map(x => ({
    id: x.id, name: x.name, qty: x.qtyUnit ? fmt(x.qtyNum, x.qtyUnit) : String(x.qtyNum),
    days: x.days, checked: x.checked, estCost: x.estCost
  })).sort((a,b)=> (a.name||"").localeCompare(b.name||""));
}

/* ---------- Small atoms ---------- */
const ProgressBar = ({ value }) =>
  e("div", { className: "prog" }, e("div", { className: "fill", style: { width: Math.max(0, Math.min(100, value)) + "%" } }));

const Checklist = ({ items, state, onToggle }) =>
  e("ul", { className: "list" },
    items.map(it =>
      e("li", { key: it.id, className: "item" },
        e("button", { className: "paw" + (state[it.id] ? " on" : ""), onClick: () => onToggle(it.id), "aria-pressed": !!state[it.id] }, state[it.id] ? "🐾" : ""),
        e("label", null, it.label)
      )
    )
  );

/* ---------- Pages ---------- */
function Calendar({ days, recipes }) {
  return e("div", { className: "wrap" },
    e("h1", null, "Calendar"),
    e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
      days.map(d => {
        const list = recipes.filter(r => r.day === d.day);
        return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
            e("div", null,
              e("div", { style: { fontWeight: 700 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
              e("div", { style: { marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" } },
                list.length ? list.map(r => e("span", { key: r.id, className: "badge" }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name))
                            : e("span", { style: { color: "#64748b", fontSize: 12 } }, "—")
              )
            ),
            e("div", null, e("span", { className: "badge" }, list.filter(x=>x.type==="juice").length, " juices"))
          )
        );
      })
    )
  );
}

function GroceryList({ groceries, setGroceries }) {
  function daysBadge(days) {
    if (!days || !days.length) return "📦 Pantry";
    const min = Math.min.apply(null, days), max = Math.max.apply(null, days);
    return "📅 " + (min === max ? ("Day " + min) : ("Day " + min + "–" + max));
  }
  return e("div", { className: "wrap" },
    e("h1", null, "Groceries"),
    e("ul", { style: { listStyle: "none", padding: 0 } },
      groceries.map((g, idx) =>
        e("li", { key: g.id, style: { display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3d0e1" } },
          e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: () => setGroceries(prev => prev.map((x, i) => i === idx ? { ...x, checked: !x.checked } : x)) }),
          e("div", null,
            e("div", null, g.name, " ", e("span", { className: "badge" }, daysBadge(g.days))),
            e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty)
          ),
          e("input", {
            type: "number", step: "0.01", placeholder: "$",
            value: g.estCost == null ? "" : g.estCost,
            onChange: (ev) => setGroceries(prev => prev.map((x, i) => i === idx ? { ...x, estCost: ev.target.value === "" ? null : +ev.target.value } : x)),
            style: { width: 90 }
          })
        )
      )
    )
  );
}

function Photos() {
  return e("div", { className: "wrap" },
    e("h1", null, "Photos"),
    e("p", null, "Upload & gallery coming next.")
  );
}

/* ---------- App ---------- */
function App() {
  const [days, setDays] = useLocal("oz.days", defaultDays());
  const [recipes, setRecipes] = useLocal("oz.recipes", PLAN_RECIPES);
  const [groceries, setGroceries] = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
  const [tab, setTab] = useState("dash");
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  // checklist items for the phase
  const ids = PHASE_TEMPLATE[day.phase] || [];
  const items = ids.map(id => ({ id, label: GOALS[id] || id }));
  const checks = day.checks || {};
  const done = items.reduce((a, it) => a + (checks[it.id] ? 1 : 0), 0);
  const progress = items.length ? (done / items.length) * 100 : 0;

  function toggle(id) {
    setDays(prev => {
      const next = prev.slice();
      const d = { ...next[idx] };
      d.checks = { ...(d.checks || {}), [id]: !d.checks?.[id] };
      next[idx] = d;
      return next;
    });
  }
  function prevDay() { setIdx(i => (i > 0 ? i - 1 : days.length - 1)); }
  function nextDay() { setIdx(i => (i < days.length - 1 ? i + 1 : 0)); }

  /* ---------- Header (ONE LINE) ---------- */
  const head = e("div", {
    className: "card",
    style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "nowrap" }
  },
    e("div", { style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexShrink: 1 } },
      e("img", { src: "oz.png", alt: "Oz", style: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 } }),
      e("div", { style: { minWidth: 0, overflow: "hidden" } },
        e("div", { style: { fontWeight: 800, fontSize: 24, letterSpacing: .2, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" } }, "Oz Companion"),
        e("div", { style: { marginTop: 2, color: "#6b7280", fontWeight: 700, letterSpacing: 1.2 } }, (day.phase || "").toUpperCase())
      )
    ),
    e("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 } },
      e("button", { className: "btn", onClick: prevDay, "aria-label": "Previous day" }, "◀"),
      e("div", { style: { border: "1px solid #f3d0e1", borderRadius: 16, padding: "6px 12px", fontWeight: 800, whiteSpace: "nowrap" } }, "Day " + day.day),
      e("button", { className: "btn", onClick: nextDay, "aria-label": "Next day" }, "▶")
    )
  );

  const dash = e(React.Fragment, null,
    head,
    e(ProgressBar, { value: progress }),
    e("div", { className: "card", style: { marginTop: 12 } }, e(Checklist, { items, state: checks, onToggle: toggle })),
    e("div", { className: "card", style: { marginTop: 12 } },
      e("div", { className: "badge" }, "🧠 Smart Coach"),
      e("p", { style: { marginTop: 6, color: "#64748b" } }, "Tap to analyze your note and get relief + motivation"),
      e("textarea", {
        value: day.note || "",
        onChange: (ev) => setDays(prev => { const n = prev.slice(); const d = { ...n[idx] }; d.note = ev.target.value; n[idx] = d; return n; }),
        rows: 4, style: { width: "100%", borderRadius: 12, border: "1px solid #f3d0e1", padding: 10 }
      })
    )
  );

  const grocery = e(GroceryList, { groceries, setGroceries });
  const calendar = e(Calendar, { days, recipes });
  const photos = e(Photos);

  return e("div", null,
    (tab === "dash") && dash,
    (tab === "groceries") && grocery,
    (tab === "calendar") && calendar,
    (tab === "photos") && photos,

    // Floating emoji dock (centered by CSS)
    e("nav", { className: "tabs" },
      [
        { id: "dash", icon: "🏠" },
        { id: "groceries", icon: "🛒" },
        { id: "calendar", icon: "📅" },
        { id: "photos", icon: "📷" },
        { id: "settings", icon: "⚙️" } // not used, kept for symmetry
      ].map(t => e("button", {
        key: t.id,
        className: "btn" + (tab === t.id ? " active" : ""),
        onClick: () => setTab(t.id),
        "aria-label": t.id
      }, t.icon))
    )
  );
}

/* ---------- Mount ---------- */
ReactDOM.createRoot(document.getElementById("root")).render(e(App));
