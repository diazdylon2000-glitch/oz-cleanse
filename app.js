/* Oz Companion — app.js (UMD / React 18 + Chart.js 4)
   - Paw checklist (per phase, customizable via Settings)
   - Smart Coach (clickable header card, readable tips)
   - Weight input auto-checks "weight" goal + chart
   - Calendar tracks notes/photos badges
   - Photos uploader with randomized affirmations (localStorage)
   - Groceries aggregation + budget line items
   - Start date + plan import (default or ChatGPT text)
   - Clean, native-feel UI aligned to provided CSS/HTML
*/

(function(){
  "use strict";

  // shorthand to create React elements
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;

  /* ---------------- helpers ---------------- */
  function useLocal(key, initialValue){
    var pair = useState(function(){
      try{ var raw = localStorage.getItem(key); return raw? JSON.parse(raw): initialValue; }
      catch(_){ return initialValue; }
    });
    var val = pair[0], setVal = pair[1];
    useEffect(function(){
      try{ localStorage.setItem(key, JSON.stringify(val)); }catch(_){}
    }, [key, val]);
    return [val, setVal];
  }

  function defaultDays(){
    var phases=["fast","fast","fast","cleanse","cleanse","cleanse","cleanse","rebuild","rebuild","rebuild","rebuild"];
    var out=[]; for(var i=0;i<phases.length;i++){
      out.push({day:i+1, phase:phases[i], order:null, checks:{}, note:"", weight:null, photos:[]});
    }
    return out;
  }

  // Build cleanse days to show 1 of EACH of the 4 juices per cleanse day
  function buildPlanRecipes(){
    var CLEANSE_DAYS=[4,5,6,7];
    var JUICES = [
      { baseId:"melon",  name:"Melon Mint Morning",  ingredients:[
        {key:"melons",name:"Melon",qty:"1"},{key:"mint",name:"Mint",qty:"1/2 cup"},{key:"limes",name:"Lime",qty:"1"}
      ]},
      { baseId:"peach",  name:"Peachy Green Glow",   ingredients:[
        {key:"peaches",name:"Peaches",qty:"3"},{key:"cucumbers",name:"Cucumbers",qty:"2"},{key:"spinach",name:"Spinach",qty:"4 cups"},{key:"lemons",name:"Lemons",qty:"1"}
      ]},
      { baseId:"carrot", name:"Carrot Apple Ginger", ingredients:[
        {key:"carrots",name:"Carrots",qty:"7"},{key:"apples",name:"Apples",qty:"1"},{key:"ginger",name:"Ginger",qty:'1/2"'},{key:"lemons",name:"Lemons",qty:"1/2"}
      ]},
      { baseId:"grape",  name:"Grape Romaine Cooler",ingredients:[
        {key:"grapes",name:"Grapes",qty:"1.5 cups"},{key:"romaine",name:"Romaine",qty:"1.5 cups"},{key:"cucumbers",name:"Cucumbers",qty:"0.5"},{key:"lemons",name:"Lemons",qty:"1/2"}
      ]}
    ];
    // Each cleanse day gets the 4 different juices (servings=1 each)
    var arr=[];
    CLEANSE_DAYS.forEach(function(d){
      JUICES.forEach(function(j){
        arr.push({ id:"r-"+j.baseId+"-d"+d, name:j.name, type:"juice", day:d, servings:1, ingredients:j.ingredients });
      });
    });
    // Rebuild meals
    arr = arr.concat([
      { id:"r-smoothie-8", name:"Smoothie Breakfast", type:"meal", day:8,
        ingredients:[{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"},{key:"chia",name:"Chia",qty:"1 tbsp"}]
      },
      { id:"r-lentil-8", name:"Lentil Soup", type:"meal", day:8,
        ingredients:[{key:"lentils",name:"Lentils (dry)",qty:"1/2 cup"},{key:"carrots",name:"Carrots",qty:"1/2 cup"},{key:"celery",name:"Celery",qty:"1/2 cup"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"onions",name:"Onion",qty:"1/4"}]
      },
      { id:"r-broth-9", name:"Simple Veg Broth", type:"meal", day:9,
        ingredients:[{key:"carrots",name:"Carrots",qty:"2"},{key:"celery",name:"Celery",qty:"2 stalks"},{key:"onions",name:"Onion",qty:"1/2"},{key:"parsley",name:"Parsley",qty:"few sprigs"}]
      },
      { id:"r-sweetpot-9", name:"Baked Sweet Potato Bowl", type:"meal", day:9,
        ingredients:[{key:"sweet-potatoes",name:"Sweet potatoes",qty:"2"},{key:"spinach",name:"Spinach",qty:"2 cups"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"}]
      },
      { id:"r-oats-10", name:"Overnight Oats", type:"meal", day:10,
        ingredients:[{key:"rolled-oats",name:"Rolled oats",qty:"1/2 cup"},{key:"almond-milk",name:"Almond milk",qty:"1 cup"}]
      },
      { id:"r-quinoa-10", name:"Quinoa Salad", type:"meal", day:10,
        ingredients:[{key:"quinoa",name:"Quinoa (dry)",qty:"1/2 cup"},{key:"cucumbers",name:"Cucumber",qty:"1"},{key:"tomatoes",name:"Tomato",qty:"1"},{key:"parsley",name:"Parsley",qty:"1/4 cup"},{key:"olive-oil",name:"Olive oil",qty:"1 tbsp"},{key:"lemons",name:"Lemon",qty:"1"}]
      },
      { id:"r-protein-11", name:"Protein + Broccoli", type:"meal", day:11,
        ingredients:[{key:"protein",name:"Salmon/Chicken",qty:"12 oz"},{key:"broccoli",name:"Broccoli",qty:"2 heads"}]
      }
    ]);
    return arr;
  }

  // groceries aggregation (juice servings=1 already per recipe above)
  function aggregateGroceries(recipes){
    function parse(s){
      if(!s) return {n:1,u:""};
      var m=String(s).match(/^(\d+(\.\d+)?)(.*)$/);
      return m? {n:parseFloat(m[1]), u:(m[3]||"").trim()} : {n:1,u:""};
    }
    function fmt(n,u){ return u ? (Number.isInteger(n)? n : (+n).toFixed(2))+" "+u : String(n); }
    var map={};
    (recipes||[]).forEach(function(r){
      (r.ingredients||[]).forEach(function(it){
        var id=(it.key||it.name||"").toLowerCase().replace(/\s+/g,"-");
        var q=parse(it.qty||"1");
        if(!map[id]){
          map[id]={id:id,name:it.name, qtyNum:q.n, qtyUnit:q.u, checked:false, estCost:null, days: r.day?[r.day]:[]};
        }else{
          map[id].qtyNum += q.n;
          var s=new Set(map[id].days||[]); if(r.day) s.add(r.day); map[id].days=Array.from(s).sort(function(a,b){return a-b;});
        }
      });
    });
    return Object.keys(map).map(function(k){
      var g=map[k]; return {id:g.id, name:g.name, qty:(g.qtyUnit? fmt(g.qtyNum,g.qtyUnit): String(g.qtyNum)), checked:g.checked, estCost:g.estCost, days:g.days};
    }).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
  }

  /* ---------------- data ---------------- */
  var INITIAL_GOALS = {
    water:"💧 Drink 120–150 oz water",
    tea:"🍵 Tea",
    coffee:"☕ Coffee",
    juice:"🧃 Juices",
    lmnt:"🧂 Electrolytes",
    exercise:"🏃 Exercise",
    wholefood:"🥗 Whole food meals",
    weight:"👣 Weight check-in"
  };

  var DEFAULT_PHASE_TEMPLATES = {
    fast:["water","tea","coffee","lmnt","exercise","weight"],
    cleanse:["water","tea","coffee","juice","lmnt","exercise","weight"],
    rebuild:["water","lmnt","exercise","wholefood","weight"]
  };

  var AFFIRM = [
    "You’ve got this! 💪","Small habits, big change ✨","Progress, not perfection",
    "Sip, breathe, reset","Strong body, calm mind","Hydration is happiness 🐾",
    "Future-you says thanks","Gentle + consistent + kind","Shine time ✨",
    "Keep it playful","You’re doing the work 💪","One choice at a time"
  ];

  function randomAff(){
    try{
      var used=JSON.parse(localStorage.getItem("oz.usedAff")||"[]");
      var avail=AFFIRM.filter(function(t){return used.indexOf(t)===-1;});
      if(avail.length===0){ used=[]; avail=AFFIRM.slice(); }
      var pick=avail[Math.floor(Math.random()*avail.length)];
      used.push(pick); localStorage.setItem("oz.usedAff", JSON.stringify(used));
      return pick;
    }catch(_){ return AFFIRM[Math.floor(Math.random()*AFFIRM.length)]; }
  }

  /* ---------------- UI atoms ---------------- */
  function ProgressBar(p){
    var v = Math.max(0, Math.min(100, p.value||0));
    return e("div", { className:"prog" }, e("div", { className:"fill", style:{ width: v+"%" } }));
  }

  function Checklist(p){
    return e("ul", { className:"list" },
      (p.items||[]).map(function(it){
        var on = !!p.state[it.id];
        return e("li", { key:it.id, className:"item" },
          e("button", { className:"paw"+(on?" on":""), onClick:function(){ p.onToggle(it.id); }, "aria-pressed":on }, on?"🐾":""),
          e("label", null, it.label)
        );
      })
    );
  }

  function WeightChart(p){
    var refCanvas = useRef(null);
    var chartRef = useRef(null);
    useEffect(function(){
      var cvs = refCanvas.current; if(!cvs) return;
      var ctx = cvs.getContext("2d");
      if(chartRef.current){ try{ chartRef.current.destroy(); }catch(_){ } }
      chartRef.current = new Chart(ctx, {
        type:"line",
        data:{
          labels: (p.series||[]).map(function(_,i){ return "Day "+(i+1); }),
          datasets: [{
            data: p.series||[],
            borderColor:"#ec4899",
            backgroundColor:"rgba(236,72,153,.12)",
            tension:.35, spanGaps:true, pointRadius:3, pointHoverRadius:4
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          layout:{ padding:{ bottom:12, top:6, left:6, right:6 } },
          plugins:{ legend:{ display:false } },
          scales:{
            x:{ ticks:{ color:"#475569", font:{ size:11 }}, grid:{ color:"rgba(148,163,184,.25)" } },
            y:{ ticks:{ color:"#475569", font:{ size:11 }}, grid:{ color:"rgba(148,163,184,.18)" } }
          },
          animation:{ duration:250 }
        }
      });
      return function(){ try{ chartRef.current && chartRef.current.destroy(); }catch(_){} };
    }, [p.series]);
    return e("div",{style:{height:180}}, e("canvas",{ref:refCanvas}));
  }

  /* ---------------- pages ---------------- */
  function GroceryList(p){
    var groceries = p.groceries;
    var setGroceries = p.setGroceries;
    var budgetState = useLocal("oz.budget", 0);
    var budget = budgetState[0], setBudget = budgetState[1];

    function update(idx, patch){
      setGroceries(groceries.map(function(g,i){ return i===idx ? Object.assign({}, g, patch) : g; }));
    }

    var totals = useMemo(function(){
      var checked=0, remaining=0, total=0;
      (groceries||[]).forEach(function(g){
        var line = +g.estCost || 0;
        if(g.checked) checked += line; else remaining += line;
        total += line;
      });
      return { checked:checked, remaining:remaining, total:total };
    },[groceries]);

    function daysBadge(days){
      if(!days || !days.length) return "📦 Pantry";
      var min = Math.min.apply(null, days), max = Math.max.apply(null, days);
      return "📅 "+(min===max? ("Day "+min) : ("Day "+min+"–"+max));
    }

    return e("div", { className:"wrap" },
      e("h1", null, "Groceries & Prices"),
      e("div",{className:"card",style:{margin:"8px 0 12px"}},
        e("div",{style:{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}},
          e("div",null,"Budget $"),
          e("input",{type:"number",step:"0.01",value:budget||"",placeholder:"0.00",onChange:function(ev){ setBudget(ev.target.value===""?0:+ev.target.value); }, style:{width:120}})
        ),
        e("div",{style:{marginTop:8,color:"#64748b",fontSize:13}},
          "Checked $", totals.checked.toFixed(2),
          " • Remaining $", totals.remaining.toFixed(2),
          " • Total $", totals.total.toFixed(2),
          budget? " • Left $"+Math.max(0,(budget - totals.total)).toFixed(2) : ""
        )
      ),
      e("ul",{style:{listStyle:"none",padding:0}},
        (groceries||[]).map(function(g,idx){
          return e("li",{key:g.id, style:{
            display:"grid", gridTemplateColumns:"32px 1fr auto", gap:8,
            padding:"10px 0", borderBottom:"1px solid #f3d0e1", alignItems:"center"
          }},
            e("button",{className:"paw"+(g.checked?" on":""),onClick:function(){ update(idx,{checked:!g.checked}); }}, g.checked?"🐾":""),
            e("div",null,
              e("div",null, g.name, " ", e("span",{className:"badge"}, daysBadge(g.days))),
              e("div",{style:{fontSize:12,color:"#64748b"}}, g.qty||"")
            ),
            e("input",{type:"number",step:"0.01",value:(g.estCost==null?"":g.estCost),
              onChange:function(ev){ update(idx,{estCost:(ev.target.value===""?null:+ev.target.value)}); },
              style:{width:90}})
          );
        })
      )
    );
  }

  function Calendar(p){
    var days = p.days, recipes = p.recipes, settings = p.settings;
    function dateFor(dayNum){
      var dstr = settings.phaseTemplates.__startDate || "";
      if(!dstr) return null;
      var base = new Date(dstr+"T00:00:00"); if(isNaN(base)) return null;
      var dt = new Date(base.getTime() + (dayNum-1)*86400000);
      return dt.toLocaleDateString();
    }
    return e("div",{className:"wrap"},
      e("h1",null,"Calendar"),
      e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
        days.map(function(d){
          var dRecipes = (recipes||[]).filter(function(r){return r.day===d.day;});
          var dd = dateFor(d.day);
          var hasPhotos = (d.photos && d.photos.length>0);
          var hasNote = (d.note && d.note.trim().length>0);
          return e("li",{key:d.day, className:"card", style:{marginBottom:8}},
            e("div",{className:"calRow"},
              e("div",null,
                e("div",{style:{fontWeight:600}}, "Day ", d.day, " — ", d.phase.toUpperCase()),
                dd && e("div",{className:"badge",style:{marginTop:6}}, dd)
              ),
              e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",minHeight:24}},
                dRecipes.length
                  ? dRecipes.map(function(r){ return e("span",{key:r.id,className:"badge"}, (r.type==="juice"?"🧃 ":"🍽️ "), r.name); })
                  : e("span",{style:{fontSize:12,color:"#64748b"}},"—"),
                hasNote && e("span",{className:"badge"},"📝 Note"),
                hasPhotos && e("span",{className:"badge"},"📸 Photos")
              )
            )
          );
        })
      )
    );
  }

  function Photos(p){
    var days = p.days, setDays = p.setDays;
    var idxState = useState(0);
    var idx = idxState[0], setIdx = idxState[1];
    var day = days[idx] || days[0];

    function handleUpload(ev){
      var files = Array.from(ev.target.files||[]);
      if(!files.length) return;
      var readers = files.map(function(f){
        return new Promise(function(res){
          var r=new FileReader(); r.onload=function(){res(r.result)}; r.readAsDataURL(f);
        });
      });
      Promise.all(readers).then(function(urls){
        setDays(function(prev){
          var next=prev.slice(); var d=Object.assign({}, next[idx]);
          d.photos = (d.photos||[]).concat(urls); next[idx]=d; return next;
        });
        var A=["Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪","Oz is proud of you 🐶","Consistency looks good on you 🌟","Radiant!","You kept a promise to yourself"];
        setTimeout(function(){ alert(A[Math.floor(Math.random()*A.length)]); }, 30);
      });
    }

    return e("div",{className:"wrap"},
      e("h1",null,"Progress Photos"),
      e("div",{className:"card",style:{marginBottom:12,display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}},
        e("div",null, e("b",null,"Day "), day.day),
        e("div",null,
          e("button",{className:"btn",onClick:function(){ setIdx(function(i){ return (i>0? i-1 : days.length-1); }); }},"◀"),
          e("span",{className:"badge",style:{margin:"0 8px"}},"Day "+day.day),
          e("button",{className:"btn",onClick:function(){ setIdx(function(i){ return (i<days.length-1? i+1 : 0); }); }},"▶")
        ),
        e("label",{className:"btn"}, "Upload photos",
          e("input",{type:"file", multiple:true, accept:"image/*", onChange:handleUpload, style:{display:"none"}})
        )
      ),
      e("div",{className:"photoGrid"},
        (day.photos||[]).map(function(url,i){ return e("img",{key:i, src:url}); })
      )
    );
  }

  /* ---------------- Smart Coach ---------------- */
  var COACH_RULES = [
    { id:"headache", test:function(ctx){return ctx.syms.has("headache");},
      tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest your eyes 5–10 minutes."] },
    { id:"dizziness", test:function(ctx){return ctx.syms.has("dizziness");},
      tips:["Sit or lie until steady.","Small juice or a pinch of salt if fasting.","Breathe in 4 / out 6."] },
    { id:"nausea", test:function(ctx){return ctx.syms.has("nausea");},
      tips:["Sip cool water or peppermint/ginger tea.","Step into fresh air.","Move slowly; avoid sudden changes."] },
    { id:"fatigue", test:function(ctx){return ctx.syms.has("fatigue");},
      tips:["Take a 15–20 min rest.","Hydrate or take electrolytes.","2 minutes of gentle stretching."] },
    { id:"hunger", test:function(ctx){return ctx.syms.has("hunger");},
      tips:["Drink water first.","Have scheduled juice slowly.","5-min walk as a reset."] }
  ];
  function inferMood(text){
    var score=6, t=(text||"").toLowerCase();
    var neg=[/overwhelm|anxious|stressed|down|sad|discourag|frustrat/,/tired|exhaust|wiped|drained/,/pain|hurt|ache/].reduce(function(n,rx){return n+(rx.test(t)?1:0);},0);
    var pos=[/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/].reduce(function(n,rx){return n+(rx.test(t)?1:0);},0);
    score += pos - 2*neg; return Math.max(1, Math.min(10, score));
  }

  /* ---------------- Dashboard ---------------- */
  function Dashboard(p){
    var templates = p.templates, days = p.days, setDays = p.setDays, recipes = p.recipes, goals = p.goals;
    var idxState = useState(0); var idx = idxState[0], setIdx = idxState[1];
    var day = days[idx] || days[0];

    var activeIds = (day.order && day.order.length ? day.order : (templates[day.phase]||[]));
    var items = activeIds.map(function(id){ return {id:id, label: goals[id] || id}; });
    var checks = day.checks || {};
    var doneCount = items.reduce(function(a,it){ return a + (checks[it.id]?1:0); }, 0);
    var totalCount = Math.max(1, items.length);
    var progress = (doneCount/totalCount)*100;
    var weightSeries = days.map(function(d){ return (d.weight==null? null: d.weight); });

    useEffect(function(){
      if(Math.round(progress)===100){
        try{
          // simple celebration: bounce label (CSS-free)
          var el=document.querySelector(".day-label"); if(el){ var o=el.style.transform; el.style.transition="transform .35s"; el.style.transform="scale(1.08)"; setTimeout(function(){ el.style.transform=o||"scale(1)"; }, 420); }
          alert("Nice! 100% today 🎉");
        }catch(_){}
      }
    },[progress]);

    function toggleCheck(id){
      setDays(function(prev){
        var next=prev.slice(); var d=Object.assign({}, next[idx]);
        var c=Object.assign({}, d.checks||{});
        c[id]=!c[id]; d.checks=c; next[idx]=d; return next;
      });
    }
    function changeDay(dir){
      setIdx(function(cur){ var n=cur+dir; if(n<0) n=days.length-1; if(n>=days.length) n=0; return n; });
    }

    // Smart Coach
    var coachTextState = useState(""); var coachText = coachTextState[0], setCoachText = coachTextState[1];
    function runCoach(){
      var text=(day.note||"").trim();
      if(!text){ setCoachText("Write a quick note below, then tap Smart Coach."); return; }
      var SYM_MATCHERS = [
        {id:"headache",rx:/\b(headache|migraine|head pain)\b/i},
        {id:"dizziness",rx:/\b(dizzy|light[-\s]?headed|vertigo)\b/i},
        {id:"nausea",rx:/\b(nausea|queasy|sick to (my|the) stomach)\b/i},
        {id:"fatigue",rx:/\b(tired|fatigue|exhaust(ed|ion)|wiped|low energy)\b/i},
        {id:"hunger",rx:/\b(hungry|starv(ed|ing)|crav(ing|es))\b/i}
      ];
      var found = new Set(SYM_MATCHERS.filter(function(m){ return m.rx.test(text); }).map(function(m){return m.id;}));
      var mood = inferMood(text);
      var hits = COACH_RULES.filter(function(r){ try{ return r.test({ syms:found, phase:day.phase }); }catch(_){ return false; } });
      var tips = hits.flatMap(function(h){return h.tips;}).slice(0,8);
      var moodBoost = (mood<=3)
        ? ["You’re not alone — let’s make today gentle.","Pick one tiny win now (8–10 oz water, 3 deep breaths).","You’ve got this! 💪"]
        : (mood<=6)
          ? ["Nice work staying steady. One small upgrade today.","Proud of your effort today. 🌟"]
          : ["Keep riding the wave.","Strong body, kind mind."];

      var header = found.size? ("I noticed: "+Array.from(found).join(", ")+".") : "No specific symptoms spotted — here’s a steady plan.";
      var body = tips.length? ("Try these:\n• "+tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
      setCoachText(header+"\n\n"+body+"\n\n"+moodBoost.join(" "));
    }

    // Next-two-day ingredients
    function nextTwoDayIngredients(currentDay){
      function bagForDays(d1,d2){
        var want=new Set([d1,d2]); var bag={};
        (recipes||[]).forEach(function(r){
          if(!r.day||!want.has(r.day)) return;
          (r.ingredients||[]).forEach(function(it){
            var key=(it.key||it.name||"").toLowerCase();
            if(!bag[key]) bag[key]={name:it.name, qtyList:[], days:new Set()};
            if(it.qty) bag[key].qtyList.push(it.qty);
            bag[key].days.add(r.day);
          });
        });
        Object.keys(bag).forEach(function(k){ bag[k].days=Array.from(bag[k].days).sort(function(a,b){return a-b;}); });
        return Object.values(bag).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
      }
      var strict = bagForDays(currentDay.day, currentDay.day+1);
      if(strict.length) return { items:strict, label:"Today + Tomorrow — Ingredients" };
      var futureDays = Array.from(new Set((recipes||[]).filter(function(r){return r.day>=currentDay.day;}).map(function(r){return r.day;}))).sort(function(a,b){return a-b;});
      if(!futureDays.length) return { items:[], label:"Upcoming Ingredients" };
      var pool=futureDays.slice(0,2);
      var fallback = bagForDays(pool[0], pool[1]||pool[0]);
      var label = pool.length===2 ? ("Upcoming Ingredients — Day "+pool[0]+" & "+pool[1]) : ("Upcoming Ingredients — Day "+pool[0]);
      return { items:fallback, label:label };
    }
    var nextInfo = nextTwoDayIngredients(day);
    var nextItems = nextInfo.items, nextLabel = nextInfo.label;

    return e(React.Fragment, null,
      // Masthead
      e("div",{className:"mast card"},
        e("div",{className:"mastRow"},
          e("div",{className:"mastLeft"},
            e("img",{src:"oz.png",alt:"Oz"}),
            e("div",{className:"mastTitle"},
              e("b",null,"Oz Companion"),
              e("small",null, day.phase.toUpperCase())
            )
          ),
          e("div",{className:"day-nav"},
            e("button",{className:"day-btn",onClick:function(){changeDay(-1);},"aria-label":"Previous day"},"◀"),
            e("span",{className:"day-label"},"Day "+day.day),
            e("button",{className:"day-btn",onClick:function(){changeDay(1);},"aria-label":"Next day"},"▶")
          )
        )
      ),

      e(ProgressBar,{value:progress}),

      // Checklist
      e("div",{className:"card",style:{marginTop:12}},
        e(Checklist,{items:items, state:checks, onToggle:toggleCheck})
      ),

      // Notes + Smart Coach (header = button)
      e("div",{className:"card",style:{marginTop:16}},
        e("div",{className:"coachCard",role:"button",tabIndex:0,
          onClick:runCoach, onKeyDown:function(ev){ if(ev.key==="Enter"||ev.key===" ") runCoach(); }},
          e("div",{className:"coachHeader"},
            e("div",{className:"coachPill"},"🧠", e("span",{className:"coachTitle"},"Smart Coach"))
          ),
          e("div",{className:"coachHint"},"Tap to analyze your note and get relief + motivation")
        ),
        coachText && e("div",{className:"coachOut"}, coachText),
        e("textarea",{value:day.note||"", onChange:function(ev){
          var val=ev.target.value;
          setDays(function(prev){ var next=prev.slice(); var d=Object.assign({}, next[idx]); d.note=val; next[idx]=d; return next; });
        }, rows:4, className:"noteArea", style:{marginTop:10}})
      ),

      // Next ingredients
      e("div",{className:"card",style:{marginTop:16}},
        e("h2",null,nextLabel),
        nextItems.length===0
          ? e("p",{style:{color:"#64748b"}},"No recipes scheduled soon.")
          : e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
              nextItems.map(function(item){
                var badge = item.days.length===1? ("Day "+item.days[0]) : ("Day "+item.days[0]+"–"+item.days[item.days.length-1]);
                return e("li",{key:item.name,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3d0e1"}},
                  e("span",null, item.name, " ", e("span",{className:"badge"}, badge)),
                  e("span",{style:{color:"#64748b",fontSize:12}}, item.qtyList.join(" + ")||"")
                );
              })
            )
      ),

      // Weight
      e("div",{className:"card",style:{marginTop:16}},
        e("h2",null,"Weight"),
        e("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}},
          e("label",null,"Today’s weight"),
          e("input",{
            type:"number", step:"0.1", inputMode:"decimal", // iOS no-zoom (plus CSS font-size:16)
            value:(day.weight==null?"":day.weight),
            onChange:function(ev){
              var v=ev.target.value;
              setDays(function(prev){
                var next=prev.slice(); var d=Object.assign({}, next[idx]);
                d.weight = (v===""? null : Number(v));
                // auto-check weight
                var c=Object.assign({}, d.checks||{}); c.weight = (v!=="" && !isNaN(Number(v)));
                d.checks=c; next[idx]=d; return next;
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

  /* ---------------- Settings ---------------- */
  function Settings(p){
    var templates = p.templates, onChange = p.onChange, onImportPlan = p.onImportPlan, goals = p.goals, setGoals = p.setGoals, onImportText = p.onImportText;
    var localState = useState(templates); var local = localState[0], setLocal = localState[1];
    var modalState = useState(false); var showModal = modalState[0], setShowModal = modalState[1];
    var modalPhaseState = useState("fast"); var modalPhase = modalPhaseState[0], setModalPhase = modalPhaseState[1];
    var modalCheckedState = useState({}); var modalChecked = modalCheckedState[0], setModalChecked = modalCheckedState[1];
    var startDateState = useLocal("oz.startDate", null); var startDate = startDateState[0], setStartDate = startDateState[1];

    useEffect(function(){ setLocal(templates); }, [templates]);

    function openModal(phase){
      setModalPhase(phase);
      var sel = new Set((local[phase]||[]));
      var all = Object.keys(goals).reduce(function(m,id){ m[id]=sel.has(id); return m; },{});
      setModalChecked(all);
      setShowModal(true);
    }
    function saveModal(){
      var nextIds = Object.keys(modalChecked).filter(function(id){ return modalChecked[id]; });
      var next = Object.assign({}, local); next[modalPhase]=nextIds; setLocal(next); onChange(next);
      setShowModal(false);
    }
    function toggleModalId(id){ setModalChecked(function(prev){ var o=Object.assign({}, prev); o[id]=!o[id]; return o; }); }
    function createGoal(){
      var idRaw = prompt("New goal ID (letters, dashes): e.g., meditation");
      if(!idRaw) return;
      var id = idRaw.toLowerCase().trim().replace(/[^a-z0-9\-]/g,"");
      if(!id) return alert("Invalid ID.");
      if(goals[id]) return alert("That goal ID already exists.");
      var label = prompt("Label to show (e.g., 🧘 Meditation 10 min)");
      if(!label) return;
      setGoals(function(prev){ var n=Object.assign({}, prev); n[id]=label; return n; });
      setModalChecked(function(prev){ var n=Object.assign({}, prev); n[id]=true; return n; });
    }

    function applyStartDate(v){
      setStartDate(v||null);
      // stash inside templates object so Calendar can read it
      var next = Object.assign({}, local);
      next.__startDate = (v||"");
      setLocal(next); onChange(next);
    }

    return e("div",{className:"wrap"},
      e("h1",null,"Settings"),

      // Start date
      e("div",{className:"card",style:{marginBottom:12}},
        e("h2",null,"Start Date"),
        e("input",{type:"date", value:(startDate||""), onChange:function(ev){ applyStartDate(ev.target.value); }, style:{marginTop:8}})
      ),

      // Import
      e("div",{className:"card",style:{marginBottom:12}},
        e("h2",null,"Meal Plan"),
        e("p",{style:{color:"#64748b",margin:"6px 0 12px"}},"Reload default 11-day plan, or import from ChatGPT text."),
        e("button",{className:"btn",onClick:onImportPlan},"Import Default Plan"),
        e("button",{className:"btn",style:{marginLeft:8},onClick:onImportText},"Import plan from ChatGPT text")
      ),

      // Phase templates (edit via modal)
      e("div",{className:"card"},
        e("h2",null,"Checklist Templates"),
        e("p",{style:{color:"#64748b",margin:"6px 0 12px"}},"Choose which goals appear by default in each phase."),
        ["fast","cleanse","rebuild"].map(function(phase){
          var label = phase.charAt(0).toUpperCase()+phase.slice(1);
          return e("div",{key:phase,style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}},
            e("div",null, e("b",null,label)),
            e("button",{className:"btn",onClick:function(){ openModal(phase); }}, "Edit")
          );
        })
      ),

      // Modal
      showModal && e("div",{className:"modal", onClick:function(ev){ if(ev.target.classList.contains("modal")) setShowModal(false); }},
        e("div",{className:"sheet"},
          e("h2",null,"Edit Goals — ", modalPhase.charAt(0).toUpperCase()+modalPhase.slice(1)),
          e("div",{style:{maxHeight:"48vh",overflow:"auto",margin:"8px 0 12px"}},
            Object.keys(goals).map(function(id){
              return e("label",{key:id, style:{display:"flex",alignItems:"center",gap:8,padding:"8px 6px",borderBottom:"1px solid #f3d0e1"}},
                e("input",{type:"checkbox", checked:!!modalChecked[id], onChange:function(){ toggleModalId(id); }}),
                e("span",null, goals[id])
              );
            })
          ),
          e("div",{style:{display:"flex",gap:8,justifyContent:"space-between"}},
            e("button",{className:"btn",onClick:createGoal},"+ New Goal"),
            e("div",null,
              e("button",{className:"btn",onClick:function(){ setShowModal(false); }},"Cancel"),
              e("button",{className:"btn primary",style:{marginLeft:8},onClick:saveModal},"Save")
            )
          )
        )
      )
    );
  }

  /* ---------------- importer ---------------- */
  function parseFreeTextPlan(text){
    var days = defaultDays();
    var recipes = [];
    var lines = String(text||"").split(/\r?\n/);
    var curDay = null;
    lines.forEach(function(raw){
      var line = raw.trim();
      var mDay = line.match(/^Day\s+(\d+)/i);
      if(mDay){ curDay=+mDay[1]; return; }
      var mJuice = line.match(/^Juice\s*\d+\s*[-:]\s*(.+)$/i);
      if(mJuice && curDay){
        recipes.push({ id:"r-"+recipes.length, name:mJuice[1].trim(), type:"juice", day:curDay, servings:1, ingredients:[] });
        return;
      }
      var mMeal = line.match(/^(Breakfast|Lunch|Dinner|Meal)\s*[-:]\s*(.+)$/i);
      if(mMeal && curDay){
        recipes.push({ id:"m-"+recipes.length, name:mMeal[2].trim(), type:"meal", day:curDay, ingredients:[] });
        return;
      }
      var mIng = line.match(/^[•\-]\s*(.+)$/);
      if(mIng && recipes.length){
        var last = recipes[recipes.length-1];
        var s=mIng[1].trim(); var m=s.match(/^(\d+(\.\d+)?\s*\w+)?\s*(.+)$/);
        last.ingredients.push({ key:(m?m[3]:s).toLowerCase().replace(/\s+/g,"-"), name:(m?m[3]:s), qty:(m&&m[1])?m[1]:"" });
      }
    });
    return { days:days, recipes:recipes };
  }

  /* ---------------- App ---------------- */
  function App(){
    var goalsState = useLocal("oz.goals", INITIAL_GOALS);
    var goals = goalsState[0], setGoals = goalsState[1];

    var settingsState = useLocal("oz.settings", { phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    var settings = settingsState[0], setSettings = settingsState[1];

    // validate templates vs goals
    useEffect(function(){
      var pt=settings && settings.phaseTemplates;
      var valid = pt && ["fast","cleanse","rebuild"].every(function(k){ return Array.isArray(pt[k]) && pt[k].every(function(id){ return !!goals[id]; }); });
      if(!valid) setSettings({ phaseTemplates: DEFAULT_PHASE_TEMPLATES });
    },[goals]); // eslint-disable-line

    var daysState = useLocal("oz.days", defaultDays());
    var days = daysState[0], setDays = daysState[1];

    var planRecipes = useLocal("oz.recipes", buildPlanRecipes());
    var recipes = planRecipes[0], setRecipes = planRecipes[1];

    var groceryState = useLocal("oz.groceries", aggregateGroceries(buildPlanRecipes()));
    var groceries = groceryState[0], setGroceries = groceryState[1];

    var tabState = useState("dash"); var tab = tabState[0], setTab = tabState[1];

    function importFullPlan(){
      var newDays = defaultDays(); setDays(newDays);
      var r = buildPlanRecipes(); setRecipes(r);
      setGroceries(aggregateGroceries(r));
      alert("Plan imported ✔");
    }
    function importFromChatGPTPrompt(){
      var txt = prompt("Paste ChatGPT meal-plan text or JSON:");
      if(!txt) return;
      try{
        var plan = JSON.parse(txt);
        if(!Array.isArray(plan.recipes) || !Array.isArray(plan.days)) throw new Error("bad");
        setDays(plan.days); setRecipes(plan.recipes); setGroceries(aggregateGroceries(plan.recipes));
        alert("Imported ✔");
      }catch(_){
        try{
          var parsed = parseFreeTextPlan(txt);
          setDays(parsed.days); setRecipes(parsed.recipes); setGroceries(aggregateGroceries(parsed.recipes));
          alert("Imported ✔");
        }catch(e){ alert("Couldn’t parse that text. If possible, paste JSON next time."); }
      }
    }

    return e("div",null,
      (tab==="dash") && e(Dashboard,{templates:settings.phaseTemplates, days:days, setDays:setDays, recipes:recipes, goals:goals}),
      (tab==="groceries") && e(GroceryList,{groceries:groceries, setGroceries:setGroceries}),
      (tab==="calendar") && e(Calendar,{days:days, recipes:recipes, settings:settings}),
      (tab==="photos") && e(Photos,{days:days, setDays:setDays}),
      (tab==="settings") && e(Settings,{
        templates:settings.phaseTemplates,
        onChange:function(next){ setSettings({ phaseTemplates: next }); },
        onImportPlan: importFullPlan,
        goals:goals, setGoals:setGoals,
        onImportText: importFromChatGPTPrompt
      }),

      // Floating emoji dock (CSS centers & styles)
      e("div",{className:"tabs"},
        e("button",{className:"btn"+(tab==="dash"?" active":""), onClick:function(){setTab("dash");}, "aria-label":"Dashboard"},"🏠"),
        e("button",{className:"btn"+(tab==="groceries"?" active":""), onClick:function(){setTab("groceries");}, "aria-label":"Groceries"},"🛒"),
        e("button",{className:"btn"+(tab==="calendar"?" active":""), onClick:function(){setTab("calendar");}, "aria-label":"Calendar"},"📅"),
        e("button",{className:"btn"+(tab==="photos"?" active":""), onClick:function(){setTab("photos");}, "aria-label":"Photos"},"📷"),
        e("button",{className:"btn"+(tab==="settings"?" active":""), onClick:function(){setTab("settings");}, "aria-label":"Settings"},"⚙️")
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
