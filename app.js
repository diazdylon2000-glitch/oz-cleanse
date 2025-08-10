// -------------------- SMART COACH COMPONENT --------------------
function SmartCoachSection({ day, updateDay }) {
  const runCoach = () => {
    if (day.note && day.note.trim() !== "") {
      // Call your AI/analysis function
      const advice = analyzeNote(day.note);
      updateDay({ ...day, coachText: advice });
    } else {
      alert("Write something first so Smart Coach can analyze it!");
    }
  };

  return React.createElement(
    "div",
    { className: "coachWrap" },
    // Header / clickable bar
    React.createElement(
      "div",
      {
        className: "coachBar",
        role: "button",
        tabIndex: 0,
        onClick: runCoach,
        onKeyDown: (ev) => {
          if (ev.key === "Enter" || ev.key === " ") runCoach();
        }
      },
      React.createElement(
        "div",
        { className: "coachLeft" },
        React.createElement("div", { className: "coachPill" }, "🧠 Smart Coach"),
        React.createElement(
          "div",
          { className: "coachHint" },
          "Tap to analyze your note and get relief + motivation"
        )
      )
    ),
    // Output from coach
    day.coachText &&
      React.createElement("div", { className: "coachOut" }, day.coachText),
    // Notes box
    React.createElement("textarea", {
      className: "noteArea",
      placeholder: "Write your thoughts...",
      value: day.note || "",
      onChange: (e) => updateDay({ ...day, note: e.target.value })
    })
  );
}

// -------------------- FLOATING DOCK WIRING --------------------
function wireFloatingDock(setTab) {
  const dock = document.querySelectorAll(".dockWrap button[data-tab]");
  dock.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabKey = btn.getAttribute("data-tab");
      if (tabKey) setTab(tabKey);
    });
  });
}

// -------------------- MAIN APP --------------------
function App() {
  const [tab, setTab] = React.useState("dashboard");
  const [days, setDays] = React.useState(loadDays());

  const updateDay = (newDay) => {
    const updated = days.map((d) => (d.id === newDay.id ? newDay : d));
    setDays(updated);
    saveDays(updated);
  };

  React.useEffect(() => {
    wireFloatingDock(setTab);
  }, []);

  return React.createElement(
    "div",
    { className: "appContainer" },
    tab === "dashboard" &&
      React.createElement(SmartCoachSection, {
        day: days[0],
        updateDay: updateDay
      }),
    // ... other tabs
  );
}

// -------------------- HELPER FUNCS --------------------
function loadDays() {
  return JSON.parse(localStorage.getItem("days")) || [
    { id: 1, note: "", coachText: "" }
  ];
}

function saveDays(data) {
  localStorage.setItem("days", JSON.stringify(data));
}

function analyzeNote(note) {
  // Temporary placeholder logic
  return `Based on your note: "${note}", remember to stay hydrated and keep moving!`;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(App)
);
