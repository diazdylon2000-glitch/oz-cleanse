/* app.js — Oz Companion (polished, native-feel)
   - Centered splash with random affirmations under Oz
   - Responsive header (avatar + title + day selector in one line)
   - Paw-print checklist (customizable via Settings)
   - Smart Coach (symptom + mood aware)
   - Notes & Photos track on Calendar (persisted in localStorage)
   - Cleanse days show 4 different juices each day (display + grocery roll-up)
   - Next-2-days ingredients preview
   - Weight tracker (no zoom), mini chart
   - Bigger 100% celebration + subtle micro-animations
*/

/* ---------------- Splash (affirmations) ---------------- */
(function initSplash() {
  var LINES = [
    "You’ve got this!",
    "Small habits, big change",
    "Progress, not perfection",
    "Sip, breathe, reset",
    "Strong body, calm mind",
    "Hydration is happiness 🐾",
    "Future-you says thanks",
    "Gentle + consistent + kind",
    "Shine time ✨",
    "Keep it playful",
    "You’re doing the work 💪",
    "Light, strong, and centered",
    "Fuel, flush, flourish",
    "Discipline is self-care"
  ];

  function setBubble() {
    var el = document.getElementById("ozBubble");
    if (el) el.textContent = LINES[Math.floor(Math.random() * LINES.length)];
  }
  function hideSplash() {
    var s = document.getElementById("ozSplash");
    if (s) {
      s.style.opacity = "0";
      setTimeout(function () { s.style.display = "none"; }, 450);
    }
  }

  document.addEventListener("DOMContentLoaded", setBubble);
  window.addEventListener("pageshow", setBubble);
  window.addEventListener("load", function () {
    setBubble();
    setTimeout(hideSplash, 1400);
  });
  // absolute failsafe
  setTimeout(hideSplash, 4000);
})();

/* ---------------- React hooks ---------------- */
var e = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;

/* ---------------- Persistence ---------------- */
function useLocal(key, initialValue) {
  var pair = useState(function () {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (_) {
      return initialValue;
    }
  });
  useEffect(function () {
    try { localStorage.setItem(key, JSON.stringify(pair[0])); } catch (_) {}
  }, [key, pair[0]]);
  return pair;
}

/* ---------------- Plan / Goals ---------------- */
var DEFAULT_GOALS = {
  water: "💧 Drink 120–150 oz water",
  tea: "🍵 Tea",
  coffee: "☕ Coffee",
  lmnt: "🧂 Electrolytes",
  exercise: "🏃 Exercise",
  weight: "👣 Weight check-in",
  wholefood: "🥗 Whole food meals"
};

var DEFAULT_PHASE_TEMPLATES = {
  FAST: ["water", "tea", "coffee", "lmnt", "exercise", "weight"],
  CLEANSE: ["water", "tea", "coffee", "lmnt", "exercise", "weight"],
  REBUILD: ["water", "lmnt", "exercise", "wholefood", "weight"]
};

// Four juices that repeat for every CLEANSE day (display)
// We keep them as base recipes and expand them per-day for calendar/groceries view.
var JUICE_CORE = [
  { id:"j-melon",  name:"Melon Mint Morning",   ingredients:[{name:"Melon",qty:"1"},{name:"Mint",qty:"1/2 cup"},{name:"Lime",qty:"1"}] },
  { id:"j-peach",  name:"Peachy Green Glow",    ingredients:[{name:"Peaches",qty:"3"},{name:"Cucumber",qty:"2"},{name:"Spinach",qty:"4 cups"},{name:"Lemon",qty:"1"}] },
  { id:"j-carrot", name:"Carrot Apple Ginger",  ingredients:[{name:"Carrots",qty:"14"},{name:"Apples",qty:"2"},{name:"Ginger",qty:'1"'},{name:"Lemon",qty:"1"}] },
  { id:"j-grape",  name:"Grape Romaine Cooler", ingredients:[{name:"Grapes",qty:"3 cups"},{name:"Romaine",qty:"3 cups"},{name:"Cucumber",qty:"2"},{name:"Lemon",qty:"1"}] }
];

function defaultDays() {
  var phases = ["FAST","FAST","FAST","CLEANSE","CLEANSE","CLEANSE","CLEANSE","REBUILD","REBUILD","REBUILD","REBUILD"];
  return phases.map(function(ph, i) {
    return { day:i+1, phase:ph, checks:{}, note:"", weight:null, photos:[] };
  });
}

/* ---------------- Grocery aggregation (repeat juices per CLEANSE day) ---------------- */
function aggregateForNextTwoDays(recipesByDay) {
  // recipesByDay: map day -> array of { name, ingredients[] }
  // Flatten today & tomorrow
  var bag = {};
  Object.keys(recipesByDay).forEach(function(d) {
    var arr = recipesByDay[d] || [];
    arr.forEach(function(r) {
      (r.ingredients || []).forEach(function(it) {
        var key = (it.name || "").toLowerCase();
        if (!bag[key]) bag[key] = { name: it.name, qtyList: [], days: new Set() };
        if (it.qty) bag[key].qtyList.push(it.qty);
        bag[key].days.add(+d);
      });
    });
  });
  Object.keys(bag).forEach(function(k){ bag[k].days = Array.from(bag[k].days).sort(function(a,b){return a-b;}); });
  return Object.values(bag).sort(function(a,b){ return (a.name||"").localeCompare(b.name||""); });
}

/* ---------------- Coach intelligence ---------------- */
var AFFIRM = [
  "You’ve got this! 💪","Proud of your effort today. 🌟","Oz is wagging his tail for you! 🐶",
  "One step at a time—amazing.","Keep going; future-you will thank you.",
  "Tiny wins add up.","Consistency beats intensity.","You’re building something real.","Strong body, kind mind."
];
var RULES = [
  { id:"headache",  test:function(t){return /\b(headache|migraine|head pain)\b/i.test(t);},
    tips:["Sip 8–12 oz water over 15 minutes.","Add a pinch of sea salt or electrolyte.","Dim screens and rest eyes for 5–10 minutes."] },
  { id:"dizzy",     test:function(t){return /\b(dizzy|light[-\s]?headed|vertigo)\b/i.test(t);},
    tips:["Sit or lie until steady.","Try LMNT or a small juice if fasting.","Breathe 4 in / 6 out."] },
  { id:"nausea",    test:function(t){return /\b(nausea|queasy|sick to (?:my|the) stomach)\b/i.test(t);},
    tips:["Cool water or peppermint/ginger tea.","Step into fresh air.","Move slowly."] },
  { id:"fatigue",   test:function(t){return /\b(tired|fatigue|exhaust(?:ed|ion)|wiped|low energy)\b/i.test(t);},
    tips:["15–20 min rest.","Hydrate or electrolytes.","2 minutes of gentle stretching."] },
  { id:"hunger",    test:function(t){return /\b(hungry|starv(?:ed|ing)|crav(?:ing|es))\b/i.test(t);},
    tips:["Drink water first.","Have scheduled juice slowly.","5-min walk as a reset."] }
];
function inferMood(text){
  var t = (text||"").toLowerCase();
  var neg = [/overwhelm|anxious|stressed|down|sad|discourag|frustrat/, /tired|exhaust|wiped|drained/, /pain|hurt|ache/]
    .reduce(function(n, rx){ return n + (rx.test(t)?1:0); }, 0);
  var pos = [/proud|strong|good|better|energized|motivated|win|progress|calm|happy|light/]
    .reduce(function(n, rx){ return n + (rx.test(t)?1:0); }, 0);
  var score = 6 + pos - 2*neg;
  return Math.max(1, Math.min(10, score));
}
function coachResponse(text, phase){
  var t = (text||"").trim();
  if (!t) return "Write a quick note above, then tap Smart Coach.";
  var hits = RULES.filter(function(r){ return r.test(t); });
  var tips = hits.flatMap(function(h){ return h.tips; }).slice(0,8);
  var mood = inferMood(t);
  var boost = (mood<=3)
    ? ["You’re not alone—let’s make today gentle.","Pick one tiny win now (8–10 oz water, 3 deep breaths).", AFFIRM[Math.floor(Math.random()*AFFIRM.length)]]
    : (mood<=6)
      ? ["Nice work staying steady. Choose one small upgrade today.", AFFIRM[Math.floor(Math.random()*AFFIRM.length)]]
      : [AFFIRM[Math.floor(Math.random()*AFFIRM.length)], "Ride the wave; stay kind to yourself."];
  var head = hits.length ? ("I noticed: " + hits.map(function(h){return h.id;}).join(", ") + ".") : "No specific symptoms spotted—here’s a steady plan.";
  var body = tips.length ? ("Try these:\n• " + tips.join("\n• ")) : "Hydrate now, 5 slow breaths, short walk, then reassess.";
  if (phase === "CLEANSE") body += "\n\nCleanse tip: aim for 4 juices spaced ~3 hours.";
  return head + "\n\n" + body + "\n\n" + boost.join(" ");
}

/* ---------------- UI atoms ---------------- */
function PawButton(props){
  return e("button", {
    className: "paw" + (props.on ? " on" : ""),
    onClick: props.onClick,
    "aria-pressed": !!props.on
  }, props.on ? "🐾" : "");
}
function ProgressBar(props){
  var v = Math.max(0, Math.min(100, props.value||0));
  return e("div", { className: "prog" },
    e("div", { className: "fill", style: { width: v + "%" } })
  );
}

/* ---------------- Pages ---------------- */
function App(){
  /* state */
  var [goals, setGoals] = useLocal("oz.goals", DEFAULT_GOALS);
  var [templates, setTemplates] = useLocal("oz.templates", DEFAULT_PHASE_TEMPLATES);
  var [days, setDays] = useLocal("oz.days", defaultDays());
  var [tab, setTab] = useLocal("oz.tab", "dash");
  var [coachOut, setCoachOut] = useState("");
  var [idx, setIdx] = useLocal("oz.idx", 0);

  var day = days[idx] || days[0];

  /* progress */
  var templateIds = templates[day.phase] || [];
  var activeIds = (templateIds || []).filter(function(id){ return !!goals[id]; });
  var doneCount = activeIds.reduce(function(a,id){ return a + (day.checks && day.checks[id] ? 1 : 0); }, 0);
  var progress = activeIds.length ? (doneCount / activeIds.length) * 100 : 0;

  useEffect(function(){
    if (Math.round(progress) === 100 && window.confetti) {
      // Big celebration
      var t = Date.now() + 800;
      (function frame(){
        confetti({ particleCount: 100, spread: 70, scalar: 1.2, origin: { y: 0.7 } });
        if (Date.now() < t) requestAnimationFrame(frame);
      })();
    }
  }, [progress]);

  function changeDay(dir){
    setIdx(function(cur){
      var n = cur + dir;
      if (n < 0) n = days.length - 1;
      if (n >= days.length) n = 0;
      return n;
    });
  }

  /* Header */
  var head = e("div", { className:"card", style:{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between"} },
    e("div",{style:{display:"flex",alignItems:"center",gap:10,minWidth:0,flex:"1 1 auto"}},
      e("img",{src:"oz.png",alt:"Oz",style:{width:36,height:36,borderRadius:9999,objectFit:"cover"}}),
      e("div",{style:{minWidth:0}},
        e("div",{style:{
          fontWeight:800, letterSpacing:.2,
          fontSize:"clamp(18px,5.2vw,22px)", lineHeight:"24px",
          whiteSpace:"nowrap", overflow:"visible", textOverflow:"clip"
        }},"Oz Companion"),
        e("div",{style:{marginTop:2, color:"#64748b", fontWeight:600, letterSpacing:.6}}, day.phase)
      )
    ),
    e("div",{style:{display:"flex",alignItems:"center",gap:10}},
      e("button",{className:"btn", onClick:function(){changeDay(-1);}, "aria-label":"Prev"}, "◀"),
      e("div",{className:"badge",style:{fontWeight:700,fontSize:16,padding:"6px 12px"}},"Day "+day.day),
      e("button",{className:"btn", onClick:function(){changeDay(1);}, "aria-label":"Next"}, "▶")
    )
  );

  /* Checklist */
  var list = e("div",{className:"card"},
    activeIds.map(function(id){
      var on = !!(day.checks && day.checks[id]);
      return e("div",{key:id,style:{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f3d0e1"}},
        e(PawButton,{on:on,onClick:function(){
          setDays(function(prev){
            var next = prev.slice();
            var d = Object.assign({}, next[idx]);
            var c = Object.assign({}, d.checks||{});
            c[id] = !c[id];
            d.checks = c; next[idx] = d;
            return next;
          });
        }}),
        e("div",null, goals[id] || id)
      );
    })
  );

  /* Smart Coach + Notes */
  var coach = e("div",{className:"card"},
    e("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
      e("span",{className:"badge"},"🧠 Smart Coach"),
      e("span",{style:{color:"#64748b"}},"Tap to analyze your note")
    ),
    e("button",{className:"btn peach",onClick:function(){
      var text = (day.note||"");
      setCoachOut(coachResponse(text, day.phase));
    }},"Analyze"),
    coachOut && e("pre",{className:"coachOut",style:{whiteSpace:"pre-wrap",marginTop:8}},coachOut),
    e("textarea",{
      value: day.note || "",
      onChange:function(ev){
        var val = ev.target.value;
        setDays(function(prev){
          var next = prev.slice(); var d = Object.assign({}, next[idx]);
          d.note = val; next[idx] = d; return next;
        });
      },
      inputMode:"text", style:{marginTop:10}
    })
  );

  /* Next two days ingredients (all four juices each CLEANSE day) */
  function recipesForDay(d){
    if (d.phase === "CLEANSE") return JUICE_CORE; // 4 juices each day
    if (d.phase === "REBUILD") {
      // simple demo meals (can extend)
      if (d.day===8) return [
        { name:"Smoothie Breakfast", ingredients:[{name:"Spinach",qty:"2 cups"},{name:"Almond milk",qty:"1 cup"},{name:"Chia",qty:"1 tbsp"}] },
        { name:"Lentil Soup", ingredients:[{name:"Lentils",qty:"1/2 cup dry"},{name:"Carrots",qty:"1/2 cup"},{name:"Celery",qty:"1/2 cup"}] }
      ];
      if (d.day===9) return [
        { name:"Simple Veg Broth", ingredients:[{name:"Carrots",qty:"2"},{name:"Celery",qty:"2 stalks"},{name:"Onion",qty:"1/2"}] },
        { name:"Baked Sweet Potato Bowl", ingredients:[{name:"Sweet potatoes",qty:"2"},{name:"Spinach",qty:"2 cups"}] }
      ];
      if (d.day===10) return [
        { name:"Overnight Oats", ingredients:[{name:"Rolled oats",qty:"1/2 cup"},{name:"Almond milk",qty:"1 cup"}] },
        { name:"Quinoa Salad", ingredients:[{name:"Quinoa",qty:"1/2 cup dry"},{name:"Cucumber",qty:"1"},{name:"Tomato",qty:"1"}] }
      ];
      if (d.day===11) return [
        { name:"Protein + Broccoli", ingredients:[{name:"Salmon/Chicken",qty:"12 oz"},{name:"Broccoli",qty:"2 heads"}] }
      ];
    }
    return [];
  }
  function nextTwo(current) {
    var d1 = current.day;
    var d2 = Math.min(current.day + 1, days.length);
    var map = {};
    map[d1] = recipesForDay(current);
    map[d2] = recipesForDay(days[d2-1] || current);
    return aggregateForNextTwoDays(map);
  }
  var nextItems = nextTwo(day);

  var upcoming = e("div",{className:"card"},
    e("h2",null,"Upcoming Ingredients — Day "+day.day+" & "+(Math.min(day.day+1,days.length))),
    nextItems.length ? e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
      nextItems.map(function(it){
        var range = (it.days.length===1) ? ("Day "+it.days[0]) : ("Day "+it.days[0]+"–"+it.days[it.days.length-1]);
        return e("li",{key:it.name,style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3d0e1"}},
          e("span",null,it.name," ", e("span",{className:"badge"},range)),
          e("span",{style:{color:"#64748b",fontSize:12}}, it.qtyList.join(" + "))
        );
      })
    ) : e("p",{style:{color:"#64748b"}},"No ingredients needed.")
  );

  /* Weight */
  var weightSeries = days.map(function(d){ return d.weight==null ? null : d.weight; });
  var weight = e("div",{className:"card"},
    e("h2",null,"Weight"),
    e("div",{style:{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}},
      e("label",null,"Today’s weight"),
      e("input",{
        type:"number", step:"0.1", inputMode:"decimal",
        value: (day.weight==null ? "" : day.weight),
        onChange:function(ev){
          var v = ev.target.value;
          setDays(function(prev){
            var next = prev.slice(); var d = Object.assign({}, next[idx]);
            d.weight = (v===""?null:Number(v));
            // auto-check weight if present in template
            if (v!==""){
              var c = Object.assign({}, d.checks||{});
              if (activeIds.indexOf("weight")!==-1) c.weight = true;
              d.checks = c;
            }
            next[idx] = d; return next;
          });
        },
        style:{width:120}
      }),
      e("span",{className:"badge"},"Day "+day.day)
    ),
    e(WeightChart,{ series: weightSeries })
  );

  function WeightChart(props){
    var canvasRef = useRef(null);
    var chartRef = useRef(null);
    useEffect(function(){
      var ctx = canvasRef.current.getContext("2d");
      if (chartRef.current) { try{ chartRef.current.destroy(); }catch(_){ } }
      chartRef.current = new Chart(ctx,{
        type:"line",
        data:{
          labels: props.series.map(function(_,i){ return "D"+(i+1); }),
          datasets:[{
            data: props.series,
            borderColor:"#ec4899",
            backgroundColor:"rgba(236,72,153,.12)",
            tension:.35, spanGaps:true, pointRadius:3, pointHoverRadius:4
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          layout:{ padding:{ top:6, bottom:12, left:6, right:6 } },
          plugins:{ legend:{ display:false } },
          scales:{
            x:{ display:true, ticks:{ color:"#475569", font:{ size:11 } }, grid:{ color:"rgba(148,163,184,.25)" } },
            y:{ display:true, ticks:{ color:"#475569", font:{ size:11 } }, grid:{ color:"rgba(148,163,184,.18)" } }
          },
          animation:{ duration:250 }
        }
      });
      return function(){ try{ chartRef.current && chartRef.current.destroy(); }catch(_){ } };
    },[props.series]);
    return e("div",{style:{height:180}}, e("canvas",{ref:canvasRef}));
  }

  /* Photos */
  var photos = e("div",{className:"card"},
    e("h2",null,"Progress Photos"),
    e("label",{className:"btn peach",style:{display:"inline-block",marginTop:8}},
      "Upload Photo",
      e("input",{type:"file",accept:"image/*",multiple:false,style:{display:"none"},onChange:function(ev){
        var f = (ev.target.files||[])[0]; if(!f) return;
        var r = new FileReader();
        r.onload = function(){
          setDays(function(prev){
            var next = prev.slice(); var d = Object.assign({}, next[idx]);
            d.photos = (d.photos||[]).concat([String(r.result)]);
            next[idx] = d; return next;
          });
          var lines = [
            "Looking strong ✨","Your glow is showing ✨","Small habits, big change 💪",
            "Oz is proud of you 🐶","Consistency looks good on you 🌟"
          ];
          setTimeout(function(){ alert(lines[Math.floor(Math.random()*lines.length)]); }, 60);
        };
        r.readAsDataURL(f);
      }})
    ),
    e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}},
      (day.photos||[]).map(function(url,i){
        return e("img",{key:i,src:url,style:{width:100,height:100,objectFit:"cover",borderRadius:8}});
      })
    )
  );

  /* Calendar */
  var cal = e("div",{className:"wrap"},
    e("h1",null,"Calendar"),
    e("ul",{style:{listStyle:"none",padding:0,marginTop:8}},
      days.map(function(d){
        var entries = recipesForDay(d);
        var juiceCount = (d.phase==="CLEANSE") ? 4 : 0;
        var hasPhotos = (d.photos && d.photos.length>0);
        var hasNote = (d.note && d.note.trim().length>0);
        return e("li",{key:d.day,className:"card",style:{marginBottom:8}},
          e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}},
            e("div",null,
              e("div",{style:{fontWeight:700}},"Day ",d.day," — ",d.phase),
              e("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}},
                entries.length ? entries.map(function(r,i){
                  var icon = (d.phase==="CLEANSE"?"🧃":"🍽️");
                  return e("span",{key:r.name+"-"+i,className:"badge"}, icon+" "+r.name);
                }) : e("span",{style:{fontSize:12,color:"#64748b"}},"—")
              )
            ),
            e("div",{style:{display:"flex",gap:6,alignItems:"center"}},
              e("span",{className:"badge"}, juiceCount+" juices"),
              hasNote && e("span",{className:"badge"},"📝 Note"),
              hasPhotos && e("span",{className:"badge"},"📸 Photos")
            )
          )
        );
      })
    )
  );

  /* Settings (custom goals per phase) */
  var settings = e("div",{className:"wrap"},
    e("h1",null,"Settings"),
    e("div",{className:"card"},
      e("h2",null,"Checklist Goals"),
      e("p",{style:{color:"#64748b"}},"Enable/disable items and edit labels."),
      Object.keys(goals).map(function(id){
        return e("div",{key:id,style:{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f3d0e1"}},
          e("input",{type:"text",value:goals[id],onChange:function(ev){
            var v = ev.target.value;
            setGoals(function(prev){ var n=Object.assign({},prev); n[id]=v; return n; });
          },style:{flex:1}}),
          e("button",{className:"btn",onClick:function(){
            if (!confirm("Remove this goal?")) return;
            setGoals(function(prev){
              var n=Object.assign({},prev); delete n[id]; return n;
            });
            setTemplates(function(prev){
              var t = Object.assign({}, prev);
              Object.keys(t).forEach(function(p){
                t[p] = (t[p]||[]).filter(function(g){ return g!==id; });
              });
              return t;
            });
          }},"Delete")
        );
      }),
      e("div",{style:{display:"flex",gap:8,marginTop:8}},
        e("input",{type:"text",placeholder:"new-goal-id (letters-dashes)",id:"newGoalId",style:{flex:1}}),
        e("input",{type:"text",placeholder:"Label (e.g., 🧘 Meditation 10 min)",id:"newGoalLabel",style:{flex:2}}),
        e("button",{className:"btn peach",onClick:function(){
          var id = (document.getElementById("newGoalId").value||"").toLowerCase().trim().replace(/[^a-z0-9\-]/g,"");
          var label = (document.getElementById("newGoalLabel").value||"").trim();
          if(!id || !label) return alert("Enter id and label.");
          if(goals[id]) return alert("Goal id exists.");
          setGoals(function(prev){ var n=Object.assign({},prev); n[id]=label; return n; });
          document.getElementById("newGoalId").value="";
          document.getElementById("newGoalLabel").value="";
        }},"+ Add")
      )
    ),
    e("div",{className:"card"},
      e("h2",null,"Phase Templates"),
      ["FAST","CLEANSE","REBUILD"].map(function(ph){
        var present = templates[ph] || [];
        return e("div",{key:ph,style:{marginTop:8}},
          e("div",{style:{fontWeight:700,marginBottom:6}},ph),
          e("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
            Object.keys(goals).map(function(id){
              var on = present.indexOf(id)>=0;
              return e("label",{key:ph+"-"+id,className:"badge"},
                e("input",{type:"checkbox",checked:on,onChange:function(ev){
                  setTemplates(function(prev){
                    var t = Object.assign({}, prev);
                    var set = new Set(t[ph] || []);
                    if(ev.target.checked) set.add(id); else set.delete(id);
                    t[ph] = Array.from(set);
                    return t;
                  });
                }}),
                " ",goals[id]
              );
            })
          )
        );
      })
    )
  );

  /* Tabs */
  var tabs = e("nav",{className:"tabs"},
    [
      { id:"dash", icon:"🏠", view:e("div",null, head, e(ProgressBar,{value:progress}), list, coach, upcoming, weight) },
      { id:"grocery", icon:"🛒", view: upcoming }, // keep simple; we preview via "upcoming"
      { id:"calendar", icon:"📅", view: cal },
      { id:"photos", icon:"📷", view: photos },
      { id:"settings", icon:"⚙️", view: settings }
    ].map(function(t){
      return e("button",{key:t.id,className:"btn"+(tab===t.id?" active":""),onClick:function(){ setTab(t.id); }}, t.icon);
    })
  );

  /* Render by tab */
  var body = (function(){
    if (tab==="dash") return e("div",null, head, e(ProgressBar,{value:progress}), list, coach, upcoming, weight);
    if (tab==="grocery") return e("div",null, head, upcoming);
    if (tab==="calendar") return e("div",null, cal);
    if (tab==="photos") return e("div",null, photos);
    if (tab==="settings") return e("div",null, settings);
    return e("div",null, head); // fallback
  })();

  return e("div",null, body, tabs);
}

/* ---------------- Mount ---------------- */
ReactDOM.createRoot(document.getElementById("root")).render(e(App));
