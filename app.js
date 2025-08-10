/* app.js — streamlined phase (auto from calendar), Smart Coach header as button,
   centered bottom menu. Works with your existing index.html + style.css. */

"use strict";

/* ===== React helpers ===== */
const e = React.createElement;
const { useState, useEffect, useRef } = React;

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

/* ===== default plan/days ===== */
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
  fast:    ["water","tea","coffee","lmnt","exercise","weight"],
  cleanse: ["water","tea","coffee","juice","lmnt","exercise","weight"],
  rebuild: ["water","lmnt","exercise","wholefood","weight"],
};

function defaultDays() {
  const phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
  return phases.map((ph, i) => ({
    day: i + 1,
    phase: ph,           // <- phase is defined here and is the single source of truth
    checks: {},
    note: "",
    weight: null,
    photos: []
  }));
}

/* A minimal recipe list (keeps groceries + calendar working) */
const PLAN_RECIPES = [
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
];

/* ===== Grocery aggregation ===== */
function aggregateGroceries(recipes){
  const factor = (r) => (r.type === "juice" ? (r.servings || 4) : 1);
  const measure = (s) => {
    if(!s) return { n:1, u:"" };
    const m = String(s).match(/^(\d+(\.\d+)?)\s*(.*)$/);
    return m ? { n:parseFloat(m[1]), u:(m[3]||"").trim() } : { n:1, u:String(s) };
  };
  const fmt = (n,u)=> u ? (Number.isInteger(n)? n : (+n).toFixed(2))+" "+u : String(n);

  const map = {};
  (recipes||[]).forEach(r=>{
    const mult = factor(r);
    (r.ingredients||[]).forEach(it=>{
      const id = (it.key||it.name||"").toLowerCase().replace(/\s+/g,"-");
      const q  = measure(it.qty||"1");
      const scaled = { n:q.n*mult, u:q.u };
      if(!map[id]){
        map[id] = { id, name:it.name, qtyNum:scaled.n, qtyUnit:scaled.u, checked:false, days:r.day?[r.day]:[] };
      }else{
        map[id].qtyNum += scaled.n;
        const s=new Set(map[id].days||[]); if(r.day) s.add(r.day); map[id].days = Array.from(s).sort((a,b)=>a-b);
      }
    });
  });

  return Object.values(map)
    .map(g => ({ id:g.id, name:g.name, qty: (g.qtyUnit?fmt(g.qtyNum,g.qtyUnit):String(g.qtyNum)), checked:g.checked, days:g.days }))
    .sort((a,b)=> (a.name||"").localeCompare(b.name||""));
}

/* ===== Small components ===== */

const ProgressBar = ({ value }) =>
  e("div", { className: "prog" },
    e("div", { className: "fill", style: { width: Math.max(0, Math.min(100, value)) + "%" } })
  );

/* ===== Chart.js weight sparkline ===== */
const WeightChart = ({ series }) => {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if(chartRef.current){ try{ chartRef.current.destroy(); }catch{} }

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
          x: { ticks:{ color:"#475569", font:{ size:11 } }, grid:{ color:"rgba(148,163,184,.25)" } },
          y: { ticks:{ color:"#475569", font:{ size:11 } }, grid:{ color:"rgba(148,163,184,.18)" } }
        },
        animation: { duration: 220 }
      }
    });

    return () => { try{ chartRef.current && chartRef.current.destroy(); }catch{} };
  }, [series]);

  return e("div", { style:{ height: 180 } }, e("canvas", { ref: canvasRef }));
};

/* ===== Smart Coach rules (compact) ===== */
const COACH_RULES = [
  { id:"headache",  rx:/\b(headache|migraine)\b/i, tips:["8–12 oz water now.","Pinch of sea salt/electrolytes.","Rest eyes 5–10 min."] },
  { id:"dizziness", rx:/\b(dizzy|light[-\s]?headed|vertigo)\b/i, tips:["Sit/lie until steady.","Small juice or electrolytes.","Breathe 4 in / 6 out."] },
  { id:"fatigue",   rx:/\b(tired|fatigue|exhaust)\b/i, tips:["15 min rest.","Hydrate + electrolytes.","2 min gentle stretch."] },
  { id:"hunger",    rx:/\b(hungry|craving|starv)\b/i, tips:["Drink water first.","Sip scheduled juice slowly.","5-min walk reset."] },
];

/* ===== Pages ===== */

function Checklist({ items, state, onToggle }) {
  return e("ul", { className: "list" },
    items.map(it =>
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
}

const GroceryList = ({ groceries }) =>
  e("div", { className: "wrap" },
    e("h1", null, "Groceries"),
    e("div", { className: "card" },
      e("ul", { style:{ listStyle:"none", padding:0, margin:0 } },
        groceries.map(g =>
          e("li", { key:g.id, style:{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f3d0e1" } },
            e("div", null, g.name, " ",
              e("span", { className:"badge" }, g.days && g.days.length ? ("Day " + (g.days.length>1 ? (g.days[0] + "–" + g.days[g.days.length-1]) : g.days[0])) : "Pantry")
            ),
            e("span", { style:{ color:"#64748b" } }, g.qty)
          )
        )
      )
    )
  );

const Calendar = ({ days, recipes }) =>
  e("div", { className:"wrap" },
    e("h1", null, "Calendar"),
    e("ul", { style:{ listStyle:"none", padding:0 } },
      days.map(d =>
        e("li", { key:d.day, className:"card", style:{ marginBottom:8 } },
          e("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 } },
            e("div", null,
              e("div", { style:{ fontWeight:700 } }, "Day ", d.day, " — ", d.phase.toUpperCase())
            ),
            e("div", { style:{ display:"flex", gap:6, flexWrap:"wrap" } },
              recipes.filter(r => r.day === d.day).map(r =>
                e("span", { key:r.id, className:"badge" }, (r.type==="juice"?"🧃 ":"🍽️ "), r.name, r.type==="juice" && r.servings ? ` ×${r.servings}` : "")
              )
            )
          )
        )
      )
    )
  );

const Photos = ({ days, setDays }) => {
  const [i, setI] = useState(0);
  const day = days[i] || days[0];

  function upload(ev){
    const files = Array.from(ev.target.files||[]);
    if(!files.length) return;
    Promise.all(files.map(f => new Promise(res=>{
      const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f);
    }))).then(urls=>{
      setDays(prev => {
        const next = prev.slice();
        const d = { ...next[i] };
        d.photos = (d.photos||[]).concat(urls);
        next[i] = d;
        return next;
      });
      setTimeout(() => alert("Looking strong ✨"), 50);
    });
  }

  return e("div", { className:"wrap" },
    e("h1", null, "Progress Photos"),
    e("div", { className:"card", style:{ marginBottom:12, display:"flex", alignItems:"center", gap:8, justifyContent:"space-between", flexWrap:"wrap" } },
      e("div", null, e("b", null, "Day "), day.day),
      e("div", null,
        e("button", { className:"btn", onClick:()=>setI(v => v>0 ? v-1 : days.length-1) }, "◀"),
        e("span", { className:"badge", style:{ margin:"0 8px" } }, "Day "+day.day),
        e("button", { className:"btn", onClick:()=>setI(v => v<days.length-1 ? v+1 : 0) }, "▶")
      ),
      e("input", { type:"file", accept:"image/*", multiple:true, onChange:upload })
    ),
    e("div", { style:{ display:"flex", gap:8, flexWrap:"wrap" } },
      (day.photos||[]).map((url,idx) => e("img", { key:idx, src:url, style:{ width:100, height:100, objectFit:"cover", borderRadius:8 } }))
    )
  );
};

/* ===== Dashboard (phase auto from day; Smart Coach header is the button) ===== */
const Dashboard = ({ templates, days, setDays, recipes, goals }) => {
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];
  const phase = day.phase; // <- AUTO from calendar/day

  const templateIds = templates[phase] || [];
  const activeIds = day.order && day.order.length ? day.order : templateIds;
  const items = activeIds.map(id => ({ id, label: goals[id] || id }));
  const checks = day.checks || {};
  const done = items.reduce((n, it) => n + (checks[it.id] ? 1 : 0), 0);
  const progress = (done / Math.max(1, items.length)) * 100;

  const weightSeries = days.map(d => (d.weight == null ? null : d.weight));

  useEffect(() => {
    if (Math.round(progress) === 100) {
      try { if(window.confetti) window.confetti({ particleCount: 120, spread: 70, origin: { y:.6 } }); } catch {}
    }
  }, [progress]);

  function changeDay(dir) {
    setIdx(v => {
      let n = v + dir;
      if (n < 0) n = days.length - 1;
      if (n >= days.length) n = 0;
      return n;
    });
  }

  function toggleCheck(id){
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

  function runCoach(){
    const text = (day.note || "").trim();
    if(!text){
      alert("Write a quick note first, then I’ll coach you.");
      return;
    }
    const lower = text.toLowerCase();
    const tips = COACH_RULES.filter(r => r.rx.test(lower)).flatMap(r => r.tips);
    const lines = tips.length ? tips : ["Hydrate now.", "3 slow breaths.", "Short walk and reassess."];
    alert("Smart Coach\n\n• " + lines.join("\n• "));
  }

  /* ingredients preview for today+tomorrow (compact) */
  function nextTwoDays(){
    const want = new Set([day.day, day.day+1]);
    const bag = {};
    recipes.forEach(r=>{
      if(!want.has(r.day)) return;
      (r.ingredients||[]).forEach(it=>{
        const key=(it.key||it.name).toLowerCase();
        if(!bag[key]) bag[key]={name:it.name, qtys:[], days:new Set()};
        bag[key].qtys.push(it.qty + (r.type==="juice"&&r.servings?` ×${r.servings}`:""));
        bag[key].days.add(r.day);
      });
    });
    return Object.values(bag).map(v=>({...v,days:Array.from(v.days).sort()}))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }
  const upcoming = nextTwoDays();

  return e(React.Fragment, null,
    // Mast (title on one line, subtitle half-size)
    e("div", { className:"mast card" },
      e("div", { className:"mastRow" },
        e("div", { className:"mastLeft" },
          e("img", { src:"oz.png", alt:"Oz" }),
          e("div", null,
            e("div", { style:{ fontSize:24, fontWeight:800, letterSpacing:.2, whiteSpace:"nowrap" } }, "Oz Companion"),
            e("div", { style:{ marginTop:2, color:"#64748b", fontWeight:600, fontSize:12, letterSpacing:.6 } }, phase.toUpperCase())
          )
        ),
        e("div", { className:"day-nav" },
          e("button", { className:"day-btn", onClick:()=>changeDay(-1) }, "◀"),
          e("span", { className:"day-label" }, "Day " + day.day),
          e("button", { className:"day-btn", onClick:()=>changeDay(1) }, "▶")
        )
      )
    ),

    e(ProgressBar, { value: progress }),

    // Checklist
    e("div", { className:"card", style:{ marginTop:12 } }, e(Checklist, { items, state:checks, onToggle:toggleCheck })),

    // Notes + Smart Coach — the header IS the button (no side “Coach” pill)
    e("div", { className:"card", style:{ marginTop:16 } },
      e("div", {
        onClick: runCoach,
        role: "button",
        tabIndex: 0,
        onKeyDown: (ev)=>{ if(ev.key==="Enter" || ev.key===" ") runCoach(); },
        style:{
          display:"grid",
          gridTemplateColumns:"auto 1fr",
          gap:12,
          alignItems:"center",
          padding:"14px 12px",
          border:"1px solid #f3d0e1",
          borderRadius:14,
          background:"linear-gradient(90deg,#ffe4ef,#e9d5ff)",
          cursor:"pointer"
        }
      },
        e("div", { style:{
          display:"grid",
          placeItems:"center",
          width:96, height:72,
          background:"#fff",
          border:"1px solid #f3d0e1",
          borderRadius:14,
          fontWeight:800,
          fontSize:18
        }}, "🧠 Smart\nCoach"),
        e("div", { style:{ color:"#475569", fontSize:16, lineHeight:1.35 } },
          "Tap to analyze your note and get relief + motivation"
        )
      ),

      e("textarea", {
        value: day.note || "",
        onChange:(ev)=>{
          const val = ev.target.value;
          setDays(prev=>{
            const next = prev.slice();
            const d = { ...next[idx] };
            d.note = val;
            next[idx] = d;
            return next;
          });
        },
        rows:4, className:"noteArea", style:{ marginTop:10 }
      })
    ),

    // Upcoming ingredients
    e("div", { className:"card", style:{ marginTop:16 } },
      e("h2", null, "Today + Tomorrow — Ingredients"),
      upcoming.length === 0
        ? e("p", { style:{ color:"#64748b" } }, "No recipes scheduled.")
        : e("ul", { style:{ listStyle:"none", padding:0, marginTop:8 } },
            upcoming.map(it =>
              e("li", { key:it.name, style:{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f3d0e1" } },
                e("span", null, it.name, " ",
                  e("span", { className:"badge" }, it.days.length===1 ? "Day "+it.days[0] : "Day "+it.days[0]+"–"+it.days[it.days.length-1])
                ),
                e("span", { style:{ color:"#64748b", fontSize:12 } }, it.qtys.join(" + "))
              )
            )
          )
    ),

    // Weight
    e("div", { className:"card", style:{ marginTop:16 } },
      e("h2", null, "Weight"),
      e("div", { style:{ display:"flex", alignItems:"center", gap:8, margin:"8px 0" } },
        e("label", null, "Today’s weight"),
        e("input", {
          type:"number", step:"0.1",
          value:(day.weight == null ? "" : day.weight),
          onChange:(ev)=>{
            const v = ev.target.value;
            setDays(prev=>{
              const next = prev.slice();
              const d = { ...next[idx] };
              d.weight = (v === "" ? null : Number(v));
              next[idx] = d;
              return next;
            });
          },
          style:{ width:120 }
        }),
        e("span", { className:"badge" }, "Day " + day.day)
      ),
      e(WeightChart, { series: weightSeries })
    )
  );
};

/* ===== Settings (unchanged features, plus import stub kept) ===== */
const Settings = ({ templates, onChange, goals, setGoals, onImportPlan }) => {
  const [local, setLocal] = useState(templates);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState("fast");
  const [checked, setChecked] = useState({});

  useEffect(()=>{ setLocal(templates); }, [templates]);

  function open(p){
    setPhase(p);
    const sel = new Set((local[p]||[]));
    const all = Object.keys(goals).reduce((m,id)=> (m[id]=sel.has(id), m), {});
    setChecked(all);
    setShow(true);
  }
  function save(){
    const ids = Object.keys(checked).filter(id=> checked[id]);
    const next = Object.assign({}, local); next[phase] = ids;
    setLocal(next); onChange(next); setShow(false);
  }
  function toggle(id){ setChecked(prev=> Object.assign({}, prev, { [id]: !prev[id] })); }
  function createGoal(){
    const idRaw = prompt("New goal ID (letters, dashes):");
    if(!idRaw) return;
    const id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,'');
    if(!id) return alert("Invalid ID.");
    if(goals[id]) return alert("ID already exists.");
    const label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
    if(!label) return;
    setGoals(prev => Object.assign({}, prev, { [id]: label }));
    setChecked(prev => Object.assign({}, prev, { [id]: true }));
  }

  return e("div", { className:"wrap" },
    e("h1", null, "Settings"),
    e("div", { className:"card", style:{ marginBottom:12 } },
      e("h2", null, "Phase Templates"),
      ["fast","cleanse","rebuild"].map(p =>
        e("div", { key:p, style:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 } },
          e("div", null, e("b", null, p.toUpperCase()), " — ",
            (local[p]||[]).map(id => e("span", { key:id, className:"badge", style:{ marginRight:6 } }, goals[id] || id))
          ),
          e("button", { className:"btn", onClick:()=>open(p) }, "Edit Goals")
        )
      )
    ),
    e("div", { className:"card" },
      e("h2", null, "Import 11-Day Plan"),
      e("p", { style:{ color:"#64748b", margin:"6px 0 12px" } }, "Reloads juices/meals and rebuilds your grocery list."),
      e("button", { className:"btn", onClick:onImportPlan }, "Import Plan")
    ),

    // modal
    e("div", { className: "modal" + (show ? " show" : ""), onClick:(ev)=>{ if(ev.target.classList.contains("modal")) setShow(false); } },
      e("div", { className: "sheet" },
        e("h2", null, "Edit Goals — ", phase.toUpperCase()),
        e("div", { style:{ maxHeight:"48vh", overflow:"auto", margin:"8px 0 12px" } },
          Object.keys(goals).map(id =>
            e("label", { key:id, style:{ display:"flex", alignItems:"center", gap:8, padding:"8px 6px", borderBottom:"1px solid #f3d0e1" } },
              e("input", { type:"checkbox", checked:!!checked[id], onChange:()=>toggle(id) }),
              e("span", null, goals[id])
            )
          )
        ),
        e("div", { style:{ display:"flex", gap:8, justifyContent:"space-between" } },
          e("button", { className:"btn", onClick:createGoal }, "+ New Goal"),
          e("div", null,
            e("button", { className:"btn", onClick:()=>setShow(false) }, "Cancel"),
            e("button", { className:"btn primary", onClick:save, style:{ marginLeft:8 } }, "Save")
          )
        )
      )
    )
  );
};

/* ===== App + Centered nav ===== */
const App = () => {
  const [goals, setGoals]       = useLocal("oz.goals", INITIAL_GOALS);
  const [settings, setSettings] = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
  const [days, setDays]         = useLocal("oz.days", defaultDays());
  const [recipes, setRecipes]   = useLocal("oz.recipes", PLAN_RECIPES);
  const [groceries, setGroceries] = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
  const [tab, setTab] = useState("dash");

  useEffect(()=>{
    const pt=settings&&settings.phaseTemplates;
    const valid=pt&&["fast","cleanse","rebuild"].every(k=> Array.isArray(pt[k]) && pt[k].every(id=> !!goals[id]));
    if(!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
  }, [goals]); // eslint-disable-line

  function importFullPlan(){
    const newDays = defaultDays(); setDays(newDays);
    setRecipes(PLAN_RECIPES);
    setGroceries(aggregateGroceries(PLAN_RECIPES));
    alert("Plan imported ✔");
  }

  return e("div", null,
    tab==="dash"      && e(Dashboard, { templates: settings.phaseTemplates, days, setDays, recipes, goals }),
    tab==="groceries" && e(GroceryList, { groceries }),
    tab==="calendar"  && e(Calendar, { days, recipes }),
    tab==="photos"    && e(Photos, { days, setDays }),
    tab==="settings"  && e(Settings, { templates: settings.phaseTemplates, onChange:(next)=>setSettings({ phaseTemplates: next }), goals, setGoals, onImportPlan: importFullPlan }),

    // Centered, softer menu (no layout shift)
    e("div", {
      className:"tabs",
      style:{
        position:"fixed", left:0, right:0, bottom:0,
        display:"flex", justifyContent:"center", gap:12,
        padding:"10px 12px",
        background:"linear-gradient(180deg, rgba(255,247,241,0.85), rgba(255,255,255,0.95))",
        backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
        borderTop:"1px solid #f3d0e1"
      }
    },
      ["Dashboard","Groceries","Calendar","Photos","Settings"].map(name => {
        const key = name.toLowerCase();
        const active = (tab === (key === "dashboard" ? "dash" : key));
        const label  = name;
        const target = (key === "dashboard" ? "dash" : key);
        return e("button", {
          key, onClick:()=>setTab(target),
          className:"btn" + (active ? " active" : ""),
          style:{
            minWidth:108,
            borderRadius:16,
            padding:"12px 16px",
            border:"1px solid #f3d0e1",
            background: active ? "#0f172a" : "#fff",
            color: active ? "#fff" : "#0f172a",
            boxShadow: active ? "0 6px 20px rgba(15,23,42,.22)" : "none"
          }
        }, label);
      })
    )
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
