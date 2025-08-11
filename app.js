/* Oz Cleanse Companion — V14.5 (everything synced)
   Patches in this build only:
   - Calendar: ensure 4 juices per cleanse day (1 of each type)
   - Smart Coach: render as bulleted list
   - Splash: also hides on oz:ready; add small 100% affirmation toast
*/

(function(){
  const e = React.createElement;
  const {useState,useEffect,useRef,useMemo} = React;

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

  // tiny toast used for 100% day affirmation
  function toast(msg = "100% day — you crushed it!") {
    try {
      const node = document.createElement('div');
      node.className = 'card';
      node.style.position = 'fixed';
      node.style.left = '50%';
      node.style.bottom = '80px';
      node.style.transform = 'translateX(-50%)';
      node.style.zIndex = '120';
      node.style.padding = '12px 16px';
      node.style.boxShadow = '0 16px 34px rgba(236,72,153,.18)';
      node.textContent = msg;
      document.body.appendChild(node);
      setTimeout(()=> node.remove(), 2800);
    } catch {}
  }

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
  // --- Rebuild-ready default plan (juices + meals + snacks) ---
  const PLAN_RECIPES = [
    // CLEANSE JUICES (same as before)
    { id:"r-melon",  name:"Melon Mint Morning", type:"juice", day:4, servings:1,
      ingredients:[{name:"Melon",qty:"1"},{name:"Mint",qty:"1/2 cup"},{name:"Lime",qty:"1"}]
    },
    { id:"r-peach",  name:"Peachy Green Glow", type:"juice", day:5, servings:1,
      ingredients:[{name:"Peaches",qty:"3"},{name:"Cucumbers",qty:"2"},{name:"Spinach",qty:"4 cup"},{name:"Lemon",qty:"1"}]
    },
    { id:"r-carrot", name:"Carrot Apple Ginger", type:"juice", day:6, servings:1,
      ingredients:[{name:"Carrots",qty:"7"},{name:"Apples",qty:"2"},{name:"Ginger",qty:'1"'},{name:"Lemon",qty:"1"}]
    },
    { id:"r-grape",  name:"Grape Romaine Cooler", type:"juice", day:7, servings:1,
      ingredients:[{name:"Grapes",qty:"3 cup"},{name:"Romaine",qty:"3 cup"},{name:"Cucumbers",qty:"2"},{name:"Lemon",qty:"1"}]
    },

    // ===================== REBUILD — Day 8 & 9 (Phase "rebuild") =====================
    { id:"r-smoothie-8", name:"Smoothie Breakfast", type:"meal", day:8,
      ingredients:[
        {name:"Banana",qty:"1"}, {name:"Spinach",qty:"2 cup"},
        {name:"Almond milk",qty:"1 cup"}, {name:"Chia seeds",qty:"1 tbsp"}
      ]
    },
    { id:"r-smoothie-9", name:"Smoothie Breakfast", type:"meal", day:9,
      ingredients:[
        {name:"Banana",qty:"1"}, {name:"Spinach",qty:"2 cup"},
        {name:"Almond milk",qty:"1 cup"}, {name:"Chia seeds",qty:"1 tbsp"}
      ]
    },

    { id:"r-steamveg-8", name:"Steamed Veg + Olive Oil & Lemon", type:"meal", day:8,
      ingredients:[
        {name:"Zucchini",qty:"1"}, {name:"Carrots",qty:"1 cup"},
        {name:"Cucumber",qty:"1"}, {name:"Spinach",qty:"2 cup"},
        {name:"Olive oil",qty:"1 tbsp"}, {name:"Lemon",qty:"1"}
      ]
    },
    { id:"r-steamveg-9", name:"Steamed Veg + Olive Oil & Lemon", type:"meal", day:9,
      ingredients:[
        {name:"Zucchini",qty:"1"}, {name:"Carrots",qty:"1 cup"},
        {name:"Cucumber",qty:"1"}, {name:"Spinach",qty:"2 cup"},
        {name:"Olive oil",qty:"1 tbsp"}, {name:"Lemon",qty:"1"}
      ]
    },

    { id:"r-lentil-8", name:"Lentil Soup", type:"meal", day:8,
      ingredients:[
        {name:"Lentils",qty:"1/2 cup"},{name:"Carrots",qty:"1/2 cup"},
        {name:"Celery",qty:"1/2 cup"},{name:"Parsley",qty:"1/4 cup"},
        {name:"Onion",qty:"1/2"},{name:"Water",qty:"4 cup"}
      ]
    },
    { id:"r-lentil-9", name:"Lentil Soup", type:"meal", day:9,
      ingredients:[
        {name:"Lentils",qty:"1/2 cup"},{name:"Carrots",qty:"1/2 cup"},
        {name:"Celery",qty:"1/2 cup"},{name:"Parsley",qty:"1/4 cup"},
        {name:"Onion",qty:"1/2"},{name:"Water",qty:"4 cup"}
      ]
    },

    { id:"s-snacks-8", type:"snack", day:8, name:"Snacks — Fruit, Coconut Yogurt, Chia Pudding",
      ingredients:[
        {name:"Melon",qty:"1"}, {name:"Grapes",qty:"2 cup"}, {name:"Peaches",qty:"3"},
        {name:"Coconut yogurt",qty:"2 cup"}, {name:"Chia seeds",qty:"3 tbsp"}, {name:"Almond milk",qty:"1 cup"}
      ]
    },
    { id:"s-snacks-9", type:"snack", day:9, name:"Snacks — Fruit, Coconut Yogurt, Chia Pudding",
      ingredients:[
        {name:"Melon",qty:"1"}, {name:"Grapes",qty:"2 cup"}, {name:"Peaches",qty:"3"},
        {name:"Coconut yogurt",qty:"2 cup"}, {name:"Chia seeds",qty:"3 tbsp"}, {name:"Almond milk",qty:"1 cup"}
      ]
    },

    // ===================== REBUILD — Day 10 & 11 =====================
    { id:"r-oats-10", name:"Overnight Oats Breakfast", type:"meal", day:10,
      ingredients:[
        {name:"Rolled oats",qty:"1/2 cup"},{name:"Almond milk",qty:"1 cup"},
        {name:"Berries",qty:"1/2 cup"},{name:"Cinnamon",qty:"1/2 tsp"}
      ]
    },
    { id:"r-oats-11", name:"Overnight Oats Breakfast", type:"meal", day:11,
      ingredients:[
        {name:"Rolled oats",qty:"1/2 cup"},{name:"Almond milk",qty:"1 cup"},
        {name:"Berries",qty:"1/2 cup"},{name:"Cinnamon",qty:"1/2 tsp"}
      ]
    },

    { id:"r-quinoa-10", name:"Quinoa Salad", type:"meal", day:10,
      ingredients:[
        {name:"Quinoa",qty:"1/2 cup"},{name:"Cucumber",qty:"1"},{name:"Tomato",qty:"1"},
        {name:"Parsley",qty:"1/4 cup"},{name:"Olive oil",qty:"1 tbsp"},{name:"Lemon",qty:"1"}
      ]
    },
    { id:"r-quinoa-11", name:"Quinoa Salad", type:"meal", day:11,
      ingredients:[
        {name:"Quinoa",qty:"1/2 cup"},{name:"Cucumber",qty:"1"},{name:"Tomato",qty:"1"},
        {name:"Parsley",qty:"1/4 cup"},{name:"Olive oil",qty:"1 tbsp"},{name:"Lemon",qty:"1"}
      ]
    },

    { id:"r-protein-10", name:"Baked Salmon or Grilled Chicken + Steamed Broccoli", type:"meal", day:10,
      ingredients:[{name:"Salmon/Chicken",qty:"12 oz"},{name:"Broccoli",qty:"2 heads"}]
    },
    { id:"r-protein-11", name:"Baked Salmon or Grilled Chicken + Steamed Broccoli", type:"meal", day:11,
      ingredients:[{name:"Salmon/Chicken",qty:"12 oz"},{name:"Broccoli",qty:"2 heads"}]
    },

    { id:"s-snacks-10", type:"snack", day:10, name:"Snacks — Raw Veg + Hummus, Fresh Fruit",
      ingredients:[
        {name:"Carrots",qty:"2"},{name:"Cucumber",qty:"1"},{name:"Celery",qty:"2 stalks"},
        {name:"Hummus",qty:"1/2 cup"},{name:"Apples",qty:"2"},{name:"Grapes",qty:"2 cup"}
      ]
    },
    { id:"s-snacks-11", type:"snack", day:11, name:"Snacks — Raw Veg + Hummus, Fresh Fruit",
      ingredients:[
        {name:"Carrots",qty:"2"},{name:"Cucumber",qty:"1"},{name:"Celery",qty:"2 stalks"},
        {name:"Hummus",qty:"1/2 cup"},{name:"Apples",qty:"2"},{name:"Grapes",qty:"2 cup"}
      ]
    }
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

  /* ------------ Units: combine quantities (cup base) ------------ */
  function parseQty(raw){
    if(!raw) return null;
    let s=String(raw).toLowerCase().trim()
      .replace(/cups?/g,"cup").replace(/tablespoons?|tbsp?s?/g,"tbsp")
      .replace(/teaspoons?|tsps?/g,"tsp").replace(/ounces?|oz/g,"oz");
    const m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)(?:\s*([a-z"]+))?/i);
    if(!m) return null;
    const num = m[1].includes("/")
      ? m[1].split(" ").reduce((a,b)=> b.includes("/") ? a + (parseFloat(b.split("/")[0]) / parseFloat(b.split("/")[1])) : a + parseFloat(b), 0)
      : parseFloat(m[1]);
    const unit = (m[3]||"").replace(/"/g,"in"); // treat 1" ginger as unknown unit
    return {n:num, u:unit};
  }
  function toCup(q){
    if(!q) return null;
    const u=q.u;
    if(u==="tsp") return {n:q.n/48,u:"cup"};
    if(u==="tbsp")return {n:q.n/16,u:"cup"};
    if(u==="oz")  return {n:q.n/8,u:"cup"};
    if(u===""||u==="cup")return {n:q.n,u:"cup"};
    return {n:q.n,u:u}; // unknown; passthrough
  }
  function fromCup(n,u){
    if(u!=="cup") return (Number.isInteger(n)?n:n.toFixed(2))+" "+u;
    if(n>=1) return (Number.isInteger(n)?n:n.toFixed(2))+" cup";
    const tbsp=n*16; if(tbsp>=1) return (Number.isInteger(tbsp)?tbsp:tbsp.toFixed(1))+" tbsp";
    const tsp=tbsp*3; return (Number.isInteger(tsp)?tsp:tsp.toFixed(1))+" tsp";
  }
  function combineQtyStrings(list){
    const parsed=list.map(parseQty).filter(Boolean);
    if(!parsed.length) return list.join(" + ");
    const cups=parsed.map(toCup);
    const convertible=cups.filter(x=>x.u==="cup");
    const others=cups.filter(x=>x.u!=="cup");
    let out=[];
    if(convertible.length){
      const sum=convertible.reduce((a,b)=>a+b.n,0);
      out.push(fromCup(sum,"cup"));
    }
    if(others.length){
      out=out.concat(others.map(x=>(x.n+" "+x.u).trim()));
    }
    return out.join(" + ");
  }

  /* ------------ Splash: random bubble text then fade ------------ */
  (function(){
    const bubble = document.getElementById("ozBubble");
    if (bubble) bubble.textContent = nextAff();

    function hide(){
      const s=document.getElementById("ozSplash");
      if(s) s.classList.add("fade-out");
      if(bubble) bubble.classList.add("fade-out");
      setTimeout(()=>{ if(s) s.style.display="none"; }, 650);
    }

    window.addEventListener("load", () => { setTimeout(hide, 1200); });
    // also hide as soon as app signals it's ready
    document.addEventListener("oz:ready", hide);
  })();

  /* ==================== PATCH: ensure 4 juices on cleanse days ==================== */
  const CLEANSE_TEMPLATE = [
    { key:"green",  name:"Green Juice",
      ingredients:[{name:"Cucumber",qty:"1"},{name:"Celery",qty:"2 stalks"},{name:"Spinach",qty:"2 cup"},{name:"Lemon",qty:"1"}] },
    { key:"carrot", name:"Carrot-Apple",
      ingredients:[{name:"Carrots",qty:"7"},{name:"Apples",qty:"2"},{name:"Ginger",qty:"1 in"}] },
    { key:"beet",   name:"Beet-Citrus",
      ingredients:[{name:"Beets",qty:"2"},{name:"Orange",qty:"1"},{name:"Lemon",qty:"1/2"}] },
    { key:"citrus", name:"Citrus-Ginger",
      ingredients:[{name:"Grapefruit",qty:"1"},{name:"Orange",qty:"1"},{name:"Ginger",qty:"1 in"}] },
  ];
  function expandCleanseForDays(recipes, days){
    const out = recipes.slice();
    const idSet = new Set(out.map(r=>r.id));
    const cleanseDays = (days||[]).filter(d=>d.phase==='cleanse').map(d=>d.day);
    cleanseDays.forEach(dayNum=>{
      const existing = out.filter(r=>r.day===dayNum && r.type==='juice');
      if (existing.length >= 4) return; // full already
      const needed = 4 - existing.length;
      for(let i=0;i<needed;i++){
        const tmpl = CLEANSE_TEMPLATE[i % CLEANSE_TEMPLATE.length];
        const id = `cj-${dayNum}-${tmpl.key}-${i}`;
        if (idSet.has(id)) continue;
        out.push({ id, type:'juice', day:dayNum, servings:1, name:tmpl.name, ingredients:(tmpl.ingredients||[]) });
        idSet.add(id);
      }
    });
    return out;
  }

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
      const ctx=ref.current.getContext("2d");
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
        toast(); // affirmation
      }
    },[progress]);

    function changeDay(d){ setIdx(i=> (i+d+days.length)%days.length ); }
    function toggle(id){
      setDays(prev=>{ const n=prev.slice(); const d={...n[idx]};
        d.checks={...(d.checks||{}), [id]: !d.checks?.[id]}; n[idx]=d; return n; });
    }

    // Smart Coach
    const [coachText,setCoachText]=useState("");
    function runCoach(){
      const txt=(day.note||"").toLowerCase();
      if(!txt) { setCoachText("Write a quick note below, then tap Smart Coach."); return;}
      const found=new Set();
      if(/headache|migraine|head pain/.test(txt)) found.add("headache");
      if(/dizzy|light.?headed|vertigo/.test(txt))   found.add("dizziness");
      if(/nausea|queasy|sick to (my|the) stomach/.test(txt)) found.add("nausea");
      if(/tired|fatigue|exhaust/.test(txt))         found.add("fatigue");
      if(/hungry|crav(ing|es)/.test(txt))           found.add("hunger");

      const tips={
        headache:["12–16 oz water + LMNT","Dim screens 5–10 min","Slow nasal breathing (in 4 / out 6)"],
        dizziness:["Sit until steady","Small juice or pinch of salt","Slow breaths"],
        nausea:["Peppermint/ginger tea","Cool water sips","Fresh air"],
        fatigue:["15–20 min rest","Hydrate / electrolytes","2-min stretch"],
        hunger:["Water first","Sip scheduled juice slowly","5-min walk as reset"]
      };
      const picked=[...found].flatMap(k=>tips[k]||[]).slice(0,7);
      const mood = /proud|better|good|calm|motivated/.test(txt) ? "up" :
                   /overwhelm|anxious|stressed|down|frustrat/.test(txt) ? "low" : "mid";
      const boost = mood==="low" ? "You’re not alone—make today gentle." :
                     mood==="mid" ? "Nice work staying steady. One tiny upgrade today." :
                     "Ride the wave, stay kind to yourself.";
      const header = found.size ? `I noticed: ${[...found].join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
      const body = picked.length ? "Try:\n• " + picked.join("\n• ") : "Hydrate, 5 slow breaths, short walk, then reassess.";
      setCoachText(`${header}\n\n${body}\n\n${boost}`);
    }

    // show coach as a tidy list
    const coachLines = useMemo(() => String(coachText||"").split(/\r?\n+/).filter(Boolean), [coachText]);

    // Upcoming 2-day ingredients (combined)
    function nextTwoDayIngredients(current){
      function gatherFor(daysWanted){
        const bag={}; // name -> {qtyList:[], days:Set}
        (recipes||[]).forEach(r=>{
          if(!r.day || !daysWanted.has(r.day)) return;
          (r.ingredients||[]).forEach(it=>{
            const key=(it.name||"").toLowerCase();
            if(!bag[key]) bag[key]={name:it.name,qtyList:[],days:new Set()};
            if(it.qty) bag[key].qtyList.push(it.qty);
            bag[key].days.add(r.day);
          });
        });
        return Object.values(bag).map(x=>({
          name:x.name, qty:combineQtyStrings(x.qtyList), days:[...x.days].sort((a,b)=>a-b)
        })).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
      }
      const d1=current.day, d2=current.day+1;
      let list = gatherFor(new Set([d1,d2]));
      if(list.length) return {items:list, label:`Today + Tomorrow — Ingredients`};
      // fallback: next two recipe days
      const futureDays=[...new Set((recipes||[]).filter(r=>r.day>=current.day).map(r=>r.day))].sort((a,b)=>a-b).slice(0,2);
      list=gatherFor(new Set(futureDays));
      const label = futureDays.length===2 ? `Upcoming Ingredients — Day ${futureDays[0]} & ${futureDays[1]}` :
                                            futureDays.length===1 ? `Upcoming Ingredients — Day ${futureDays[0]}` : `Upcoming Ingredients`;
      return {items:list, label};
    }
    const nxt = nextTwoDayIngredients(day);

    const weightSeries = days.map(d=> d.weight==null ? null : d.weight);

    return e(React.Fragment,null,
      e("div",{className:"card mast"},
        e("div",{className:"left"},
          e("img",{src:"oz.png",alt:"Oz"}),
          e("div",null,
            e("h1",null,"Oz Companion"),
            e("div",{className:"phase"}, day.phase.toUpperCase())
          )
        ),
        e("div",{className:"day-nav"},
          e("button",{className:"btn",onClick:()=>changeDay(-1),"aria-label":"Prev day"},"◀"),
          e("div",{className:"day-chip"},
            e("div",{style:{fontWeight:800}}, "Day ", day.day)
          ),
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
        coachLines.length>0 && e("div",{className:"coachOut"},
          e("ul",{style:{margin:"6px 0 0", padding:"0 0 0 18px"}},
            coachLines.map((line,i)=> e("li",{key:i}, line))
          )
        ),
        e("textarea",{className:"noteArea", placeholder:"Notes…",
          value:day.note||"",
          onChange:(ev)=> setDays(prev=>{ const n=prev.slice(); const d={...n[idx]}; d.note=ev.target.value; n[idx]=d; return n; })
        })
      ),

      e("div",{className:"card",style:{marginTop:12}},
        e("h2",null, nxt.label),
        !nxt.items.length ? e("p",{style:{color:"var(--muted)"}}, "No recipes scheduled soon.")
        : e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
            nxt.items.map(it=> e("li",{key:it.name, className:"row", style:{justifyContent:"space-between",borderBottom:"1px solid var(--line)",padding:"6px 0"}},
              e("span",null, it.name, " ",
                e("span",{className:"badge"}, it.days.length===1 ? ("Day "+it.days[0]) : ("Day "+it.days[0]+"–"+it.days[it.days.length-1]))
              ),
              e("span",{style:{color:"var(--muted)",fontSize:13}}, it.qty||"")
            ))
          )
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

  function Groceries({groceries,setGroceries}){
    return e("div",{className:"card"},
      e("h2",null,"Groceries & Prices"),
      !groceries.length ? e("p",{style:{color:"var(--muted)"}}, "No grocery items yet.")
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
      e("ul", { style: { listStyle: "none", padding: 0, margin: 0 } },
        days.map(d => {
          const list = (recipes || []).filter(r => r.day === d.day);
          const hasPhotos = !!(d.photos && d.photos.length);
          const hasNote = !!(d.note && d.note.trim().length);
          const dd = dateFor(d.day);

          return e("li", { key: d.day, className: "card", style: { padding: "12px", marginTop: 10 } },
            e("div", { className: "row", style: { justifyContent: "space-between", alignItems: "flex-start", gap: 8 } },
              // Left: day + phase + optional date
              e("div", null,
                e("div", { style: { fontWeight: 800 } }, "Day ", d.day, " — ", (d.phase || "").toUpperCase()),
                dd && e("div", { className: "badge", style: { marginTop: 6 } }, dd)
              ),
              // Right: recipes + note/photo badges
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
      id:g.id, name:g.name, qty:combineQtyStrings(g.qtyList),
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
      if(mJ && curDay){ cur={id:"r-"+Math.random().toString(36).slice(2), name:mJ[1], type:"juice", day:curDay, ingredients:[]}; recipes.push(cur); return; }
      const mM=line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
      if(mM && curDay){ cur={id:"m-"+Math.random().toString(36).slice(2), name:mM[2], type:"meal", day:curDay, ingredients:[]}; recipes.push(cur); return; }
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

    // ensure cleanse days always show 4 juices/day
    useEffect(()=>{
      const expanded = expandCleanseForDays(recipes, days);
      if (expanded.length !== recipes.length) setRecipes(expanded);
    },[days, recipes, setRecipes]);

    useEffect(()=>{ // ensure grocery list follows recipes
      setGroceries(aggregateGroceries(recipes));
    },[recipes,setGroceries]);

    return e(React.Fragment,null,
      tab==="dash"     && e(Dashboard,{days,setDays,templates,goals,recipes}),
      tab==="groceries"&& e(Groceries,{groceries,setGroceries}),
      tab==="calendar" && e(Calendar,{days,recipes,settings}),
      tab==="photos"   && e(Photos,{days,setDays}),
      tab==="settings" && e(Settings,{settings,setSettings,goals,setGoals,templates,setTemplates,setDays,setRecipes,setGroceries}),

      e("nav",{className:"tabs"},
        [{id:"dash",icon:"🏠"},{id:"groceries",icon:"🛒"},{id:"calendar",icon:"📅"},{id:"photos",icon:"📷"},{id:"settings",icon:"⚙️"}]
          .map(t=> e("button",{key:t.id,className:"btn"+(tab===t.id?" primary":""),onClick:()=>setTab(t.id),"aria-label":t.id}, t.icon))
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
// After your React app mounts:
document.dispatchEvent(new Event('oz:ready'));
