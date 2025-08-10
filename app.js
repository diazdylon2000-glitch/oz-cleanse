/* app.js — streamlined header, centered splash text, fixed calendar listing */

/* ---------- Splash: put the bubble UNDER Oz & fade out ---------- */
(function () {
  var LINES = [
    "Strong body, calm mind",
    "Small habits, big change",
    "Hydration is happiness 🐾",
    "Progress, not perfection",
    "Sip, breathe, reset",
    "You’ve got this! 💪"
  ];
  var bub = document.getElementById("ozBubble");
  if (bub) {
    bub.textContent = LINES[Math.floor(Math.random() * LINES.length)];
    // Put bubble centered under the pic (no CSS change needed)
    bub.style.left = "50%";
    bub.style.transform = "translateX(-50%)";
    bub.style.top = "calc(50% + 140px)"; // under the 180–200px circle
    bub.style.maxWidth = "82vw";
    bub.style.textAlign = "center";
  }
  window.addEventListener("load", function () {
    var splash = document.getElementById("ozSplash");
    setTimeout(function () {
      if (splash) splash.classList.add("fade-out");
      if (bub) bub.classList.add("fade-out");
      setTimeout(function () {
        if (splash) splash.style.display = "none";
        if (bub) bub.style.display = "none";
      }, 500);
    }, 1100);
  });
})();

/* ---------- React helpers ---------- */
const e = React.createElement;
const { useState, useEffect, useMemo } = React;

/* ---------- Data ---------- */
function defaultDays() {
  const phases = [
    "fast", "fast", "fast",
    "cleanse", "cleanse", "cleanse", "cleanse",
    "rebuild", "rebuild", "rebuild", "rebuild"
  ];
  return phases.map((ph, i) => ({
    day: i + 1,
    phase: ph,
    checks: {},
    weight: null,
    note: "",
    photos: []
  }));
}

// Four distinct juices on cleanse days; meals later
const RECIPES = [
  { id: "j-melon",  name: "Melon Mint Morning",  type: "juice",  day: 4 },
  { id: "j-peach",  name: "Peachy Green Glow",   type: "juice",  day: 5 },
  { id: "j-carrot", name: "Carrot Apple Ginger", type: "juice",  day: 6 },
  { id: "j-grape",  name: "Grape Romaine Cooler",type: "juice",  day: 7 },

  { id: "m-smooth", name: "Smoothie Breakfast",  type: "meal",   day: 8 },
  { id: "m-lentil", name: "Lentil Soup",         type: "meal",   day: 8 },
  { id: "m-oats",   name: "Overnight Oats",      type: "meal",   day:10 },
  { id: "m-quinoa", name: "Quinoa Salad",        type: "meal",   day:10 },
  { id: "m-prot",   name: "Protein + Broccoli",  type: "meal",   day:11 }
];

const GOAL_LABELS = {
  water: "💧 Drink 120–150 oz water",
  tea: "🍵 Tea",
  coffee: "☕ Coffee",
  lmnt: "🧂 Electrolytes",
  exercise: "🏃 Exercise",
  whole: "🥗 Whole food meals",
  weight: "👣 Weight check-in"
};

const PHASE_DEFAULTS = {
  fast:    ["water","tea","coffee","lmnt","exercise","weight"],
  cleanse: ["water","tea","coffee","lmnt","exercise","weight"],
  rebuild: ["water","lmnt","exercise","whole","weight"]
};

/* ---------- Small atoms ---------- */
function ProgressBar({ value }) {
  return e("div", { className: "prog" },
    e("i", { style: { width: Math.max(0, Math.min(100, value)) + "%" } })
  );
}

/* ---------- App ---------- */
function App() {
  const [days, setDays] = useState(() => {
    try {
      const raw = localStorage.getItem("oz.days");
      return raw ? JSON.parse(raw) : defaultDays();
    } catch { return defaultDays(); }
  });
  useEffect(() => {
    try { localStorage.setItem("oz.days", JSON.stringify(days)); } catch {}
  }, [days]);

  const [tab, setTab] = useState("dashboard");
  const [idx, setIdx] = useState(0);
  const day = days[idx] || days[0];

  /* ---- Header (one line) ---- */
  const header = e("div", {
    className: "card",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      justifyContent: "space-between"
    }
  },
    e("div", { style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } },
      e("img", {
        src: "oz.png",
        alt: "Oz",
        style: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }
      }),
      e("div", { style: { overflow: "hidden" } },
        e("div", {
          style: {
            fontWeight: 800, fontSize: 24, letterSpacing: .2,
            whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden"
          }
        }, "Oz Companion"),
        e("div", {
          style: { marginTop: 2, color: "#6b7280", fontWeight: 700, letterSpacing: 1.2 }
        }, (day.phase || "").toUpperCase())
      )
    ),
    e("div", { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 } },
      e("button", {
        className: "btn", "aria-label": "Previous day",
        onClick: () => setIdx(i => (i > 0 ? i - 1 : days.length - 1))
      }, "◀"),
      e("div", {
        style: {
          border: "1px solid #f3d0e1", borderRadius: 16, padding: "8px 16px",
          fontWeight: 800
        }
      }, "Day " + day.day),
      e("button", {
        className: "btn", "aria-label": "Next day",
        onClick: () => setIdx(i => (i < days.length - 1 ? i + 1 : 0))
      }, "▶")
    )
  );

  /* ---- Checklist ---- */
  const activeGoalIds = day.order && day.order.length
    ? day.order
    : (PHASE_DEFAULTS[day.phase] || []);
  const items = activeGoalIds.map(id => ({ id, label: GOAL_LABELS[id] || id }));
  const checks = day.checks || {};
  const done = items.reduce((n, it) => n + (checks[it.id] ? 1 : 0), 0);
  const progress = (items.length ? (done / items.length) : 0) * 100;

  function toggleCheck(id) {
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

  const checklist = e("div", { className: "card" },
    e("ul", { className: "list" },
      items.map(it =>
        e("li", { key: it.id, className: "item" },
          e("button", {
            className: "paw" + (checks[it.id] ? " on" : ""),
            onClick: () => toggleCheck(it.id),
            "aria-pressed": !!checks[it.id]
          }, checks[it.id] ? "🐾" : ""),
          e("label", null, it.label)
        )
      )
    )
  );

  /* ---- Notes + Coach (UI only) ---- */
  const [coachText, setCoachText] = useState("");
  function runCoach() {
    const t = (day.note || "").toLowerCase();
    if (!t) { setCoachText("Write a quick note, then tap Smart Coach."); return; }
    const tips = [];
    if (/headache|migraine/.test(t)) tips.push("12–16 oz water + electrolytes; dim screens 10 min.");
    if (/dizzy|light.?headed/.test(t)) tips.push("Sit until steady; small juice; breathe 4 in / 6 out.");
    if (/nausea|queasy/.test(t)) tips.push("Cool water or peppermint/ginger tea; fresh air.");
    if (/tired|fatigue|exhaust/.test(t)) tips.push("15 min rest; hydrate; gentle stretching.");
    if (!tips.length) tips.push("Hydrate now, 5 slow breaths, short walk, reassess.");
    setCoachText("Try these:\n• " + tips.join("\n• "));
  }

  const notes = e("div", { className: "card" },
    e("div", {
      role: "button", tabIndex: 0,
      onClick: runCoach,
      onKeyDown: (ev) => { if (ev.key === "Enter" || ev.key === " ") runCoach(); },
      style: {
        display: "flex", alignItems: "center", gap: 10,
        background: "linear-gradient(90deg,#ffe4ef,#e9d5ff)",
        border: "1px solid #f3d0e1", borderRadius: 14, padding: "10px 12px",
        cursor: "pointer"
      }
    },
      e("span", { className: "badge" }, "🧠 Smart Coach"),
      e("div", { style: { color: "#64748b", fontWeight: 600 } },
        "Tap to analyze your note and get relief + motivation"
      )
    ),
    coachText && e("pre", {
      className: "coachOut",
      style: { marginTop: 8, whiteSpace: "pre-wrap" }
    }, coachText),
    e("textarea", {
      value: day.note || "",
      onChange: (ev) => {
        const val = ev.target.value;
        setDays(prev => {
          const next = prev.slice();
          const d = { ...next[idx] };
          d.note = val;
          next[idx] = d;
          return next;
        });
      },
      rows: 4, className: "noteArea", style: { marginTop: 10 }
    })
  );

  /* ---- Calendar (FIX: show ONE of each juice) ---- */
  function CalendarView() {
    return e("div", { className: "card" },
      e("h2", null, "Calendar"),
      e("ul", { style: { listStyle: "none", padding: 0, marginTop: 8 } },
        days.map(d => {
          const todays = RECIPES.filter(r => r.day === d.day);
          return e("li", {
            key: d.day,
            style: { padding: "8px 0", borderBottom: "1px solid #f3d0e1" }
          },
            e("div", {
              style: {
                display: "flex", justifyContent: "space-between",
                alignItems: "center", gap: 8, flexWrap: "wrap"
              }
            },
              e("div", null,
                e("div", { style: { fontWeight: 700 } }, "Day ", d.day, " — ", d.phase.toUpperCase()),
                e("div", {
                  style: {
                    display: "flex", gap: 6, flexWrap: "wrap",
                    marginTop: 6, minHeight: 24
                  }
                },
                  todays.length
                    ? todays.map(r =>
                        e("span", { key: r.id, className: "badge" },
                          (r.type === "juice" ? "🧃 " : "🍽️ "), r.name // <-- no ×4 anywhere
                        )
                      )
                    : e("span", { style: { fontSize: 12, color: "#64748b" } }, "—")
                )
              ),
              e("button", { className: "btn", onClick: () => setIdx(d.day - 1) }, "Go")
            )
          );
        })
      )
    );
  }

  /* ---- Tabs ---- */
  const tabs = e("nav", { className: "tabs" },
    [
      { id: "dashboard", icon: "🏠" },
      { id: "calendar",  icon: "📅" },
      { id: "photos",    icon: "📷" },
      { id: "settings",  icon: "⚙️" }
    ].map(t =>
      e("button", {
        key: t.id,
        className: "btn" + (tab === t.id ? " active" : ""),
        onClick: () => setTab(t.id),
        "aria-label": t.id
      }, t.icon)
    )
  );

  /* ---- Compose screens ---- */
  const dashboard = e(React.Fragment, null,
    header,
    e(ProgressBar, { value: progress }),
    checklist,
    notes
  );

  const photos = e("div", { className: "card" },
    e("h2", null, "Photos"),
    e("p", { style: { color: "#64748b" } }, "Upload & track progress photos on your Photos tab (not included in this minimal build).")
  );

  const settingsView = e("div", { className: "card" },
    e("h2", null, "Settings"),
    e("p", { style: { color: "#64748b" } }, "More settings coming soon.")
  );

  return e("div", null,
    tab === "dashboard" ? dashboard :
    tab === "calendar"  ? e(CalendarView) :
    tab === "photos"    ? photos :
                          settingsView,
    tabs
  );
}

/* ---------- Mount ---------- */
ReactDOM.createRoot(document.getElementById("root")).render(e(App));
