/* Oz Cleanse Companion — V15.0 (patched)
   - Splash + randomized affirmation (fades out)
   - Header: avatar + single-line title, phase under title
   - Smart Coach outputs a bulleted list
   - Calendar: forces 4 juices per cleanse day (1 of each)
   - Settings tab restored
   - Groceries, Photos, Weight chart, Notes — preserved
*/
(function(){
  const e = React.createElement;
  const {useState,useEffect,useRef} = React;

  /* ----------------- Error Banner ----------------- */
  window.addEventListener("error", (ev) => {
    const box = document.getElementById("errorBanner");
    if (!box) return;
    box.textContent = "Error: " + (ev.error?.message || ev.message);
    box.style.display = "block";
    const s = document.getElementById("ozSplash");
    if (s) s.style.display = "none";
  });

  /* ----------------- Helpers ----------------- */
  function useLocal(key, initial) {
    const [val, setVal] = useState(() => {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
      catch { return initial; }
    });
    useEffect(() => { try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }, [key,val]);
    return [val, setVal];
  }
  function vibrate(ms=12){ try{ navigator.vibrate && navigator.vibrate(ms) }catch{} }

  const AFFS = [
    "Hydration is happiness 🐾","Small habits, big change","Strong body, calm mind",
    "Sip, breathe, reset","You’ve got this!","Future-you says thanks",
    "Gentle + consistent + kind","One step at a time","Momentum loves you"
  ];
  function nextAff(){
    try{
      const used=JSON.parse(localStorage.getItem("oz.aff.used")||"[]");
      const pool=AFFS.filter(a=>!used.includes(a));
      const pick=(pool.length?pool:AFFS)[Math.floor(Math.random()* (pool.length?pool.length:AFFS.length))];
      const u=[...used,pick].slice(-AFFS.length);
      localStorage.setItem("oz.aff.used", JSON.stringify(u));
      return pick;
    }catch{ return AFFS[0]; }
  }

  /* ------------ Plan recipes (juices + rebuild meals) ------------ */
  // Four standard juices for cleanse-day expansion:
  const CLEANSE_TEMPLATES = [
    { baseId:"green",  name:"Green Juice",        type:"juice" },
    { baseId:"carrot", name:"Carrot-Apple",       type:"juice" },
    { baseId:"beet",   name:"Beet-Citrus",        type:"juice" },
    { baseId:"ginger", name:"Citrus-Ginger",      type:"juice" },
  ];

  // Minimal seeds; you can extend these with your real plan. Expansion will still show 4/day.
  const PLAN_RECIPES = [
    { id:"d4-green",  name:"Green Juice",   type:"juice", day:4, servings:1, ingredients:[{name:"Spinach",qty:"2 cup"}] },
    { id:"d5-carrot", name:"Carrot-Apple",  type:"juice", day:5, servings:1, ingredients:[{name:"Carrots",qty:"6"}] },
    { id:"d6-beet",   name:"Beet-Citrus",   type:"juice", day:6, servings:1, ingredients:[{name:"Beets",qty:"2"}] },
    { id:"d7-ginger", name:"Citrus-Ginger", type:"juice", day:7, servings:1, ingredients:[{name:"Ginger",qty:'1"'}] },

    // (Rebuild sample items can be added; groceries aggregation will adapt.)
  ];

  /* ------------ Phase templates & goals ------------ */
  const GOAL_LABELS = {
    water:"💧 Drink 120–150 oz water", tea:"🍵 Tea", coffee:"☕ Coffee", lmnt:"🧂 Electrolytes",
    exercise:"🏃 Exercise", wholefood:"🥗 Whole food meals", weight:"👣 Weight check-in", juices:"🧃 Juices"
  };
  const DEFAULT_PHASE_TEMPLATES = {
    fast:["water","tea","coffee","lmnt","exercise","weight"],
    cleanse:["water","tea","coffee","juices","lmnt","exercise","weight"],
    rebuild:["water","lmnt","exercise","wholefood","weight"]
  };

  function defaultDays(){
    const phases=["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    return phases.map((ph,i)=>({day:i+1, phase:ph, checks:{}, note:"", weight:null, photos:[]}));
  }

  /* ------------ Splash: random bubble text then fade ------------ */
  (function(){
    const bubble = document.getElementById("ozBubble");
    if (bubble) bubble.textContent = nextAff();
    window.addEventListener("load", () => {
      setTimeout(() => {
        const s=document.getElementById("ozSplash");
        if(s) s.classList.add("fade-out");
        if(bubble) bubble.classList.add("fade-out");
        setTimeout(()=>{ if(s) s.style.display="none"; }, 650);
      }, 1200);
    });
  })();

  /* ================= Components ================= */

  const Progress = ({value}) => e("div",{className:"prog"}, e("i",{style:{width:Math.max(0,Math.min(100,value))+"%"}}));

  const Checklist = ({ items, state, onToggle }) =>
    e("ul",{style:{listStyle:"none",padding:0,margin:0}},
      items.map(it =>
        e("li",{key:it.id, className:"row", style:{padding:"10px 0",borderBottom:"1px solid var(--line)"}},
          e("button",{className:"paw"+(state[it.id]?" on":""), onClick:()=>onToggle(it.id)}, state[it.id]?"🐾":""),
          e("div",null, it.label)
        )
      )
    );

  const WeightChart = ({series}) => {
    const ref=useRef(null), chartRef=useRef(null);
    useEffect(()=>{
      const ctx=ref.current?.getContext("2d");
      if(!ctx) return;
      if(chartRef.current) try{ chartRef.current.destroy(); }catch{}
      chartRef.current=new Chart(ctx,{
        type:"line",
        data:{ labels:series.map((_,i)=>"Day "+(i+1)), datasets:[{data:series,borderColor:"#ec4899",backgroundColor:"rgba(236,72,153,.12)",tension:.35,spanGaps:true,pointRadius:3}]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
          scales:{ x:{ticks:{color:"#6a7a90",font:{size:11}}}, y:{ticks:{color:"#6a7a90",font:{size:11}}} },
          animation:{duration:250}
        }
      });
      return ()=>{ try{chartRef.current && chartRef.current.destroy();}catch{} };
    },[series]);
    return e("div",{style:{height:180}}, e("canvas",{ref}));
  };

  /* ------------ Pages ------------ */

  function Dashboard({days,setDays,templates,goals,recipes}){
    const [idx,setIdx]=useState(0);
    const day=days[idx]||days[0];

    const templateIds=templates[day.phase]||[];
    const activeIds=(day.order&&day.order.length?day.order:templateIds);
    const items=activeIds.map(id=>({id,label:goals[id]||id}));
    const checks=day.checks||{};
    const done=items.reduce((a,it)=>a+(checks[it.id]?1:0),0);
    const total=Math.max(1,items.length);
    const progress=done/total*100;

    useEffect(()=>{
      if(Math.round(progress)===100){
        try{ confetti({ particleCount:160, spread:72, ticks:240, scalar:1.1, origin:{y:.7} }); }catch{}
        vibrate(25);
      }
    },[progress]);

    function changeDay(d){ setIdx(i=> (i+d+days.length)%days.length ); }
    function toggle(id){
      setDays(prev=>{ const n=prev.slice(); const d={...n[idx]};
        d.checks={...(d.checks||{}), [id]: !d.checks?.[id]}; n[idx]=d; return n; });
    }

    // Smart Coach (formatted list)
    const [coach,setCoach]=useState(null);
    function runCoach(){
      const txt=(day.note||"").toLowerCase();
      if(!txt) { setCoach({header:"Write a quick note below, then tap Smart Coach.", tips:[], boost:""}); return; }
      const found=new Set();
      if(/headache|migraine|head pain/.test(txt)) found.add("headache");
      if(/dizzy|light.?headed|vertigo/.test(txt))   found.add("dizziness");
      if(/nausea|queasy|sick to (my|the) stomach/.test(txt)) found.add("nausea");
      if(/tired|fatigue|exhaust/.test(txt))         found.add("fatigue");
      if(/hungry|crav(ing|es)/.test(txt))           found.add("hunger");
      const tipsMap={
        headache:["12–16 oz water + LMNT","Dim screens 5–10 min","Slow nasal breathing (in 4 / out 6)"],
        dizziness:["Sit until steady","Small juice or pinch of salt","Slow breaths"],
        nausea:["Peppermint/ginger tea","Cool water sips","Fresh air"],
        fatigue:["15–20 min rest","Hydrate / electrolytes","2-min stretch"],
        hunger:["Water first","Sip scheduled juice slowly","5-min walk as reset"]
      };
      const tips=[...found].flatMap(k=>tipsMap[k]||[]).slice(0,7);
      const mood = /proud|better|good|calm|motivated/.test(txt) ? "up" :
                   /overwhelm|anxious|stressed|down|frustrat/.test(txt) ? "low" : "mid";
      const boost = mood==="low" ? "You’re not alone—make today gentle." :
                     mood==="mid" ? "Nice work staying steady. One tiny upgrade today." :
                     "Ride the wave, stay kind to yourself.";
      const header = found.size ? `I noticed: ${[...found].join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
      setCoach({header,tips,boost});
    }

    const weightSeries = days.map(d=> d.weight==null ? null : d.weight);

    return e(React.Fragment,null,
      e("div",{className:"card mast"},
        e("div",{className:"left"},
          e("img",{src:"oz.png",alt:"Oz"}),
          e("div",{className:"mast-title"},
            e("h1",null,"Oz Companion"),
            e("div",{className:"phase"}, day.phase.toUpperCase())
          )
        ),
        e("div",{className:"day-nav"},
          e("button",{className:"btn",onClick:()=>changeDay(-1),"aria-label":"Prev day"},"◀"),
          e("div",{className:"day-chip"}, e("div",{style:{fontWeight:800}},"Day ", day.day)),
          e("button",{className:"btn",onClick:()=>changeDay(1),"aria-label":"Next day"},"▶")
        )
      ),

      e("div",{style:{margin:"10px 0 6px"}}, e(Progress,{value:progress})),

      e("div",{className:"card"},
        e(Checklist,{items, state:checks, onToggle:toggle})
      ),

      e("div",{className:"card",style:{marginTop:12}},
        e("div",{className:"coachCard", role:"button", tabIndex:0,
          onClick:runCoach, onKeyDown:(ev)=>{ if(ev.key==="Enter"||ev.key===" ") runCoach(); }},
          e("span",{className:"badge"},"🧠 Smart Coach"),
          e("div",{style:{marginTop:6,color:"var(--muted)"}}, "Tap to analyze your note and get relief + motivation")
        ),
        coach && e("div",{className:"coachOut"},
          e("div",{style:{fontWeight:700, marginBottom:6}}, coach.header),
          (coach.tips && coach.tips.length)
            ? e("ul",{style:{margin:"0 0 8px 18px"}}, coach.tips.map((t,i)=> e("li",{key:i}, t)))
            : e("div",{style:{color:"var(--muted)", marginBottom:6}}, "Hydrate, 5 slow breaths, short walk, then reassess."),
          e("div",{style:{color:"var(--muted)"}}, coach.boost)
        ),
        e("textarea",{className:"noteArea", placeholder:"Notes…",
          value:day.note||"",
          onChange:(ev)=> setDays(prev=>{ const n=prev.slice(); const d={...n[idx]}; d.note=ev.target.value; n[idx]=d; return n; })
        })
      ),

      e("div",{className:"card",style:{marginTop:12}},
        e("h2",null,"Weight"),
        e("div",{className:"row",style:{margin:"6px 0 10px"}},
          e("label",null,"Today’s weight"),
          e("input",{type:"number",step:"0.1",value:(day.weight==null?"":day.weight),style:{width:120},
            onChange:(ev)=>{
              const v=ev.target.value;
              setDays(prev=>{ const n=prev.slice(); const d={...n[idx]};
                d.weight = (v===""?null:Number(v));
                if(v!==""){ d.checks={...(d.checks||{}), weight:true}; }
                n[idx]=d; return n; });
            }
          }),
          e("span",{className:"badge"},"Day ", day.day)
        ),
        e(WeightChart,{series:weightSeries})
      )
    );
  }

  /* ---------- Calendar with cleanse-day expansion ---------- */
  function Calendar({ days, recipes, settings }) {
    function dateFor(dayNum) {
      const dstr = settings.startDate || "";
      if (!dstr) return null;
      const base = new Date(dstr + "T00:00:00");
      if (isNaN(base)) return null;
      const dt = new Date(base.getTime() + (dayNum - 1) * 86400000);
      return dt.toLocaleDateString();
    }

    function expandCleanseDay(list, d) {
      if ((d.phase||"") !== "cleanse") return list;
      const byName = new Map(list.map(r => [r.name, r]));
      CLEANSE_TEMPLATES.forEach(t=>{
        if(!byName.has(t.name)){
          byName.set(t.name, { id:`auto-${d.day}-${t.baseId}`, name:t.name, type:"juice", day:d.day, servings:1 });
        }
      });
      return Array.from(byName.values());
    }

    return e("div", { className: "card" },
      e("h2", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
        days.map(d => {
          let list = (recipes || []).filter(r => r.day === d.day);
          list = expandCleanseDay(list, d);

          const hasPhotos = !!(d.photos && d.photos.length);
          const hasNote = !!(d.note && d.note.trim().length);
          const dd = dateFor(d.day);

          return e("li", { key: d.day, className: "card", style: { padding: "12px", marginTop: 10 } },
            e("div", { className: "row", style: { justifyContent: "space-between", alignItems: "flex-start", gap: 8 } },
              e("div", null,
                e("div", { style: { fontWeight: 800 } }, "Day ", d.day, " — ", (d.phase || "").toUpperCase()),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              e("div", { className: "row", style: { minHeight: 24, flexWrap: "wrap", gap: 6 } },
                list.length
                  ? list.map(r =>
                      e("span", { key: r.id, className: "badge" },
                        (r.type === "juice" ? "🧃 " : (r.type === "snack" ? "🍎 " : "🍽️ ")),
                        r.name
                      )
                    )
                  : e("span", { style: { fontSize: 12, color: "var(--muted)" } }, "—"),
                hasNote && e("span", { className: "badge" }, "📝 Note"),
                hasPhotos && e("span", { className: "badge" }, "📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  /* ---------- Groceries / Photos / Settings ---------- */
  function Groceries({groceries,setGroceries}){
    return e("div",{className:"card"},
      e("h2",null,"Groceries & Prices"),
      !groceries?.length ? e("p",{style:{color:"var(--muted)"}}, "No grocery items yet.")
      : e("ul",{style:{listStyle:"none",padding:0}},
          groceries.map((g,idx)=> e("li",{key:g.id, className:"row", style:{padding:"8px 0",borderBottom:"1px solid var(--line)"}},
            e("button",{className:"paw"+(g.checked?" on":""), onClick:()=> setGroceries(prev=> prev.map((x,i)=> i===idx? {...x,checked:!x.checked} : x ))}, g.checked?"🐾":""),
            e("div",{style:{flex:1}},
              e("div",null,g.name," ",
                e("span",{className:"badge"}, (g.days&&g.days.length? "📅 Day "+(g.days.length>1?(Math.min(...g.days)+"–"+Math.max(...g.days)):g.days[0]) : "📦 Pantry"))
              ),
              e("div",{style:{fontSize:12,color:"var(--muted)"}}, g.qty||"")
            ),
            e("input",{type:"number",step:"0.01",placeholder:"$",value:(g.estCost??""),style:{width:90},
              onChange:(ev)=> setGroceries(prev=> prev.map((x,i)=> i===idx? {...x, estCost: (ev.target.value===""?null:Number(ev.target.value)) } : x )) })
          ))
        )
    );
  }

  function Photos({days,setDays}){
    const [idx,setIdx]=useState(0);
    const d=days[idx]||days[0];
    function handleUpload(ev){
      const files=[...ev.target.files||[]];
      if(!files.length) return;
      Promise.all(files.map(f=> new Promise(res=>{const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f);})))
        .then(urls=>{
          setDays(prev=>{const n=prev.slice(); const dd={...n[idx]}; dd.photos=(dd.photos||[]).concat(urls); n[idx]=dd; return n;});
          const A=["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶","Consistency looks good on you 🌟"];
          setTimeout(()=> alert(A[Math.floor(Math.random()*A.length)]), 50);
          vibrate(18);
        });
    }
    return e("div",{className:"card"},
      e("div",{className:"row",style:{justifyContent:"space-between"}},
        e("div",null, e("b",null,"Photos — Day ", d.day)),
        e("div",null,
          e("button",{className:"btn",onClick:()=>setIdx(i=>(i>0?i-1:days.length-1))},"◀"),
          e("span",{className:"badge",style:{margin:"0 8px"}}, "Day "+d.day),
          e("button",{className:"btn",onClick:()=>setIdx(i=>(i<days.length-1?i+1:0))},"▶")
        )
      ),
      e("div",{className:"row",style:{marginTop:8}},
        e("label",{className:"btn primary",style:{display:"inline-block",cursor:"pointer"}}, "Upload Photo",
          e("input",{type:"file",accept:"image/*",multiple:true,style:{display:"none"},onChange:handleUpload})
        )
      ),
      e("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12,marginTop:12}},
        (d.photos||[]).map((src,i)=> e("img",{key:i,src,style:{width:"100%",height:120,objectFit:"cover",borderRadius:12,border:"1px solid var(--line)"}}))
      )
    );
  }

  function Settings({settings,setSettings,goals,setGoals,templates,setTemplates,setDays,setRecipes,setGroceries}){
    const [show,setShow]=useState(false);
    const [phase,setPhase]=useState("fast");
    const [checked,setChecked]=useState({});

    function open(phaseName){
      setPhase(phaseName);
      const active = new Set(templates[phaseName]||[]);
      const all = Object.keys(goals).reduce((m,k)=> (m[k]=active.has(k), m), {});
      setChecked(all);
      setShow(true);
    }
    function savePhase(){
      const ids=Object.keys(checked).filter(k=>checked[k]);
      setTemplates(prev=>({...prev,[phase]:ids}));
      setShow(false);
    }
    function toggleId(id){ setChecked(prev=> ({...prev,[id]:!prev[id]}) ); }
    function addCustom(){
      const idRaw = prompt("New goal ID (letters/dashes): e.g., meditation");
      if(!idRaw) return;
      const id=idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,"");
      if(!id||goals[id]) return alert("Invalid or duplicate ID.");
      const label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if(!label) return;
      setGoals(prev=> ({...prev,[id]:label}) );
      setChecked(prev=> ({...prev,[id]:true}) );
    }
    function importDefault(){
      setDays(defaultDays());
      setRecipes(PLAN_RECIPES);
      setGroceries(aggregateGroceries(PLAN_RECIPES));
      alert("Default 11-day plan imported.");
    }
    function importFromChatGPT(){
      const txt = prompt("Paste ChatGPT plan (JSON or simple text).");
      if(!txt) return;
      try{
        const plan=JSON.parse(txt);
        if(!Array.isArray(plan.recipes)||!Array.isArray(plan.days)) throw 0;
        setDays(plan.days); setRecipes(plan.recipes); setGroceries(aggregateGroceries(plan.recipes));
        alert("Plan imported ✔");
      }catch{
        try{
          const parsed=parseFreeTextPlan(txt);
          setDays(parsed.days); setRecipes(parsed.recipes); setGroceries(aggregateGroceries(parsed.recipes));
          alert("Plan imported ✔");
        }catch{ alert("Could not parse. Try JSON if possible."); }
      }
    }

    return e("div",{className:"card"},
      e("h2",null,"Settings"),
      e("div",{className:"grid grid-2",style:{marginTop:6}},
        e("div",null,
          e("div",{style:{fontSize:12,marginBottom:4}},"Start date"),
          e("input",{type:"date",value:(settings.startDate||""), onChange:(ev)=> setSettings(prev=>({...prev,startDate:ev.target.value||null})) })
        ),
        e("div",null,
          e("div",{style:{fontSize:12,marginBottom:4}},"Import plan"),
          e("div",{className:"row"},
            e("button",{className:"btn primary",onClick:importDefault},"Default 11-day"),
            e("button",{className:"btn",onClick:importFromChatGPT},"From ChatGPT")
          )
        )
      ),

      e("div",{style:{marginTop:12,fontWeight:700}},"Edit checklist by phase"),
      e("div",{className:"grid grid-2",style:{marginTop:8}},
        e("button",{className:"btn",onClick:()=>open("fast")},"Fast — Edit"),
        e("button",{className:"btn",onClick:()=>open("cleanse")},"Cleanse — Edit"),
        e("button",{className:"btn",onClick:()=>open("rebuild")},"Rebuild — Edit")
      ),

      show && e("div",{className:"modal",onClick:(ev)=>{ if(ev.target.classList.contains("modal")) setShow(false); }},
        e("div",{className:"sheet"},
          e("h3",null,"Edit Goals — ", phase.charAt(0).toUpperCase()+phase.slice(1)),
          e("div",{style:{maxHeight:"48vh",overflow:"auto",margin:"8px 0 12px"}},
            Object.keys(goals).map(id=>
              e("label",{key:id, className:"row", style:{padding:"6px 4px",borderBottom:"1px solid var(--line)"}},
                e("input",{type:"checkbox",checked:!!checked[id],onChange:()=>toggleId(id)}),
                e("span",null, goals[id])
              )
            )
          ),
          e("div",{className:"row",style:{justifyContent:"space-between"}},
            e("button",{className:"btn",onClick:addCustom},"+ Add custom"),
            e("div",null,
              e("button",{className:"btn",onClick:()=>setShow(false)},"Cancel"),
              e("button",{className:"btn primary",style:{marginLeft:8},onClick:savePhase},"Save")
            )
          )
        )
      )
    );
  }

  /* ------------ Grocery aggregation (from recipes) ------------ */
  function aggregateGroceries(recipes){
    const map={};
    (recipes||[]).forEach(r=>{
      (r.ingredients||[]).forEach(it=>{
        const id=(it.name||"").toLowerCase().replace(/\s+/g,"-");
        if(!map[id]) map[id]={id,name:it.name, qtyList:[], checked:false, estCost:null, days: new Set()};
        if(it.qty) map[id].qtyList.push(it.qty);
        if(r.day) map[id].days.add(r.day);
      });
    });
    return Object.values(map).map(g=>({
      id:g.id, name:g.name, qty:g.qtyList?.join(" + ")||"",
      checked:g.checked, estCost:g.estCost, days:[...g.days].sort((a,b)=>a-b)
    })).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }

  /* ------------ Parse free-text plan (simple) ------------ */
  function parseFreeTextPlan(text){
    const days=defaultDays(); const recipes=[];
    const lines=String(text||"").split(/\r?\n/);
    let curDay=null, cur=null;
    lines.forEach(raw=>{
      const line=raw.trim();
      const mDay=line.match(/^Day\s+(\d+)/i);
      if(mDay){ curDay=+mDay[1]; return; }
      const mJ=line.match(/^Juice\s*\d*\s*[-:]\s*(.+)$/i);
      if(mJ && curDay){ cur={id:"r-"+Math.random().toString(36).slice(2), name=mJ[1], type:"juice", day:curDay, ingredients:[]}; recipes.push(cur); return; }
      const mM=line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
      if(mM && curDay){ cur={id:"m-"+Math.random().toString(36).slice(2), name=mM[2], type:"meal", day:curDay, ingredients:[]}; recipes.push(cur); return; }
      const ing=line.match(/^[•\-]\s*(.+)$/); if(ing && cur){ cur.ingredients.push({name:ing[1].replace(/^[\d/.\s]+\w*\s+/,""), qty:ing[1].match(/^([\d/.\s]+\w*)/i)?.[1]||""}); }
    });
    return {days,recipes};
  }

  /* ------------ App ------------ */
  function App(){
    const [goals,setGoals]=useLocal("oz.goals", GOAL_LABELS);
    const [templates,setTemplates]=useLocal("oz.templates", DEFAULT_PHASE_TEMPLATES);
    const [settings,setSettings]=useLocal("oz.settings",{startDate:null});
    const [days,setDays]=useLocal("oz.days", defaultDays());
    const [recipes,setRecipes]=useLocal("oz.recipes", PLAN_RECIPES);
    const [groceries,setGroceries]=useLocal("oz.groceries", aggregateGroceries(PLAN_RECIPES));
    const [tab,setTab]=useState("dash");

    useEffect(()=>{ setGroceries(aggregateGroceries(recipes)); },[recipes,setGroceries]);

    return e(React.Fragment,null,
      tab==="dash"     && e(Dashboard,{days,setDays,templates,goals,recipes}),
      tab==="groceries"&& e(Groceries,{groceries,setGroceries}),
      tab==="calendar" && e(Calendar,{days,recipes,settings}),
      tab==="photos"   && e(Photos,{days,setDays}),
      tab==="settings" && e(Settings,{settings,setSettings,goals,setGoals,templates,setTemplates,setDays,setRecipes,setGroceries}),

      e("nav",{className:"tabs"},
        [
          {id:"dash",icon:"🏠"},{id:"groceries",icon:"🛒"},
          {id:"calendar",icon:"📅"},{id:"photos",icon:"📷"},
          {id:"settings",icon:"⚙️"}
        ].map(t=> e("button",{key:t.id,className:"btn"+(tab===t.id?" primary":""),onClick:()=>setTab(t.id),"aria-label":t.id}, t.icon))
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
document.dispatchEvent(new Event('oz:ready'));
