/* app.js — Oz Companion (Unified, stable, streamlined)
   - Splash: random affirmation, fade out; shows under the Oz image (CSS)
   - Header: Oz avatar + title + centered day selector in one line
   - Paw-print checklist, customizable via Settings
   - Smart Coach: compact header-as-button + hint; rich tips + mood logic
   - Calendar: shows 1 of each juice (Days 4–7); meals (Days 8–11)
   - Groceries: cleanse juice ingredients multiplied ×4 per day
   - Photos: uploader + randomized affirmations; stored in localStorage
   - Settings: start date, import default 11-day, import from ChatGPT (text/JSON), goals editor
   - Weight chart: Chart.js line; weight input avoids mobile zoom (inputmode)
   - Next-2-days ingredients preview
*/

(function () {
  "use strict";

  /* ---------- Splash: set random affirmation + safe fade ---------- */
  (function initSplash() {
    var LINES = [
      "You’ve got this!","Small habits, big change","Progress, not perfection",
      "Sip, breathe, reset","Strong body, calm mind","Hydration is happiness 🐾",
      "Future-you says thanks","Gentle + consistent + kind","Shine time ✨",
      "Keep it playful","You’re doing the work 💪","One choice at a time"
    ];
    var b = document.getElementById("ozBubble");
    if (b) b.textContent = LINES[Math.floor(Math.random() * LINES.length)];
    // failsafe fade (also in CSS/HTML timeout); this ensures no hanging
    window.addEventListener("load", function () {
      setTimeout(function () {
        var s = document.getElementById("ozSplash");
        var bb = document.getElementById("ozBubble");
        if (s) s.classList.add("fadeOut");
        if (bb) bb.classList.add("fadeOut");
        setTimeout(function () {
          if (s) s.style.display = "none";
          if (bb) bb.style.display = "none";
        }, 650);
      }, 1100);
    });
    // global error banner
    window.addEventListener("error", function (e) {
      var el = document.getElementById("errorBanner");
      if (!el) return;
      var msg = e.error && e.error.message ? e.error.message : e.message;
      el.textContent = "Error: " + msg;
      el.style.display = "block";
      var s = document.getElementById("ozSplash");
      var bb = document.getElementById("ozBubble");
      if (s) s.style.display = "none";
      if (bb) bb.style.display = "none";
    });
  })();

  /* ---------- React helpers ---------- */
  var e = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;

  function useLocal(key, initialValue) {
    var pair = useState(function () {
      try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
      catch { return initialValue; }
    });
    var val = pair[0], setVal = pair[1];
    useEffect(function () {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }, [key, val]);
    return [val, setVal];
  }

  /* ---------- Canonical 11-day plan ---------- */
  function defaultDays11() {
    var phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    return phases.map(function (ph, i) {
      return { day: i + 1, phase: ph, checks: {}, note: "", weight: null, photos: [] };
    });
  }

  // Shows one of each juice in Calendar (days 4–7). Groceries multiply ×4.
  var PLAN_RECIPES = [
    // Cleanse juices — 1 each shown in calendar; groceries ×4 handled later
    { id:"j-melon",  name:"Melon Mint Morning",  type:"juice", day:4, servings:1,
      ingredients:[{key:"melon",name:"Melon",qty:"1 each"},{key:"mint",name:"Mint",qty:"0.5 cup"},{key:"lime",name:"Lime",qty:"1 each"}] },
    { id:"j-peach",  name:"Peachy Green Glow",   type:"juice", day:5, servings:1,
      ingredients:[{key:"peach",name:"Peaches",qty:"3 each"},{key:"cucumber",name:"Cucumbers",qty:"2 each"},{key:"spinach",name:"Spinach",qty:"4 cup"},{key:"lemon",name:"Lemons",qty:"1 each"}] },
    { id:"j-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:1,
      ingredients:[{key:"carrot",name:"Carrots",qty:"14 each"},{key:"apple",name:"Apples",qty:"2 each"},{key:"ginger",name:"Ginger",qty:'1 inch'},{key:"lemon",name:"Lemons",qty:"1 each"}] },
    { id:"j-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:1,
      ingredients:[{key:"grapes",name:"Grapes",qty:"3 cup"},{key:"romaine",name:"Romaine",qty:"3 cup"},{key:"cucumber",name:"Cucumbers",qty:"2 each"},{key:"lemon",name:"Lemons",qty:"1 each"}] },

    // Rebuild meals
    { id:"m-smoothie", name:"Smoothie Breakfast", type:"meal", day:8,
      ingredients:[{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}] },
    { id:"m-lentil", name:"Lentil Soup", type:"meal", day:8,
      ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"0.5 cup"},{key:"carrots",name:"Carrots",qty:"0.5 cup"},{key:"celery",name:"Celery",qty:"0.5 cup"},{key:"parsley",name:"Parsley",qty:"0.25 cup"},{key:"onion",name:"Onion",qty:"0.25 each"}] },
    { id:"m-broth", name:"Simple Veg Broth", type:"meal", day:9,
      ingredients:[{key:"carrots",name:"Carrots",qty:"2 each"},{key:"celery",name:"Celery",qty:"2 stalk"},{key:"onion",name:"Onion",qty:"0.5 each"},{key:"parsley",name:"Parsley",qty:"few sprigs"}] },
    { id:"m-sweet", name:"Baked Sweet Potato Bowl", type:"meal", day:9,
      ingredients:[{key:"sweet-potato",name:"Sweet potatoes",qty:"2 each"},{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}] },
    { id:"m-oats", name:"Overnight Oats", type:"meal", day:10,
      ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"0.5 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"}] },
    { id:"m-quinoa", name:"Quinoa Salad", type:"meal", day:10,
      ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"0.5 cup"},{key:"cucumber",name:"Cucumber",qty:"1 each"},{key:"tomato",name:"Tomato",qty:"1 each"},{key:"parsley",name:"Parsley",qty:"0.25 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemon",name:"Lemon",qty:"1 each"}] },
    { id:"m-protein", name:"Protein + Broccoli", type:"meal", day:11,
      ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 head"}] }
  ];

  /* ---------- Groceries: multiply juice×4 per cleanse day ---------- */
  function aggregateGroceries(recipes) {
    var byId = {};
    function parseQty(s) {
      var m = String(s || "").match(/^(\d+(\.\d+)?)(.*)$/);
      return m ? { n: parseFloat(m[1]), u: (m[3] || "").trim() } : { n: 1, u: "" };
    }
    function add(key, name, qty, day, mult) {
      var q = parseQty(qty);
      if (!byId[key]) byId[key] = { id: key, name: name, n: 0, u: q.u, days: new Set(), checked: false, estCost: null };
      byId[key].n += q.n * (mult || 1);
      if (day) byId[key].days.add(day);
    }
    recipes.forEach(function (r) {
      var mult = r.type === "juice" ? 4 : 1;
      (r.ingredients || []).forEach(function (it) {
        var key = (it.key || it.name || "").toLowerCase().replace(/\s+/g, "-");
        add(key, it.name, it.qty, r.day, mult);
      });
    });
    return Object.values(byId).map(function (x) {
      var qty = (x.u ? ((Number.isInteger(x.n) ? x.n : (+x.n).toFixed(2)) + " " + x.u) : String(+x.n));
      return { id: x.id, name: x.name, qty: qty, checked: x.checked, estCost: x.estCost, days: Array.from(x.days).sort(function (a, b) { return a - b; }) };
    }).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
  }

  /* ---------- Checklist goals (editable) ---------- */
  var DEFAULT_GOALS = {
    water: "💧 Water 120–150 oz",
    lmnt: "🧂 LMNT / Electrolytes",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    exercise: "🏃 Exercise",
    juice: "🧃 Juices",
    wholefood: "🥗 Whole-food meal",
    weight: "👣 Weight check-in"
  };

  var PHASE_TEMPLATES = {
    fast:   ["water","tea","coffee","lmnt","exercise","weight"],
    cleanse:["water","tea","coffee","juice","lmnt","exercise","weight"],
    rebuild:["water","lmnt","exercise","wholefood","weight"]
  };

  /* ---------- Small atoms ---------- */
  function ProgressBar(props) {
    var v = Math.max(0, Math.min(100, props.value || 0));
    return e("div", { className: "prog" }, e("div", { className: "fill", style: { width: v + "%" } }));
  }
  function Checklist(props) {
    return e("ul", { className: "list" },
      (props.items || []).map(function (it) {
        var on = !!props.state[it.id];
        return e("li", { key: it.id, className: "item" },
          e("button", {
            className: "paw" + (on ? " on" : ""),
            onClick: function () { props.onToggle(it.id); },
            "aria-pressed": on
          }, on ? "🐾" : ""),
          e("label", null, it.label)
        );
      })
    );
  }
  function WeightChart(props) {
    var canvasRef = useRef(null);
    var chartRef = useRef(null);
    useEffect(function () {
      var ctx = canvasRef.current ? canvasRef.current.getContext("2d") : null;
      if (!ctx) return;
      if (chartRef.current) { try { chartRef.current.destroy(); } catch {} }
      var labels = (props.series || []).map(function (_, i) { return "Day " + (i + 1); });
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            data: props.series,
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
            x: { display: true, ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.25)" } },
            y: { display: true, ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148,163,184,.18)" } }
          },
          animation: { duration: 220 }
        }
      });
      return function () { try { chartRef.current && chartRef.current.destroy(); } catch {} };
    }, [props.series]);
    return e("div", { style: { height: 180 } }, e("canvas", { ref: canvasRef }));
  }

  /* ---------- Coach intelligence ---------- */
  var COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "One step at a time — you’re doing amazing.","Consistency beats intensity.","Your glow is coming."
  ];
  var SYM_MATCHERS = [
    { id:"headache", rx:/\b(headache|migraine|head pain)\b/i, tips:["12–16 oz water now + a pinch of salt / LMNT.","Dim screens 10 minutes.","Gentle neck/temple massage."] },
    { id:"dizziness", rx:/\b(dizzy|light[-\s]?headed|vertigo)\b/i, tips:["Sit until steady.","Small juice or electrolytes if fasting.","Breathe in 4 / out 6 for 1 minute."] },
    { id:"nausea", rx:/\b(nausea|queasy|sick to (my|the) stomach)\b/i, tips:["Cool water or peppermint/ginger tea.","Fresh air for 3 minutes.","Slow movements; avoid sudden changes."] },
    { id:"fatigue", rx:/\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i, tips:["15–20 min rest.","Hydrate + electrolytes.","2 minutes of gentle stretching / walk."] },
    { id:"hunger",  rx:/\b(hungry|starv(ed|ing)|crav(ing|es))\b/i, tips:["Drink water first.","Have your scheduled juice slowly.","5-min walk reset."] },
    { id:"anxiety", rx:/\b(anxious|anxiety|panicky|overwhelm(ed)?)\b/i, tips:["Box breathing 4-4-4-4 for 2 min.","Grounding: 5-4-3-2-1 senses.","Write a one-line intention."] },
    { id:"bloating", rx:/\b(bloat(ed|ing)|gassy|gas)\b/i, tips:["Smaller sips; slow intake.","10–15 min easy walk.","Peppermint tea."] }
  ];
  function inferMood(text) {
    var score = 6; var t = String(text || "").toLowerCase();
    var negRx = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/];
    var posRx = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/];
    var neg = negRx.reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    var pos = posRx.reduce(function (n, rx) { return n + (rx.test(t) ? 1 : 0); }, 0);
    score += pos - 2 * neg;
    return Math.max(1, Math.min(10, score));
  }

  /* ---------- Pages ---------- */
  function Dashboard(props) {
    var days = props.days, setDays = props.setDays, recipes = props.recipes, goals = props.goals;
    var idxState = useState(0); var idx = idxState[0], setIdx = idxState[1];
    var day = days[idx] || days[0] || { day: 1, phase: "fast", checks: {}, note: "", weight: null, photos: [] };

    // checklist
    var templateIds = PHASE_TEMPLATES[day.phase] || [];
    var items = templateIds.map(function (id) { return ({ id: id, label: goals[id] || id }); });
    var checks = day.checks || {};
    var done = items.reduce(function (a, it) { return a + (checks[it.id] ? 1 : 0); }, 0);
    var total = Math.max(1, items.length);
    var progress = (done / total) * 100;

    useEffect(function () {
      if (Math.round(progress) === 100) {
        try { if (window.confetti) window.confetti({ particleCount: 160, spread: 80, origin: { y: .6 } }); } catch {}
        try { if (window.confetti) setTimeout(function(){ window.confetti({ particleCount: 160, spread: 100, origin: { y: .6 } }); }, 200); } catch {}
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

    // coach
    var coachTextState = useState(""); var coachText = coachTextState[0], setCoachText = coachTextState[1];
    function runCoach() {
      var text = String(day.note || "").trim();
      if (!text) { setCoachText("Write a quick note, then tap Smart Coach."); return; }
      var found = new Set(SYM_MATCHERS.filter(function (m) { return m.rx.test(text); }).map(function (m) { return m.id; }));
      var mood = inferMood(text);
      var tips = SYM_MATCHERS.filter(function (m) { return found.has(m.id); }).flatMap(function (m) { return m.tips; }).slice(0, 8);
      var moodBoost = (mood <= 3)
        ? ["You’re not alone — let’s make today gentle.", "Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : (mood <= 6)
          ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
          : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];
      var header = found.size ? ("I noticed: " + Array.from(found).join(", ") + ".") : "No specific symptoms spotted — here’s a steady plan.";
      var body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(header + "\n\n" + body + "\n\n" + moodBoost.join(" "));
    }

    // next 2-day ingredients
    function nextTwoDayIngredients(current) {
      function collect(daysPair) {
        var want = new Set(daysPair);
        var bag = {};
        (recipes || []).forEach(function (r) {
          if (!r.day || !want.has(r.day)) return;
          (r.ingredients || []).forEach(function (it) {
            var key = (it.key || it.name || "").toLowerCase();
            if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
            if (it.qty) bag[key].qtyList.push(it.qty + (r.type === "juice" && r.servings ? "" : ""));
            bag[key].days.add(r.day);
          });
        });
        Object.keys(bag).forEach(function (k) { bag[k].days = Array.from(bag[k].days).sort(function (a, b) { return a - b; }); });
        return Object.values(bag).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
      }
      var strict = collect([current.day, current.day + 1]);
      if (strict.length) return { items: strict, label: "Today + Tomorrow — Ingredients" };
      var futureDays = Array.from(new Set((recipes || []).filter(function (r) { return r.day >= current.day; }).map(function (r) { return r.day; }))).sort(function (a, b) { return a - b; });
      var pool = futureDays.slice(0, 2);
      if (pool.length === 0) return { items: [], label: "Upcoming Ingredients" };
      var fb = collect([pool[0], pool[1] || pool[0]]);
      var label = pool.length === 2 ? ("Upcoming Ingredients — Day " + pool[0] + " & " + pool[1]) : ("Upcoming Ingredients — Day " + pool[0]);
      return { items: fb, label: label };
    }
    var nt = nextTwoDayIngredients(day);

    var weightSeries = days.map(function (d) { return d.weight == null ? null : d.weight; });

    // header
    var head = e("div", { className: "mast card" },
      e("div", { className: "mastRow" },
        e("div", { className: "mastLeft" },
          e("img", { src: "oz.png", alt: "Oz" }),
          e("div", null,
            e("div", { className: "mastTitle" }, "Oz Companion"),
            e("div", { className: "mastSubtitle" }, day.phase.toUpperCase())
          )
        ),
        e("div", { className: "day-nav", style: { alignItems: "center" } },
          e("button", { className: "day-btn", onClick: function(){ changeDay(-1); }, "aria-label":"Previous day" }, "◀"),
          e("span", { className: "day-label" }, "Day " + day.day),
          e("button", { className: "day-btn", onClick: function(){ changeDay(1); }, "aria-label":"Next day" }, "▶")
        )
      )
    );

    return e(React.Fragment, null,
      head,
      e(ProgressBar, { value: progress }),

      // checklist
      e("div", { className: "card", style: { marginTop: 12 } },
        e(Checklist, { items: items, state: checks, onToggle: toggleCheck })
      ),

      // Smart Coach + Notes
      e("div", { className: "card", style: { marginTop: 16 } },
        e("div", {
          className: "coachCard", role: "button", tabIndex: 0,
          onClick: runCoach,
          onKeyDown: function (ev) { if (ev.key === "Enter" || ev.key === " ") runCoach(); }
        },
          e("div", { className: "coachHeader" },
            e("div", { className: "coachPill" }, "🧠", e("span", { className: "coachTitle" }, "Smart Coach"))
          ),
          e("div", { className: "coachHint" }, "Tap to analyze your note and get relief + motivation")
        ),
        coachText && e("div", { className: "coachOut" }, coachText),
        e("textarea", {
          className: "noteArea", rows: 4, placeholder: "Notes…",
          value: day.note || "",
          onChange: function (ev) {
            var val = ev.target.value;
            props.setDays(function (prev) {
              var next = prev.slice(); var d = Object.assign({}, next[idx]); d.note = val; next[idx] = d; return next;
            });
          }
        })
      ),

      // Next two days ingredients
      e("div", { className: "card", style: { marginTop: 16 } },
        e("h2", null, nt.label),
        nt.items.length === 0
          ? e("p", { style: { color: "#64748b" } }, "No recipes scheduled soon.")
          : e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
              nt.items.map(function (it, i) {
                var range = it.days.length === 1 ? ("Day " + it.days[0]) : ("Day " + it.days[0] + "–" + it.days[it.days.length - 1]);
                return e("li", { key: i, style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3d0e1" } },
                  e("span", null, it.name, " ", e("span", { className: "badge" }, range)),
                  e("span", { style: { color: "#64748b", fontSize: 12 } }, it.qtyList.join(" + ") || "")
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
            type: "number",
            step: "0.1",
            inputMode: "decimal",
            value: (day.weight == null ? "" : day.weight),
            onChange: function (ev) {
              var v = ev.target.value;
              props.setDays(function (prev) {
                var next = prev.slice();
                var d = Object.assign({}, next[idx]);
                d.weight = (v === "" ? null : Number(v));
                // If weight is part of today's checklist, mark it done
                var ids = PHASE_TEMPLATES[d.phase] || [];
                if (v !== "" && ids.indexOf("weight") !== -1) {
                  var c = Object.assign({}, d.checks || {}); c.weight = true; d.checks = c;
                }
                next[idx] = d; return next;
              });
            },
            style: { width: 120 }
          }),
          e("span", { className: "badge" }, "Day " + day.day)
        ),
        e(WeightChart, { series: weightSeries })
      )
    );
  }

  function GroceryList(props) {
    var groceries = props.groceries, setGroceries = props.setGroceries;
    var totals = useMemo(function () {
      var checked = 0, remaining = 0, total = 0;
      (groceries || []).forEach(function (g) {
        var n = parseFloat(String(g.estCost || 0)) || 0;
        if (g.checked) checked += n; else remaining += n;
        total += n;
      });
      return { checked: checked, remaining: remaining, total: total };
    }, [groceries]);

    function daysBadge(days) {
      if (!days || !days.length) return "📦 Pantry";
      var min = Math.min.apply(null, days), max = Math.max.apply(null, days);
      return "📅 " + (min === max ? ("Day " + min) : ("Day " + min + "–" + max));
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Groceries & Prices"),
      e("div", { className: "card", style: { margin: "8px 0 12px" } },
        e("div", { style: { marginTop: 4, color: "#64748b", fontSize: 13 } },
          "Checked $", totals.checked.toFixed(2),
          " • Remaining $", totals.remaining.toFixed(2),
          " • Total $", totals.total.toFixed(2)
        )
      ),
      e("ul", { style: { listStyle: "none", padding: 0 } },
        (groceries || []).map(function (g, idx) {
          return e("li", {
            key: g.id, style: {
              display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8,
              padding: "10px 0", borderBottom: "1px solid #f3d0e1", alignItems: "center"
            }
          },
            e("button", { className: "paw" + (g.checked ? " on" : ""), onClick: function () {
              setGroceries(function (prev) {
                return prev.map(function (x, i) { return i === idx ? Object.assign({}, x, { checked: !x.checked }) : x; });
              });
            } }, g.checked ? "🐾" : ""),
            e("div", null,
              e("div", null, g.name, " ", e("span", { className: "badge" }, daysBadge(g.days))),
              e("div", { style: { fontSize: 12, color: "#64748b" } }, g.qty || "")
            ),
            e("input", {
              type: "number", step: "0.01", placeholder: "$",
              value: (g.estCost == null ? "" : g.estCost),
              onChange: function (ev) {
                var v = ev.target.value;
                setGroceries(function (prev) {
                  return prev.map(function (x, i) { return i === idx ? Object.assign({}, x, { estCost: (v === "" ? null : Number(v)) }) : x; });
                });
              },
              style: { width: 90 }
            })
          );
        })
      )
    );
  }

  function CalendarView(props) {
    var days = props.days, recipes = props.recipes;
    return e("div", { className: "wrap" },
      e("h1", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
        days.map(function (d) {
          var todays = recipes.filter(function (r) { return r.day === d.day; });
          return e("li", { key: d.day, className: "card", style: { marginBottom: 8 } },
            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
              e("div", null,
                e("div", { style: { fontWeight: 700, fontSize: 18 } }, "Day ", d.day, " — ", d.phase.toUpperCase())
              ),
              e("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", minHeight: 24 } },
                todays.length
                  ? todays.map(function (r) { return e("span", { key: r.id, className: "badge" }, (r.type === "juice" ? "🧃 " : "🍽️ "), r.name); })
                  : e("span", { style: { fontSize: 12, color: "#64748b" } }, "—")
              )
            )
          );
        })
      )
    );
  }

  function PhotosView(props) {
    var days = props.days, setDays = props.setDays;
    var iS = useState(0); var idx = iS[0], setIdx = iS[1];
    var day = days[idx] || days[0];
    var AF = [
      "Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪",
      "Oz is proud of you 🐶","Consistency looks good on you 🌟","Momentum is real 🔥"
    ];
    function handleUpload(ev) {
      var files = Array.from(ev.target.files || []);
      if (!files.length) return;
      var readers = files.map(function (f) { return new Promise(function (res) {
        var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(f);
      }); });
      Promise.all(readers).then(function (urls) {
        setDays(function (prev) {
          var next = prev.slice(); var d = Object.assign({}, next[idx]);
          d.photos = (d.photos || []).concat(urls); next[idx] = d; return next;
        });
        setTimeout(function () { alert(AF[Math.floor(Math.random() * AF.length)]); }, 50);
      });
    }
    return e("div", { className: "wrap" },
      e("h1", null, "Progress Photos"),
      e("div", { className: "card", style: { marginBottom: 12, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" } },
        e("div", null, e("b", null, "Day "), day.day),
        e("div", null,
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return i > 0 ? i - 1 : days.length - 1; }); } }, "◀"),
          e("span", { className: "badge", style: { margin: "0 8px" } }, "Day " + day.day),
          e("button", { className: "btn", onClick: function () { setIdx(function (i) { return i < days.length - 1 ? i + 1 : 0; }); } }, "▶")
        ),
        e("label", { className: "btn peach", style: { cursor: "pointer" } }, "Upload Photo",
          e("input", { type: "file", multiple: true, accept: "image/*", onChange: handleUpload, style: { display: "none" } })
        )
      ),
      e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        (day.photos || []).map(function (url, i) { return e("img", { key: i, src: url, style: { width: 100, height: 100, objectFit: "cover", borderRadius: 8 } }); })
      )
    );
  }

  function SettingsPage(props) {
    var days = props.days, setDays = props.setDays, recipes = props.recipes, setRecipes = props.setRecipes, groceries = props.groceries, setGroceries = props.setGroceries;
    var goals = props.goals, setGoals = props.setGoals, settings = props.settings, setSettings = props.setSettings;
    var startS = useState(settings.startDate || ""); var start = startS[0], setStart = startS[1];
    var rawS = useState(""); var raw = rawS[0], setRaw = rawS[1];

    function applyPlan(newRecipes) {
      setRecipes(newRecipes);
      setDays(defaultDays11());
      setGroceries(aggregateGroceries(newRecipes));
      alert("Plan applied ✔");
    }
    function importDefault() { applyPlan(PLAN_RECIPES); }
    function saveStart() { setSettings(Object.assign({}, settings, { startDate: (start || null) })); alert("Start date saved ✔"); }

    function importFromChatGPT() {
      if (!raw.trim()) { alert("Paste a plan first."); return; }
      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.recipes)) throw new Error("bad");
        applyPlan(parsed.recipes);
      } catch {
        var recs = parseFreeTextPlan(raw);
        applyPlan(recs);
      }
    }

    function parseFreeTextPlan(text) {
      var out = [];
      var lines = String(text).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      var cur = null, curDay = null;
      lines.forEach(function (L) {
        var m;
        if ((m = L.match(/^day\s*(\d+)/i))) { curDay = +m[1]; return; }
        if ((m = L.match(/^(juice|meal)[:\-]?\s*(.+)$/i))) {
          cur = { id: "imp-" + Math.random().toString(36).slice(2), type: m[1].toLowerCase(), name: m[2].trim(), day: curDay, ingredients: [] };
          out.push(cur); return;
        }
        if (/^[•\-*]/.test(L) && cur) {
          var s = L.replace(/^[•\-*]\s*/, "");
          var mm = s.match(/^(\d+(\.\d+)?\s*[a-zA-Z\-]+)?\s*(.+)$/);
          cur.ingredients.push({
            key: (mm && mm[3] || s).toLowerCase().replace(/\s+/g, "-"),
            name: mm && mm[3] || s, qty: (mm && mm[1]) ? mm[1] : ""
          });
        }
      });
      return out;
    }

    function addGoal() {
      var idRaw = prompt("New goal id (e.g., meditation)");
      if (!idRaw) return;
      var id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "");
      if (!id) return alert("Invalid id.");
      if (goals[id]) return alert("Already exists.");
      var label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if (!label) return;
      setGoals(Object.assign({}, goals, (function (o) { o[id] = label; return o; })({})));
    }
    function removeGoal(id) {
      var g = Object.assign({}, goals); delete g[id]; setGoals(g);
    }

    return e("div", { className: "wrap" },
      e("h1", null, "Settings"),
      e("div", { className: "card" },
        e("h2", null, "11-Day Plan"),
        e("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end", marginTop: 8 } },
          e("div", null,
            e("label", null, "Start date"),
            e("input", { type: "date", value: start, onChange: function (ev) { setStart(ev.target.value); } })
          ),
          e("button", { className: "btn", onClick: saveStart }, "Save")
        ),
        e("div", { style: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" } },
          e("button", { className: "btn primary", onClick: importDefault }, "Import Default 11-Day Plan"),
          e("button", { className: "btn", onClick: function () { setRaw(""); } }, "Clear Paste Box")
        ),
        e("label", { style: { display: "block", marginTop: 12 } }, "Import plan from ChatGPT (paste JSON or readable text)"),
        e("textarea", { style: { width: "100%", height: 120 }, value: raw, onChange: function (ev) { setRaw(ev.target.value); } }),
        e("button", { className: "btn", style: { marginTop: 8 }, onClick: importFromChatGPT }, "Import From Paste")
      ),
      e("div", { className: "card", style: { marginTop: 12 } },
        e("h2", null, "Checklist Items"),
        e("p", { style: { color: "#64748b" } }, "Add or remove checklist goals. They appear by phase automatically."),
        e("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8 } },
          e("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
            Object.entries(goals).map(function (pair) {
              var id = pair[0], label = pair[1];
              return e("li", {
                key: id, style: {
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: "1px solid #f3d0e1"
                }
              },
                e("span", null, label, " ", e("code", { style: { fontSize: 12, color: "#64748b" } }, "(", id, ")")),
                e("button", { className: "btn", onClick: function () { removeGoal(id); } }, "Remove")
              );
            })
          ),
          e("button", { className: "btn", onClick: addGoal }, "+ Add Goal")
        )
      )
    );
  }

  /* ---------- App ---------- */
  function App() {
    // state
    var goalsS = useLocal("oz.goals", DEFAULT_GOALS); var goals = goalsS[0], setGoals = goalsS[1];
    var settingsS = useLocal("oz.settings", { startDate: null }); var settings = settingsS[0], setSettings = settingsS[1];
    var daysS = useLocal("oz.days", defaultDays11()); var days = daysS[0], setDays = daysS[1];
    var recipesS = useLocal("oz.recipes", PLAN_RECIPES); var recipes = recipesS[0], setRecipes = recipesS[1];
    var groceriesS = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES)); var groceries = groceriesS[0], setGroceries = groceriesS[1];
    var tabS = useState("dash"); var tab = tabS[0], setTab = tabS[1];

    // views
    var dash = e(Dashboard, { days: days, setDays: setDays, recipes: recipes, goals: goals });
    var grocery = e(GroceryList, { groceries: groceries, setGroceries: setGroceries });
    var calendar = e(CalendarView, { days: days, recipes: recipes, settings: settings });
    var photos = e(PhotosView, { days: days, setDays: setDays });
    var settingsView = e(SettingsPage, {
      days: days, setDays: setDays, recipes: recipes, setRecipes: setRecipes,
      groceries: groceries, setGroceries: setGroceries, goals: goals, setGoals: setGoals,
      settings: settings, setSettings: setSettings
    });

    // tabs bar (emoji)
    var tabs = e("div", { className: "tabs" },
      [
        { id: "dash", icon: "🏠", label: "Dashboard" },
        { id: "grocery", icon: "🛒", label: "Groceries" },
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
    );

    return e("div", null,
      (tab === "dash") && dash,
      (tab === "grocery") && grocery,
      (tab === "calendar") && calendar,
      (tab === "photos") && photos,
      (tab === "settings") && settingsView,
      tabs
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
