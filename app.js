/* app.js — Oz Companion (modular build)
   - Expects React/ReactDOM/Chart to be loaded by index.html
   - Expects data.js to define: INITIAL_GOALS, DEFAULT_PHASE_TEMPLATES, PLAN_RECIPES, DEFAULT_PRICES
   - Safe fallbacks included if data.js is missing.
*/
"use strict";

/* ---------------- Aliases ---------------- */
const e = React.createElement;
const { useState, useEffect, useRef } = React;

/* ---------------- Helpers ---------------- */
function useLocal(key, initialValue){
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

// confetti safety (provided in index.html)
function safeConfetti(opts){ try{ if(window.confetti) window.confetti(opts); }catch(e){} }

/* ---------------- Defaults (fallbacks if data.js absent) ---------------- */
const GOALS_FALLBACK = {
  water:"💧 Drink 120–150 oz water",
  tea:"🍵 Tea",
  coffee:"☕ Coffee",
  juice:"🧃 Juices",
  lmnt:"🧂 Electrolytes",
  exercise:"🏃 Exercise",
  wholefood:"🥗 Whole food meals",
  weight:"👣 Weight check-in"
};
const TEMPLATES_FALLBACK = {
  fast:["water","tea","coffee","lmnt","exercise","weight"],
  cleanse:["water","tea","coffee","juice","lmnt","exercise","weight"],
  rebuild:["water","lmnt","exercise","wholefood","weight"]
};
// tiny starter plan in case data.js not loaded
const PLAN_FALLBACK = [
  { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:4,
    ingredients:[{key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}]
  },
  { id:"r-peach",  name:"Peachy Green Glow",  type:"juice", day:5, servings:4,
    ingredients:[{key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}]
  }
];
const PRICES_FALLBACK = {
  carrots: { unit:"each", price:0.40 },
  cucumbers: { unit:"each", price:0.75 },
  lemons: { unit:"each", price:0.60 },
  limes: { unit:"each", price:0.50 },
  peaches: { unit:"each", price:0.90 },
  grapes: { unit:"lb", price:2.50 },
  romaine: { unit:"head", price:2.00 },
  spinach: { unit:"lb", price:4.00 },
  melons: { unit:"each", price:3.50 },
  apples: { unit:"each", price:0.90 },
  ginger: { unit:"oz", price:0.25 },
  parsley: { unit:"bunch", price:1.75 },
  mint: { unit:"bunch", price:1.50 },
  "rolled-oats": { unit:"lb", price:1.80 },
  "almond-milk": { unit:"qt", price:3.50 },
  lentils: { unit:"lb", price:1.60 },
  quinoa: { unit:"lb", price:4.50 },
  "olive-oil": { unit:"fl-oz", price:0.30 },
  broccoli: { unit:"head", price:2.25 }
};

// pull from data.js or use fallbacks
const INITIAL_GOALS = (window.INITIAL_GOALS || GOALS_FALLBACK);
const DEFAULT_PHASE_TEMPLATES = (window.DEFAULT_PHASE_TEMPLATES || TEMPLATES_FALLBACK);
const PLAN_RECIPES = (window.PLAN_RECIPES || PLAN_FALLBACK);
const DEFAULT_PRICES = (window.DEFAULT_PRICES || PRICES_FALLBACK);

/* ---------------- Plan Scaffolding ---------------- */
function defaultDays(){
  const phases=["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
  return phases.map((ph,i)=>({day:i+1,phase:ph,order:null,checks:{},custom:false,note:"",weight:null,photos:[]}));
}

/* ---------------- Import (ChatGPT free-text or JSON) ---------------- */
window.ozParseFreeTextPlan = function(text){
  const days = defaultDays();
  const recipes = [];
  const lines = text.split(/\r?\n/);
  let curDay = null;
  lines.forEach((raw)=>{
    const line = raw.trim();
    const mDay = line.match(/^Day\s+(\d+)/i);
    if(mDay){ curDay = +mDay[1]; return; }
    const mJuice = line.match(/^Juice\s*\d*\s*[-:]\s*(.+)$/i);
    if(mJuice && curDay){
      recipes.push({ id:"r-"+recipes.length, name:mJuice[1].trim(), type:"juice", day:curDay, servings:4, ingredients:[] });
      return;
    }
    const mMeal = line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
    if(mMeal && curDay){
      recipes.push({ id:"m-"+recipes.length, name:mMeal[2].trim(), type:"meal", day:curDay, ingredients:[] });
      return;
    }
    const mIng = line.match(/^[•\-]\s*(.+)$/);
    if(mIng && recipes.length){
      const last = recipes[recipes.length-1];
      last.ingredients = last.ingredients || [];
      const s = mIng[1].trim();
      const m = s.match(/^(\d+(\.\d+)?(?:\s*\w+)?)\s*(.+)$/); // qty name
      if(m){
        last.ingredients.push({ key:m[3].toLowerCase().replace(/\s+/g,"-"), name:m[3], qty:m[1] });
      }else{
        last.ingredients.push({ key:s.toLowerCase().replace(/\s+/g,"-"), name:s, qty:"" });
      }
    }
  });
  return { days, recipes };
};

/* ---------------- Grocery aggregation (servings aware) ---------------- */
function aggregateGroceries(recipes){
  const factor = (r)=> (r.type==="juice" ? (r.servings || 4) : 1);
  const measure = (s)=>{ if(!s) return {n:1,u:"each"}; const m=String(s).match(/^(\d+(\.\d+)?)\s*(.*)$/); return m?{n:+m[1],u:(m[3]||"each").trim()}:{n:1,u:"each"}; };
  const fmt = (n,u)=> (u ? (Number.isInteger(n)? n : (+n).toFixed(2))+" "+u : String(n));
  const map = {};
  (recipes||[]).forEach(r=>{
    const mult = factor(r);
    (r.ingredients||[]).forEach(it=>{
      const id=(it.key||it.name||"").toLowerCase().replace(/\s+/g,'-');
      const q=measure(it.qty||"1");
      const scaled={n:q.n*mult,u:q.u};
      if(!map[id]){
        map[id]={id,name:it.name,qtyNum:scaled.n,qtyUnit:scaled.u,checked:false,estCost:null,days:r.day?[r.day]:[]};
      }else{
        map[id].qtyNum += scaled.n;
        const s=new Set(map[id].days||[]); if(r.day) s.add(r.day); map[id].days = Array.from(s).sort((a,b)=>a-b);
      }
    });
  });
  return Object.values(map).map(g=>({
    id:g.id,name:g.name,
    qty: (g.qtyUnit?fmt(g.qtyNum,g.qtyUnit):String(g.qtyNum)),
    checked:g.checked, estCost:g.estCost, days:g.days
  })).sort((a,b)=> (a.name||"").localeCompare(b.name||""));
}

/* ---------------- UI Bits ---------------- */
const ProgressBar = ({ value }) =>
  e("div", { className:"prog" },
    e("div", { className:"fill", style:{ width: Math.max(0, Math.min(100, value))+"%" } })
  );

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
  const chartRef = useRef(null);
  useEffect(()=>{
    const ctx = canvasRef.current.getContext("2d");
    if(chartRef.current){ try{ chartRef.current.destroy(); }catch{} }
    chartRef.current = new Chart(ctx, {
      type:"line",
      data:{
        labels: series.map((_,i)=>"Day "+(i+1)),
        datasets:[{
          data:series,
          borderColor:"#ec4899",
          backgroundColor:"rgba(236,72,153,.12)",
          tension:.35,
          spanGaps:true,
          pointRadius:3,
          pointHoverRadius:4
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        layout:{ padding:{ top:6, right:8, bottom:18, left:8 } },
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ display:true, ticks:{ color:"#475569", font:{ size:11 }}, grid:{ color:"rgba(148,163,184,.25)"}},
          y:{ display:true, ticks:{ color:"#475569", font:{ size:11 }}, grid:{ color:"rgba(148,163,184,.18)"}}
        },
        animation:{ duration:220 }
      }
    });
    return ()=>{ try{ chartRef.current && chartRef.current.destroy(); }catch{} };
  }, [series]);
  return e("div", { className:"chartWrap" }, e("canvas", { ref:canvasRef }));
};

/* ---------------- Grocery Page ---------------- */
const UNITS = ["each","head","lb","cup","oz","fl-oz","bunch","qt"];
function parseQty(q){
  if(!q) return { n:1, u:"each" };
  const m = String(q).match(/^(\d+(\.\d+)?)\s*(\w+)?/);
  return { n: m? +m[1] : 1, u: m && m[3] ? m[3].toLowerCase() : "each" };
}
function convert(n, from, to, name=""){
  if(from===to) return n;
  const cupToLb = { spinach: 0.0625, romaine: 0.05, grapes:0.33, parsley:0.06, mint:0.06 };
  if(from==="cup" && to==="lb"){
    const k = Object.keys(cupToLb).find(k=> name.toLowerCase().includes(k));
    return k ? n*cupToLb[k] : n*0.1;
  }
  if(from==="oz" && to==="lb") return n/16;
  if(from==="fl-oz" && to==="qt") return n/32;
  if(from==="qt" && to==="fl-oz") return n*32;
  return n; // best-effort
}

const GroceryList = ({ groceries, setGroceries }) => {
  const [budget, setBudget] = useLocal("oz.budget", 0);

  const enriched = groceries.map(g=>{
    const base = DEFAULT_PRICES[g.id] || {};
    return { ...g, unit:(g.unit||base.unit||"each"), price:(g.price!=null?g.price:(base.price||0)) };
  });

  function update(idx, patch){
    setGroceries(enriched.map((g,i)=> i===idx? {...g, ...patch} : g));
  }

  const totals = enriched.reduce((acc,g)=>{
    const {n,u} = parseQty(g.qty);
    const qtyInPriceUnit = convert(n, u, g.unit, g.name);
    const line = (g.price||0) * (isFinite(qtyInPriceUnit)?qtyInPriceUnit:0);
    if(g.checked) acc.checked += line; else acc.remaining += line;
    acc.total += line; return acc;
  }, {checked:0, remaining:0, total:0});

  function daysBadge(days){
    if(!days||!days.length) return "📦 Pantry";
    const min = Math.min(...days), max = Math.max(...days);
    return "📅 "+(min===max?("Day "+min):("Day "+min+"–"+max));
  }

  return e("div", { className:"wrap" },
    e("h1", null, "Groceries & Prices"),
    e("div",{className:"card",style:{margin:"8px 0 12px"}},
      e("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}},
        e("div",null,"Budget $"),
        e("input",{type:"number",step:"0.01",value:budget||"",placeholder:"0.00",
          onChange:(ev)=>setBudget(ev.target.value===""?0:+ev.target.value),style:{width:120}})
      ),
      e("div",{style:{marginTop:8,color:"#64748b",fontSize:13}},
        "Checked $", totals.checked.toFixed(2),
        " • Remaining $", totals.remaining.toFixed(2),
        " • Total $", totals.total.toFixed(2),
        budget? " • Left $"+Math.max(0,(budget - totals.total)).toFixed(2) : ""
      )
    ),
    e("ul", { style:{ listStyle:"none", padding:0 }},
      enriched.map((g,idx)=>
        e("li", { key:g.id, style:{
          display:"grid",gridTemplateColumns:"36px 1fr auto auto auto",gap:8,
          padding:"10px 0", borderBottom:"1px solid #f3d0e1", alignItems:"center"
        }},
          e("button", { className:"paw"+(g.checked?" on":""), onClick:()=>update(idx,{checked:!g.checked}) }),
          e("div", null,
            e("div", null, g.name, " ", e("span", { className:"badge" }, daysBadge(g.days))),
            e("div", { style:{ fontSize:12, color:"#64748b" } }, g.qty||"")
          ),
          e("select",{value:g.unit,onChange:(ev)=>update(idx,{unit:ev.target.value})},
            UNITS.map(u=> e("option",{key:u,value:u},u))),
          e("input",{
            type:"number",step:"0.01",value:(g.price==null?"":g.price),
            onChange:(ev)=>update(idx,{price:(ev.target.value===""?0:+ev.target.value)}),
            style:{width:80}}),
          e("div",{style:{textAlign:"right",minWidth:70,fontWeight:600}},
            "$"+(function(){ const {n,u}=parseQty(g.qty); const q=convert(n,u,g.unit,g.name); return ((g.price||0)*(isFinite(q)?q:0)).toFixed(2); })()
          )
        )
      )
    )
  );
};

/* ---------------- Calendar ---------------- */
const Calendar = ({ days, recipes, settings }) => {
  function dateFor(dayNum){
    const dstr = settings.phaseTemplates.__startDate || "";
    if(!dstr) return null;
    const base = new Date(dstr+"T00:00:00");
    if(isNaN(base)) return null;
    const dt = new Date(base.getTime() + (dayNum-1)*86400000);
    return dt.toLocaleDateString();
  }
  return e("div", { className:"wrap" },
    e("h1", null, "Calendar"),
    e("ul", { style:{ listStyle:"none", padding:0, marginTop:8 }},
      days.map(d=>{
        const dRecipes = recipes.filter(r=> r.day===d.day);
        const dd = dateFor(d.day);
        const hasPhotos = (d.photos && d.photos.length>0);
        const hasNote = (d.note && d.note.trim().length>0);
        return e("li", { key:d.day, className:"card", style:{ marginBottom:8 }},
          e("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }},
            e("div", null,
              e("div", { style:{ fontWeight:600 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
              dd && e("div", { className:"badge", style:{ marginTop:6 } }, dd)
            ),
            e("div", { style:{ display:"flex", gap:6, flexWrap:"wrap", minHeight:24 }},
              dRecipes.length
                ? dRecipes.map(r=> e("span", { key:r.id, className:"badge" },
                    (r.type==="juice"?"🧃 ":"🍽️ "), r.name, (r.type==="juice" && r.servings?` ×${r.servings}`:"")))
                : e("span", { style:{ fontSize:12, color:"#64748b" } }, "—"),
              hasNote && e("span",{className:"badge"},"📝 Note"),
              hasPhotos && e("span",{className:"badge"},"📸 Photos")
            )
          )
        );
      })
    )
  );
};

/* ---------------- Photos ---------------- */
const Photos = ({ days, setDays }) => {
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  function handleUpload(ev){
    const files = Array.from(ev.target.files||[]);
    if(!files.length) return;
    const readers = files.map(f => new Promise(res=>{
      const r = new FileReader(); r.onload = ()=>res(r.result); r.readAsDataURL(f);
    }));
    Promise.all(readers).then(urls=>{
      setDays(prev=>{ const next=prev.slice(); const d={...next[idx]}; d.photos=(d.photos||[]).concat(urls); next[idx]=d; return next; });
      const A=["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶","Consistency looks good on you 🌟","Radiant!","You kept a promise to yourself"];
      setTimeout(()=> alert(A[Math.floor(Math.random()*A.length)]), 50);
    });
  }

  return e("div", { className:"wrap" },
    e("h1", null, "Progress Photos"),
    e("div",{className:"card",style:{marginBottom:12,display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}},
      e("div",null, e("b",null,"Day "), day.day),
      e("div",null,
        e("button",{className:"btn",onClick:()=>setIdx(i=> (i>0?i-1:days.length-1))},"◀"),
        e("span",{className:"badge",style:{margin:"0 8px"}},"Day "+day.day),
        e("button",{className:"btn",onClick:()=>setIdx(i=> (i<days.length-1?i+1:0))},"▶")
      ),
      e("input", { type:"file", multiple:true, accept:"image/*", onChange:handleUpload })
    ),
    e("div", { style:{ display:"flex", gap:8, flexWrap:"wrap" } },
      (day.photos||[]).map((url,i)=> e("img",{ key:i, src:url, style:{ width:100, height:100, objectFit:"cover", borderRadius:8 }}))
    )
  );
};

/* ---------------- Smart Coach ---------------- */
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
    tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest eyes 5–10 minutes."] },
  { id:"dizziness", test:ctx=>ctx.syms.has("dizziness"),
    tips:["Sit or lie until steady.","Small juice or pinch of salt if fasting.","Breathe in 4 / out 6."] },
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

/* ---------------- Dashboard ---------------- */
const Dashboard = ({ templates, days, setDays, recipes, goals }) => {
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  // ingredients for today + tomorrow (or next two recipe days)
  function nextTwoDayIngredients(currentDay){
    const tryDays = (d1, d2) => {
      const want = new Set([d1, d2]); const bag = {};
      (recipes || []).forEach(r => {
        if (!r.day || !want.has(r.day)) return;
        (r.ingredients || []).forEach(it => {
          const key = (it.key || it.name || "").toLowerCase();
          if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
          if (it.qty) bag[key].qtyList.push(it.qty + (r.type==="juice" && r.servings?` ×${r.servings}`:""));
          bag[key].days.add(r.day);
        });
      });
      Object.keys(bag).forEach(k => bag[k].days = Array.from(bag[k].days).sort((a,b)=>a-b));
      return Object.values(bag).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    };
    const strict = tryDays(currentDay.day, currentDay.day + 1);
    if (strict.length) return { items: strict, label: "Today + Tomorrow — Ingredients" };

    const futureDays = Array.from(new Set((recipes||[]).filter(r => r.day >= currentDay.day).map(r => r.day))).sort((a,b)=>a-b);
    const pool = futureDays.slice(0,2);
    if (pool.length === 0) return { items: [], label: "Upcoming Ingredients" };
    const fallback = tryDays(pool[0], pool[1] || pool[0]);
    const label = pool.length === 2 ? `Upcoming Ingredients — Day ${pool[0]} & ${pool[1]}` : `Upcoming Ingredients — Day ${pool[0]}`;
    return { items: fallback, label };
  }
  const { items: nextItems, label: nextLabel } = nextTwoDayIngredients(day);

  // checklist from templates
  const templateIds = templates[day.phase] || [];
  const activeIds = (day.order && day.order.length ? day.order : templateIds);
  const items = activeIds.map(id => ({ id, label: goals[id] || id }));
  const checks = day.checks || {};
  const doneCount = items.reduce((a, it) => a + (checks[it.id] ? 1 : 0), 0);
  const totalCount = Math.max(1, items.length);
  const progress = (doneCount / totalCount) * 100;

  // confetti on 100%
  useEffect(()=>{ if (Math.round(progress) === 100) safeConfetti({ particleCount: 100, spread: 70, origin: { y: .6 } }); }, [progress]);

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
  function setPhase(p){ setDays(prev => { const next = prev.slice(); const d = { ...next[idx] }; d.phase = p; next[idx] = d; return next; }); }
  function changeDay(dir){ setIdx(cur => { let n = cur + dir; if (n < 0) n = days.length - 1; if (n >= days.length) n = 0; return n; }); }

  // Smart Coach (embedded)
  const [coachText, setCoachText] = useState("");
  const SYM_MATCHERS = [
    {id:"headache",rx:/\b(headache|migraine|head pain)\b/i},
    {id:"dizziness",rx:/\b(dizzy|light[-\s]?headed|vertigo)\b/i},
    {id:"nausea",rx:/\b(nausea|queasy|sick to (my|the) stomach)\b/i},
    {id:"fatigue",rx:/\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i},
    {id:"brain-fog",rx:/\b(brain[-\s]?fog|foggy|can.?t focus)\b/i},
    {id:"constipation",rx:/\b(constipat(ed|ion)|no (bm|bowel)|hard stool)\b/i},
    {id:"cramps",rx:/\b(cramps?|spasm)\b/i},
    {id:"cold",rx:/\b(chills?|feeling cold|freezing)\b/i},
    {id:"insomnia",rx:/\b(can.?t sleep|insomnia|up all night|poor sleep)\b/i},
    {id:"hunger",rx:/\b(hungry|starv(ed|ing)|crav(ing|es))\b/i},
    {id:"anxiety",rx:/\b(anxious|anxiety|panicky|overwhelm(ed)?)\b/i},
    {id:"bloating",rx:/\b(bloat(ed|ing)|gassy|gas)\b/i}
  ];
  function inferMood(text){
    let score = 6; const t=(text||"").toLowerCase();
    const neg=[/overwhelm|anxious|stressed|down|sad|discourag|frustrat/,/tired|exhaust|wiped|drained/,/pain|hurt|ache/].reduce((n,rx)=>n+(rx.test(t)?1:0),0);
    const pos=[/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/].reduce((n,rx)=>n+(rx.test(t)?1:0),0);
    score += pos - 2*neg; return Math.max(1, Math.min(10, score));
  }
  function runCoach(){
    const text=(day.note||"").trim();
    if(!text){ setCoachText("Write a quick note below, then tap Smart Coach."); return; }
    const found=new Set(SYM_MATCHERS.filter(m=>m.rx.test(text)).map(m=>m.id));
    const mood=inferMood(text);
    const hits=COACH_RULES.filter(r=>{ try{return r.test({syms:found,phase:day.phase});}catch{return false;} });
    const tips=hits.flatMap(h=>h.tips).slice(0,8);
    const moodBoost=(mood<=3)
      ? ["You’re not alone — let’s make today gentle.","Pick one tiny win now (8–10 oz water, 3 deep breaths).", COACH_AFFIRM[Math.floor(Math.random()*COACH_AFFIRM.length)]]
      : (mood<=6)
        ? ["Nice work staying steady. One small upgrade today.", COACH_AFFIRM[Math.floor(Math.random()*COACH_AFFIRM.length)]]
        : [COACH_AFFIRM[Math.floor(Math.random()*COACH_AFFIRM.length)], "Ride the wave, stay kind to yourself."];
    const header=found.size?`I noticed: ${Array.from(found).join(", ")}.`:"No specific symptoms spotted — here’s a steady plan.";
    const body=tips.length?("Try these:\n• "+tips.join("\n• ")):"Hydrate now, 5 slow breaths, short walk, then reassess.";
    setCoachText(`${header}\n\n${body}\n\n${moodBoost.join(" ")}`);
  }

  // weight series
  const weightSeries = days.map(d => (d.weight == null ? null : d.weight));

  return e(React.Fragment, null,
    // Masthead
    e("div",{className:"mast card"},
      e("div",{className:"mastRow"},
        e("div",{className:"mastLeft"},
          e("img",{src:"oz.png",alt:"Oz"}),
          e("div",null,
            e("div",{style:{fontSize:22,fontWeight:800,letterSpacing:.2,whiteSpace:"nowrap"}}, "Oz Companion"),
            e("div",{style:{marginTop:3,color:"#64748b",fontWeight:600,letterSpacing:.6,fontSize:12}},
              day.phase.toUpperCase()
            )
          )
        ),
        e("div",{className:"day-nav"},
          e("button",{className:"day-btn",onClick:()=>changeDay(-1),"aria-label":"Previous day"},"◀"),
          e("span",{className:"day-label"},"Day "+day.day),
          e("button",{className:"day-btn",onClick:()=>changeDay(1),"aria-label":"Next day"},"▶")
        )
      ),
      e("div",{className:"mastRow",style:{marginTop:8}},
        e("select",{value:day.phase,onChange:(ev)=>setPhase(ev.target.value),className:"btn","aria-label":"Phase"},
          e("option",{value:"fast"},"Fast"),
          e("option",{value:"cleanse"},"Cleanse"),
          e("option",{value:"rebuild"},"Rebuild")
        )
      )
    ),

    // Progress bar
    e(ProgressBar,{value:progress}),

    // Checklist
    e("div",{className:"card",style:{marginTop:12}},
      e(Checklist,{items, state:checks, onToggle:toggleCheck})
    ),

    // Notes + Smart Coach (button is the gradient chip itself)
    e("div",{className:"card",style:{marginTop:16}},
      e("div",{
        style:{
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
          padding:"12px",border:"1px solid #f3d0e1",borderRadius:14,
          background:"linear-gradient(90deg,#ffe4ef,#e9d5ff)", cursor:"pointer"
        },
        onClick: runCoach
      },
        e("div",{style:{display:"flex",alignItems:"center",gap:10,minWidth:0}},
          e("div",{style:{
            borderRadius:12,border:"1px solid #f3d0e1",background:"#fff",padding:"8px 12px",
            fontWeight:800,fontSize:16,whiteSpace:"nowrap"
          }},"🧠 Smart Coach"),
          e("div",{style:{
            color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
          }}, "Tap to analyze your note & suggest relief + motivation")
        ),
        e("div",{className:"badge"},"Coach")
      ),
      coachText && e("div",{className:"coachOut",style:{marginTop:10}}, coachText),
      e("textarea",{
        value: day.note || "",
        onChange:(ev)=>{
          const val = ev.target.value;
          setDays(prev=>{
            const next = prev.slice();
            const d = {...next[idx]}; d.note = val; next[idx] = d; return next;
          });
        },
        rows:4, className:"noteArea", style:{marginTop:10}
      })
    ),

    // Next ingredients
    e("div",{className:"card",style:{marginTop:16}},
      e("h2", null, nextLabel),
      nextItems.length === 0
        ? e("p",{style:{color:"#64748b"}},"No recipes scheduled soon.")
        : e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
            nextItems.map(item =>
              e("li",{key:item.name,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3d0e1"}},
                e("span", null,
                  item.name, " ",
                  e("span",{className:"badge"},
                    item.days.length === 1 ? ("Day " + item.days[0]) : ("Day " + item.days[0] + "–" + item.days[item.days.length - 1])
                  )
                ),
                e("span",{style:{color:"#64748b",fontSize:12}}, item.qtyList.join(" + ") || "")
              )
            )
          )
    ),

    // Weight
    e("div",{className:"card",style:{marginTop:16}},
      e("h2",null,"Weight"),
      e("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}},
        e("label",null,"Today’s weight"),
        e("input",{
          type:"number", step:"0.1",
          value:(day.weight==null?"":day.weight),
          onChange:(ev)=>{
            const v = ev.target.value;
            setDays(prev=>{
              const next = prev.slice();
              const d = { ...next[idx] };
              d.weight = (v==="" ? null : Number(v));
              if (v !== "" && ((d.checks && "weight" in d.checks) || activeIds.indexOf("weight") !== -1)) {
                const c = { ...(d.checks || {}) }; c.weight = true; d.checks = c;
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
};

/* ---------------- Settings (goal modal + import) ---------------- */
const Settings = ({ templates, onChange, onImportPlan, goals, setGoals }) => {
  const [local, setLocal] = useState(templates);
  const [showModal, setShowModal] = useState(false);
  const [modalPhase, setModalPhase] = useState("fast");
  const [modalChecked, setModalChecked] = useState({});

  useEffect(()=>{ setLocal(templates); }, [templates]);

  function openModal(phase){
    setModalPhase(phase);
    const sel = new Set(local[phase]||[]);
    const all = Object.keys(goals).reduce((m,id)=> (m[id]=sel.has(id), m), {});
    setModalChecked(all);
    setShowModal(true);
  }
  function saveModal(){
    const nextIds = Object.keys(modalChecked).filter(id=> modalChecked[id]);
    const next = Object.assign({}, local); next[modalPhase]=nextIds; setLocal(next); onChange(next);
    setShowModal(false);
  }
  function toggleModalId(id){ setModalChecked(prev=> Object.assign({}, prev, {[id]: !prev[id]})); }
  function createGoal(){
    const idRaw = prompt("New goal ID (letters, numbers, dashes), e.g., meditation");
    if(!idRaw) return;
    const id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,'');
    if(!id) return alert("Invalid ID.");
    if(goals[id]) return alert("That goal ID already exists.");
    const label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
    if(!label) return;
    setGoals(prev=> Object.assign({}, prev, {[id]:label}));
    setModalChecked(prev=> Object.assign({}, prev, {[id]: true}));
  }

  return e("div",{className:"wrap"},
    e("h1",null,"Settings"),
    e("div",{className:"card",style:{marginBottom:12}},
      e("h2",null,"Phase Templates"),
      e("p",{style:{margin:"6px 0 12px",color:"#64748b"}}, "Choose which goals appear by default in each phase."),
      ["fast","cleanse","rebuild"].map(phase =>
        e("div",{key:phase,style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}},
          e("div",null, e("b",null, phase.charAt(0).toUpperCase()+phase.slice(1)), " — ",
            (local[phase]||[]).map(id=> e("span",{key:id,className:"badge",style:{marginRight:6}}, goals[id]||id))
          ),
          e("button",{className:"btn",onClick:()=>openModal(phase)},"Edit Goals")
        )
      )
    ),
    e("div",{className:"card",style:{marginTop:8}},
      e("h2",null,"Import 11-Day Plan"),
      e("p",{style:{color:"#64748b",margin:"6px 0 12px"}},"Reloads all juices/meals and rebuilds the grocery list."),
      e("button",{className:"btn",onClick:onImportPlan},"Import Plan"),
      e("button",{className:"btn",style:{marginLeft:8},onClick:importFromChatGPTPrompt},"Import from ChatGPT text")
    ),

    // Modal
    e("div",{className:"modal"+(showModal?" show":""), onClick:(ev)=>{ if(ev.target.classList.contains("modal")) setShowModal(false); }},
      e("div",{className:"sheet"},
        e("h2",null,"Edit Goals — ", modalPhase.charAt(0).toUpperCase()+modalPhase.slice(1)),
        e("div",{style:{maxHeight:"48vh",overflow:"auto",margin:"8px 0 12px"}},
          Object.keys(goals).map(id =>
            e("label",{key:id,style:{display:"flex",alignItems:"center",gap:8,padding:"8px 6px",borderBottom:"1px solid #f3d0e1"}},
              e("input",{type:"checkbox",checked:!!modalChecked[id],onChange:()=>toggleModalId(id)}),
              e("span",null,goals[id])
            )
          )
        ),
        e("div",{style:{display:"flex",gap:8,justifyContent:"space-between"}},
          e("button",{className:"btn",onClick:createGoal},"+ New Goal"),
          e("div",null,
            e("button",{className:"btn",onClick:()=>setShowModal(false)},"Cancel"),
            e("button",{className:"btn primary",onClick:saveModal,style:{marginLeft:8}},"Save")
          )
        )
      )
    )
  );
};

/* ---------------- App ---------------- */
const App = () => {
  const [goals, setGoals] = useLocal("oz.goals", INITIAL_GOALS);
  const [settings, setSettings] = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
  useEffect(()=>{ // validate templates vs goals
    const pt=settings&&settings.phaseTemplates;
    const valid=pt&&["fast","cleanse","rebuild"].every(k=> Array.isArray(pt[k]) && pt[k].every(id=>!!goals[id]));
    if(!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[goals]);

  const [days, setDays] = useLocal("oz.days", defaultDays());
  const [recipes, setRecipes] = useLocal("oz.recipes", PLAN_RECIPES);
  const [groceries, setGroceries] = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
  const [tab, setTab] = useState("dash");

  function importFullPlan(){
    const newDays = defaultDays(); setDays(newDays);
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
        const parsed = window.ozParseFreeTextPlan(txt);
        setDays(parsed.days); setRecipes(parsed.recipes);
        setGroceries(aggregateGroceries(parsed.recipes));
        alert("Imported ✔");
      }catch(e){ alert("Couldn’t parse that text. If possible, paste JSON next time."); }
    }
  }

  return e("div", {},
    tab==="dash" && e(Dashboard, { templates: settings.phaseTemplates, days, setDays, recipes, goals }),
    tab==="groceries" && e(GroceryList, { groceries, setGroceries }),
    tab==="calendar"  && e(Calendar, { days, recipes, settings }),
    tab==="photos"    && e(Photos, { days, setDays }),
    tab==="settings"  && e(Settings, {
      templates: settings.phaseTemplates,
      onChange: (next)=> setSettings({ phaseTemplates: next }),
      onImportPlan: importFullPlan,
      goals, setGoals
    }),

    e("div", { className:"tabs" },
      e("button",{className:"btn"+(tab==="dash"?" active":""),onClick:()=>setTab("dash")},"Dashboard"),
      e("button",{className:"btn"+(tab==="groceries"?" active":""),onClick:()=>setTab("groceries")},"Groceries"),
      e("button",{className:"btn"+(tab==="calendar"?" active":""),onClick:()=>setTab("calendar")},"Calendar"),
      e("button",{className:"btn"+(tab==="photos"?" active":""),onClick:()=>setTab("photos")},"Photos"),
      e("button",{className:"btn"+(tab==="settings"?" active":""),onClick:()=>setTab("settings")},"Settings")
    )
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
