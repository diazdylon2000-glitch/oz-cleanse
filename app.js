/* app.js — Oz Cleanse Companion (checkpoint + upgrades)
   - Bullet Smart Coach
   - Phase templates + popup editors + custom goal add
   - Two-day ingredients (combined amounts)
   - Photos & notes tracked on calendar
   - Weight entry auto-check
   - Confetti & haptics on 100%
*/
/* --- Loader hardening: never-stuck + CDN banner (duplicate-safe) --- */
(function () {
  function hideSplash() {
    var s = document.getElementById('ozSplash');
    var b = document.getElementById('ozBubble');
    if (s) s.style.display = 'none';
    if (b) b.style.display = 'none';
  }
  // safety net in case app code throws during init
  window.addEventListener('error', hideSplash);
  // last resort after 3.5s
  setTimeout(hideSplash, 3500);
})();

(function () {
  const e = React.createElement;
  const { useState, useEffect, useMemo, useRef } = React;

  /* ----------------- Utilities ----------------- */
  function useLocal(key, initial) {
    const [val, setVal] = useState(() => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initial;
      } catch {
        return initial;
      }
    });
    useEffect(() => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    }, [key, val]);
    return [val, setVal];
  }

  function vibrate(ms = 10) {
    try { navigator.vibrate && navigator.vibrate(ms); } catch {}
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ------------- Defaults / Plan --------------- */
  const PHASES = ["FAST", "CLEANSE", "REBUILD"];

  const DEFAULT_GOALS = {
    water: "💧 Drink 120–150 oz water",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    lmnt: "🧂 Electrolytes",
    exercise: "🏃 Exercise",
    weight: "👣 Weight check-in",
    wholefood: "🥗 Whole food meals",
    juices: "🧃 Juices",
  };

  // Phase templates (ids in DEFAULT_GOALS). Editable in Settings.
  const DEFAULT_TEMPLATES = {
    FAST:      ["water", "tea", "coffee", "lmnt", "exercise", "weight"],
    CLEANSE:   ["water", "tea", "coffee", "juices", "lmnt", "exercise", "weight"],
    REBUILD:   ["water", "lmnt", "exercise", "wholefood", "weight"],
  };

  // 11-day base plan with rebuild meals and snacks.
  const PLAN = [
    // Cleanse days (4–7) juices
    { id:"r-melon",  type:"juice", day:4, name:"Melon Mint Morning",
      ingredients:[{name:"Melon",qty:"1"},{name:"Mint",qty:"1/2 cup"},{name:"Lime",qty:"1"}] },
    { id:"r-peach",  type:"juice", day:5, name:"Peachy Green Glow",
      ingredients:[{name:"Peaches",qty:"3"},{name:"Cucumbers",qty:"2"},{name:"Spinach",qty:"4 cups"},{name:"Lemon",qty:"1"}] },
    { id:"r-carrot", type:"juice", day:6, name:"Carrot Apple Ginger",
      ingredients:[{name:"Carrots",qty:"14"},{name:"Apples",qty:"2"},{name:"Ginger",qty:'1"'},
                   {name:"Lemon",qty:"1"}] },
    { id:"r-grape",  type:"juice", day:7, name:"Grape Romaine Cooler",
      ingredients:[{name:"Grapes",qty:"3 cups"},{name:"Romaine",qty:"3 cups"},
                   {name:"Cucumbers",qty:"2"},{name:"Lemon",qty:"1"}] },

    // Rebuild Day 8–9 (Day1–2 of rebuild)
    { id:"rb-smoothie8", type:"meal", day:8, name:"Smoothie Breakfast",
      ingredients:[{name:"Banana",qty:"1"},{name:"Spinach",qty:"2 cups"},
                   {name:"Almond milk",qty:"1 cup"},{name:"Chia seeds",qty:"1 tbsp"}] },
    { id:"rb-lunch8", type:"meal", day:8, name:"Steamed Veg Lunch",
      ingredients:[{name:"Zucchini",qty:"1"},{name:"Carrots",qty:"1"},
                   {name:"Cucumber",qty:"1"},{name:"Spinach",qty:"2 cups"},
                   {name:"Olive oil",qty:"1 tbsp"},{name:"Lemon",qty:"1"}] },
    { id:"rb-dinner8", type:"meal", day:8, name:"Lentil Soup",
      ingredients:[{name:"Lentils (dry)",qty:"1/2 cup"},{name:"Carrots (diced)",qty:"1/2 cup"},
                   {name:"Celery (diced)",qty:"1/2 cup"},{name:"Parsley",qty:"1/4 cup"},{name:"Onion",qty:"1/2"}] },
    { id:"rb-snacks8", type:"snack", day:8, name:"Fruit / Coconut yogurt / Chia pudding" },

    { id:"rb-smoothie9", type:"meal", day:9, name:"Smoothie Breakfast",
      ingredients:[{name:"Banana",qty:"1"},{name:"Spinach",qty:"2 cups"},
                   {name:"Almond milk",qty:"1 cup"},{name:"Chia seeds",qty:"1 tbsp"}] },
    { id:"rb-lunch9", type:"meal", day:9, name:"Steamed Veg Lunch",
      ingredients:[{name:"Zucchini",qty:"1"},{name:"Carrots",qty:"1"},
                   {name:"Cucumber",qty:"1"},{name:"Spinach",qty:"2 cups"},
                   {name:"Olive oil",qty:"1 tbsp"},{name:"Lemon",qty:"1"}] },
    { id:"rb-dinner9", type:"meal", day:9, name:"Lentil Soup",
      ingredients:[{name:"Lentils (dry)",qty:"1/2 cup"},{name:"Carrots (diced)",qty:"1/2 cup"},
                   {name:"Celery (diced)",qty:"1/2 cup"},{name:"Parsley",qty:"1/4 cup"},{name:"Onion",qty:"1/2"}] },
    { id:"rb-snacks9", type:"snack", day:9, name:"Fruit / Coconut yogurt / Chia pudding" },

    // Rebuild Day 10–11 (Day3–4 of rebuild)
    { id:"rb-oats10", type:"meal", day:10, name:"Overnight Oats",
      ingredients:[{name:"Rolled oats",qty:"1/2 cup"},{name:"Almond milk",qty:"1 cup"},
                   {name:"Berries",qty:"1/2 cup"},{name:"Cinnamon",qty:"1/2 tsp"}] },
    { id:"rb-quinoa10", type:"meal", day:10, name:"Quinoa Salad",
      ingredients:[{name:"Quinoa (dry)",qty:"1/2 cup"},{name:"Cucumber",qty:"1"},
                   {name:"Tomato",qty:"1"},{name:"Parsley",qty:"1/4 cup"},{name:"Lemon",qty:"1"},
                   {name:"Olive oil",qty:"1 tbsp"}] },
    { id:"rb-protein11", type:"meal", day:11, name:"Salmon/Chicken + Steamed Broccoli",
      ingredients:[{name:"Salmon/Chicken",qty:"12 oz"},{name:"Broccoli",qty:"2 heads"}] },
    { id:"rb-snacks1011", type:"snack", day:10, name:"Raw veg + hummus / fresh fruit" },
    { id:"rb-snacks111", type:"snack", day:11, name:"Raw veg + hummus / fresh fruit" },
  ];

  function defaultDays() {
    const phases = ["FAST","FAST","FAST","CLEANSE","CLEANSE","CLEANSE","CLEANSE","REBUILD","REBUILD","REBUILD","REBUILD"];
    return phases.map((p, i) => ({
      day: i + 1,
      phase: p,
      checks: {},  // id -> bool
      note: "",
      weight: null,
      photos: []
    }));
  }

  /* ----------- Smart Coach helpers ----------- */
  const COACH_TIPS = {
    headache: ["12–16 oz water + LMNT", "Dim screens 5–10 min", "Slow nasal breathing (in 4 / out 6)"],
    dizziness: ["Sit until steady", "Small juice or pinch of salt", "Slow breaths"],
    nausea: ["Peppermint/ginger tea", "Cool water sips", "Fresh air"],
    fatigue: ["15–20 min rest", "Hydrate / electrolytes", "2-min stretch"],
    hunger: ["Water first", "Sip scheduled juice slowly", "5-min walk as reset"]
  };
  function analyzeNote(text) {
    const t = (text || "").toLowerCase();
    const found = [];
    if (/\b(headache|migraine|head pain)\b/.test(t)) found.push("headache");
    if (/\b(dizzy|light.?headed|vertigo)\b/.test(t)) found.push("dizziness");
    if (/\b(nausea|queasy|sick to (my|the) stomach)\b/.test(t)) found.push("nausea");
    if (/\b(tired|fatigue|exhaust)\b/.test(t)) found.push("fatigue");
    if (/\b(hungry|crav(ing|es))\b/.test(t)) found.push("hunger");

    const tips = found.flatMap(k => COACH_TIPS[k] || []).slice(0, 8);
    const mood = /proud|better|good|calm|motivated/.test(t) ? "up" :
                 /overwhelm|anxious|stressed|down|frustrat/.test(t) ? "low" : "mid";
    const boost = mood === "low"
      ? "You’re not alone — make today gentle."
      : mood === "mid"
        ? "Nice work staying steady. One tiny upgrade today."
        : "Ride the wave, stay kind to yourself.";

    return {
      found,
      tips,
      boost
    };
  }

  /* --------- Ingredient aggregation (2 days) ---------- */
  // parse qty like "1/2 cup", "2", '1"', "2 cups"
  function parseQty(q) {
    if (!q) return { n: 1, u: "" };
    const m = String(q).trim().match(/^(\d+(?:\/\d+)?|\d*\.\d+)\s*([a-zA-Z"’-]+)?/);
    if (!m) return { n: 1, u: "" };
    let n = 1;
    if (m[1].includes("/")) {
      const [a, b] = m[1].split("/").map(Number);
      n = b ? a / b : Number(a);
    } else {
      n = Number(m[1]);
    }
    return { n, u: (m[2] || "").toLowerCase() };
  }
  // normalize units into buckets so we can sum simple cases
  const CUP_ALIASES = new Set(["cup","cups","c"]);
  function combineTwoDays(recipes, d1, d2) {
    const bag = {};
    (recipes || []).forEach(r => {
      if (r.day === d1 || r.day === d2) {
        (r.ingredients || []).forEach(it => {
          const key = (it.name || "").toLowerCase();
          const { n, u } = parseQty(it.qty || "1");
          const unit = CUP_ALIASES.has(u) ? "cup" : u;
          if (!bag[key]) bag[key] = { name: it.name, n: 0, u: unit };
          // sum only if same normalized unit
          if (bag[key].u === unit) {
            bag[key].n += n;
          } else {
            // fallback: keep separate by appending
            bag[key + " " + unit] = { name: it.name + ` (${unit})`, n, u: unit };
          }
        });
      }
    });
    const out = Object.values(bag)
      .filter(x => x.n > 0)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return out.map(x => ({ name: x.name, qty: (x.u ? `${trimFloat(x.n)} ${x.u}${x.u === "cup" && x.n !== 1 ? "s" : ""}` : trimFloat(x.n)) }));
  }
  function trimFloat(n) {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
  }

  /* ---------------- Components ---------------- */
  const Paw = ({ on, onClick, label }) =>
    e("button", { className: "paw" + (on ? " on" : ""), onClick, "aria-pressed": !!on, title: label || "" }, on ? "🐾" : "");

  const Progress = ({ value }) =>
    e("div", { className: "progress" }, e("div", { className: "fill", style: { width: clamp(value, 0, 100) + "%" } }));

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
            backgroundColor: "rgba(236,72,153,.10)",
            tension: .34,
            spanGaps: true,
            pointRadius: 3,
            pointHoverRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }},
          scales: {
            x: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.25)" } },
            y: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.18)" } },
          },
          animation: { duration: 240 }
        }
      });
      return () => { try { chartRef.current && chartRef.current.destroy(); } catch {} };
    }, [series]);
    return e("div", { style: { height: 180 } }, e("canvas", { ref: canvasRef }));
  };

  /* -------------- Pages --------------- */
  function Header({ day, onPrev, onNext }) {
    return e("div", { className: "topbar card" },
      e("div", { className: "headLeft" },
        e("img", { src: "oz.png", alt: "Oz", className: "avatar" }),
        e("div", null,
          e("div", { className: "title" }, "Oz Companion"),
          e("div", { className: "phase" }, day.phase)
        )
      ),
      e("div", { className: "daybox" },
        e("button", { className: "round", onClick: onPrev, "aria-label": "Previous day" }, "◀"),
        e("div", { className: "daypill" },
          e("div", { className: "d1" }, "Day"), e("div", { className: "d2" }, String(day.day))
        ),
        e("button", { className: "round", onClick: onNext, "aria-label": "Next day" }, "▶")
      )
    );
  }

  function Checklist({ ids, labels, state, onToggle }) {
    return e("ul", { className: "checklist" },
      (ids || []).map(id =>
        e("li", { key: id },
          e(Paw, { on: !!state[id], onClick: () => onToggle(id), label: labels[id] }),
          e("span", { className: "clabel" }, labels[id] || id)
        )
      )
    );
  }

  function CoachCard({ note, setCoachText }) {
    function run() {
      const t = (note || "").trim();
      if (!t) { setCoachText("Write a quick note below, then tap Smart Coach."); return; }
      const res = analyzeNote(t);
      const lines = [];
      lines.push(res.found.length ? `I noticed: ${res.found.join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.");
      lines.push("");
      lines.push("Try:");
      if (res.tips.length) {
        res.tips.forEach(tip => lines.push("• " + tip));
      } else {
        lines.push("• Hydrate");
        lines.push("• 5 slow breaths");
        lines.push("• Short walk, then reassess");
      }
      lines.push("");
      lines.push(res.boost);
      setCoachText(lines.join("\n"));
      vibrate(12);
    }
    return e("div", {
      className: "coachCard",
      role: "button",
      tabIndex: 0,
      onClick: run,
      onKeyDown: (ev) => { if (ev.key === "Enter" || ev.key === " ") run(); }
    },
      e("span", { className: "badge" }, "🧠 Smart Coach"),
      e("div", { style: { marginTop: 6, color: "var(--muted)" } }, "Tap to analyze your note and get relief + motivation")
    );
  }

  function Upcoming({ recipes, day }) {
    // today + tomorrow. If tomorrow has no recipes, pick next recipe day.
    const d1 = day.day;
    let d2 = d1 + 1;
    const daysWithRecipes = Array.from(new Set((recipes || []).map(r => r.day))).sort((a,b)=>a-b);
    if (!daysWithRecipes.includes(d2)) {
      d2 = daysWithRecipes.find(x => x > d1) || d1;
    }
    const items = combineTwoDays(recipes, d1, d2);
    const label = d1 === d2 ? `Upcoming Ingredients — Day ${d1}` : `Upcoming Ingredients — Day ${d1} & ${d2}`;
    return e("div", { className: "card" },
      e("h2", null, label),
      items.length === 0
        ? e("div", { className: "muted" }, "No recipes scheduled soon.")
        : e("ul", { className: "up-list" }, items.map((it, i) =>
            e("li", { key: i },
              e("span", null, it.name),
              e("span", { className: "qty" }, it.qty || "")
            )
          ))
    );
  }

  function Calendar({ days, recipes, settings }) {
    function dateFor(dayNum) {
      const dstr = settings.startDate || "";
      if (!dstr) return null;
      const base = new Date(dstr + "T00:00:00");
      if (isNaN(base)) return null;
      const dt = new Date(base.getTime() + (dayNum - 1) * 86400000);
      return dt.toLocaleDateString();
    }
    return e("div", { className: "card" },
      e("h2", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0 } },
        days.map(d => {
          const list = (recipes || []).filter(r => r.day === d.day);
          const hasPhotos = (d.photos && d.photos.length > 0);
          const hasNote = (d.note && d.note.trim().length > 0);
          const dd = dateFor(d.day);
          return e("li", { key: d.day, className: "card", style: { padding: 12, marginTop: 10 } },
            e("div", { className: "row", style: { justifyContent: "space-between" } },
              e("div", null,
                e("div", { style: { fontWeight: 800 } }, "Day ", d.day, " — ", d.phase),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              e("div", { className: "row", style: { minHeight: 24, gap: 6, flexWrap: "wrap" } },
                list.length
                  ? list.map(r => e("span", { key: r.id, className: "badge" },
                      r.type === "juice" ? "🧃 " : (r.type === "snack" ? "🍎 " : "🍽️ "), r.name))
                  : e("span", { className: "muted" }, "—"),
                hasNote && e("span", { className: "badge" }, "📝 Note"),
                hasPhotos && e("span", { className: "badge" }, "📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  function Photos({ days, setDays }) {
    const [idx, setIdx] = useState(0);
    const d = days[idx] || days[0];

    function onUpload(ev) {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      const readers = files.map(f => new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(f);
      }));
      Promise.all(readers).then(urls => {
        setDays(prev => {
          const next = prev.slice();
          const dd = { ...next[idx] };
          dd.photos = (dd.photos || []).concat(urls);
          next[idx] = dd;
          return next;
        });
        const A = ["Looking strong ✨", "Your glow is showing ✨", "Small habits, big change 💪", "Oz is proud of you 🐶", "Consistency looks great on you 🌟"];
        alert(A[Math.floor(Math.random() * A.length)]);
      });
    }

    return e("div", { className: "card" },
      e("h2", null, "Progress Photos"),
      e("div", { className: "row", style: { gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 8 } },
        e("div", null, e("b", null, "Day "), d.day),
        e("div", null,
          e("button", { className: "btn", onClick: () => setIdx(i => (i > 0 ? i - 1 : days.length - 1)) }, "◀"),
          e("span", { className: "badge", style: { margin: "0 8px" } }, "Day " + d.day),
          e("button", { className: "btn", onClick: () => setIdx(i => (i < days.length - 1 ? i + 1 : 0)) }, "▶")
        ),
        e("label", { className: "btn peach" }, "Upload",
          e("input", { type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: onUpload })
        )
      ),
      e("div", { className: "grid-photos" },
        (d.photos || []).map((src, i) => e("img", { key: i, src, className: "pimg" }))
      )
    );
  }

  function Settings({ templates, setTemplates, goals, setGoals, startDate, setStartDate, onImportPlan, onImportFromText }) {
    const [show, setShow] = useState(null); // "FAST" | "CLEANSE" | "REBUILD"
    const [newGoalLabel, setNewGoalLabel] = useState("");

    function addCustomGoal() {
      const lbl = (newGoalLabel || "").trim();
      if (!lbl) return;
      const id = lbl.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (goals[id]) { alert("That goal already exists."); return; }
      setGoals(prev => Object.assign({}, prev, { [id]: lbl }));
      setNewGoalLabel("");
      alert("Goal added. Enable it in a phase via Edit.");
    }

    function PhaseEditor({ phase }) {
      const ids = templates[phase] || [];
      const all = Object.keys(goals);
      function toggle(id) {
        setTemplates(prev => {
          const set = new Set(prev[phase] || []);
          if (set.has(id)) set.delete(id); else set.add(id);
          return Object.assign({}, prev, { [phase]: Array.from(set) });
        });
      }
      return e("div", { className: "sheet" },
        e("h3", null, phase.charAt(0) + phase.slice(1).toLowerCase()),
        e("div", { className: "edit-list" },
          all.map(id => e("label", { key: id, className: "edit-row" },
            e("input", { type: "checkbox", checked: ids.includes(id), onChange: () => toggle(id) }),
            e("span", null, goals[id] || id)
          ))
        ),
        e("div", { className: "row", style: { justifyContent: "flex-end", gap: 8 } },
          e("button", { className: "btn", onClick: () => setShow(null) }, "Done")
        )
      );
    }

    return e("div", { className: "card" },
      e("h2", null, "Settings"),
      e("div", { className: "row", style: { gap: 12, flexWrap: "wrap" } },
        e("label", { className: "field" },
          e("div", { className: "f-label" }, "Start Date"),
          e("input", {
            type: "date",
            value: startDate || "",
            onChange: (ev) => setStartDate(ev.target.value || null)
          })
        ),
        e("div", { className: "row", style: { gap: 8 } },
          e("button", { className: "btn", onClick: onImportPlan }, "Import 11-Day Plan"),
          e("button", { className: "btn", onClick: onImportFromText }, "Import Plan from ChatGPT")
        )
      ),

      e("hr", { className: "sep" }),

      e("div", { className: "row", style: { gap: 8, flexWrap: "wrap" } },
        ["FAST", "CLEANSE", "REBUILD"].map(ph =>
          e("div", { key: ph, className: "card mini" },
            e("div", { className: "row", style: { justifyContent: "space-between" } },
              e("b", null, ph.charAt(0) + ph.slice(1).toLowerCase()),
              e("button", { className: "btn", onClick: () => setShow(ph) }, "Edit")
            )
          )
        )
      ),

      e("div", { className: "card", style: { marginTop: 12 } },
        e("h3", null, "Add Custom Checklist Item"),
        e("div", { className: "row", style: { gap: 8 } },
          e("input", { type: "text", placeholder: "Label (e.g., 🧘 Meditation 10 min)", value: newGoalLabel,
            onChange: (ev) => setNewGoalLabel(ev.target.value), style: { flex: 1 } }),
          e("button", { className: "btn", onClick: addCustomGoal }, "Add")
        )
      ),

      show && e("div", { className: "modal", onClick: (ev) => { if (ev.target.classList.contains("modal")) setShow(null); } },
        e(PhaseEditor, { phase: show })
      )
    );
  }

  /* -------------- The App --------------- */
  function App() {
    const [goals, setGoals] = useLocal("oz.goals", DEFAULT_GOALS);
    const [templates, setTemplates] = useLocal("oz.templates", DEFAULT_TEMPLATES);
    const [startDate, setStartDate] = useLocal("oz.startDate", null);

    const [days, setDays] = useLocal("oz.days", defaultDays());
    const [recipes, setRecipes] = useLocal("oz.recipes", PLAN.slice());
    const [tab, setTab] = useState("dash"); // dash | groceries (future) | calendar | photos | settings

    const [idx, setIdx] = useState(0);
    const day = days[idx] || days[0];

    // Checklist IDs to show for current phase
    const ids = templates[day.phase] || [];
    const done = ids.reduce((a, id) => a + (day.checks && day.checks[id] ? 1 : 0), 0);
    const pct = ids.length ? (done / ids.length) * 100 : 0;

    useEffect(() => {
      if (Math.round(pct) === 100) {
        vibrate(30);
        try {
          confetti && confetti({
            particleCount: 160,
            spread: 70,
            origin: { y: .6 }
          });
          confetti && confetti({
            particleCount: 80,
            spread: 120,
            origin: { x: 0 },
          });
          confetti && confetti({
            particleCount: 80,
            spread: 120,
            origin: { x: 1 },
          });
        } catch {}
      }
    }, [pct]);

    function prevDay() { setIdx(i => i > 0 ? i - 1 : days.length - 1); }
    function nextDay() { setIdx(i => i < days.length - 1 ? i + 1 : 0); }

    function toggleCheck(id) {
      setDays(prev => {
        const n = prev.slice();
        const d = { ...n[idx] };
        const c = { ...(d.checks || {}) };
        c[id] = !c[id];
        d.checks = c;
        n[idx] = d;
        return n;
      });
      vibrate(8);
    }

    // Smart Coach
    const [coachText, setCoachText] = useState("");

    // Weight auto-check
    function updateWeight(v) {
      setDays(prev => {
        const n = prev.slice();
        const d = { ...n[idx] };
        d.weight = (v === "" ? null : Number(v));
        // auto-check if present
        if ((templates[d.phase] || []).includes("weight")) {
          const c = { ...(d.checks || {}) };
          c.weight = (v !== "");
          d.checks = c;
        }
        n[idx] = d;
        return n;
      });
    }

    // Grocery — future expansion (kept container to not break tabs)
    const groceriesView = e("div", { className: "card" },
      e("h2", null, "Groceries"),
      e("div", { className: "muted" }, "Coming next: price presets & quick totals.")
    );

    // Dashboard
    const dash = e(React.Fragment, null,
      e(Header, { day, onPrev: prevDay, onNext: nextDay }),
      e(Progress, { value: pct }),

      e("div", { className: "card" },
        e(Checklist, { ids, labels: goals, state: day.checks || {}, onToggle: toggleCheck })
      ),

      e("div", { className: "card", style: { marginTop: 12 } },
        e(CoachCard, { note: day.note, setCoachText }),
        coachText && e("div", { className: "coachOut" }, coachText),
        e("textarea", {
          className: "noteArea",
          placeholder: "Notes…",
          value: day.note || "",
          onChange: (ev) => setDays(prev => {
            const n = prev.slice();
            const d = { ...n[idx] };
            d.note = ev.target.value;
            n[idx] = d;
            return n;
          })
        })
      ),

      e(Upcoming, { recipes, day }),

      e("div", { className: "card", style: { marginTop: 12 } },
        e("h2", null, "Weight"),
        e("div", { className: "row", style: { alignItems: "center", gap: 8 } },
          e("label", null, "Today"),
          e("input", {
            type: "number", step: "0.1", inputMode: "decimal",
            value: (day.weight == null ? "" : day.weight),
            onChange: (ev) => updateWeight(ev.target.value),
            className: "nozoom"
          }),
          e("span", { className: "badge" }, "Day ", String(day.day))
        ),
        e(WeightChart, { series: days.map(d => d.weight == null ? null : d.weight) })
      )
    );

    const calendarView = e(Calendar, { days, recipes, settings: { startDate } });
    const photosView = e(Photos, { days, setDays });

    const settingsView = e(Settings, {
      templates, setTemplates,
      goals, setGoals,
      startDate, setStartDate,
      onImportPlan: () => {
        setRecipes(PLAN.slice());
        alert("Default 11-day plan imported.");
      },
      onImportFromText: () => {
        const txt = prompt("Paste meal-plan text or JSON.");
        if (!txt) return;
        try {
          const obj = JSON.parse(txt);
          if (!Array.isArray(obj.recipes)) throw 0;
          setRecipes(obj.recipes);
          alert("Plan imported from JSON.");
          return;
        } catch {}
        // naive free-text fallback
        const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const recs = [];
        let cur = null;
        lines.forEach(L => {
          const mDay = L.match(/^Day\s*(\d+)/i);
          if (mDay) { cur = { day: Number(mDay[1]) }; return; }
          const rx = /^(Juice|Smoothie|Breakfast|Lunch|Dinner|Snack|Meal)\s*[-:]?\s*(.+)$/i;
          const m = L.match(rx);
          if (m && cur) {
            const type = /juice/i.test(m[1]) ? "juice" : (/snack/i.test(m[1]) ? "snack" : "meal");
            recs.push({ id: "imp-" + Math.random().toString(36).slice(2), day: cur.day, type, name: m[2], ingredients: [] });
            return;
          }
          const i = L.match(/^[-*•]\s*(.+)$/);
          if (i && recs.length) {
            recs[recs.length - 1].ingredients.push({ name: i[1], qty: "" });
          }
        });
        if (recs.length) {
          setRecipes(recs);
          alert("Plan imported from text.");
        } else {
          alert("Couldn’t parse that text.");
        }
      }
    });

    return e("div", null,
      (tab === "dash") && dash,
      (tab === "grocery") && groceriesView,
      (tab === "calendar") && calendarView,
      (tab === "photos") && photosView,
      (tab === "settings") && settingsView,

      // Floating dock (emoji)
      e("nav", { className: "tabs" },
        [
          { id: "dash", icon: "🏠" },
          { id: "grocery", icon: "🛒" },
          { id: "calendar", icon: "📅" },
          { id: "photos", icon: "📷" },
          { id: "settings", icon: "⚙️" }
        ].map(t =>
          e("button", {
            key: t.id,
            className: "btn" + (tab === t.id ? " active" : ""),
            onClick: () => setTab(t.id),
            "aria-label": t.id
          }, t.icon)
        )
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
/* --- Loader hardening: never-stuck + CDN banner (duplicate-safe) --- */
(function () {
  function hideSplash() {
    var s = document.getElementById('ozSplash');
    var b = document.getElementById('ozBubble');
    if (s) s.style.display = 'none';
    if (b) b.style.display = 'none';
  }
  // safety net in case app code throws during init
  window.addEventListener('error', hideSplash);
  // last resort after 3.5s
  setTimeout(hideSplash, 3500);
})();
