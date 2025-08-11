/* app.js — Oz Cleanse Companion (full, drop-in)
   - Splash: randomized affirmations + never-stuck fail-safe
   - Header: avatar • title • centered day selector
   - Paw-print checklist (phase-aware; shows only current phase items)
   - Phase templates editor (Fast / Cleanse / Rebuild) + Add Custom Goal (modal)
   - Notes & photos saved to localStorage; surfacing badges on Calendar
   - Smart Coach: clear bullet tips + mood boost
   - Weight entry auto-checks Weight goal; smooth line chart (Chart.js)
   - Two-day ingredients, with like-unit amounts combined (½ + ½ → 1)
   - Grocery list with price entry + day badges
   - Confetti + haptics when day hits 100%
*/

/* ---------------- Splash: affirmations + never-stuck ---------------- */
(function () {
  var AFFS = [
    "You’ve got this!","Small habits, big change","Progress, not perfection",
    "Sip, breathe, reset","Strong body, calm mind","Hydration is happiness 🐾",
    "Future-you says thanks","Gentle + consistent + kind","Shine time ✨",
    "Keep it playful","You’re doing the work 💪","Momentum looks good on you",
    "Light, strong, centered","One choice at a time","Calm is a superpower"
  ];
  var bubble = document.getElementById("ozBubble");
  if (bubble) bubble.textContent = AFFS[Math.floor(Math.random() * AFFS.length)];

  function hideSplash() {
    var s = document.getElementById("ozSplash");
    var b = document.getElementById("ozBubble");
    if (s) s.style.display = "none";
    if (b) b.style.display = "none";
  }
  window.addEventListener("load", function () {
    // fade quickly after load so it feels snappy
    setTimeout(hideSplash, 1400);
  });
  window.addEventListener("error", hideSplash);
  setTimeout(hideSplash, 4000); // fail-safe
})();

/* ---------------- App ---------------- */
(function () {
  const e = React.createElement;
  const { useState, useEffect, useMemo, useRef } = React;

  /* Utils */
  function useLocal(key, initial) {
    const [v, setV] = useState(() => {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
      catch { return initial; }
    });
    useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
    return [v, setV];
  }
  function vibrate(ms=12){ try{navigator.vibrate && navigator.vibrate(ms);}catch{} }
  function safeConfetti(opts){ try{ if (window.confetti) window.confetti(opts); } catch{} }

  /* Quantity helpers (combine like-units) */
  function parseQty(q) {
    if (!q) return { n: 1, u: "" };
    const s = String(q).trim().toLowerCase();
    const frac = s.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
    if (frac) return { n: (+frac[1]/+frac[2]), u: (frac[3]||"").trim() };
    const m = s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (m) return { n: parseFloat(m[1]), u: (m[2]||"").trim() };
    return { n: 1, u: s };
  }
  function combineQty(list) {
    if (!list || !list.length) return "";
    const parsed = list.map(parseQty);
    const unit = parsed[0].u;
    const same = parsed.every(p => p.u === unit);
    if (same) {
      const sum = parsed.reduce((a,b)=>a+b.n,0);
      return (Number.isInteger(sum) ? String(sum) : sum.toFixed(2)) + (unit?(" "+unit):"");
    }
    return list.join(" + ");
  }

  /* Defaults */
  const DEFAULT_GOALS = {
    water: "💧 Water 120–150 oz",
    tea: "🍵 Tea",
    coffee: "☕ Coffee",
    juice: "🧃 Juices",
    lmnt: "🧂 Electrolytes",
    exercise: "🏃 Exercise",
    wholefood: "🥗 Whole food meals",
    weight: "👣 Weight check-in"
  };
  const DEFAULT_PHASE_TEMPLATES = {
    fast:    ["water","tea","coffee","lmnt","exercise","weight"],
    cleanse: ["water","tea","coffee","juice","lmnt","exercise","weight"],
    rebuild: ["water","lmnt","exercise","wholefood","weight"]
  };
  function defaultDays() {
    const phases = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    return phases.map((ph,i)=>({ day:i+1, phase:ph, checks:{}, note:"", weight:null, photos:[] }));
  }

  /* Plan (cleanse juices + rebuild meals/snacks) */
  const PLAN_RECIPES = [
    // Cleanse (servings=4 means 4 bottles of that juice that day)
    { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:4,
      ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}] },
    { id:"r-peach",  name:"Peachy Green Glow",  type:"juice", day:5, servings:4,
      ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cup"},{key:"lemons",name:"Lemons",qty:"1"}] },
    { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:4,
      ingredients:[{key:"carrots",name:"Carrots",qty:"14"},{key:"apples",name:"Apples",qty:"2"},{key:"ginger",name:"Ginger",qty:"1 oz"},{key:"lemons",name:"Lemons",qty:"1"}] },
    { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:4,
      ingredients:[{key:"grapes",name:"Grapes",qty:"3 cup"},{key:"romaine",name:"Romaine",qty:"3 cup"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"lemons",name:"Lemons",qty:"1"}] },

    // Rebuild day 8–9
    { id:"m-smoothie-8", name:"Smoothie Breakfast", type:"meal", day:8,
      ingredients:[{key:"banana",name:"Banana",qty:"1"},{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}] },
    { id:"m-lunch-8", name:"Steamed Veg Lunch", type:"meal", day:8,
      ingredients:[{key:"zucchini",name:"Zucchini",qty:"1"},{key:"carrots",name:"Carrots",qty:"1"},{key:"cucumber",name:"Cucumber",qty:"1"},{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemon",name:"Lemon",qty:"1"}] },
    { id:"m-dinner-8", name:"Lentil Soup", type:"meal", day:8,
      ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{key:"carrots",name:"Carrots",qty:"1/2 cup"},{key:"celery",name:"Celery",qty:"1/2 cup"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"onion",name:"Onion",qty:"1/2"}] },
    { id:"s-snack-8", name:"Snacks (Fruit/Yogurt/Chia)", type:"snack", day:8,
      ingredients:[{key:"fruit",name:"Fresh fruit",qty:"2 cup"},{key:"coconut-yogurt",name:"Coconut yogurt",qty:"1 cup"},{key:"chia-pudding",name:"Chia pudding",qty:"1 cup"}] },

    { id:"m-smoothie-9", name:"Smoothie Breakfast", type:"meal", day:9,
      ingredients:[{key:"banana",name:"Banana",qty:"1"},{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}] },
    { id:"m-lunch-9", name:"Steamed Veg Lunch", type:"meal", day:9,
      ingredients:[{key:"zucchini",name:"Zucchini",qty:"1"},{key:"carrots",name:"Carrots",qty:"1"},{key:"cucumber",name:"Cucumber",qty:"1"},{key:"spinach",name:"Spinach",qty:"2 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemon",name:"Lemon",qty:"1"}] },
    { id:"m-dinner-9", name:"Lentil Soup", type:"meal", day:9,
      ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{key:"carrots",name:"Carrots",qty:"1/2 cup"},{key:"celery",name:"Celery",qty:"1/2 cup"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"onion",name:"Onion",qty:"1/2"}] },
    { id:"s-snack-9", name:"Snacks (Fruit/Yogurt/Chia)", type:"snack", day:9,
      ingredients:[{key:"fruit",name:"Fresh fruit",qty:"2 cup"},{key:"coconut-yogurt",name:"Coconut yogurt",qty:"1 cup"},{key:"chia-pudding",name:"Chia pudding",qty:"1 cup"}] },

    // Rebuild day 10–11
    { id:"m-oo-10", name:"Overnight Oats Breakfast", type:"meal", day:10,
      ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"berries",name:"Berries",qty:"1/2 cup"},{key:"cinnamon",name:"Cinnamon",qty:"1/2 tsp"}] },
    { id:"m-quinoa-10", name:"Quinoa Salad Lunch", type:"meal", day:10,
      ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"1/2 cup"},{key:"cucumber",name:"Cucumber",qty:"1"},{key:"tomato",name:"Tomato",qty:"1"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"lemon",name:"Lemon",qty:"1"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}] },
    { id:"m-protein-10", name:"Salmon/Chicken + Broccoli", type:"meal", day:10,
      ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 heads"}] },
    { id:"s-snack-10", name:"Snacks (Veg+Hummus/Fruit)", type:"snack", day:10,
      ingredients:[{key:"veg",name:"Raw veg + hummus",qty:"2 cup"},{key:"fruit",name:"Fresh fruit",qty:"2 cup"}] },

    { id:"m-oo-11", name:"Overnight Oats Breakfast", type:"meal", day:11,
      ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"berries",name:"Berries",qty:"1/2 cup"},{key:"cinnamon",name:"Cinnamon",qty:"1/2 tsp"}] },
    { id:"m-quinoa-11", name:"Quinoa Salad Lunch", type:"meal", day:11,
      ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"1/2 cup"},{key:"cucumber",name:"Cucumber",qty:"1"},{key:"tomato",name:"Tomato",qty:"1"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"lemon",name:"Lemon",qty:"1"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}] },
    { id:"m-protein-11", name:"Salmon/Chicken + Broccoli", type:"meal", day:11,
      ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 heads"}] },
    { id:"s-snack-11", name:"Snacks (Veg+Hummus/Fruit)", type:"snack", day:11,
      ingredients:[{key:"veg",name:"Raw veg + hummus",qty:"2 cup"},{key:"fruit",name:"Fresh fruit",qty:"2 cup"}] }
  ];

  /* Grocery aggregation (juice scaled by servings) */
  function aggregateGroceries(recipes) {
    const factor = r => (r.type === "juice" ? (r.servings || 4) : 1);
    const map = {};
    (recipes||[]).forEach(r => {
      const mult = factor(r);
      (r.ingredients||[]).forEach(it => {
        const id = (it.key || it.name || "").toLowerCase().replace(/\s+/g,"-");
        const qty = it.qty || "1";
        const p = parseQty(qty);
        const scaled = { n: p.n * mult, u: p.u };
        if (!map[id]) {
          map[id] = { id, name: it.name, qtyNum: scaled.n, qtyUnit: scaled.u, checked:false, estCost:null, days: r.day?[r.day]:[] };
        } else {
          map[id].qtyNum += scaled.n;
          map[id].qtyUnit = map[id].qtyUnit || scaled.u;
          const s=new Set(map[id].days||[]); if(r.day) s.add(r.day); map[id].days = Array.from(s).sort((a,b)=>a-b);
        }
      });
    });
    function fmt(n,u){ return u ? (Number.isInteger(n)? String(n) : n.toFixed(2)) + " " + u : String(n); }
    return Object.values(map)
      .map(g => ({ id:g.id, name:g.name, qty: fmt(g.qtyNum,g.qtyUnit), checked:g.checked, estCost:g.estCost, days:g.days }))
      .sort((a,b)=> (a.name||"").localeCompare(b.name||""));
  }

  /* Components */
  const ProgressBar = ({ value }) =>
    e("div", { className:"prog" }, e("div", { className:"fill", style:{ width: Math.max(0, Math.min(100, value)) + "%" } }));

  const Checklist = ({ items, state, onToggle }) =>
    e("ul", { className:"list" },
      items.map(it =>
        e("li", { key:it.id, className:"item" },
          e("button", { className:"paw"+(state[it.id]?" on":""), onClick:()=>onToggle(it.id), "aria-pressed":!!state[it.id] }, state[it.id]?"🐾":""),
          e("label", null, it.label)
        )
      )
    );

  const WeightChart = ({ series }) => {
    const canvasRef = useRef(null);
    const chartRef  = useRef(null);
    useEffect(() => {
      const el = canvasRef.current; if (!el) return;
      const ctx = el.getContext("2d");
      if (chartRef.current) { try{chartRef.current.destroy();}catch{} }
      chartRef.current = new Chart(ctx, {
        type:"line",
        data:{
          labels: series.map((_,i)=>"Day "+(i+1)),
          datasets: [{ data: series, borderColor:"#ec4899", backgroundColor:"rgba(236,72,153,.10)", pointRadius:3, tension:.35, spanGaps:true }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ display:false } },
          scales:{
            x:{ grid:{ color:"rgba(148,163,184,.25)" }, ticks:{ color:"#475569", font:{ size:11 } } },
            y:{ grid:{ color:"rgba(148,163,184,.18)" }, ticks:{ color:"#475569", font:{ size:11 } } }
          },
          animation:{ duration:220 }
        }
      });
      return ()=>{ try{chartRef.current && chartRef.current.destroy();}catch{} };
    }, [series]);
    return e("div", { style:{ height:180 } }, e("canvas", { ref:canvasRef }));
  };

  /* Pages */
  function nextTwoDayIngredients(day, recipes){
    const collect = (dset) => {
      const bag = {};
      (recipes||[]).forEach(r=>{
        if (!r.day || !dset.has(r.day)) return;
        (r.ingredients||[]).forEach(it=>{
          const key = (it.key||it.name||"").toLowerCase();
          if(!bag[key]) bag[key] = { name: it.name, qtys: [], days:new Set() };
          if(it.qty) bag[key].qtys.push(it.qty + (r.type==="juice" && r.servings?` ×${r.servings}`:""));
          bag[key].days.add(r.day);
        });
      });
      // combine like-units, ignoring ×N suffix for combine (we only combine the base qtys)
      const out = Object.keys(bag).map(k => {
        const baseQtys = bag[k].qtys.map(q => String(q).replace(/\s*×\d+$/,""));
        return {
          name: bag[k].name,
          qty: combineQty(baseQtys),
          days: Array.from(bag[k].days).sort((a,b)=>a-b)
        };
      });
      return out.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    };
    // Prefer today + tomorrow; else next two recipe days
    const strict = collect(new Set([day.day, day.day+1]));
    if (strict.length) return { items: strict, label: "Today + Tomorrow — Ingredients" };
    const futureDays = Array.from(new Set((recipes||[]).filter(r=>r.day>=day.day).map(r=>r.day))).sort((a,b)=>a-b);
    const pool = futureDays.slice(0,2);
    if (!pool.length) return { items:[], label:"Upcoming Ingredients" };
    const fb = collect(new Set(pool));
    const label = pool.length===2 ? `Upcoming Ingredients — Day ${pool[0]} & ${pool[1]}` : `Upcoming Ingredients — Day ${pool[0]}`;
    return { items: fb, label };
  }

  function GroceryList({ groceries, setGroceries }){
    function daysBadge(days){
      if(!days || !days.length) return "📦 Pantry";
      const min = Math.min.apply(null, days), max = Math.max.apply(null, days);
      return "📅 " + (min===max ? ("Day "+min) : ("Day "+min+"–"+max));
    }
    return e("div", { className:"card" },
      e("h2", null, "Groceries & Prices"),
      e("ul", { style:{ listStyle:"none", padding:0 } },
        (groceries||[]).map((g,idx)=>
          e("li", { key:g.id, style:{ display:"grid", gridTemplateColumns:"32px 1fr auto", gap:8, padding:"10px 0", borderBottom:"1px solid #f3d0e1", alignItems:"center" } },
            e("button", { className:"paw"+(g.checked?" on":""), onClick:()=> setGroceries(prev=> prev.map((x,i)=> i===idx ? {...x, checked:!x.checked} : x)) }, g.checked?"🐾":""),
            e("div", null,
              e("div", null, g.name, " ", e("span", { className:"badge" }, daysBadge(g.days))),
              e("div", { style:{ fontSize:12, color:"#64748b" } }, g.qty || "")
            ),
            e("input", { type:"number", step:"0.01", inputMode:"decimal", value:(g.estCost==null?"":g.estCost), placeholder:"$",
              onChange:(ev)=> setGroceries(prev=> prev.map((x,i)=> i===idx ? {...x, estCost: (ev.target.value===""?null:Number(ev.target.value))} : x)),
              style:{ width:90 }
            })
          )
        )
      )
    );
  }

  function Calendar({days,recipes,settings}){
    function dateFor(dayNum){
      const dstr=settings.startDate||"";
      if(!dstr) return null;
      const base=new Date(dstr+"T00:00:00");
      if(isNaN(base)) return null;
      const dt = new Date(base.getTime()+(dayNum-1)*86400000);
      return dt.toLocaleDateString();
    }
    return e("div",{className:"card"},
      e("h2",null,"Calendar"),
      e("ul",{style:{listStyle:"none",padding:0}},
        days.map(d=>{
          const list=(recipes||[]).filter(r=>r.day===d.day);
          const hasPhotos=(d.photos&&d.photos.length>0);
          const hasNote=(d.note&&d.note.trim().length>0);
          const dd=dateFor(d.day);
          return e("li",{key:d.day, className:"card", style:{padding:"12px",marginTop:10}},
            e("div",{className:"row",style:{justifyContent:"space-between"}},
              e("div",null,
                e("div",{style:{fontWeight:800}}, "Day ", d.day, " — ", d.phase.toUpperCase()),
                dd && e("div",{className:"badge",style:{marginTop:6}}, dd)
              ),
              e("div",{className:"row",style:{minHeight:24, gap:6, flexWrap:"wrap"}},
                list.length
                  ? list.map(r=> e("span",{key:r.id,className:"badge"}, (r.type==="juice"?"🧃 ": (r.type==="snack"?"🍎 ":"🍽️ ")), r.name, (r.type==="juice"&&r.servings?` ×${r.servings}`:"")))
                  : e("span",{style:{fontSize:12,color:"var(--muted)"}}, "—"),
                hasNote && e("span",{className:"badge"},"📝 Note"),
                hasPhotos && e("span",{className:"badge"},"📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  function Photos({days,setDays}){
    const [idx,setIdx]=useState(0);
    const day = days[idx] || days[0];
    function handleUpload(ev){
      const files = Array.from(ev.target.files||[]);
      if(!files.length) return;
      const readers = files.map(f => new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); }));
      Promise.all(readers).then(urls=>{
        setDays(prev=>{ const next=prev.slice(); const d={...next[idx]}; d.photos=(d.photos||[]).concat(urls); next[idx]=d; return next; });
        const A=["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶","Consistency looks good on you 🌟"];
        setTimeout(()=> alert(A[Math.floor(Math.random()*A.length)]), 50);
      });
      vibrate(10);
    }
    return e("div",{className:"card"},
      e("h2",null,"Progress Photos"),
      e("div",{className:"row",style:{justifyContent:"space-between",alignItems:"center",gap:8,marginTop:6}},
        e("div",null, e("b",null,"Day "), day.day),
        e("div",null,
          e("button",{className:"btn",onClick:()=>setIdx(i=> (i>0?i-1:days.length-1))},"◀"),
          e("span",{className:"badge",style:{margin:"0 8px"}},"Day "+day.day),
          e("button",{className:"btn",onClick:()=>setIdx(i=> (i<days.length-1?i+1:0))},"▶")
        ),
        e("label",{className:"btn peach"},
          "Upload", e("input",{type:"file", accept:"image/*", multiple:true, style:{display:"none"}, onChange:handleUpload})
        )
      ),
      e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}},
        (day.photos||[]).map((url,i)=> e("img",{key:i,src:url,style:{width:100,height:100,objectFit:"cover",borderRadius:8}}))
      )
    );
  }

  function Settings({templates,onChange,onImportPlan,goals,setGoals,onImportText,settings,setSettings}){
    const [show,setShow]=useState(false);
    const [phase,setPhase]=useState("fast");
    const [check,setCheck]=useState({}); // id -> bool
    useEffect(()=>{ // sync when opening phase
      if(!show) return;
      const sel = new Set(templates[phase]||[]);
      const all = Object.keys(goals).reduce((m,id)=> (m[id]=sel.has(id), m), {});
      setCheck(all);
    },[show,phase,templates,goals]);

    function saveModal(){
      const ids = Object.keys(check).filter(id=>check[id]);
      const next = Object.assign({}, templates, { [phase]: ids });
      onChange(next); setShow(false);
    }
    function toggle(id){ setCheck(prev=> Object.assign({}, prev, { [id]: !prev[id] })); }
    function addCustom(){
      const idRaw = prompt("New goal ID (letters, dashes): e.g., meditation");
      if(!idRaw) return;
      const id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,'');
      if(!id) return alert("Invalid ID.");
      if(goals[id]) return alert("That goal ID already exists.");
      const label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if(!label) return;
      setGoals(prev=> Object.assign({}, prev, { [id]: label }));
      setCheck(prev=> Object.assign({}, prev, { [id]: true }));
    }

    return e("div",{className:"card"},
      e("h2",null,"Settings"),

      // Start date
      e("div",{className:"row",style:{alignItems:"center",gap:8,marginTop:8}},
        e("label",null,"Start date"),
        e("input",{type:"date", value:settings.startDate||"", onChange:(ev)=> setSettings(Object.assign({}, settings, { startDate: ev.target.value || null }))})
      ),

      // Imports
      e("div",{className:"row",style:{gap:8,flexWrap:"wrap",marginTop:12}},
        e("button",{className:"btn",onClick:onImportPlan},"Import Default 11-Day Plan"),
        e("button",{className:"btn",onClick:onImportText},"Import plan from ChatGPT text")
      ),

      // Phase templates quick rows
      e("div",{style:{marginTop:14}},
        ["fast","cleanse","rebuild"].map(ph =>
          e("div",{key:ph, className:"row", style:{justifyContent:"space-between",alignItems:"center",marginTop:8}},
            e("div",null, e("b",null, ph.charAt(0).toUpperCase()+ph.slice(1)), " — ", (templates[ph]||[]).map(id=> e("span",{key:id,className:"badge",style:{marginRight:6}}, goals[id]||id))),
            e("button",{className:"btn",onClick:()=>{ setPhase(ph); setShow(true); }},"Edit")
          )
        )
      ),

      // Modal
      show && e("div",{className:"modal show", onClick:(ev)=>{ if(ev.target.classList && ev.target.classList.contains("modal")) setShow(false); }},
        e("div",{className:"sheet"},
          e("h2",null,"Edit — ", phase.charAt(0).toUpperCase()+phase.slice(1)),
          e("div",{style:{maxHeight:"48vh",overflow:"auto",margin:"8px 0 12px"}},
            Object.keys(goals).map(id =>
              e("label",{key:id,style:{display:"flex",alignItems:"center",gap:8,padding:"8px 6px",borderBottom:"1px solid #f3d0e1"}},
                e("input",{type:"checkbox",checked:!!check[id],onChange:()=>toggle(id)}),
                e("span",null,goals[id])
              )
            )
          ),
          e("div",{className:"row",style:{justifyContent:"space-between"}},
            e("button",{className:"btn",onClick:addCustom},"+ Add Custom Goal"),
            e("div",null,
              e("button",{className:"btn",onClick:()=>setShow(false)},"Cancel"),
              e("button",{className:"btn primary",onClick:saveModal,style:{marginLeft:8}},"Save")
            )
          )
        )
      )
    );
  }

  function parseFreeTextPlan(text){
    const days = defaultDays();
    const recipes = [];
    const lines = String(text||"").split(/\r?\n/);
    let curDay = null;
    lines.forEach(raw=>{
      const line = raw.trim();
      const mDay = line.match(/^Day\s+(\d+)/i);
      if(mDay){ curDay = +mDay[1]; return; }
      const mJuice = line.match(/^Juice\s*\d*\s*[-:]\s*(.+)$/i);
      if(mJuice && curDay){ recipes.push({ id:"r-"+recipes.length, name:mJuice[1].trim(), type:"juice", day:curDay, servings:4, ingredients:[] }); return; }
      const mMeal = line.match(/^(Breakfast|Lunch|Dinner|Meal|Snack)s?\s*[-:]\s*(.+)$/i);
      if(mMeal && curDay){
        const type = /snack/i.test(mMeal[1]) ? "snack" : "meal";
        recipes.push({ id:"m-"+recipes.length, name:mMeal[2].trim(), type, day:curDay, ingredients:[] });
        return;
      }
      const mIng = line.match(/^[•\-]\s*(.+)$/);
      if(mIng && recipes.length){
        const last = recipes[recipes.length-1];
        const s = mIng[1].trim();
        const m = s.match(/^(\d+(\.\d+)?\s*\w+)?\s*(.+)$/);
        last.ingredients.push({ key:(m?m[3]:s).toLowerCase().replace(/\s+/g,"-"), name:(m?m[3]:s), qty:(m&&m[1])?m[1]:"" });
      }
    });
    return { days, recipes };
  }

  /* Dashboard */
  function Dashboard({templates, days, setDays, recipes, goals}){
    const [idx, setIdx] = useState(0);
    const day = days[idx] || days[0];

    const templateIds = templates[day.phase] || [];
    const activeIds = (day.order && day.order.length ? day.order : templateIds);
    const items = activeIds.map(id => ({ id, label: goals[id] || id }));
    const checks = day.checks || {};
    const doneCount = items.reduce((a, it) => a + (checks[it.id] ? 1 : 0), 0);
    const totalCount = Math.max(1, items.length);
    const progress = (doneCount / totalCount) * 100;
    const weightSeries = days.map(d => (d.weight==null ? null : d.weight));

    useEffect(()=>{ if (Math.round(progress) === 100) { safeConfetti({ particleCount: 180, spread: 80, origin:{y:.6} }); vibrate(20); } }, [progress]);

    function toggleCheck(id){
      setDays(prev => {
        const next = prev.slice();
        const d = { ...next[idx] };
        const c = { ...(d.checks||{}) };
        c[id] = !c[id]; d.checks = c;
        next[idx] = d; return next;
      });
      vibrate(8);
    }
    function changeDay(dir){ setIdx(cur=>{ let n=cur+dir; if(n<0) n=days.length-1; if(n>=days.length) n=0; return n; }); vibrate(6); }

    // Smart Coach (bulleted)
    const [coachText,setCoachText]=useState("");
    function runCoach(){
      const txt=(day.note||"").toLowerCase();
      if(!txt) { setCoachText("Write a quick note below, then tap Smart Coach."); return; }
      const found=new Set();
      if(/headache|migraine|head pain/.test(txt)) found.add("headache");
      if(/dizzy|light.?headed|vertigo/.test(txt)) found.add("dizziness");
      if(/nausea|queasy|sick to (my|the) stomach/.test(txt)) found.add("nausea");
      if(/tired|fatigue|exhaust/.test(txt)) found.add("fatigue");
      if(/hungry|crav(ing|es)/.test(txt)) found.add("hunger");

      const tips={
        headache:["12–16 oz water + LMNT","Dim screens 5–10 min","Slow nasal breathing (in 4 / out 6)"],
        dizziness:["Sit until steady","Small juice or pinch of salt","Slow breaths"],
        nausea:["Peppermint/ginger tea","Cool water sips","Fresh air"],
        fatigue:["15–20 min rest","Hydrate / electrolytes","2-min stretch"],
        hunger:["Water first","Sip scheduled juice slowly","5-min walk reset"]
      };
      const picked=[...found].flatMap(k=>tips[k]||[]);
      const mood = /proud|better|good|calm|motivated/.test(txt) ? "up" :
                   /overwhelm|anxious|stressed|down|frustrat/.test(txt) ? "low" : "mid";
      const boost = mood==="low" ? "You’re not alone—make today gentle." :
                     mood==="mid" ? "Nice work staying steady. One tiny upgrade today." :
                     "Ride the wave, stay kind to yourself.";
      const header = found.size ? `I noticed: ${[...found].join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
      const body = picked.length
        ? "Try:\n" + picked.map(t=>"• "+t).join("\n")
        : "Hydrate, 5 slow breaths, short walk, then reassess.";
      setCoachText(`${header}\n\n${body}\n\n${boost}`);
      vibrate(12);
    }

    const nextInfo = nextTwoDayIngredients(day, recipes);

    return e(React.Fragment, null,
      // Header (one straight line)
      e("div",{className:"mast card"},
        e("div",{className:"mastRow"},
          e("div",{className:"mastLeft"},
            e("img",{src:"oz.png",alt:"Oz"}),
            e("div",null,
              e("div",{style:{fontSize:20,fontWeight:800,letterSpacing:.2}}, "Oz Cleanse Companion"),
              e("div",{style:{marginTop:2,color:"#64748b",fontWeight:600,letterSpacing:.6,fontSize:12}}, day.phase.toUpperCase())
            )
          ),
          e("div",{className:"day-nav",style:{alignItems:"center"}},
            e("button",{className:"day-btn",onClick:()=>changeDay(-1),"aria-label":"Previous day"},"◀"),
            e("span",{className:"day-label"},"Day "+day.day),
            e("button",{className:"day-btn",onClick:()=>changeDay(1),"aria-label":"Next day"},"▶")
          )
        )
      ),

      e(ProgressBar,{value:progress}),

      // Checklist (phase-aware)
      e("div",{className:"card",style:{marginTop:12}},
        e(Checklist,{items, state:checks, onToggle:toggleCheck})
      ),

      // Notes + Smart Coach
      e("div",{className:"card",style:{marginTop:12}},
        e("div",{className:"coachCard", role:"button", tabIndex:0,
          onClick:runCoach, onKeyDown:(ev)=>{ if(ev.key==="Enter"||ev.key===" ") runCoach(); }},
          e("span",{className:"badge"},"🧠 Smart Coach"),
          e("div",{style:{marginTop:6,color:"var(--muted)"}}, "Tap to analyze your note and get relief + motivation")
        ),
        coachText && e("pre",{className:"coachOut", style:{whiteSpace:"pre-wrap"}}, coachText),
        e("textarea",{className:"noteArea", placeholder:"Notes…",
          value:day.note||"",
          onChange:(ev)=> setDays(prev=>{ const n=prev.slice(); const d={...n[idx]}; d.note=ev.target.value; n[idx]=d; return n; })
        })
      ),

      // Next ingredients (combined)
      e("div",{className:"card",style:{marginTop:12}},
        e("h2",null,nextInfo.label),
        nextInfo.items.length===0
          ? e("p",{style:{color:"#64748b"}}, "No recipes scheduled soon.")
          : e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
              nextInfo.items.map(it =>
                e("li",{key:it.name,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3d0e1"}},
                  e("span",null,it.name," ", e("span",{className:"badge"},
                    it.days.length===1 ? ("Day "+it.days[0]) : ("Day "+it.days[0]+"–"+it.days[it.days.length-1])
                  )),
                  e("span",{style:{color:"#64748b",fontSize:12}}, it.qty || "")
                )
              )
            )
      ),

      // Weight
      e("div",{className:"card",style:{marginTop:12}},
        e("h2",null,"Weight"),
        e("div",{className:"row",style:{alignItems:"center",gap:8,margin:"8px 0"}},
          e("label",null,"Today’s weight"),
          e("input",{type:"number", step:"0.1", inputMode:"decimal",
            value:(day.weight==null?"":day.weight),
            onChange:(ev)=>{
              const v = ev.target.value;
              setDays(prev=>{
                const next = prev.slice();
                const d = { ...next[idx] };
                d.weight = (v==="" ? null : Number(v));
                if (v !== "" && (activeIds.includes("weight") || (d.checks && "weight" in d.checks))) {
                  const c = { ...(d.checks||{}) }; c.weight = true; d.checks = c;
                }
                next[idx] = d; return next;
              });
            },
            style:{width:120}
          }),
          e("span",{className:"badge"},"Day "+day.day)
        ),
        e(WeightChart,{series:weightSeries})
      )
    );
  }

  /* App root */
  function App(){
    const [goals, setGoals] = useLocal("oz.goals", DEFAULT_GOALS);
    const [settings, setSettings] = useLocal("oz.settings", { startDate:null, phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    useEffect(()=>{ // validate templates
      const pt=settings&&settings.phaseTemplates;
      const valid=pt && ["fast","cleanse","rebuild"].every(k=> Array.isArray(pt[k]) && pt[k].every(id=> !!goals[id]));
      if(!valid) setSettings({ startDate: settings.startDate||null, phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goals]);

    const [days, setDays] = useLocal("oz.days", defaultDays());
    const [recipes, setRecipes] = useLocal("oz.recipes", PLAN_RECIPES);
    const [groceries, setGroceries] = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
    const [tab, setTab] = useState("dash");

    function importFullPlan(){
      const newDays=defaultDays(); setDays(newDays);
      setRecipes(PLAN_RECIPES);
      setGroceries(aggregateGroceries(PLAN_RECIPES));
      alert("Plan imported ✔");
    }
    function importFromChatGPTPrompt(){
      const txt = prompt("Paste ChatGPT meal-plan text or JSON:");
      if(!txt) return;
      try{
        const plan = JSON.parse(txt);
        if(!Array.isArray(plan.recipes) || !Array.isArray(plan.days)) throw new Error("bad");
        setDays(plan.days); setRecipes(plan.recipes);
        setGroceries(aggregateGroceries(plan.recipes));
        alert("Imported ✔");
      }catch{
        try{
          const parsed = parseFreeTextPlan(txt);
          setDays(parsed.days); setRecipes(parsed.recipes); setGroceries(aggregateGroceries(parsed.recipes));
          alert("Imported ✔");
        }catch(e){ alert("Couldn’t parse that text. If possible, paste JSON next time."); }
      }
    }

    return e("div",null,
      tab==="dash"      && e(Dashboard,{templates:settings.phaseTemplates, days, setDays, recipes, goals}),
      tab==="groceries" && e(GroceryList,{groceries, setGroceries}),
      tab==="calendar"  && e(Calendar,{days, recipes, settings}),
      tab==="photos"    && e(Photos,{days, setDays}),
      tab==="settings"  && e(Settings,{
        templates: settings.phaseTemplates,
        onChange: (next)=> setSettings(Object.assign({}, settings, { phaseTemplates: next })),
        onImportPlan: importFullPlan,
        goals, setGoals,
        onImportText: importFromChatGPTPrompt,
        settings, setSettings
      }),

      // Floating emoji dock (CSS centers & handles safe-area)
      e("div",{className:"tabs"},
        e("button",{className:"btn"+(tab==="dash"?" active":""),      onClick:()=>setTab("dash"),      "aria-label":"Dashboard"},"🏠"),
        e("button",{className:"btn"+(tab==="groceries"?" active":""), onClick:()=>setTab("groceries"), "aria-label":"Groceries"},"🛒"),
        e("button",{className:"btn"+(tab==="calendar"?" active":""),  onClick:()=>setTab("calendar"),  "aria-label":"Calendar"},"📅"),
        e("button",{className:"btn"+(tab==="photos"?" active":""),    onClick:()=>setTab("photos"),    "aria-label":"Photos"},"📷"),
        e("button",{className:"btn"+(tab==="settings"?" active":""),  onClick:()=>setTab("settings"),  "aria-label":"Settings"},"⚙️")
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
