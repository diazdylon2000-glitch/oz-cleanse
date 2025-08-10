/* app.js — Oz Companion (V14 clean)
   - Streamlined header: Oz bubble + title + centered day selector
   - Emoji floating dock
   - iOS no-zoom on number inputs (class "no-zoom")
   - Groceries aggregated from recipes
   - Daily notes/weight, coach hint, photos, calendar, settings
*/

(function () {
  // --- Guards for globals loaded by <script> in index.html ---
  if (!window.React || !window.ReactDOM) {
    console.error("React/ReactDOM not available. Check <script> tags in index.html.");
    return;
  }
  const e = React.createElement;
  const { useState, useEffect, useMemo, useRef } = React;

  // ============ Small utils ============
  function useLocal(key, initial) {
    const [v, setV] = useState(() => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initial;
      } catch {
        return initial;
      }
    });
    useEffect(() => {
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    }, [key, v]);
    return [v, setV];
  }
  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
  }

  // ============ Affirmations ============
  const AFFS = [
    "Small habits, big change",
    "You’ve got this!",
    "Hydration is happiness 🐾",
    "Progress > perfection",
    "Sip, breathe, reset",
    "Steady water, bright energy",
    "Kind to myself, always",
    "Oz is proud of you 🐶"
  ];
  function nextAff() {
    try {
      const used = JSON.parse(localStorage.getItem("oz.usedAff") || "[]");
      let avail = AFFS.filter(a => used.indexOf(a) === -1);
      if (!avail.length) {
        avail = AFFS.slice();
        localStorage.setItem("oz.usedAff", "[]");
      }
      const pick = avail[Math.floor(Math.random() * avail.length)];
      used.push(pick);
      localStorage.setItem("oz.usedAff", JSON.stringify(used));
      return pick;
    } catch {
      return AFFS[0];
    }
  }

  // ============ Seed data ============
  const PHASES = ["Water Fast", "Water Fast", "Water Fast", "Juice Cleanse", "Juice Cleanse", "Juice Cleanse", "Juice Cleanse", "Rebuild", "Rebuild", "Rebuild", "Rebuild"];
  const GOALS = {
    water: { label: "💧 Water 120–150 oz" },
    tea: { label: "🍵 Tea" },
    coffee: { label: "☕ Coffee" },
    juices: { label: "🧃 Juices" },
    lmnt: { label: "🧂 LMNT" },
    exercise: { label: "🏃 Exercise" },
    noJunk: { label: "🚫 Avoid processed food" },
    weighIn: { label: "👣 Weight check-in" }
  };

  function defDays() {
    const out = [];
    for (let i = 0; i < PHASES.length; i++) {
      const goals = {};
      Object.keys(GOALS).forEach(k => { goals[k] = false; });
      out.push({ day: i + 1, phase: PHASES[i], goals, weight: null, note: "" });
    }
    return out;
  }

  function seedRecipes() {
    return [
      { id: "r-melon", name: "Melon Mint Morning", type: "juice", day: 4, ingredients: [{ name: "Melon", qty: "1" }, { name: "Mint", qty: "1/2 c" }, { name: "Lime", qty: "1" }] },
      { id: "r-peach", name: "Peachy Green Glow", type: "juice", day: 5, ingredients: [{ name: "Peaches", qty: "6" }, { name: "Cucumbers", qty: "4" }, { name: "Spinach", qty: "8 c" }, { name: "Lemons", qty: "2" }] },
      { id: "r-carrot", name: "Carrot Apple Ginger", type: "juice", day: 6, ingredients: [{ name: "Carrots", qty: "28" }, { name: "Apples", qty: "4" }, { name: "Ginger", qty: '2"' }, { name: "Lemons", qty: "2" }] },
      { id: "r-grape", name: "Grape Romaine Cooler", type: "juice", day: 7, ingredients: [{ name: "Grapes", qty: "6 c" }, { name: "Romaine", qty: "6 c" }, { name: "Cucumbers", qty: "4" }, { name: "Lemons", qty: "2" }] },
      { id: "r-smoothie", name: "Smoothie Breakfast", type: "meal", day: 8, ingredients: [{ name: "Spinach", qty: "2 c" }, { name: "Almond milk", qty: "1 c" }, { name: "Chia", qty: "1 tbsp" }] },
      { id: "r-lentil", name: "Lentil Soup", type: "meal", day: 8, ingredients: [{ name: "Lentils", qty: "1/2 c" }, { name: "Carrots", qty: "1/2 c" }, { name: "Celery", qty: "1/2 c" }, { name: "Parsley", qty: "1/4 c" }, { name: "Onion", qty: "1/4" }] },
      { id: "r-oats", name: "Overnight Oats", type: "meal", day: 10, ingredients: [{ name: "Oats", qty: "1/2 c" }, { name: "Almond milk", qty: "1 c" }] },
      { id: "r-quinoa", name: "Quinoa Salad", type: "meal", day: 10, ingredients: [{ name: "Quinoa", qty: "1/2 c" }, { name: "Cucumber", qty: "1" }, { name: "Tomato", qty: "1" }, { name: "Parsley", qty: "1/4 c" }, { name: "Olive oil", qty: "1 tbsp" }, { name: "Lemon", qty: "1" }] },
      { id: "r-protein", name: "Protein + Broccoli", type: "meal", day: 11, ingredients: [{ name: "Salmon/Chicken", qty: "12 oz" }, { name: "Broccoli", qty: "2 heads" }] }
    ];
  }

  function aggregateGroceries(recipes) {
    const map = {};
    (recipes || []).forEach(r => {
      (r.ingredients || []).forEach(it => {
        const id = (it.name || "").toLowerCase().replace(/\s+/g, "-");
        if (!map[id]) map[id] = { id, name: it.name, qty: it.qty || "", checked: false, estCost: null, days: [] };
        if (r.day) {
          const s = new Set(map[id].days || []);
          s.add(r.day);
          map[id].days = Array.from(s).sort((a, b) => a - b);
        }
      });
    });
    return Object.values(map).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  // ============ Tiny chart helper ============
  function WeightMiniChart({ series }) {
    const ref = useRef(null);
    const inst = useRef(null);
    useEffect(() => {
      if (!window.Chart) return;
      const ctx = ref.current.getContext("2d");
      try { inst.current && inst.current.destroy && inst.current.destroy(); } catch {}
      inst.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: series.map((_, i) => "D" + (i + 1)),
          datasets: [{ data: series, borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,.10)", tension: .3, spanGaps: true, pointRadius: 2 }]
        },
        options: { plugins: { legend: { display: false } }, animation: { duration: 200 }, scales: { x: { display: false }, y: { display: false } } }
      });
      return () => { try { inst.current && inst.current.destroy(); } catch {} };
    }, [series]);
    return e("canvas", { height: 80, ref });
  }

  // ============ App ============
  function App() {
    const [tab, setTab] = useState("dashboard");
    const [settings, setSettings] = useLocal("oz.settings", {
      startDate: null,
      headerImg: "",
      phaseGoals: {
        "Water Fast": ["water", "tea", "coffee", "lmnt", "exercise", "noJunk", "weighIn"],
        "Juice Cleanse": ["water", "tea", "coffee", "juices", "lmnt", "exercise", "noJunk", "weighIn"],
        "Rebuild": ["water", "exercise", "noJunk", "weighIn"]
      },
      weightLbs: 170, workoutDays: 4, sessionMins: 60, sweat: "moderate"
    });
    const [days, setDays] = useLocal("oz.days", defDays());
    const [recipes, setRecipes] = useLocal("oz.recipes", seedRecipes());
    const [groceries, setGroceries] = useLocal("oz.groceries", aggregateGroceries(seedRecipes()));
    const [photos, setPhotos] = useLocal("oz.photos", []);
    const aff = useMemo(() => nextAff(), [settings.startDate]);

    // Splash text (handled in index.html). Just make sure bubble shows fresh line quickly.
    useEffect(() => {
      const b = document.getElementById("bubble"); if (b) b.textContent = aff;
      setTimeout(() => { const s = document.getElementById("splash"); if (s) s.style.display = "none"; if (b) b.style.display = "none"; }, 1500);
    }, [aff]);

    // Header day shift helpers
    function shiftPrev() {
      setDays(prev => {
        const a = prev.slice();
        if (a.length <= 1) return a;
        const last = a.pop(); a.unshift(last);
        return a.map((d, i) => Object.assign({}, d, { day: i + 1 }));
      });
    }
    function shiftNext() {
      setDays(prev => {
        const a = prev.slice();
        if (a.length <= 1) return a;
        const first = a.shift(); a.push(first);
        return a.map((d, i) => Object.assign({}, d, { day: i + 1 }));
      });
    }

    // Coach line (lightweight)
    function coachLine(d) {
      const t = (d.note || "").toLowerCase();
      if (/headache|dizzy/.test(t)) return "Try 12–16 oz water + LMNT; ease intensity.";
      if (d.phase === "Juice Cleanse") return "A juice ~every 3 hrs—sip slowly.";
      if (d.phase === "Rebuild") return "Chew well, 80% full, anchor protein+veg.";
      return "Nice work—keep water steady and move a little.";
    }

    // Groceries total
    const totals = useMemo(() => {
      const ck = groceries.filter(g => g.checked).reduce((a, b) => a + (+b.estCost || 0), 0);
      const rest = groceries.filter(g => !g.checked).reduce((a, b) => a + (+b.estCost || 0), 0);
      return { ck, rest, all: ck + rest };
    }, [groceries]);

    // ======= UI helpers =======
    function Section(p) { return e("section", { className: "card" }, p.children); }

    // ======= Header (streamlined) =======
    const head = e("header", { className: "card" },
      e("div", { className: "id" },
        e("img", { src: (settings.headerImg || "oz.png"), alt: "Oz" }),
        e("div", { className: "title" },
          e("div", { className: "t" }, "Oz Companion"),
          e("div", { className: "sub" }, (days[0] ? (days[0].phase || "") : "").toUpperCase())
        )
      ),
      e("div", { className: "dayNav" },
        e("button", { className: "btn", onClick: shiftPrev }, "◀"),
        e("div", { className: "d" }, "Day ", (days[0] ? days[0].day : 1)),
        e("button", { className: "btn", onClick: shiftNext }, "▶")
      )
    );

    // ======= Dashboard =======
    const weightSeries = days.map(d => (d.weight == null ? null : d.weight));
    const dash = e(Section, null,
      e("div", { className: "grid grid-3" },
        e("div", null,
          e("div", { className: "badge" }, "Today"),
          e("div", { style: { fontWeight: 700, marginTop: 6 } }, (days[0] || {}).phase || "—"),
          e("div", { className: "prog", style: { marginTop: 8 } }, e("i", { style: { width: "30%" } }))
        ),
        e("div", null,
          e("div", { style: { fontSize: 12, color: "#64748b" } }, "Hydration"),
          e("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
            e("button", {
              className: "paw " + ((days[0] && days[0].goals.water) ? "on" : ""),
              onClick: function () {
                setDays(p => { const n = p.slice(); n[0].goals.water = !n[0].goals.water; return n; });
                vibrate(8);
              }
            }, (days[0] && days[0].goals.water) ? "🐾" : "W"),
            e("button", {
              className: "paw " + ((days[0] && days[0].goals.lmnt) ? "on" : ""),
              onClick: function () {
                setDays(p => { const n = p.slice(); n[0].goals.lmnt = !n[0].goals.lmnt; return n; });
                vibrate(8);
              }
            }, (days[0] && days[0].goals.lmnt) ? "🐾" : "L")
          ),
          e("div", { className: "prog", style: { marginTop: 8 } }, e("i", { style: { width: ((days[0] && days[0].goals.water) ? "100%" : "0%") } })),
          e("div", { className: "prog", style: { marginTop: 8 } }, e("i", { style: { width: ((days[0] && days[0].goals.lmnt) ? "100%" : "0%") } }))
        ),
        e("div", null,
          e("div", { style: { fontSize: 12, color: "#64748b" } }, "Weight mini-chart"),
          e(WeightMiniChart, { series: weightSeries })
        )
      )
    );

    // ======= Daily editor =======
    const daily = e(Section, null,
      e("h2", null, "Daily"),
      days.map((d, i) => e("div", {
        key: d.day,
        style: { border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginTop: 8, background: "#fff" }
      },
        e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          e("div", null, e("span", { className: "badge" }, d.phase), " ", e("b", null, "Day ", d.day)),
          e("select", {
            value: d.phase,
            onChange: function (ev) {
              setDays(prev => {
                const n = prev.slice();
                n[i] = Object.assign({}, n[i], { phase: ev.target.value });
                return n;
              });
            }
          }, ["Water Fast", "Juice Cleanse", "Rebuild"].map(p => e("option", { key: p, value: p }, p)))
        ),
        e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 } },
          Object.keys(d.goals)
            .filter(k => (settings.phaseGoals[d.phase] || []).indexOf(k) >= 0)
            .map(k => e("button", {
              key: k,
              className: "pill" + (d.goals[k] ? " on" : ""),
              onClick: function () {
                setDays(prev => {
                  const n = prev.slice();
                  const g = Object.assign({}, n[i].goals);
                  g[k] = !g[k];
                  n[i] = Object.assign({}, n[i], { goals: g });
                  return n;
                });
              }
            }, GOALS[k].label))
        ),
        e("div", { style: { marginTop: 8, display: "flex", gap: 8, alignItems: "center" } },
          e("label", null, "Weight"),
          e("input", {
            type: "number",
            className: "no-zoom",
            inputMode: "decimal",
            value: (d.weight == null ? "" : d.weight),
            onChange: function (ev) {
              setDays(prev => {
                const n = prev.slice();
                n[i] = Object.assign({}, n[i], { weight: ev.target.value === "" ? null : Number(ev.target.value) });
                return n;
              });
            },
            style: { width: 110 }
          })
        ),
        e("textarea", {
          placeholder: "Notes…",
          value: (d.note || ""),
          onChange: function (ev) {
            setDays(prev => {
              const n = prev.slice();
              n[i] = Object.assign({}, n[i], { note: ev.target.value });
              return n;
            });
          },
          style: { width: "100%", height: 80, marginTop: 8 }
        }),
        e("div", {
          className: "card",
          role: "button",
          tabIndex: 0,
          onClick: function () { alert(coachLine(d)); },
          onKeyDown: function (ev) { if (ev.key === "Enter" || ev.key === " ") alert(coachLine(d)); },
          style: { marginTop: 8, fontSize: 14, background: "linear-gradient(90deg,#ffe4ef,#e9d5ff)" }
        }, e("span", { className: "pill" }, "🧠 Smart Coach"), " ",
          e("span", null, "Tap to analyze your note and get relief + motivation"))
      ))
    );

    // ======= Recipes (simple) =======
    const recipesView = e(Section, null,
      e("h2", null, "Recipes"),
      (recipes.length === 0)
        ? e("p", null, "No recipes yet.")
        : e("ul", null,
            recipes.map(r => e("li", { key: r.id, style: { padding: "8px 0", borderBottom: "1px solid var(--line)" } },
              e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
                e("div", null,
                  e("div", { style: { fontWeight: 600 } }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name, " ", e("span", { className: "badge" }, "Day ", r.day)),
                  e("div", { style: { fontSize: 12, color: "#64748b" } }, (r.ingredients || []).map(i => (i.name || "") + (i.qty ? " (" + i.qty + ")" : "")).join(", "))
                ),
                e("div", null,
                  e("select", {
                    value: r.day || "",
                    onChange: function (ev) {
                      const v = Number(ev.target.value || "0");
                      setRecipes(prev => prev.map(x => x.id === r.id ? Object.assign({}, x, { day: v || null }) : x));
                    }
                  }, e("option", { value: "" }, "Set day…"), days.map(d => e("option", { key: d.day, value: d.day }, "Day ", d.day, " — ", d.phase))),
                  e("button", {
                    className: "btn",
                    style: { marginLeft: 8 },
                    onClick: function () {
                      if (!confirm("Delete recipe?")) return;
                      const removed = r;
                      setRecipes(prev => prev.filter(x => x.id !== removed.id));
                    }
                  }, "Delete")
                )
              )
            ))
          )
    );

    // ======= Calendar =======
    const calendar = e(Section, null,
      e("h2", null, "Calendar / Agenda"),
      e("ul", null,
        days.map(d => e("li", { key: d.day, style: { padding: "8px 0", borderBottom: "1px solid var(--line)" } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } },
            e("div", null,
              e("div", { style: { fontWeight: 600 } }, "Day ", d.day, " — ", d.phase),
              e("div", {
                style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, minHeight: 24 }
              },
                (function () {
                  const list = recipes.filter(r => r.day === d.day);
                  if (!list.length) return e("span", { style: { fontSize: 12, color: "#64748b" } }, "—");
                  return list.map(r => e("span", { key: r.id, className: "badge" }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name));
                })()
              )
            ),
            e("div", null)
          )
        ))
      )
    );

    // ======= Grocery =========
    const grocery = e(Section, null,
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
        e("div", null,
          e("h2", null, "Groceries & Prices"),
          e("div", { style: { fontSize: 12, color: "#64748b", marginTop: 4 } },
            "Checked $", totals.ck.toFixed(2), " • Remaining $", totals.rest.toFixed(2), " • Total $", totals.all.toFixed(2))
        ),
        e("button", {
          className: "btn",
          onClick: function () {
            setGroceries(aggregateGroceries(recipes));
            vibrate(6);
          }
        }, "Rebuild from recipes")
      ),
      e("ul", null,
        groceries.map((g, idx) => e("li", {
          key: g.id,
          style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }
        },
          e("button", {
            className: "paw " + (g.checked ? "on" : ""),
            onClick: function () {
              setGroceries(prev => prev.map((x, i) => i === idx ? Object.assign({}, x, { checked: !x.checked }) : x));
            }
          }, g.checked ? "🐾" : ""),
          e("div", { style: { flex: 1 } },
            e("div", null, g.name, " ",
              e("span", { className: "badge" },
                (g.days && g.days.length
                  ? ("📅 Day " + (g.days.length > 1 ? (Math.min.apply(null, g.days) + "–" + Math.max.apply(null, g.days)) : g.days[0]))
                  : "📦 Pantry")))
            ,
            e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
          ),
          e("input", {
            type: "number", step: "0.01", placeholder: "$",
            value: (g.estCost == null ? "" : g.estCost),
            onChange: function (ev) {
              setGroceries(prev => prev.map((x, i) => i === idx ? Object.assign({}, x, { estCost: (ev.target.value === "" ? null : Number(ev.target.value)) }) : x));
            }, style: { width: 90 }
          })
        )))
    );

    // ======= Photos =======
    const photosView = e(Section, null,
      e("h2", null, "Progress Photos"),
      e("label", { className: "btn peach", style: { display: "inline-block", marginTop: 8 } }, "Upload Photo",
        e("input", {
          type: "file", accept: "image/*", style: { display: "none" },
          onChange: function (ev) {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const rd = new FileReader();
            rd.onload = function () {
              const id = Math.random().toString(36).slice(2);
              const date = new Date().toLocaleDateString();
              setPhotos(p => [{ id, src: String(rd.result), date }].concat(p));
              alert("Looking strong ✨");
            };
            rd.readAsDataURL(f);
          }
        })
      ),
      e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12, marginTop: 12 } },
        photos.map(p => e("figure", { key: p.id, style: { border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" } },
          e("img", { src: p.src, style: { width: "100%", height: 120, objectFit: "cover" } }),
          e("figcaption", { style: { padding: 6, fontSize: 12 } }, p.date),
          e("button", {
            className: "btn", style: { width: "100%" },
            onClick: function () { setPhotos(prev => prev.filter(x => x.id !== p.id)); }
          }, "Delete")
        ))
    );

    // ======= LMNT Helper (Settings-lite) =======
    function lmntRange() {
      const base = settings.weightLbs >= 200 ? 1.5 : (settings.weightLbs >= 160 ? 1.0 : 0.75);
      const session = settings.sessionMins >= 60 ? 1 : 0.5;
      const mult = settings.sweat === "high" ? 1.25 : (settings.sweat === "low" ? 0.75 : 1.0);
      const boost = (settings.workoutDays * session * mult) / 7;
      const lo = Math.max(0.5, (base + boost) - 0.5).toFixed(1);
      const hi = Math.min(3, (base + boost) + 0.5).toFixed(1);
      return lo + "–" + hi + " pkt/day";
    }
    function inputRow(label, type, value, onChange) {
      return e("div", null,
        e("div", { style: { fontSize: 12, marginBottom: 4 } }, label),
        e("input", { type, value: (value == null ? "" : value), onChange: (ev) => onChange(ev.target.value), className: (type === "number" ? "no-zoom" : ""), style: { width: "100%", padding: 8, border: "1px solid var(--line)", borderRadius: 12 } })
      );
    }

    const coach = e(Section, null,
      e("h2", null, "LMNT Helper"),
      e("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 } },
        inputRow("Weight (lb)", "number", settings.weightLbs, v => setSettings(Object.assign({}, settings, { weightLbs: Number(v || 0) }))),
        inputRow("Workout days / wk", "number", settings.workoutDays, v => setSettings(Object.assign({}, settings, { workoutDays: Number(v || 0) }))),
        inputRow("Session length (min)", "number", settings.sessionMins, v => setSettings(Object.assign({}, settings, { sessionMins: Number(v || 0) }))),
        e("div", null,
          e("div", { style: { fontSize: 12, marginBottom: 4 } }, "Sweat level"),
          e("select", { value: settings.sweat, onChange: ev => setSettings(Object.assign({}, settings, { sweat: ev.target.value })) },
            e("option", { value: "low" }, "Low"),
            e("option", { value: "moderate" }, "Moderate"),
            e("option", { value: "high" }, "High")
          )
        )
      ),
      e("p", { style: { marginTop: 8 } }, "Recommended: ", lmntRange())
    );

    // ======= Settings =======
    function inputURL(value, onChange) {
      return e("input", { type: "url", value: (value || ""), onChange: ev => onChange(ev.target.value), placeholder: "https://…", style: { width: "100%", padding: 8, border: "1px solid var(--line)", borderRadius: 12 } });
    }
    const settingsView = e(Section, null,
      e("h2", null, "Settings"),
      e("div", null, e("div", { style: { fontSize: 12, marginBottom: 4 } }, "Start date"),
        e("input", { type: "date", value: settings.startDate || "", onChange: ev => setSettings(Object.assign({}, settings, { startDate: (ev.target.value || null) })), style: { padding: 8, border: "1px solid var(--line)", borderRadius: 12 } })),
      e("div", { style: { marginTop: 8 } }, e("div", { style: { fontSize: 12, marginBottom: 4 } }, "Header/Oz photo URL"), inputURL(settings.headerImg || "", v => setSettings(Object.assign({}, settings, { headerImg: v })))),
      e("div", { style: { marginTop: 12 } },
        e("div", { style: { fontWeight: 600, marginBottom: 4 } }, "Phase goal categories"),
        ["Water Fast", "Juice Cleanse", "Rebuild"].map(ph => e("div", { key: ph, className: "card", style: { padding: 8, marginBottom: 8 } },
          e("div", { style: { marginBottom: 6 } }, ph),
          e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            Object.keys(GOALS).map(k => {
              const checked = (settings.phaseGoals[ph] || []).indexOf(k) >= 0;
              return e("label", { key: k, className: "badge" },
                e("input", {
                  type: "checkbox", checked,
                  onChange: ev => {
                    const set = new Set(settings.phaseGoals[ph] || []);
                    if (ev.target.checked) set.add(k); else set.delete(k);
                    const pg = Object.assign({}, settings.phaseGoals); pg[ph] = Array.from(set);
                    setSettings(Object.assign({}, settings, { phaseGoals: pg }));
                  }
                }),
                " ", GOALS[k].label
              );
            })
          )
        )))
    );

    // ======= Render =======
    return e("div", null,
      // affirmation toast
      e("div", { className: "toast", onClick: function () { if (navigator.clipboard) navigator.clipboard.writeText(aff); alert("Affirmation copied ✨"); } },
        e("div", null, "✨ ", aff)
      ),
      head,
      (tab === "dashboard") && dash,
      (tab === "daily") && daily,
      (tab === "grocery") && grocery,
      (tab === "calendar") && calendar,
      (tab === "recipes") && recipesView,
      (tab === "photos") && photosView,
      (tab === "coach") && coach,
      (tab === "settings") && settingsView,

      // Floating emoji dock
      e("nav", { className: "tabs" },
        [
          { id: "dashboard", icon: "🏠" },
          { id: "grocery",   icon: "🛒" },
          { id: "calendar",  icon: "📅" },
          { id: "photos",    icon: "📷" },
          { id: "settings",  icon: "⚙️" }
        ].map(function (t) {
          return e("button", {
            key: t.id,
            className: "btn" + (tab === t.id ? " active" : ""),
            onClick: function () { setTab(t.id); },
            "aria-label": t.id
          }, t.icon);
        })
      )
    ); // <-- closes: return e("div", null, ...)

  } // <-- closes: function App()

  // Mount
  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
