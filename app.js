/* Oz Companion — phase-aware checklists, notes/photos tracking, weight auto-check,
   editable phase templates + custom goals, centered splash, and clean UI. */

(function () {
  "use strict";

  const e = React.createElement;
  const { useState, useEffect, useRef } = React;

  /* ---------- Helpers: localStorage state ---------- */
  function useLocal(key, initialValue) {
    const [val, setVal] = useState(() => {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
      catch { return initialValue; }
    });
    useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
    return [val, setVal];
  }

  /* ---------- Default data ---------- */
  const INITIAL_GOALS = {
    water: "💧 Water 120–150 oz",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    juice: "🧃 Juices",
    lmnt: "🧂 Electrolytes",
    exercise: "🏃 Exercise",
    wholefood: "🥗 Whole food meal",
    weight: "👣 Weight check-in"
  };

  const DEFAULT_PHASE_TEMPLATES = {
    fast:    ["water", "tea", "coffee", "lmnt", "exercise", "weight"],
    cleanse: ["water", "tea", "coffee", "juice", "lmnt", "exercise", "weight"],
    rebuild: ["water", "lmnt", "exercise", "wholefood", "weight"]
  };

  function defaultDays() {
    const phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    return phases.map((ph, i) => ({
      day: i + 1,
      phase: ph,
      checks: {},     // per-goal boolean
      note: "",
      weight: null,
      photos: []
    }));
  }

  /* ---------- UI atoms ---------- */
  const ProgressBar = ({ value }) =>
    e("div", { className:"prog" },
      e("div", { className:"fill", style:{ width: Math.max(0, Math.min(100, value))+"%" } })
    );

  const Checklist = ({ items, state, onToggle }) =>
    e("ul", { className:"list" },
      items.map(it =>
        e("li", { key: it.id, className:"item" },
          e("button", { className:"paw"+(state[it.id]?" on":""), onClick:()=>onToggle(it.id), "aria-pressed":!!state[it.id] }, state[it.id]?"🐾":""),
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
            tension: .35,
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
          animation: { duration: 250 }
        }
      });

      return () => { try { chartRef.current && chartRef.current.destroy(); } catch {} };
    }, [series]);

    return e("div", { style:{ height: 180 } }, e("canvas", { ref: canvasRef }));
  };

  /* ---------- Smart coach ---------- */
  const COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "One step at a time — you’re doing amazing.","Keep going, your future self will thank you.",
    "Tiny wins add up.","Consistency beats intensity.","Strong body, kind mind."
  ];

  const COACH_RULES = [
    { id:"headache", test:ctx=>ctx.syms.has("headache"), tips:["Sip 8–12 oz water over 15 minutes.","Add sea salt/electrolyte.","Dim screens and rest 5–10 min."] },
    { id:"dizziness", test:ctx=>ctx.syms.has("dizziness"), tips:["Sit or lie until steady.","Small juice or pinch of salt if fasting.","Breathe 4 in / 6 out."] },
    { id:"nausea", test:ctx=>ctx.syms.has("nausea"), tips:["Cool water or peppermint/ginger tea.","Fresh air.","Move slowly; avoid sudden changes."] },
    { id:"fatigue", test:ctx=>ctx.syms.has("fatigue"), tips:["Rest 15–20 min.","Hydrate or electrolytes.","2 minutes of gentle stretching."] },
    { id:"hunger", test:ctx=>ctx.syms.has("hunger"), tips:["Drink water first.","Have scheduled juice slowly.","5-min walk as a reset."] }
  ];

  function inferMood(text) {
    let score = 6; const t = (text || "").toLowerCase();
    const neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/]
      .reduce((n, rx) => n + (rx.test(t) ? 1 : 0), 0);
    const pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/]
      .reduce((n, rx) => n + (rx.test(t) ? 1 : 0), 0);
    score += pos - 2 * neg; return Math.max(1, Math.min(10, score));
  }

  /* ---------- Pages ---------- */
  const Dashboard = ({ templates, days, setDays, goals }) => {
    const [idx, setIdx] = useState(0);
    const day = days[idx] || days[0];

    // Phase-aware checklist (only goals for current phase)
    const templateIds = templates[day.phase] || [];
    const items = templateIds.map(id => ({ id, label: goals[id] || id }));

    const checks = day.checks || {};
    const doneCount = items.reduce((a, it) => a + (checks[it.id] ? 1 : 0), 0);
    const totalCount = Math.max(1, items.length);
    const progress = (doneCount / totalCount) * 100;

    const weightSeries = days.map(d => (d.weight == null ? null : d.weight));

    useEffect(() => {
      if (Math.round(progress) === 100) {
        try {
          // fun confetti burst (if available)
          if (window.confetti) window.confetti({ particleCount: 160, spread: 80, origin: { y: .6 } });
        } catch {}
      }
    }, [progress]);

    function toggleCheck(id) {
      setDays(prev => {
        const next = prev.slice();
        const d = { ...next[idx] };
        const c = { ...(d.checks || {}) };
        c[id] = !c[id];
        d.checks = c;
        next[idx] = d;
        return next;
      });
    }
    function changeDay(dir) {
      setIdx(cur => {
        let n = cur + dir;
        if (n < 0) n = days.length - 1;
        if (n >= days.length) n = 0;
        return n;
      });
    }

    // Smart coach
    const [coachText, setCoachText] = useState("");
    function runCoach() {
      const text = (day.note || "").trim();
      if (!text) { setCoachText("Write a quick note below, then tap Smart Coach."); return; }
      const SYM_MATCHERS = [
        { id: "headache", rx: /\b(headache|migraine|head pain)\b/i },
        { id: "dizziness", rx: /\b(dizzy|light[-\s]?headed|vertigo)\b/i },
        { id: "nausea", rx: /\b(nausea|queasy|sick to (my|the) stomach)\b/i },
        { id: "fatigue", rx: /\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i },
        { id: "hunger", rx: /\b(hungry|starv(ed|ing)|crav(ing|es))\b/i }
      ];
      const found = new Set(SYM_MATCHERS.filter(m => m.rx.test(text)).map(m => m.id));
      const mood = inferMood(text);
      const hits = COACH_RULES.filter(r => { try { return r.test({ syms: found, phase: day.phase }); } catch { return false; } });
      const tips = hits.flatMap(h => h.tips).slice(0, 8);
      const moodBoost = (mood <= 3)
        ? ["You’re not alone — go gentle today.", "Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
        : (mood <= 6)
          ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)]]
          : [COACH_AFFIRM[Math.floor(Math.random() * COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];

      const header = found.size ? `I noticed: ${Array.from(found).join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
      const body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(`${header}\n\n${body}\n\n${moodBoost.join(" ")}`);
    }

    // Day tools: selector + photos uploader in one box
    function handleUpload(ev) {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      const readers = files.map(f => new Promise(res => {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
      }));
      Promise.all(readers).then(urls => {
        setDays(prev => {
          const next = prev.slice();
          const d = { ...next[idx] };
          d.photos = (d.photos || []).concat(urls);
          next[idx] = d;
          return next;
        });
        alert(["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Consistency looks good on you 🌟"][Math.floor(Math.random()*4)]);
      });
    }

    return e(React.Fragment, null,
      // Masthead
      e("div", { className:"mast card" },
        e("div", { className:"mastRow" },
          e("div", { className:"mastLeft" },
            e("img", { src:"oz.png", alt:"Oz" }),
            e("div", { className:"mastTitle" },
              e("b", null, "Oz Companion"),
              e("small", null, day.phase.toUpperCase())
            )
          ),
          e("div", { className:"day-nav", style:{ alignItems:"center" } },
            e("button", { className:"day-btn", onClick:()=>changeDay(-1), "aria-label":"Previous day" }, "◀"),
            e("span", { className:"day-label" }, "Day "+day.day),
            e("button", { className:"day-btn", onClick:()=>changeDay(1), "aria-label":"Next day" }, "▶")
          )
        )
      ),

      e(ProgressBar, { value: progress }),

      // Day tools (selector + upload)
      e("div", { className:"card", style:{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" } },
        e("div", null, e("b", null, "Today: Day ", day.day, " — ", day.phase.toUpperCase())),
        e("label", { className:"btn", style:{ borderRadius:12, cursor:"pointer" } }, "Upload Photo",
          e("input", { type:"file", accept:"image/*", multiple:true, onChange:handleUpload, style:{ display:"none" } })
        )
      ),

      // Checklist (phase-specific)
      e("div", { className:"card", style:{ marginTop:12 } },
        e(Checklist, { items, state:checks, onToggle:toggleCheck })
      ),

      // Notes + Coach
      e("div", { className:"card", style:{ marginTop:16 } },
        e("div", {
          className:"coachCard", role:"button", tabIndex:0,
          onClick:runCoach, onKeyDown:(ev)=>{ if(ev.key==="Enter"||ev.key===" ") runCoach(); }
        },
          e("div", { className:"coachHeader" },
            e("div", { className:"coachPill" }, "🧠", e("span", { className:"coachTitle" }, "Smart Coach"))
          ),
          e("div", { className:"coachHint" }, "Tap to analyze your note and get relief + motivation")
        ),
        coachText && e("div", { className:"coachOut" }, coachText),
        e("textarea", {
          value: day.note || "",
          onChange:(ev)=>{
            const val = ev.target.value;
            setDays(prev=>{
              const next = prev.slice();
              const d = {...next[idx]}; d.note = val; next[idx] = d; return next;
            });
          },
          rows:4, className:"noteArea", style:{ marginTop:10 }
        })
      ),

      // Weight
      e("div", { className:"card", style:{ marginTop:16 } },
        e("h2", null, "Weight"),
        e("div", { style:{ display:"flex", alignItems:"center", gap:8, margin:"8px 0" } },
          e("label", null, "Today’s weight"),
          e("input", {
            type:"number", step:"0.1",
            value: (day.weight==null ? "" : day.weight),
            onChange:(ev)=>{
              const v = ev.target.value;
              setDays(prev=>{
                const next = prev.slice();
                const d = {...next[idx]};
                d.weight = (v==="" ? null : Number(v));
                // auto-check weight when value entered
                const c = { ...(d.checks || {}) };
                if (v !== "") c.weight = true;
                d.checks = c;
                next[idx] = d;
                return next;
              });
            },
            style:{ width:120 }
          }),
          e("span", { className:"badge" }, "Day "+day.day)
        ),
        e(WeightChart, { series: weightSeries })
      )
    );
  };

  const Calendar = ({ days }) => {
    return e("div", { className:"wrap" },
      e("h1", null, "Calendar"),
      e("ul", { style:{ listStyle:"none", padding:0 } },
        days.map(d =>
          e("li", { key:d.day, className:"calRow" },
            e("div", null,
              e("div", { style:{ fontWeight:600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
              e("div", { style:{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6, minHeight:24 } },
                (d.note && d.note.trim().length>0) && e("span", { className:"badge" }, "📝 Note"),
                (d.photos && d.photos.length>0) && e("span", { className:"badge" }, "📸 Photos")
              )
            ),
            e("div", null, e("span", { className:"badge" }, "Checklist: ", Object.values(d.checks||{}).filter(Boolean).length))
          )
        )
      )
    );
  };

  const Photos = ({ days, setDays }) => {
    const [idx, setIdx] = useState(0);
    const day = days[idx] || days[0];

    function handleUpload(ev) {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      const readers = files.map(f => new Promise(res => {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
      }));
      Promise.all(readers).then(urls => {
        setDays(prev => {
          const next = prev.slice();
          const d = { ...next[idx] };
          d.photos = (d.photos || []).concat(urls);
          next[idx] = d;
          return next;
        });
        alert(["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶"][Math.floor(Math.random()*4)]);
      });
    }

    return e("div", { className:"wrap" },
      e("h1", null, "Progress Photos"),
      e("div", { className:"card", style:{ marginBottom:12, display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" } },
        e("div", null,
          e("button", { className:"btn", onClick:()=>setIdx(i => (i>0? i-1 : days.length-1)) }, "◀"),
          e("span", { className:"badge", style:{ margin:"0 8px" } }, "Day "+day.day),
          e("button", { className:"btn", onClick:()=>setIdx(i => (i<days.length-1? i+1 : 0)) }, "▶")
        ),
        e("label", { className:"btn", style:{ borderRadius:12, cursor:"pointer" } }, "Upload Photo",
          e("input", { type:"file", multiple:true, accept:"image/*", onChange:handleUpload, style:{ display:"none" } })
        )
      ),
      e("div", { className:"photoGrid" },
        (day.photos||[]).map((url,i)=> e("img",{ key:i, src:url }))
      )
    );
  };

  const Settings = ({ templates, setTemplates, goals, setGoals }) => {
    const [showModal, setShowModal] = useState(false);
    const [phase, setPhase] = useState("fast");
    const [checked, setChecked] = useState({});

    useEffect(() => {
      // ensure current modal picks up template
      const sel = new Set(templates[phase] || []);
      const initial = Object.keys(goals).reduce((m, id) => (m[id] = sel.has(id), m), {});
      setChecked(initial);
    }, [phase, templates, goals]);

    function openModal(ph){ setPhase(ph); setShowModal(true); }
    function saveModal(){
      const nextIds = Object.keys(checked).filter(id => checked[id]);
      const next = Object.assign({}, templates); next[phase] = nextIds;
      setTemplates(next); setShowModal(false);
    }
    function toggleGoal(id){ setChecked(prev => Object.assign({}, prev, { [id]: !prev[id] })); }
    function createGoal(){
      const idRaw = prompt("New goal ID (letters, dashes). Example: meditation");
      if(!idRaw) return;
      const id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,'');
      if(!id) return alert("Invalid ID.");
      if(goals[id]) return alert("That ID already exists.");
      const label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if(!label) return;
      setGoals(Object.assign({}, goals, { [id]:label }));
      setChecked(prev => Object.assign({}, prev, { [id]: true }));
    }

    return e("div", { className:"wrap" },
      e("h1", null, "Settings"),
      e("div", { className:"card" },
        e("h2", null, "Phase Templates"),
        e("p", { style:{ color:"#64748b", margin:"6px 0 12px" } }, "Choose which checklist items appear by default in each phase. Add your own with “+ New Goal”."),
        ["fast","cleanse","rebuild"].map(ph =>
          e("div", { key:ph, style:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 } },
            e("div", null,
              e("b", null, ph.toUpperCase()), " — ",
              (templates[ph]||[]).map(id => e("span", { key:id, className:"badge", style:{ marginRight:6 } }, goals[id]||id))
            ),
            e("div", null,
              e("button", { className:"btn", onClick:()=>openModal(ph) }, "Edit"),
              e("button", { className:"btn", style:{ marginLeft:8 }, onClick:createGoal }, "+ New Goal")
            )
          )
        )
      ),

      // Modal
      e("div", { className:"modal"+(showModal?" show":""), onClick:(ev)=>{ if(ev.target.classList.contains("modal")) setShowModal(false); } },
        e("div", { className:"sheet" },
          e("h2", null, "Edit ", phase.toUpperCase()),
          e("div", { style:{ maxHeight:"48vh", overflow:"auto", margin:"8px 0 12px" } },
            Object.keys(goals).map(id =>
              e("label", { key:id, style:{ display:"flex", alignItems:"center", gap:8, padding:"8px 6px", borderBottom:"1px solid var(--line)" } },
                e("input", { type:"checkbox", checked:!!checked[id], onChange:()=>toggleGoal(id) }),
                e("span", null, goals[id])
              )
            )
          ),
          e("div", { style:{ display:"flex", gap:8, justifyContent:"flex-end" } },
            e("button", { className:"btn", onClick:()=>setShowModal(false) }, "Cancel"),
            e("button", { className:"btn", onClick:createGoal }, "+ New Goal"),
            e("button", { className:"btn", style:{ background:"#111827", color:"#fff", borderColor:"#111827" }, onClick:saveModal }, "Save")
          )
        )
      )
    );
  };

  /* ---------- App ---------- */
  function App(){
    const [goals, setGoals] = useLocal("oz.goals", INITIAL_GOALS);
    const [templates, setTemplates] = useLocal("oz.templates", DEFAULT_PHASE_TEMPLATES);
    const [days, setDays] = useLocal("oz.days", defaultDays());
    const [tab, setTab] = useState("dash");

    return e("div", null,
      (tab==="dash") && e(Dashboard, { templates, days, setDays, goals }),
      (tab==="calendar") && e(Calendar, { days }),
      (tab==="photos") && e(Photos, { days, setDays }),
      (tab==="settings") && e(Settings, { templates, setTemplates, goals, setGoals }),

      // Tabs (emoji dock)
      e("div", { className:"tabs" },
        e("button", { className:"btn"+(tab==="dash"?" active":""), onClick:()=>setTab("dash"), "aria-label":"Dashboard" }, "🏠"),
        e("button", { className:"btn"+(tab==="calendar"?" active":""), onClick:()=>setTab("calendar"), "aria-label":"Calendar" }, "📅"),
        e("button", { className:"btn"+(tab==="photos"?" active":""), onClick:()=>setTab("photos"), "aria-label":"Photos" }, "📷"),
        e("button", { className:"btn"+(tab==="settings"?" active":""), onClick:()=>setTab("settings"), "aria-label":"Settings" }, "⚙️")
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
