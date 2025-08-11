/* Oz Companion – V15 full build */
(function(){
  const e = React.createElement;
  const { useState, useEffect, useMemo, useRef } = React;

  /* ---------- Splash ---------- */
  const AFFS = [
    "Hydration is happiness 🐾","Strong body, calm mind","Small habits, big change",
    "Progress, not perfection","Sip, breathe, reset","Gentle + consistent + kind",
    "Future-you says thanks","Your glow is showing ✨","Discipline is self-care",
    "Body wisdom > old habits","Steady water, bright energy","One step at a time"
  ];
  (function initSplash(){
    const line = document.getElementById("splashLine");
    if(line) line.textContent = AFFS[Math.floor(Math.random()*AFFS.length)];
    setTimeout(()=>{ const s=document.getElementById("splash"); if(s) s.classList.add("hide"); }, 1300);
    window.addEventListener("error",(ev)=>{
      const b=document.getElementById("err");
      if(b){ b.style.display="block"; b.textContent="Error: "+(ev.error?.message || ev.message); }
      const s=document.getElementById("splash"); if(s) s.classList.add("hide");
    });
  })();

  /* ---------- Model / defaults ---------- */
  function defDays(){
    const phases=["FAST","FAST","FAST","CLEANSE","CLEANSE","CLEANSE","CLEANSE","REBUILD","REBUILD","REBUILD","REBUILD"];
    return phases.map((ph,i)=>({day:i+1,phase:ph,checks:{},note:"",weight:null,photos:[]}));
  }
  // built-in goals (you can add in Settings)
  const DEFAULT_GOALS = {
    water:"💧 Drink 120–150 oz water",
    tea:"🍵 Tea",
    coffee:"☕ Coffee",
    lmnt:"🧂 Electrolytes",
    exercise:"🏃 Exercise",
    whole:"🥗 Whole food meals",
    weight:"👣 Weight check-in"
  };
  const PHASE_TEMPLATES = {
    FAST:["water","tea","coffee","lmnt","exercise","weight"],
    CLEANSE:["water","tea","coffee","lmnt","exercise","weight"],
    REBUILD:["water","lmnt","exercise","whole","weight"]
  };
  // cleanse juices (every cleanse day shows these 4)
  const CLEANSE_JUICES = [
    {id:"r-melon",name:"Melon Mint Morning"},
    {id:"r-peach",name:"Peachy Green Glow"},
    {id:"r-carrot",name:"Carrot Apple Ginger"},
    {id:"r-grape",name:"Grape Romaine Cooler"}
  ];
  // rebuild meals (simple)
  const REBUILD_MEALS = [
    {id:"m-smoothie",name:"Smoothie Breakfast",day:8},
    {id:"m-lentil",name:"Lentil Soup",day:8},
    {id:"m-broth",name:"Simple Veg Broth",day:9},
    {id:"m-sweet",name:"Baked Sweet Potato Bowl",day:9},
    {id:"m-oats",name:"Overnight Oats",day:10},
    {id:"m-quinoa",name:"Quinoa Salad",day:10},
    {id:"m-protein",name:"Protein + Broccoli",day:11},
  ];

  /* ---------- Storage hook ---------- */
  function useLocal(key, initial){
    const [v,setV] = useState(()=>{ try{const r=localStorage.getItem(key); return r?JSON.parse(r):initial;}catch{return initial;} });
    useEffect(()=>{ try{localStorage.setItem(key,JSON.stringify(v));}catch{} },[key,v]);
    return [v,setV];
  }

  /* ---------- Micro helpers ---------- */
  const Progress = ({value}) => e("div",{className:"prog"}, e("div",{style:{width:Math.max(0,Math.min(100,value))+"%"}}));

  const Checklist = ({labels, ids, state, onToggle}) =>
    e("ul",{className:"list fadein"},
      ids.map(id =>
        e("li",{className:"item",key:id},
          e("button",{className:"paw"+(state[id]?" on":""),onClick:()=>onToggle(id),"aria-pressed":!!state[id]}, state[id]?"🐾":""),
          e("div",null, labels[id] || id)
        )
      ));

  const WeightChart = ({series})=>{
    const ref=useRef(null), chartRef=useRef(null);
    useEffect(()=>{
      const ctx=ref.current.getContext("2d");
      if(chartRef.current){ try{chartRef.current.destroy()}catch{} }
      chartRef.current = new Chart(ctx,{
        type:"line",
        data:{ labels:series.map((_,i)=>"Day "+(i+1)), datasets:[{ data:series, borderColor:"#ec4899", backgroundColor:"rgba(236,72,153,.12)", tension:.35, spanGaps:true, pointRadius:3 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
          scales:{ x:{ ticks:{color:"#475569",font:{size:11}}}, y:{ ticks:{color:"#475569",font:{size:11}}} } }
      });
      return ()=>{ try{chartRef.current && chartRef.current.destroy()}catch{} };
    },[series]);
    return e("div",{style:{height:180}}, e("canvas",{ref}));
  };

  /* ---------- Coach ---------- */
  const COACH_AFFIRM = [
    "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
    "Consistency beats intensity.","Tiny wins add up.","Fuel, flush, flourish.","Kind to yourself = power."
  ];
  function inferMood(text){
    let score=6; const t=(text||"").toLowerCase();
    const neg=[/overwhelm|anxious|stressed|down|discourag/,/tired|exhaust|wiped/,/pain|hurt|ache/]
      .reduce((n,rx)=>n+(rx.test(t)?1:0),0);
    const pos=[/proud|strong|good|better|energized|motivated|progress|calm|happy|light/]
      .reduce((n,rx)=>n+(rx.test(t)?1:0),0);
    score += pos - 2*neg; return Math.max(1,Math.min(10,score));
  }
  function smartCoach(text, phase){
    const t=(text||"").toLowerCase();
    const SYM = [
      {id:"headache", rx:/\b(headache|migraine|head pain)\b/},
      {id:"dizzy", rx:/\b(dizzy|light[-\s]?headed|vertigo)\b/},
      {id:"nausea", rx:/\b(nausea|queasy|sick to (my|the) stomach)\b/},
      {id:"fatigue", rx:/\b(tired|fatigue|exhaust(ed|ion)|wiped)\b/},
      {id:"hunger", rx:/\b(hungry|starv(ed|ing)|crav(ing|es))\b/}
    ];
    const found = new Set(SYM.filter(m=>m.rx.test(t)).map(m=>m.id));
    const mood = inferMood(t);
    let tips=[];
    if(found.has("headache")) tips.push("12–16 oz water + pinch of sea salt, dim screens 10–15 min.");
    if(found.has("dizzy")) tips.push("Sit until steady; slow breaths (4 in / 6 out) for 2 minutes.");
    if(found.has("nausea")) tips.push("Peppermint or ginger tea; cool water sips; fresh air.");
    if(found.has("fatigue")) tips.push("15-minute rest; hydrate; a 3-minute stretch reset.");
    if(found.has("hunger")) tips.push("Water first; if cleansing, sip a juice; 5-min walk.");
    if(phase==="CLEANSE") tips.push("Aim ~1 juice every 3 hours; sip slowly.");
    if(phase==="REBUILD") tips.push("Chew well and stop at 80% full; protein + veg anchor.");
    if(!tips.length) tips.push("Hydrate now, 5 slow breaths, short walk, then reassess.");

    const moodBoost = (mood<=3)
      ? ["You’re not alone — make today gentle.","Pick one tiny win now (8–10 oz water).", pick(COACH_AFFIRM)]
      : (mood<=6)
        ? ["Nice work staying steady. Upgrade one small thing today.", pick(COACH_AFFIRM)]
        : [pick(COACH_AFFIRM), "Ride the wave. Keep it kind."];

    const header = found.size ? `I noticed: ${Array.from(found).join(", ")}.` : "No specific symptoms spotted — here’s a steady plan.";
    return `${header}\n\nTry these:\n• ${tips.join("\n• ")}\n\n${moodBoost.join(" ")}`;
  }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  /* ---------- Pages ---------- */
  const Dashboard = ({days,setDays, goals, templates})=>{
    const [idx,setIdx] = useState(0);
    const day = days[idx] || days[0];
    const active = (day.order && day.order.length ? day.order : templates[day.phase]) || [];
    const labels = goals;
    const checks = day.checks || {};
    const done = active.reduce((n,id)=> n + (checks[id]?1:0), 0);
    const progress = active.length ? (done/active.length)*100 : 0;
    const series = days.map(d => d.weight==null?null:d.weight);

    useEffect(()=>{ if(Math.round(progress)===100){ bigCelebrate(); } },[progress]);
    function bigCelebrate(){
      try{
        // burst + glitter curtain
        const count=140, defaults={origin:{y:.65}};
        function fire(particleRatio, opts){ confetti(Object.assign({}, defaults, opts, {particleCount:Math.floor(count*particleRatio)})); }
        fire(.25, {spread:26,startVelocity:55});
        fire(.2, {spread:60});
        fire(.35, {spread:100, decay:.91, scalar:.9});
        fire(.1, {spread:120, startVelocity:25, decay:.92, scalar:1.2});
        fire(.1, {spread:120, startVelocity:45});
      }catch{}
    }

    function toggle(id){
      setDays(prev=>{
        const next=prev.slice(); const d={...next[idx]};
        d.checks = {...(d.checks||{}), [id]: !(d.checks||{})[id]};
        next[idx]=d; return next;
      });
    }
    function move(n){ setIdx(i=> (i+n+days.length)%days.length ); }

    const [coachOut,setCoachOut] = useState("");
    function runCoach(){
      const text=(day.note||"").trim();
      if(!text){ setCoachOut("Write a quick note below, then tap Smart Coach."); return; }
      setCoachOut(smartCoach(text, day.phase));
    }

    // next 2 days ingredients (juices on cleanse, simple rebuild)
    function nextTwo(current){
      const want=[current.day, current.day+1];
      const rows=[];
      const add=(name,qty)=>rows.push({name,qty});
      const d1=days.find(d=>d.day===want[0]);
      const d2=days.find(d=>d.day===want[1]);
      [d1,d2].forEach(d=>{
        if(!d) return;
        if(d.phase==="CLEANSE") CLEANSE_JUICES.forEach(j=>add(j.name,"1 bottle"));
        if(d.phase==="REBUILD") add("Protein + vegetable meal","1 meal");
      });
      return rows;
    }

    return e(React.Fragment,null,
      // mast
      e("div",{className:"card mast fadein"},
        e("div",{className:"mL"},
          e("img",{src:"oz.png",alt:"Oz"}),
          e("div",null,
            e("div",{className:"mTitle"},"Oz Companion"),
            e("div",{className:"mSub"},day.phase)
          )
        ),
        e("div",{className:"dayNav"},
          e("button",{className:"btn",onClick:()=>move(-1)},"◀"),
          e("div",{className:"dayPill"},"Day ",day.day),
          e("button",{className:"btn",onClick:()=>move(1)},"▶")
        )
      ),

      e(Progress,{value:progress}),

      // checklist
      e("div",{className:"card fadein"},
        e(Checklist,{labels,ids:active,state:checks,onToggle:toggle})
      ),

      // coach + notes
      e("div",{className:"card fadein"},
        e("div",{className:"coachCard",role:"button",tabIndex:0,onClick:runCoach,
          onKeyDown:(ev)=>{ if(ev.key===" "||ev.key==="Enter") runCoach(); }},
          e("span",{className:"badge"},"🧠 Smart Coach"),
          e("div",null,"Tap to analyze your note and get relief + motivation")
        ),
        coachOut && e("div",{className:"card",style:{marginTop:8}}, coachOut),
        e("textarea",{className:"note",value:day.note,
          onChange:(ev)=>setDays(prev=>{const next=prev.slice();next[idx]={...next[idx],note:ev.target.value};return next;})})
      ),

      // ingredients
      e("div",{className:"card fadein"},
        e("h3",null,"Upcoming ingredients — next 2 days"),
        e("ul",{className:"list"},
          nextTwo(day).map((it,i)=> e("li",{className:"item",key:i}, e("div",null,it.name), e("span",{className:"badge"},it.qty)))
        )
      ),

      // weight
      e("div",{className:"card fadein"},
        e("h3",null,"Weight"),
        e("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}},
          e("label",null,"Today"),
          e("input",{type:"number",inputMode:"decimal",step:"0.1",style:{width:120},
            value: day.weight==null?"":day.weight,
            onChange:(ev)=>setDays(prev=>{const n=prev.slice(); n[idx]={...n[idx],weight:ev.target.value===""?null:Number(ev.target.value)}; return n; })
          ),
          e("span",{className:"badge"},"Day ",day.day)
        ),
        e(WeightChart,{series})
      )
    );
  };

  const Calendar = ({days})=>{
    return e("div",{className:"card fadein"},
      e("h2",null,"Calendar"),
      e("ul",{className:"list"},
        days.map(d=>{
          const isCleanse = d.phase==="CLEANSE";
          const note = (d.note||"").trim().length>0;
          const photos = (d.photos||[]).length>0;
          return e("li",{className:"item",key:d.day,style:{alignItems:"flex-start"}},
            e("div",null,
              e("div",null, e("b",null,`Day ${d.day} — ${d.phase}`)),
              isCleanse && e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}},
                CLEANSE_JUICES.map(j=> e("span",{key:j.id,className:"badge"},"🧃 ",j.name))
              )
            ),
            e("div",{style:{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}},
              isCleanse ? e("span",{className:"badge"},"4 juices") : e("span",{className:"badge"},"0 juices"),
              note && e("span",{className:"badge"},"📝 Note"),
              photos && e("span",{className:"badge"},"📸 Photos")
            )
          );
        })
      )
    );
  };

  // very light grocery placeholder (kept lean)
  const Groceries = ({})=> e("div",{className:"card fadein"},
    e("h2",null,"Groceries & Prices"),
    e("p",{style:{color:"#64748b"}}, "Grocery aggregation kept light in this build — we can re-enable the full price editor if you want it back next." )
  );

  const Photos = ({days,setDays})=>{
    const [idx,setIdx]=useState(0);
    const day=days[idx]||days[0];
    function upload(ev){
      const f=ev.target.files?.[0]; if(!f) return;
      const r=new FileReader();
      r.onload=()=>{
        setDays(prev=>{const n=prev.slice(); const d={...n[idx]}; d.photos=[...(d.photos||[]), String(r.result)]; n[idx]=d; return n;});
        const P = [
          "Looking strong ✨","Your glow is showing ✨","Oz is proud of you 🐶",
          "Small habits, big change 💪","Confidence up. Keep going. 🌟"
        ];
        setTimeout(()=>alert(P[Math.floor(Math.random()*P.length)]),50);
      };
      r.readAsDataURL(f);
    }
    return e("div",{className:"card fadein"},
      e("h2",null,"Progress photos — Day ",day.day),
      e("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},
        e("button",{className:"btn primary",onClick:()=>setIdx(i=>(i>0?i-1:days.length-1))},"◀"),
        e("span",{className:"badge"},"Day ",day.day),
        e("button",{className:"btn primary",onClick:()=>setIdx(i=>(i<days.length-1?i+1:0))},"▶"),
        e("label",{className:"btn",style:{background:"linear-gradient(90deg,var(--peach),var(--peach2))",display:"inline-block",marginLeft:"auto"}},
          "Upload photo", e("input",{type:"file",accept:"image/*",style:{display:"none"},onChange:upload})
        )
      ),
      e("div",{className:"grid",style:{marginTop:12}},
        (day.photos||[]).map((src,i)=> e("img",{key:i,src}))
      )
    );
  };

  const Settings = ({goals,setGoals,templates,setTemplates})=>{
    const [phase,setPhase] = useState("FAST");
    const allIds = Object.keys(goals);

    function togglePhaseGoal(id, on){
      setTemplates(prev=>{
        const set=new Set(prev[phase]||[]);
        if(on) set.add(id); else set.delete(id);
        return {...prev, [phase]:Array.from(set)};
      });
    }
    function addGoal(){
      const idRaw = prompt("New goal ID (letters, dashes): e.g., meditation");
      if(!idRaw) return;
      const id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,"");
      if(!id || goals[id]){ alert("Invalid/duplicate ID"); return; }
      const label = prompt("Label to show (you can include emoji):");
      if(!label) return;
      setGoals(prev=> ({...prev, [id]:label}));
      setTemplates(prev=> ({...prev, [phase]:[...(prev[phase]||[]), id]}));
    }

    return e("div",{className:"card fadein"},
      e("h2",null,"Settings"),
      e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",margin:"6px 0 10px"}},
        ["FAST","CLEANSE","REBUILD"].map(p=> e("button",{key:p,className:"btn"+(phase===p?" primary":""),onClick:()=>setPhase(p)}, p))
      ),
      e("div",{className:"card",style:{padding:10}},
        e("div",{style:{fontSize:12,color:"#64748b",marginBottom:6}},"Visible checklist items for ", e("b",null,phase)),
        e("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          allIds.map(id=>{
            const on = (templates[phase]||[]).includes(id);
            return e("label",{key:id,className:"badge"},
              e("input",{type:"checkbox",checked:on,onChange:(ev)=>togglePhaseGoal(id, ev.target.checked)}),
              " ", goals[id]
            );
          })
        ),
        e("div",{style:{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          e("button",{className:"btn",onClick:addGoal},"+ New goal"),
          e("span",{className:"badge"}, (templates[phase]||[]).length, " selected")
        )
      )
    );
  };

  /* ---------- App ---------- */
  const App = ()=>{
    const [days,setDays] = useLocal("oz.days", defDays());
    const [goals,setGoals] = useLocal("oz.goals", DEFAULT_GOALS);
    const [templates,setTemplates] = useLocal("oz.templates", PHASE_TEMPLATES);
    const [tab,setTab] = useState("dash");

    // guard templates if goals changed
    useEffect(()=>{
      const valid = ["FAST","CLEANSE","REBUILD"].every(k => Array.isArray(templates[k]) && templates[k].every(id => goals[id]));
      if(!valid) setTemplates(PHASE_TEMPLATES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goals]);

    return e(React.Fragment,null,
      (tab==="dash") && e(Dashboard,{days,setDays,goals,templates}),
      (tab==="calendar") && e(Calendar,{days}),
      (tab==="groceries") && e(Groceries,{}),
      (tab==="photos") && e(Photos,{days,setDays}),
      (tab==="settings") && e(Settings,{goals,setGoals,templates,setTemplates}),
      e("nav",{className:"tabs"},
        [
          {id:"dash",ico:"🏠"},{id:"groceries",ico:"🛒"},{id:"calendar",ico:"📅"},
          {id:"photos",ico:"📷"},{id:"settings",ico:"⚙️"}
        ].map(t=> e("button",{key:t.id,className:"btn"+(tab===t.id?" active":""),onClick:()=>setTab(t.id),"aria-label":t.id}, t.ico))
      )
    );
  };

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
