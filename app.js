"use strict";

/* ===== React helpers ===== */
const e = React.createElement;
const { useState, useEffect, useRef } = React;

/* ===== Local storage hook ===== */
function useLocal(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

/* ===== Utilities & globals ===== */
window.safeConfetti = function (opts) {
  try { if (window.confetti) window.confetti(opts); } catch {}
};

/* ===== Plan data ===== */
const INITIAL_GOALS = {
  water: "💧 Drink 120–150 oz water",
  tea: "🍵 Tea",
  coffee: "☕ Coffee",
  juice: "🧃 Juices",
  lmnt: "🧂 Electrolytes",
  exercise: "🏃 Exercise",
  wholefood: "🥗 Whole food meals",
  weight: "👣 Weight check-in",
};

const DEFAULT_PHASE_TEMPLATES = {
  fast:    ["water", "tea", "coffee", "lmnt", "exercise", "weight"],
  cleanse: ["water", "tea", "coffee", "juice", "lmnt", "exercise", "weight"],
  rebuild: ["water", "lmnt", "exercise", "wholefood", "weight"],
};

function defaultDays() {
  const phases = [
    "fast", "fast", "fast",
    "cleanse", "cleanse", "cleanse", "cleanse",
    "rebuild", "rebuild", "rebuild", "rebuild"
  ];
  return phases.map((ph, i) => ({
    day: i + 1,
    phase: ph,
    order: null,
    checks: {},
    custom: false,
    note: "",
    weight: null,
    photos: [],
  }));
}

/* Juices = 4 per day during cleanse; ingredients are per ONE juice; groceries scale by servings=4 */
const PLAN_RECIPES = [
  { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:4,
    ingredients:[
      {key:"melons",name:"Melon",qty:"0.25 each"},
      {key:"mint",name:"Mint",qty:"2 tbsp"},
      {key:"limes",name:"Lime",qty:"0.25 each"}
    ]
  },
  { id:"r-peach",  name:"Peachy Green Glow", type:"juice", day:5, servings:4,
    ingredients:[
      {key:"peaches",name:"Peaches",qty:"1.5 each"},
      {key:"cucumbers",name:"Cucumbers",qty:"0.5 each"},
      {key:"spinach",name:"Spinach",qty:"2 cups"},
      {key:"lemons",name:"Lemon",qty:"0.5 each"}
    ]
  },
  { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:4,
    ingredients:[
      {key:"carrots",name:"Carrots",qty:"7 each"},
      {key:"apples",name:"Apples",qty:"1 each"},
      {key:"ginger",name:"Ginger",qty:"0.5 oz"},
      {key:"lemons",name:"Lemon",qty:"0.5 each"}
    ]
  },
  { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:4,
    ingredients:[
      {key:"green-grapes",name:"Grapes",qty:"1.5 cups"},
      {key:"romaine",name:"Romaine",qty:"1.5 cups"},
      {key:"cucumbers",name:"Cucumbers",qty:"0.5 each"},
      {key:"lemons",name:"Lemon",qty:"0.5 each"}
    ]
  },

  // Rebuild meals (1x per listed day)
  { id:"r-smoothie", name:"Smoothie Breakfast", type:"meal", day:8,
    ingredients:[
      {key:"spinach",name:"Spinach",qty:"2 cups"},
      {key:"almond-milk",name:"Almond milk",qty:"1 cup"},
      {key:"chia",name:"Chia",qty:"1 tbsp"}
    ]
  },
  { id:"r-lentil", name:"Lentil Soup", type:"meal", day:8,
    ingredients:[
      {key:"lentils",name:"Lentils (dry)",qty:"0.5 cup"},
      {key:"carrots",name:"Carrots",qty:"0.5 cup"},
      {key:"celery",name:"Celery",qty:"0.5 cup"},
      {key:"parsley",name:"Parsley",qty:"0.25 cup"},
      {key:"onions",name:"Onion",qty:"0.25 each"}
    ]
  },
  { id:"r-broth9", name:"Simple Veg Broth", type:"meal", day:9,
    ingredients:[
      {key:"carrots",name:"Carrots",qty:"2 each"},
      {key:"celery",name:"Celery",qty:"2 stalks"},
      {key:"onions",name:"Onion",qty:"0.5 each"},
      {key:"parsley",name:"Parsley",qty:"4 sprigs"}
    ]
  },
  { id:"r-sweetpot9", name:"Baked Sweet Potato Bowl", type:"meal", day:9,
    ingredients:[
      {key:"sweet-potatoes",name:"Sweet potatoes",qty:"2 each"},
      {key:"spinach",name:"Spinach",qty:"2 cups"},
      {key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}
    ]
  },
  { id:"r-oats", name:"Overnight Oats", type:"meal", day:10,
    ingredients:[
      {key:"rolled-oats",name:"Rolled oats",qty:"0.5 cup"},
      {key:"almond-milk",name:"Almond milk",qty:"1 cup"}
    ]
  },
  { id:"r-quinoa", name:"Quinoa Salad", type:"meal", day:10,
    ingredients:[
      {key:"quinoa",name:"Quinoa (dry)",qty:"0.5 cup"},
      {key:"cucumbers",name:"Cucumber",qty:"1 each"},
      {key:"tomatoes",name:"Tomato",qty:"1 each"},
      {key:"parsley",name:"Parsley",qty:"0.25 cup"},
      {key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},
      {key:"lemons",name:"Lemon",qty:"1 each"}
    ]
  },
  { id:"r-protein", name:"Protein + Broccoli", type:"meal", day:11,
    ingredients:[
      {key:"protein",name:"Salmon/Chicken",qty:"12 oz"},
      {key:"broccoli",name:"Broccoli",qty:"2 heads"}
    ]
  },
];

/* ===== Groceries aggregator (scales juices by servings) ===== */
function aggregateGroceries(recipes) {
  const factor = (r) => (r.type === "juice" ? (r.servings || 4) : 1);

  const parseQty = (s) => {
    if (!s) return { n: 1, u: "" };
    const m = String(s).match(/^(\d+(\.\d+)?)\s*([a-z\-]+|each|cups?|tbsp|tsp|stalks?)?$/i);
    return m ? { n: parseFloat(m[1]), u: (m[3] || "").toLowerCase().replace(/s$/,"") } : { n: 1, u: String(s) };
  };

  const fmt = (n, u) => (u ? (Number.isInteger(n) ? n : (+n).toFixed(2)) + " " + (u==="each"?"each":u) : String(n));

  const map = {};
  (recipes || []).forEach((r) => {
    const mult = factor(r);
    (r.ingredients || []).forEach((it) => {
      const id = (it.key || it.name || "").toLowerCase().replace(/\s+/g, "-");
      const q = parseQty(it.qty || "1");
      const scaled = { n: q.n * mult, u: q.u };
      if (!map[id]) {
        map[id] = {
          id,
          name: it.name,
          qtyNum: scaled.n,
          qtyUnit: scaled.u,
          checked: false,
          estCost: null,
          days: r.day ? [r.day] : [],
        };
      } else {
        map[id].qtyNum += scaled.n;
        const set = new Set(map[id].days || []);
        if (r.day) set.add(r.day);
        map[id].days = Array.from(set).sort((a, b) => a - b);
      }
    });
  });

  return Object.values(map)
    .map((g) => ({
      id: g.id,
      name: g.name,
      qty: g.qtyUnit ? fmt(g.qtyNum, g.qtyUnit) : String(g.qtyNum),
      checked: g.checked,
      estCost: g.estCost,
      days: g.days,
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/* ===== Unit conversions (lightweight) ===== */
const UNITS = ["each", "head", "lb", "cup", "oz", "fl-oz", "bunch", "qt"];

function parseQtyGeneric(q) {
  if (!q) return { n: 1, u: "each" };
  const m = String(q).match(/^(\d+(\.\d+)?)\s*([a-z\-]+|each)?$/i);
  return { n: m ? +m[1] : 1, u: m && m[3] ? m[3].toLowerCase() : "each" };
}

// name-aware best-effort conversions
function convert(n, from, to, name = "") {
  if (from === to) return n;
  if (from === "oz" && to === "lb") return n / 16;
  if (from === "lb" && to === "oz") return n * 16;
  if (from === "fl-oz" && to === "qt") return n / 32;
  if (from === "qt" && to === "fl-oz") return n * 32;

  // cups -> lbs for specific produce
  const cupToLb = {
    spinach: 0.0625,
    romaine: 0.05,
    grapes: 0.33,
    parsley: 0.06,
    mint: 0.06,
  };
  if (from === "cup" && to === "lb") {
    const k = Object.keys(cupToLb).find((k) => name.toLowerCase().includes(k));
    return k ? n * cupToLb[k] : n * 0.1;
  }

  // stalks -> each (treat as each)
  if (from === "stalk" && to === "each") return n;

  // default: no reliable conversion
  return n;
}

/* ===== Birmingham, AL default price placeholders (editable) ===== */
const DEFAULT_PRICES = {
  carrots:       { unit: "each",  price: 0.40 },
  cucumbers:     { unit: "each",  price: 0.75 },
  lemons:        { unit: "each",  price: 0.60 },
  limes:         { unit: "each",  price: 0.50 },
  peaches:       { unit: "each",  price: 0.90 },
  "green-grapes":{ unit: "lb",    price: 2.50 },
  romaine:       { unit: "head",  price: 2.00 },
  spinach:       { unit: "lb",    price: 4.00 },
  melons:        { unit: "each",  price: 3.50 },
  apples:        { unit: "each",  price: 0.90 },
  ginger:        { unit: "oz",    price: 0.25 },
  parsley:       { unit: "bunch", price: 1.75 },
  mint:          { unit: "bunch", price: 1.50 },
  "rolled-oats": { unit: "lb",    price: 1.80 },
  "almond-milk": { unit: "qt",    price: 3.50 },
  lentils:       { unit: "lb",    price: 1.60 },
  quinoa:        { unit: "lb",    price: 4.50 },
  "olive-oil":   { unit: "fl-oz", price: 0.30 },
  broccoli:      { unit: "head",  price: 2.25 },
  "sweet-potatoes": { unit: "each", price: 1.25 },
  celery:        { unit: "bunch", price: 2.25 },
  onions:        { unit: "each",  price: 0.80 },
  tomatoes:      { unit: "each",  price: 1.20 },
  protein:       { unit: "lb",    price: 7.99 } // rough salmon/chicken
};

/* ===== UI components ===== */
const ProgressBar = ({ value }) =>
  e("div", { className: "prog" },
    e("div", {
      className: "fill",
      style: { width: `${Math.max(0, Math.min(100, value))}%` }
    })
  );

const Checklist = ({ items, state, onToggle }) =>
  e("ul", { className: "list" },
    items.map((it) =>
      e("li", { key: it.id, className: "item" },
        e("button", {
          className: "paw" + (state[it.id] ? " on" : ""),
          onClick: () => onToggle(it.id),
          "aria-pressed": !!state[it.id]
        }, state[it.id] ? "🐾" : ""),
        e("label", null, it.label)
      )
    )
  );

const WeightChart = ({ series }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (chartRef.current) { try { chartRef.current.destroy(); } catch {} }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.map((_, i) => "Day " + (i + 1)),
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
        layout: { padding: { bottom: 12, top: 4, left: 6, right: 6 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            display: true,
            ticks: { color: "#475569", font: { size: 11 } },
            grid: { color: "rgba(148,163,184,.25)" }
          },
          y: {
            display: true,
            ticks: { color: "#475569", font: { size: 11 } },
            grid: { color: "rgba(148,163,184,.18)" }
          }
        },
        animation: { duration: 220 }
      }
    });

    return () => { try { chartRef.current && chartRef.current.destroy(); } catch {} };
  }, [series]);

  return e("div", { style: { height: 180 } }, e("canvas", { ref: canvasRef }));
};

/* ===== Pages ===== */
const GroceryList = ({ groceries, setGroceries }) => {
  const [budget, setBudget] = useLocal("oz.budget", 0);

  // enrich with default price/unit
  const enriched = groceries.map((g) => {
    const base = DEFAULT_PRICES[g.id] || {};
    return {
      ...g,
      unit: g.unit || base.unit || "each",
      price: (g.price != null ? g.price : (base.price || 0))
    };
  });

  function update(idx, patch) {
    setGroceries(enriched.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  const totals = enriched.reduce((acc, g) => {
    const { n, u } = parseQtyGeneric(g.qty);
    const qtyInPriceUnit = convert(n, u, g.unit, g.name);
    const line = (g.price || 0) * (isFinite(qtyInPriceUnit) ? qtyInPriceUnit : 0);
    if (g.checked) acc.checked += line; else acc.remaining += line;
    acc.total += line;
    return acc;
  }, { checked: 0, remaining: 0, total: 0 });

  function daysBadge(days) {
    if (!days || !days.length) return "📦 Pantry";
    const min = Math.min.apply(null, days), max = Math.max.apply(null, days);
    return "📅 " + (min === max ? ("Day " + min) : ("Day " + min + "–" + max));
  }

  return e("div", { className: "wrap" },
    e("h1", null, "Groceries & Prices"),
    e("div", { className: "card", style: { margin: "8px 0 12px" } },
      e("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } },
        e("div", null, "Budget $"),
        e("input", {
          type: "number", step: "0.01", value: budget || "", placeholder: "0.00",
          onChange: (ev) => setBudget(ev.target.value === "" ? 0 : +ev.target.value),
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
      enriched.map((g, idx) =>
        e("li", {
          key: g.id,
          style: {
            display: "grid",
            gridTemplateColumns: "32px 1fr auto auto auto",
            gap: 8,
            padding: "10px 0",
            borderBottom: "1px solid #f3d0e1",
            alignItems: "center"
          }
        },
          e("button", {
            className: "paw" + (g.checked ? " on" : ""),
            onClick: () => update(idx, { checked: !g.checked })
          }),
          e("div", null,
            e("div", null, g.name, " ",
              e("span", { className: "badge" }, daysBadge(g.days))
            ),
            e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
          ),
          e("select", {
            value: g.unit,
            onChange: (ev) => update(idx, { unit: ev.target.value })
          },
            UNITS.map((u) => e("option", { key: u, value: u }, u))
          ),
          e("input", {
            type: "number",
            step: "0.01",
            value: (g.price == null ? "" : g.price),
            onChange: (ev) => update(idx, { price: (ev.target.value === "" ? 0 : +ev.target.value) }),
            style: { width: 80 }
          }),
          e("div", { style: { textAlign: "right", minWidth: 70, fontWeight: 600 } },
            "$" + (function () {
              const { n, u } = parseQtyGeneric(g.qty);
              const q = convert(n, u, g.unit, g.name);
              return ((g.price || 0) * (isFinite(q) ? q : 0)).toFixed(2);
            })()
          )
        )
      )
    )
  );
};

const Calendar = ({ days, recipes, settings }) => {
  function dateFor(dayNum) {
    const dstr = settings.phaseTemplates.__startDate || "";
    if (!dstr) return null;
    const base = new Date(dstr + "T00:00:00");
    if (isNaN(base)) return null;
    const dt = new Date(base.getTime() + (dayNum - 1) * 86400000);
    return dt.toLocaleDateString();
  }

  return e("div", { className: "wrap" },
    e("h1", null, "Calendar"),
    e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
      days.map((d) => {
        const dRecipes = recipes.filter((r) => r.day === d.day);
        const dd = dateFor(d.day);
        const hasPhotos = (d.photos && d.photos.length > 0);
        const hasNote = (d.note && d.note.trim().length > 0);
        return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
            e("div", null,
              e("div", { style: { fontWeight: 600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
              dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
            ),
            e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 24 } },
              dRecipes.length
                ? dRecipes.map((r) =>
                    e("span", { key: r.id, className: "badge" },
                      (r.type === "juice" ? "🧃 " : "🍽️ "), r.name,
                      (r.type === "juice" && r.servings ? ` ×${r.servings}` : "")
                    )
                  )
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

const Photos = ({ days, setDays }) => {
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  function handleUpload(ev) {
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    const readers = files.map((f) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((urls) => {
      setDays((prev) => {
        const next = prev.slice();
        const d = { ...next[idx] };
        d.photos = (d.photos || []).concat(urls);
        next[idx] = d;
        return next;
      });
      const A = [
        "Looking strong ✨", "Your glow is showing ✨", "Small habits, big change 💪",
        "Oz is proud of you 🐶", "Consistency looks good on you 🌟", "Radiant!",
        "You kept a promise to yourself"
      ];
      setTimeout(() => alert(A[Math.floor(Math.random() * A.length)]), 40);
    });
  }

  return e("div", { className: "wrap" },
    e("h1", null, "Progress Photos"),
    e("div", {
      className: "card",
      style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }
    },
      e("div", null, e("b", null, "Day "), day.day),
      e("div", null,
        e("button", { className: "btn", onClick: () => setIdx((i) => (i > 0 ? i - 1 : days.length - 1)) }, "◀"),
        e("span", { className: "badge", style: { margin: "0 8px" } }, "Day " + day.day),
        e("button", { className: "btn", onClick: () => setIdx((i) => (i < days.length - 1 ? i + 1 : 0)) }, "▶")
      ),
      e("input", { type: "file", multiple: true, accept: "image/*", onChange: handleUpload })
    ),
    e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
      (day.photos || []).map((url, i) => e("img", {
        key: i, src: url, style: { width: 100, height: 100, objectFit: "cover", borderRadius: 8 }
      }))
    )
  );
};

/* ===== Smart Coach ===== */
const COACH_AFFIRM = [
  "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
  "One step at a time — you’re doing amazing.","Keep going, your future self will thank you.",
  "Tiny wins add up.","Consistency beats intensity.","You’re building something real.",
  "Strong body, kind mind.","Your glow is coming through.","Hydration nation ✨","Breathe, sip, reset.",
  "Today counts.","I see your effort.","Momentum looks good on you.","You’re learning your body.",
  "You can do hard things.","Grace + grit.","Keep stacking wins.","Be proud of showing up.",
  "Progress, not perfection.","Calm is a superpower.","You’re getting lighter in every way.",
  "Nice and steady.","You’re in the arena.","This is self-respect in action.",
  "The best time is now.","Joy in the journey.","Your effort matters."
];

const COACH_RULES = [
  { id:"headache",  test:ctx=>ctx.syms.has("headache"),
    tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest your eyes 5–10 minutes."] },
  { id:"dizziness", test:ctx=>ctx.syms.has("dizziness"),
    tips:["Sit or lie until steady.","Small juice or a pinch of salt if fasting.","Breathe in 4 / out 6."] },
  { id:"nausea",    test:ctx=>ctx.syms.has("nausea"),
    tips:["Sip cool water or peppermint/ginger tea.","Step into fresh air.","Move slowly; avoid sudden changes."] },
  { id:"fatigue",   test:ctx=>ctx.syms.has("fatigue"),
    tips:["Take a 15–20 min rest.","Hydrate or take electrolytes.","2 minutes of gentle stretching."] },
  { id:"brain-fog", test:ctx=>ctx.syms.has("brain-fog"),
    tips:["Stand and stretch.","Hydrate now.","Get 5 minutes of sunlight if possible."] },
  { id:"constipation", test:ctx=>ctx.syms.has("constipation"),
    tips:["Increase water + electrolytes.","Add gentle fiber at rebuild (chia, greens).","Short walk after meals."] },
  { id:"cramps",    test:ctx=>ctx.syms.has("cramps"),
    tips:["Magnesium-rich foods at rebuild.","Electrolytes today.","Gentle calf/quad stretches."] },
  { id:"cold",      test:ctx=>ctx.syms.has("cold"),
    tips:["Layer up; warm herbal tea.","Warm shower.","Short walk to boost circulation."] },
  { id:"insomnia",  test:ctx=>ctx.syms.has("insomnia"),
    tips:["No screens 60 min before bed.","Magnesium and warm tea.","Keep bedroom cool and dark."] },
  { id:"hunger",    test:ctx=>ctx.syms.has("hunger"),
    tips:["Drink water first.","Have scheduled juice slowly.","5-min walk as a reset."] },
  { id:"anxiety",   test:ctx=>ctx.syms.has("anxiety"),
    tips:["Box breathing 4-4-4-4.","Ground: notice 5 things you see.","Write a 1-line intention."] },
  { id:"bloating",  test:ctx=>ctx.syms.has("bloating"),
    tips:["Slow down intake; smaller sips.","Gentle walk 10–15 min.","Peppermint tea."] }
];

/* ===== Dashboard ===== */
const Dashboard = ({ templates, days, setDays, recipes, goals }) => {
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  // upcoming ingredients (today + tomorrow or next two recipe days)
  function nextTwoDayIngredients(currentDay) {
    const collect = (d1, d2) => {
      const want = new Set([d1, d2]);
      const bag = {};
      (recipes || []).forEach(r => {
        if (!r.day || !want.has(r.day)) return;
        (r.ingredients || []).forEach(it => {
          const key = (it.key || it.name || "").toLowerCase();
          if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
          if (it.qty) bag[key].qtyList.push(it.qty + (r.type === "juice" && r.servings ? ` ×${r.servings}` : ""));
          bag[key].days.add(r.day);
        });
      });
      Object.keys(bag).forEach(k => bag[k].days = Array.from(bag[k].days).sort((a,b)=>a-b));
      return Object.values(bag).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    };

    const strict = collect(currentDay.day, currentDay.day + 1);
    if (strict.length) return { items: strict, label: "Today + Tomorrow — Ingredients" };

    const future = Array.from(new Set((recipes || []).filter(r => r.day >= currentDay.day).map(r => r.day))).sort((a,b)=>a-b);
    const pool = future.slice(0, 2);
    if (pool.length === 0) return { items: [], label: "Upcoming Ingredients" };
    const fallback = collect(pool[0], pool[1] || pool[0]);
    const label = pool.length === 2 ? `Upcoming Ingredients — Day ${pool[0]} & ${pool[1]}` : `Upcoming Ingredients — Day ${pool[0]}`;
    return { items: fallback, label };
  }
  const { items: nextItems, label: nextLabel } = nextTwoDayIngredients(day);

  // checklist for day
  const templateIds = templates[day.phase] || [];
  const activeIds = (day.order && day.order.length ? day.order : templateIds);
  const items = activeIds.map((id) => ({ id, label: goals[id] || id }));
  const checks = day.checks || {};
  const doneCount = items.reduce((a, it) => a + (checks[it.id] ? 1 : 0), 0);
  const totalCount = Math.max(1, items.length);
  const progress = (doneCount / totalCount) * 100;

  const weightSeries = days.map((d) => (d.weight == null ? null : d.weight));
  useEffect(() => {
    if (Math.round(progress) === 100) window.safeConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, [progress]);

  function toggleCheck(id) {
    setDays((prev) => {
      const next = prev.slice();
      const d = { ...next[idx] };
      const c = { ...(d.checks || {}) };
      c[id] = !c[id];
      d.checks = c;
      next[idx] = d;
      return next;
    });
  }
  function setPhase(p) {
    setDays((prev) => {
      const next = prev.slice();
      const d = { ...next[idx] };
      d.phase = p;
      next[idx] = d;
      return next;
    });
  }
  function changeDay(dir) {
    setIdx((cur) => {
      let n = cur + dir;
      if (n < 0) n = days.length - 1;
      if (n >= days.length) n = 0;
      return n;
    });
  }

  // Smart Coach
  const [coachText, setCoachText] = useState("");
  const SYM_MATCHERS = [
    { id: "headache", rx: /\b(headache|migraine|head pain)\b/i },
    { id: "dizziness", rx: /\b(dizzy|light[-\s]?headed|vertigo)\b/i },
    { id: "nausea", rx: /\b(nausea|queasy|sick to (my|the) stomach)\b/i },
    { id: "fatigue", rx: /\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i },
    { id: "brain-fog", rx: /\b(brain[-\s]?fog|foggy|can.?t focus)\b/i },
    { id: "constipation", rx: /\b(constipat(ed|ion)|no (bm|bowel)|hard stool)\b/i },
    { id: "cramps", rx: /\b(cramps?|spasm)\b/i },
    { id: "cold", rx: /\b(chills?|feeling cold|freezing)\b/i },
    { id: "insomnia", rx: /\b(can.?t sleep|insomnia|up all night|poor sleep)\b/i },
    { id: "hunger", rx: /\b(hungry|starv(ed|ing)|crav(ing|es))\b/i },
    { id: "anxiety", rx: /\b(anxious|anxiety|panicky|overwhelm(ed)?)\b/i },
    { id: "bloating", rx: /\b(bloat(ed|ing)|gassy|gas)\b/i },
  ];
  function inferMood(text) {
    let score = 6;
    const t = (text || "").toLowerCase();
    const neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/].reduce((n, rx) => n + (rx.test(t) ? 1 : 0), 0);
    const pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/].reduce((n, rx) => n + (rx.test(t) ? 1 : 0), 0);
    score += pos - 2 * neg;
    return Math.max(1, Math.min(10, score));
  }
  function runCoach() {
    const text = (day.note || "").trim();
    if (!text) { setCoachText("Write a quick note, then tap Smart Coach."); return; }
    const found = new Set(SYM_MATCHERS.filter(m => m.rx.test(text)).map(m => m.id));
    const mood = inferMood(text);
    const hits = COACH_RULES.filter(r => { try { return r.test({ syms: found, phase: day.phase }); } catch { return false; } });
    const tips = hits.flatMap(h => h.tips).slice(0, 8);
    const moodBoost = (mood <= 3)
      ? ["You’re not alone — let’s make today gentle.", "Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
      : (mood <= 6)
        ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];
    const header = found.size ? `I noticed: ${Array.from(found).join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
    const body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
    setCoachText(`${header}\n\n${body}\n\n${moodBoost.join(" ")}`);
  }

  return e(React.Fragment, null,
    // Masthead
    e("div", { className: "mast card" },
      e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } },
        // left
        e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          e("img", { src: "oz.png", alt: "Oz", style: { width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" } }),
          e("div", null,
            e("div", {
              style: { fontSize: "1.25rem", fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap" }
            }, "Oz Companion"),
            e("div", {
              style: { marginTop: 2, fontSize: ".7rem", fontWeight: 600, letterSpacing: ".06em", color: "#64748b" }
            }, day.phase.toUpperCase())
          )
        ),
        // right nav
        e("div", { className: "day-nav" },
          e("button", { className: "day-btn", onClick: () => changeDay(-1), "aria-label": "Previous day" }, "◀"),
          e("span", { className: "day-label" }, "Day " + day.day),
          e("button", { className: "day-btn", onClick: () => changeDay(1), "aria-label": "Next day" }, "▶")
        )
      ),
      // phase selector tucked on a second row for mobile neatness
      e("div", { style: { marginTop: 8 } },
        e("select", { className: "btn", value: day.phase, onChange: (ev) => setPhase(ev.target.value), "aria-label": "Phase" },
          e("option", { value: "fast" }, "Fast"),
          e("option", { value: "cleanse" }, "Cleanse"),
          e("option", { value: "rebuild" }, "Rebuild")
        )
      )
    ),

    // Progress
    e(ProgressBar, { value: progress }),

    // Checklist
    e("div", { className: "card", style: { marginTop: 12 } },
      e(Checklist, { items, state: checks, onToggle: toggleCheck })
    ),

  // Notes + Smart Coach (integrated header is the button)
e("div", { className: "card", style: { marginTop: 16 } },
  e("div", {
    onClick: runCoach,
    role: "button",
    tabIndex: 0,
    onKeyDown: (ev) => { if (ev.key === "Enter" || ev.key === " ") runCoach(); },
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "14px 12px",
      border: "1px solid #f3d0e1",
      borderRadius: 14,
      background: "linear-gradient(90deg,#ffe4ef,#e9d5ff)",
      cursor: "pointer"
    }
  },
    e("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      e("div", {
        style: {
          borderRadius: 14,
          border: "1px solid #f3d0e1",
          background: "#fff",
          padding: "10px"
        }
      },
        "🧠"
      ),
      e("div", null,
        e("div", { style: { fontWeight: "bold" } }, "Smart Coach"),
        e("div", { style: { fontSize: "0.85rem", color: "#555" } },
          "Understands your note and suggests relief + motivation"
        )
      )
    )
  ),
  coachText && e("div", {
    className: "coachOut",
    style: { marginTop: 10, background: "#fff", border: "1px solid #f3d0e1", borderRadius: 12, padding: "10px" }
  }, coachText),
  e("textarea", {
    value: day.note || "",
    onChange: (ev) => {
      const val = ev.target.value;
      setDays(prev => {
        const next = prev.slice();
        const d = { ...next[idx] };
        d.note = val;
        next[idx] = d;
        return next;
      });
    },
    rows: 4,
    className: "noteArea",
    style: { marginTop: 10 }
  })
)
