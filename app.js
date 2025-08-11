/* Oz Companion – compact app.js (React 18) */
(function(){
  const e = React.createElement;
  const {useState,useEffect,useRef,useMemo} = React;

  /* ------ Splash lines ------ */
  const SPLASH = [
    "Hydration is happiness 🐾",
    "Strong body, calm mind",
    "Small habits, big change",
    "Progress, not perfection",
    "Sip, breathe, reset"
  ];
  (function initSplash(){
    const line = document.getElementById("splashLine");
    if(line) line.textContent = SPLASH[Math.floor(Math.random()*SPLASH.length)];
    // safety auto-hide
    setTimeout(()=>{ const s=document.getElementById("splash"); if(s) s.classList.add("hide"); }, 1300);
    window.addEventListener("error",(ev)=>{
      const b=document.getElementById("errorBanner");
      if(b){ b.style.display="block"; b.textContent = "Error: " + (ev.error?.message || ev.message); }
      const s=document.getElementById("splash"); if(s) s.classList.add("hide");
    });
  })();

  /* ------ Defaults ------ */
  function defDays(){
    const phases=["FAST","FAST","FAST","CLEANSE","CLEANSE","CLEANSE","CLEANSE","REBUILD","REBUILD","REBUILD","REBUILD"];
    return phases.map((ph,i)=>({day:i+1,phase:ph,checks:{},note:"",weight:null,photos:[]}));
  }
  const GOAL_LABEL = {
    water:"💧 Drink 120–150 oz water",
    tea:"🍵 Tea", coffee:"☕ Coffee", lmnt:"🧂 Electrolytes",
    exercise:"🏃 Exercise", weight:"👣 Weight check-in", whole:"🥗 Whole food meals"
  };
  const PHASE_DEFAULTS = {
    FAST:["water","tea","coffee","lmnt","exercise","weight"],
    CLEANSE:["water","tea","coffee","lmnt","exercise","weight"],
    REBUILD:["water","lmnt","exercise","whole","weight"]
  };

  /* 4 cleanse juices (used on every CLEANSE day visually) */
  const CLEANSE_JUICES = [
    {id:"r-melon",name:"Melon Mint Morning"},
    {id:"r-peach",name:"Peachy Green Glow"},
    {id:"r-carrot",name:"Carrot Apple Ginger"},
    {id:"r-grape",name:"Grape Romaine Cooler"}
  ];

  /* simple localStorage helper */
  function useLocal(key, initial){
    const [v,setV] = useState(()=>{ try{ const r=localStorage.getItem(key); return r?JSON.parse(r):initial; }catch{return initial;} });
    useEffect(()=>{ try{ localStorage.setItem(key,JSON.stringify(v)); }catch{} },[key,v]);
    return [v,setV];
  }

  /* ---------- tiny atoms ---------- */
  const Progress = ({value}) => e("div",{className:"prog"}, e("div",{style:{width:Math.max(0,Math.min(100,value))+"%"}}));
  const Checklist = ({items,state,onToggle}) =>
    e("ul",{className:"list"},
      items.map(it =>
        e("li",{className:"item",key:it.id},
          e("button",{className:"paw"+(state[it.id]?" on":""),onClick:()=>onToggle(it.id),"aria-pressed":!!state[it.id]}, state[it.id]?"🐾":""),
          e("div",null,it.label)
        )
      ));

  const WeightChart = ({series})=>{
    const ref = useRef(null), chartRef = useRef(null);
    useEffect(()=>{
      const ctx = ref.current.getContext("2d");
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

  /* ---------- Pages ---------- */
  const Dashboard = ({days,setDays})=>{
    const [idx,setIdx] = useState(0);
    const day = days[idx] || days[0];
    const tmpl = PHASE_DEFAULTS[day.phase] || [];
    const items = tmpl.map(id=>({id,label:GOAL_LABEL[id]}));
    const checks = day.checks || {};
    const done = items.reduce((n,it)=>n+(checks[it.id]?1:0),0);
    const progress = items.length? (done/items.length)*100 : 0;
    const series = days.map(d => d.weight==null ? null : d.weight);

    useEffect(()=>{ if(Math.round(progress)===100){ try{ confetti({particleCount:90, spread:70, origin:{y:.6}}); }catch{} } },[progress]);

    function toggle(id){
      setDays(prev=>{
        const next = prev.slice(); const d = {...next[idx]};
        d.checks = {...(d.checks||{}), [id]: !(d.checks||{})[id]};
        next[idx]=d; return next;
      });
    }
    function move(n){ setIdx(i=> (i+n+days.length)%days.length ); }

    /* Smart coach – UI only */
    const [coach,setCoach] = useState("");
    function runCoach(){
      const t=(day.note||"").toLowerCase();
      const has = kw => t.includes(kw);
      let tips=[];
      if(has("headache")||has("dizzy")) tips.push("12–16 oz water + pinch of salt; dim screens 10 min.");
      if(day.phase==="CLEANSE") tips.push("One juice about every 3 hours, sip slowly.");
      if(day.phase==="REBUILD") tips.push("Chew well; stop at 80% full.");
      if(!tips.length) tips.push("Hydrate now, 5 slow breaths, short walk.");
      setCoach(tips.join(" "));
    }

    /* next two days ingredients (based on CLEANSE_JUICES + simple meals) */
    function upcoming(current){
      const d1=current.day, d2=current.day+1;
      const list = [];
      const add = (name, qty) => list.push({name,qty});
      if(current.phase==="CLEANSE") CLEANSE_JUICES.forEach(j=>add(j.name,"1 bottle"));
      if(days[idx+1] && days[idx+1].phase==="CLEANSE") CLEANSE_JUICES.forEach(j=>add(j.name,"1 bottle"));
      if(current.phase==="REBUILD") add("Simple veg + protein","1 meal");
      return list;
    }

    return e(React.Fragment,null,
      e("div",{className:"card mast"},
        e("div",{className:"mL"},
          e("img",{src:"oz.png",alt:"Oz"}),
          e("div",null,
            e("div",{className:"mTitle",style:{fontSize:26}},"Oz Companion"),
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

      e("div",{className:"card"},
        e(Checklist,{items,state:checks,onToggle:toggle})
      ),

      e("div",{className:"card"},
        e("div",{className:"coachCard",role:"button",tabIndex:0,onClick:runCoach,
          onKeyDown:(ev)=>{ if(ev.key===" "||ev.key==="Enter") runCoach(); }},
          e("span",{className:"badge"},"🧠 Smart Coach"),
          e("div",null,"Tap to analyze your note and get relief + motivation")
        ),
        coach && e("div",{className:"card",style:{marginTop:8}}, coach),
        e("textarea",{className:"note",value:day.note,
          onChange:(ev)=>setDays(prev=>{const next=prev.slice();next[idx]={...next[idx],note:ev.target.value};return next;})})
      ),

      e("div",{className:"card"},
        e("h3",null,"Upcoming ingredients — next 2 days"),
        e("ul",{className:"list"},
          upcoming(day).map((it,i)=> e("li",{className:"item",key:i}, e("div",null,it.name), e("span",{className:"badge"},it.qty)))
        )
      ),

      e("div",{className:"card"},
        e("h3",null,"Weight"),
        e("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}},
          e("label",null,"Today"),
          e("input",{type:"number",inputMode:"decimal",step:"0.1",style:{width:120},
            value: day.weight==null?"":day.weight,
            onChange:(ev)=>setDays(prev=>{const n=prev.slice(); n[idx]={...n[idx],weight:ev.target.value===""?null:Number(ev.target.value)}; return n; })
          }),
          e("span",{className:"badge"},"Day ",day.day)
        ),
        e(WeightChart,{series:series})
      )
    );
  };

  const Calendar = ({days})=>{
    return e("div",{className:"card"},
      e("h2",null,"Calendar"),
      e("ul",{className:"list"},
        days.map(d=>{
          const isCleanse = d.phase==="CLEANSE";
          const names = isCleanse ? CLEANSE_JUICES.map(j=>j.name) : [];
          const juiceBadge = isCleanse ? "4 juices" : "0 juices";
          return e("li",{className:"item",key:d.day},
            e("div",null, e("b",null,`Day ${d.day} — ${d.phase}`)),
            e("div",{style:{marginLeft:"auto"}}, e("span",{className:"badge"},juiceBadge)),
            isCleanse && e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginTop:8,width:"100%"}},
              names.map(n=> e("span",{key:n,className:"badge"},"🧃 ",n))
            )
          );
        })
      )
    );
  };

  const Groceries = ({})=>{
    return e("div",{className:"card"},
      e("h2",null,"Groceries & Prices"),
      e("p",{style:{color:"#64748b"}}, "Coming from the plan (editable prices) – we’ll wire your local store book next.")
    );
  };

  const Photos = ({days,setDays})=>{
    const [idx,setIdx]=useState(0);
    const day=days[idx]||days[0];
    function upload(ev){
      const f=ev.target.files?.[0]; if(!f) return;
      const r=new FileReader();
      r.onload=()=>{
        setDays(prev=>{const n=prev.slice(); const d={...n[idx]}; d.photos=[...(d.photos||[]), String(r.result)]; n[idx]=d; return n;});
        const A=["Looking strong ✨","Your glow is showing ✨","Oz is proud of you 🐶","Small habits, big change 💪"];
        setTimeout(()=>alert(A[Math.floor(Math.random()*A.length)]),50);
      };
      r.readAsDataURL(f);
    }
    return e("div",{className:"card"},
      e("h2",null,"Progress photos – Day ",day.day),
      e("label",{className:"btn",style:{background:"linear-gradient(90deg,var(--peach),var(--peach2))",display:"inline-block"}},
        "Upload photo", e("input",{type:"file",accept:"image/*",style:{display:"none"},onChange:upload})
      ),
      e("div",{className:"grid",style:{marginTop:12}},
        (day.photos||[]).map((src,i)=> e("img",{key:i,src}))
      )
    );
  };

  const Settings = ({})=>{
    return e("div",{className:"card"},
      e("h2",null,"Settings"),
      e("p",{style:{color:"#64748b"}}, "Lightweight settings UI — more switches coming.")
    );
  };

  /* ---------- App ---------- */
  const App = ()=>{
    const [days,setDays] = useLocal("oz.days", defDays());
    const [tab,setTab] = useState("dash");

    return e(React.Fragment,null,
      (tab==="dash") && e(Dashboard,{days,setDays}),
      (tab==="calendar") && e(Calendar,{days}),
      (tab==="groceries") && e(Groceries,{}),
      (tab==="photos") && e(Photos,{days,setDays}),
      (tab==="settings") && e(Settings,{}),

      e("nav",{className:"tabs"},
        [
          {id:"dash",ico:"🏠"},{id:"groceries",ico:"🛒"},{id:"calendar",ico:"📅"},{id:"photos",ico:"📷"},{id:"settings",ico:"⚙️"}
        ].map(t=> e("button",{key:t.id,className:"btn"+(tab===t.id?" active":""),onClick:()=>setTab(t.id),"aria-label":t.id}, t.ico))
      )
    );
  };

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
