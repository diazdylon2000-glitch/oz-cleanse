/* Oz Companion — v18
   - Centered splash with randomized affirmations
   - One-line header (photo + title + day selector)
   - Paw checklist, customizable via Settings
   - Smart Coach (streamlined, friendlier tips)
   - Notes & Photos tracked; everything persisted to localStorage
   - Weight input + chart (no zoom)
   - Calendar: during cleanse, shows one of each 4 juices for the day
   - Grocery list aggregated from plan (matches the 11-day)
   - Bigger confetti when 100% complete
   - Floating emoji dock
*/

(function(){
  const e = React.createElement;
  const {useState,useEffect,useMemo,useRef} = React;

  // ---------- Splash (random affirmation) ----------
  const AFFS = [
    "Hydration is happiness 🐾","Small habits, big change","Strong body, calm mind",
    "Sip, breathe, reset","Consistency > intensity","You’re doing great",
    "One choice at a time","Gentle + steady wins","Future-you says thanks",
    "Shine time ✨","You’ve got this 💪"
  ];
  (function showSplash(){
    const p = document.getElementById("splashAff");
    if(p){ p.textContent = AFFS[Math.floor(Math.random()*AFFS.length)]; }
    // hard timeout failsafe
    setTimeout(()=>{ const s=document.getElementById("splash"); if(s) s.style.display="none"; }, 2200);
  })();

  // ---------- Utils ----------
  function useLocal(key, initial){
    const [val,setVal] = useState(()=>{
      try{
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : initial;
      }catch{ return initial; }
    });
    useEffect(()=>{ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} },[key,val]);
    return [val,setVal];
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  // Plan + goals
  const GOALS_DEFAULT = {
    water:"💧 Drink 120–150 oz water",
    tea:"🍵 Tea",
    coffee:"☕ Coffee",
    lmnt:"🧂 Electrolytes",
    exercise:"🏃 Exercise",
    weight:"👣 Weight check-in",
  };
  const PHASES = ["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];

  // Default recipes (4 juices days 4–7)
  const PLAN_RECIPES = [
    {id:"j1", name:"Melon Mint Morning", type:"juice", day:4},
    {id:"j2", name:"Peachy Green Glow",  type:"juice", day:4},
    {id:"j3", name:"Carrot Apple Ginger", type:"juice", day:4},
    {id:"j4", name:"Grape Romaine Cooler", type:"juice", day:4},

    {id:"j5", name:"Melon Mint Morning", type:"juice", day:5},
    {id:"j6", name:"Peachy Green Glow",  type:"juice", day:5},
    {id:"j7", name:"Carrot Apple Ginger", type:"juice", day:5},
    {id:"j8", name:"Grape Romaine Cooler", type:"juice", day:5},

    {id:"j9", name:"Melon Mint Morning", type:"juice", day:6},
    {id:"j10", name:"Peachy Green Glow",  type:"juice", day:6},
    {id:"j11", name:"Carrot Apple Ginger", type:"juice", day:6},
    {id:"j12", name:"Grape Romaine Cooler", type:"juice", day:6},

    {id:"j13", name:"Melon Mint Morning", type:"juice", day:7},
    {id:"j14", name:"Peachy Green Glow",  type:"juice", day:7},
    {id:"j15", name:"Carrot Apple Ginger", type:"juice", day:7},
    {id:"j16", name:"Grape Romaine Cooler", type:"juice", day:7},

    // Rebuild examples
    {id:"m1", name:"Smoothie Breakfast", type:"meal", day:8},
    {id:"m2", name:"Lentil Soup", type:"meal", day:8},
    {id:"m3", name:"Simple Veg Broth", type:"meal", day:9},
    {id:"m4", name:"Baked Sweet Potato Bowl", type:"meal", day:9},
    {id:"m5", name:"Overnight Oats", type:"meal", day:10},
    {id:"m6", name:"Quinoa Salad", type:"meal", day:10},
    {id:"m7", name:"Protein + Broccoli", type:"meal", day:11},
  ];

  function defaultDays(){
    return PHASES.map((ph,i)=>({
      day:i+1, phase:ph, checks:{}, note:"", weight:null, photos:[]
    }));
  }

  // ---------- Header ----------
  function Header({day,phase,onPrev,onNext}){
    return e("div",{className:"header"},
      e("div",{className:"header-left"},
        e("img",{src:"oz.png",alt:"Oz",className:"header-oz"}),
        e("div",{className:"title-stack"},
          e("div",{className:"title"},"Oz Companion"),
          e("div",{className:"phase"}, phase.toUpperCase())
        )
      ),
      e("div",{className:"day-stack"},
        e("button",{className:"day-btn",onClick:onPrev,"aria-label":"Previous day"},"◀"),
        e("div",{className:"day-pill"},"Day ",day),
        e("button",{className:"day-btn",onClick:onNext,"aria-label":"Next day"},"▶")
      )
    );
  }

  // ---------- Checklist ----------
  function Checklist({items, state, onToggle}){
    return e("ul",{className:"list"},
      items.map(it =>
        e("li",{key:it.id,className:"item"},
          e("button",{className:"paw"+(state[it.id]?" on":""),onClick:()=>onToggle(it.id)}, state[it.id]?"🐾":""),
          e("div",null,it.label)
        )
      )
    );
  }

  // ---------- Coach ----------
  const COACH_RULES = [
    { id:"headache", test:t=>/\b(headache|migraine)\b/i.test(t),
      tips:["12–16 oz water now","Add LMNT or sea salt","Dim the lights 5–10 min"] },
    { id:"dizzy", test:t=>/\b(dizzy|light[- ]?headed)\b/i.test(t),
      tips:["Sit or lie until steady","Small juice if fasting","Slow breathing 4/6"] },
    { id:"nausea", test:t=>/\b(nausea|queasy)\b/i.test(t),
      tips:["Ginger or peppermint tea","Cool water sips","Fresh air + slow moves"] },
    { id:"fatigue", test:t=>/\b(tired|fatigue|wiped)\b/i.test(t),
      tips:["15–20 min rest","Hydrate + electrolytes","2 min gentle stretch"] },
    { id:"hunger", test:t=>/\b(hungry|craving|starving)\b/i.test(t),
      tips:["12 oz water first","Scheduled juice slowly","5 min walk reset"] },
  ];
  function coachAnalyze(text,phase){
    const t = (text||"").trim();
    if(!t) return "Write a quick note below, then tap Coach.";
    const hits = COACH_RULES.filter(r=>r.test(t)).flatMap(r=>r.tips);
    const base = (phase==="cleanse")
      ? "Juice about every 3 hours; sip slowly, breathe between sips."
      : (phase==="rebuild")
        ? "Chew well, stop at 80% full, pair protein + veg."
        : "Steady water and a short walk go a long way.";
    const extra = hits.length ? ("Try:\n• " + hits.slice(0,6).join("\n• ")) : "Hydrate now, 5 slow breaths, then a tiny action.";
    return base + "\n\n" + extra;
  }

  // ---------- Weight chart ----------
  function WeightChart({series}){
    const ref = useRef(null);
    const chart = useRef(null);
    useEffect(()=>{
      const el = ref.current;
      if(!el) return;
      if(chart.current){ try{ chart.current.destroy(); }catch{} }
      chart.current = new Chart(el,{
        type:"line",
        data:{ labels:series.map((_,i)=>"Day "+(i+1)),
          datasets:[{data:series, borderColor:"#ec4899", backgroundColor:"rgba(236,72,153,.08)", tension:.35, spanGaps:true, pointRadius:3}]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, animation:{duration:250},
          scales:{ x:{ticks:{color:"#6b7a87",font:{size:11}}}, y:{ticks:{color:"#6b7a87",font:{size:11}}} } }
      });
      return ()=>{ try{ chart.current && chart.current.destroy(); }catch{} };
    },[series.join("|")]);
    return e("div",{className:"chartWrap"}, e("canvas",{ref}));
  }

  // ---------- Pages ----------
  function Dashboard({days,setDays,recipes,goals}){
    const [idx,setIdx] = useState(0);
    const day = days[idx] || days[0];
    const activeIds = Object.keys(goals);
    const items = activeIds.map(id=>({id,label:goals[id]}));
    const checks = day.checks || {};

    const done = items.reduce((n,it)=> n + (checks[it.id]?1:0), 0);
    const progress = items.length ? (done/items.length)*100 : 0;

    useEffect(()=>{
      if(Math.round(progress)===100 && window.confetti){
        confetti({particleCount:120, spread:75, startVelocity:55, origin:{y:.6}});
        setTimeout(()=>confetti({particleCount:80, spread:65, startVelocity:45, origin:{y:.7}}), 220);
      }
    },[progress]);

    function toggle(id){
      setDays(prev=>{
        const next = prev.slice();
        const d = {...next[idx]};
        d.checks = {...(d.checks||{}), [id]: !d.checks?.[id]};
        next[idx] = d; return next;
      });
    }
    function changeDay(delta){
      setIdx(i=>{
        let n = i+delta; if(n<0) n=days.length-1; if(n>=days.length) n=0; return n;
      });
    }

    const coachText = coachAnalyze(day.note, day.phase);

    // Weight series
    const weightSeries = days.map(d=>d.weight==null?null:d.weight);

    // Next two days ingredients (list recipe names)
    const nextLabel = "Upcoming Ingredients — Day "+day.day+" & "+(day.day+1);
    const nextItems = recipes
      .filter(r => r.day===day.day || r.day===day.day+1)
      .reduce((m,r)=>{ m[r.name]=(m[r.name]||0)+1; return m; },{});
    const nextList = Object.keys(nextItems).sort();

    return e("div",{className:"wrap"},
      e(Header,{day:day.day,phase:day.phase,onPrev:()=>changeDay(-1),onNext:()=>changeDay(1)}),

      e("div",{className:"progress",style:{margin:"12px 2px 8px"}}, e("i",{style:{width:progress+"%"}})),

      e("div",{className:"card"},
        e(Checklist,{items,state:checks,onToggle:toggle})
      ),

      e("div",{className:"card"},
        e("div",{className:"coach",onClick:()=>alert("Coach says:\n\n"+coachText), role:"button",tabIndex:0},
          e("span",null,"🧠"),
          e("div",null, e("div",{className:"coachTitle"},"Smart Coach"),
            e("div",{className:"muted"},"Tap to analyze your note and get relief + motivation")
          )
        ),
        day.note && e("div",{className:"coachOut",style:{marginTop:10}}, coachText),
        e("textarea",{className:"note",placeholder:"Notes…",value:day.note||"",
          onChange:(ev)=>{
            const v = ev.target.value;
            setDays(prev=>{ const next=prev.slice(); const d={...next[idx]}; d.note=v; next[idx]=d; return next; });
          }})
      ),

      e("div",{className:"card"},
        e("h2",null,"Weight"),
        e("div",{style:{display:"flex",alignItems:"center",gap:10,margin:"8px 0"}},
          e("label",null,"Today"),
          e("input",{type:"number", inputMode:"decimal", step:"0.1", style:{width:120,fontSize:16},
            value: (day.weight==null?"":day.weight),
            onChange:(ev)=>{
              const v = ev.target.value;
              setDays(prev=>{ const next=prev.slice(); const d={...next[idx]}; d.weight=(v===""?null:Number(v)); next[idx]=d; return next; });
            }})
        ),
        e(WeightChart,{series:weightSeries})
      ),

      e("div",{className:"card"},
        e("h2",null,nextLabel),
        nextList.length===0 ? e("div",{className:"muted"},"No recipes scheduled in the next two days.")
          : e("ul",{className:"list"}, nextList.map(name =>
              e("li",{key:name,className:"item"}, e("div",null,name))
            ))
      )
    );
  }

  function Calendar({days,recipes}){
    // For cleanse days (4–7), there should be 4 *distinct* juices each day
    const dayRecipes = (d) => {
      const list = recipes.filter(r=>r.day===d.day);
      if(d.phase==="cleanse"){
        // unique juices (one of each)
        const uniq = [];
        const seen = new Set();
        list.forEach(r=>{
          if(r.type==="juice" && !seen.has(r.name)){ seen.add(r.name); uniq.push(r); }
        });
        return uniq;
      }
      return list;
    };

    return e("div",{className:"wrap"},
      e("h1",null,"Calendar"),
      e("div",{className:"card"},
        e("ul",{className:"list"},
          days.map(d =>
            e("li",{key:d.day,className:"item"},
              e("div",null, e("strong",null,"Day ",d.day," — ", d.phase.toUpperCase()),
                e("div",{className:"tags"},
                  dayRecipes(d).length===0
                    ? e("span",{className:"muted"},"—")
                    : dayRecipes(d).map(r=> e("span",{key:r.id,className:"tag"}, (r.type==="juice"?"🧃 ":"🍽️ "), r.name))
                )
              ),
              e("span",{className:"badge"}, (d.phase==="cleanse" ? "4 juices" : dayRecipes(d).length+" items"))
            )
          )
        )
      )
    );
  }

  function aggregateGroceries(recipes){
    // very light aggregation by name
    const map = {};
    recipes.forEach(r=>{
      (map[r.name] = map[r.name] || {name:r.name, qty:1, checked:false}).qty += 0;
    });
    return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
  }

  function Grocery({groceries,setGroceries}){
    return e("div",{className:"wrap"},
      e("h1",null,"Groceries & Prices"),
      e("div",{className:"card grow"},
        groceries.length===0 ? e("div",{className:"muted"},"No items yet — import a plan in Settings.")
          : groceries.map((g,idx)=>
              e("div",{key:g.name,className:"row"},
                e("button",{className:"paw"+(g.checked?" on":""),onClick:()=>{
                  setGroceries(prev=> prev.map((x,i)=> i===idx ? {...x,checked:!x.checked} : x));
                }}, g.checked?"🐾":""),
                e("div",null,g.name),
                e("input",{className:"price", type:"number", step:"0.01",
                  placeholder:"$", value:(g.price??""),
                  onChange:(ev)=>{
                    const v = ev.target.value;
                    setGroceries(prev=> prev.map((x,i)=> i===idx ? {...x,price:(v===""?null:Number(v))} : x));
                  }})
              )
            )
      )
    );
  }

  function Photos({days,setDays}){
    const [idx,setIdx] = useState(0);
    const d = days[idx] || days[0];
    function upload(ev){
      const files = Array.from(ev.target.files||[]);
      if(!files.length) return;
      Promise.all(files.map(f=> new Promise(res=>{
        const r = new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f);
      }))).then(urls=>{
        setDays(prev=>{
          const next=prev.slice(); const dd={...next[idx]};
          dd.photos = (dd.photos||[]).concat(urls); next[idx]=dd; return next;
        });
        const A = ["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶"];
        alert(A[Math.floor(Math.random()*A.length)]);
      });
    }
    return e("div",{className:"wrap"},
      e("h1",null,"Progress Photos"),
      e("label",{className:"upload"},"Upload photo(s)",
        e("input",{type:"file",accept:"image/*",multiple:true,onChange:upload})
      ),
      e("div",{className:"card"},
        e("div",{className:"tags"},
          e("button",{className:"btn",onClick:()=>setIdx(i=>i>0?i-1:days.length-1)},"◀"),
          e("span",{className:"badge"},"Day ", d.day),
          e("button",{className:"btn",onClick:()=>setIdx(i=>i<days.length-1?i+1:0)},"▶")
        ),
        e("div",{className:"gridPhotos",style:{marginTop:12}},
          (d.photos||[]).map((src,i)=>
            e("figure",{key:i,className:"photo"},
              e("img",{src,alt:"progress"}),
              e("figcaption",null,"#" + (i+1)),
              e("button",{className:"btn",style:{width:"100%"},onClick:()=>{
                setDays(prev=>{
                  const next=prev.slice(); const dd={...next[idx]};
                  dd.photos = (dd.photos||[]).filter((_,k)=>k!==i); next[idx]=dd; return next;
                });
              }},"Delete")
            )
          )
        )
      )
    );
  }

  function Settings({settings,setSettings,setDays,setRecipes,setGroceries,goals,setGoals}){
    function importDefault(){
      setRecipes(PLAN_RECIPES);
      setGroceries(aggregateGroceries(PLAN_RECIPES));
      setDays(defaultDays());
      alert("Default 11-day plan loaded ✔");
    }
    function importFromText(){
      const txt = prompt("Paste plan JSON or lines like:\nDay 4\nJuice: Melon Mint Morning\nMeal: Lentil Soup");
      if(!txt) return;
      try{
        const parsed = JSON.parse(txt);
        if(Array.isArray(parsed.recipes)){
          setRecipes(parsed.recipes);
          setGroceries(aggregateGroceries(parsed.recipes));
          alert("Plan imported ✔");
          return;
        }
      }catch{}
      // very light free-text parser (name + type + day)
      const lines = String(txt).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      const out = [];
      let curDay=null;
      lines.forEach(L=>{
        let m = L.match(/^Day\s+(\d+)/i);
        if(m){ curDay = +m[1]; return; }
        m = L.match(/^(Juice|Meal)\s*[:\-]\s*(.+)$/i);
        if(m && curDay){ out.push({id:"x"+(out.length+1),name:m[2],type:(/juice/i.test(m[1])?"juice":"meal"),day:curDay}); }
      });
      if(out.length){ setRecipes(out); setGroceries(aggregateGroceries(out)); alert("Plan imported ✔"); }
      else alert("Couldn’t parse that. Paste JSON if possible.");
    }
    function toggleGoal(){
      const id = prompt("New goal ID (e.g., meditation)");
      if(!id) return;
      const label = prompt("Label to display (emoji + text)");
      if(!label) return;
      setGoals(prev=>({...prev,[id]:label}));
      alert("Goal added. It will appear on Dashboard.");
    }
    return e("div",{className:"wrap"},
      e("h1",null,"Settings"),
      e("div",{className:"card"},
        e("div",{style:{display:"grid",gap:10}},
          e("label",null,"Start date",
            e("input",{type:"date", value:settings.startDate||"",
              onChange:(ev)=> setSettings(prev=>({...prev,startDate:(ev.target.value||null)})) })
          ),
          e("div",null,e("button",{className:"btn primary",onClick:importDefault},"Import default 11-day plan"),
            e("button",{className:"btn",style:{marginLeft:8},onClick:importFromText},"Import from ChatGPT text"))
        )
      ),
      e("div",{className:"card"},
        e("h2",null,"Checklist goals"),
        e("div",{className:"tags"},
          Object.keys(goals).map(id=> e("span",{key:id,className:"tag"}, goals[id]))
        ),
        e("button",{className:"btn",style:{marginTop:8},onClick:toggleGoal},"+ Add goal")
      )
    );
  }

  // ---------- App ----------
  function App(){
    const [goals,setGoals] = useLocal("oz.goals", GOALS_DEFAULT);
    const [settings,setSettings] = useLocal("oz.settings", {startDate:null});
    const [days,setDays] = useLocal("oz.days", defaultDays());
    const [recipes,setRecipes] = useLocal("oz.recipes", PLAN_RECIPES);
    const [groceries,setGroceries] = useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
    const [tab,setTab] = useState("dash");

    // hide splash once React is up
    useEffect(()=>{ const s=document.getElementById("splash"); if(s) s.style.display="none"; },[]);

    return e(React.Fragment,null,
      tab==="dash"     && e(Dashboard,{days,setDays,recipes,goals}),
      tab==="grocery"  && e(Grocery,{groceries,setGroceries}),
      tab==="calendar" && e(Calendar,{days,recipes}),
      tab==="photos"   && e(Photos,{days,setDays}),
      tab==="settings" && e(Settings,{settings,setSettings,setDays,setRecipes,setGroceries,goals,setGoals}),

      e("nav",{className:"tabs"},
        [
          {id:"dash",icon:"🏠",label:"Dashboard"},
          {id:"grocery",icon:"🛒",label:"Groceries"},
          {id:"calendar",icon:"📅",label:"Calendar"},
          {id:"photos",icon:"📷",label:"Photos"},
          {id:"settings",icon:"⚙️",label:"Settings"},
        ].map(t =>
          e("button",{key:t.id,className:"btn"+(tab===t.id?" active":""),onClick:()=>setTab(t.id),"aria-label":t.label}, t.icon)
        )
      )
    );
  }

  // Global error -> show banner + kill splash
  window.addEventListener("error",(ev)=>{
    const b = document.getElementById("errorBanner");
    if(!b) return;
    const msg = ev.error?.message || ev.message || "Unknown error";
    b.textContent = "App error: " + msg;
    b.style.display = "block";
    const s=document.getElementById("splash"); if(s) s.style.display="none";
  });

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
